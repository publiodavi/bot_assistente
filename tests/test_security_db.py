"""Integração opt-in em schema descartável: nunca usa tabelas reais da aplicação."""
import os
import re
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import asyncpg
from chainlit.context import context_var
from chainlit.types import Feedback
from fastapi import HTTPException
from sqlalchemy import text

from src.security_data import StudyDataLayer
from src.security_limits import usage, UsageLimit


@unittest.skipUnless(os.getenv("STUDY_TEST_DATABASE_URL"), "Defina STUDY_TEST_DATABASE_URL para integração PostgreSQL")
class DatabaseSecurityTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        url = os.environ["STUDY_TEST_DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://", 1)
        from urllib.parse import urlsplit
        if urlsplit(url).hostname not in ("127.0.0.1", "localhost"):
            raise RuntimeError("Os testes só podem usar PostgreSQL local.")
        self.schema = "security_test_" + uuid4().hex
        self.admin = await asyncpg.connect(url)
        await self.admin.execute(f'CREATE SCHEMA "{self.schema}"')
        await self.admin.execute(f'SET search_path TO "{self.schema}"')
        for file in sorted(Path("migrations").glob("*.sql")):
            await self.admin.execute(file.read_text(encoding="utf-8"))
        self.layer = StudyDataLayer(url.replace("postgresql://", "postgresql+asyncpg://", 1),
                                   connect_args={"server_settings": {"search_path": self.schema}})
        self.users, self.threads, self.steps = [uuid4() for _ in range(2)], [uuid4() for _ in range(2)], [uuid4() for _ in range(2)]
        for user, thread, step in zip(self.users, self.threads, self.steps):
            await self.admin.execute('INSERT INTO users VALUES ($1,$2,$3,$4)', user, "test:" + str(user), "2026-11-13Z", "{}")
            await self.admin.execute('INSERT INTO threads (id,"userId",metadata) VALUES ($1,$2,$3)', thread, user, "{}")
            await self.admin.execute('INSERT INTO steps (id,"threadId",name,type) VALUES ($1,$2,$3,$4)', step, thread, "Estudante", "user_message")
        self.session = SimpleNamespace(thread_id=str(self.threads[0]), user=SimpleNamespace(id=str(self.users[0])), id=str(uuid4()))
        self.token = context_var.set(SimpleNamespace(session=self.session))

    async def asyncTearDown(self):
        context_var.reset(self.token)
        await self.layer.engine.dispose()
        if not re.fullmatch(r"security_test_[0-9a-f]{32}", self.schema):
            raise RuntimeError("Schema de teste inválido.")
        await self.admin.execute(f'DROP SCHEMA "{self.schema}" CASCADE')
        await self.admin.close()

    async def test_feedback_owner_update_delete_and_foreign_denial(self):
        feedback = Feedback(forId=str(self.steps[0]), value=1, comment="Bom")
        identifier = await self.layer.secure_feedback(str(self.users[0]), feedback=feedback)
        feedback.id, feedback.value = identifier, 0
        await self.layer.secure_feedback(str(self.users[0]), feedback=feedback)
        with self.assertRaises(HTTPException):
            await self.layer.secure_feedback(str(self.users[1]), feedback=feedback)
        with self.assertRaises(HTTPException):
            await self.layer.secure_feedback(str(self.users[1]), delete_id=identifier)
        await self.layer.secure_feedback(str(self.users[0]), delete_id=identifier)
        self.assertEqual(await self.admin.fetchval("SELECT count(*) FROM feedbacks"), 0)

    async def test_message_collision_cannot_transfer_foreign_step(self):
        malicious = {"id": str(self.steps[1]), "threadId": str(self.threads[0]), "name": "Estudante",
                     "type": "user_message", "output": "Sobrescrever"}
        with self.assertRaises(ValueError):
            await self.layer.create_step(malicious)
        row = await self.admin.fetchrow('SELECT "threadId",output FROM steps WHERE id=$1', self.steps[1])
        self.assertEqual(row["threadId"], self.threads[1])
        self.assertIsNone(row["output"])

    async def test_step_edit_and_cross_thread_parent(self):
        step = {"id": str(self.steps[0]), "threadId": str(self.threads[0]), "name": "Estudante", "type": "user_message", "output": "Editada"}
        await self.layer.create_step(step)
        self.assertEqual(await self.admin.fetchval("SELECT output FROM steps WHERE id=$1", self.steps[0]), "Editada")
        with self.assertRaises(ValueError):
            await self.layer.create_step({**step, "parentId": str(self.steps[1])})

    async def test_database_invariants_block_thread_takeover_and_step_transfer(self):
        with self.assertRaises(asyncpg.InsufficientPrivilegeError):
            await self.admin.execute('UPDATE threads SET "userId"=$1 WHERE id=$2', self.users[1], self.threads[0])
        with self.assertRaises(asyncpg.InsufficientPrivilegeError):
            await self.admin.execute('UPDATE steps SET "threadId"=$1 WHERE id=$2', self.threads[1], self.steps[0])

    async def test_shared_usage_releases_on_failure_and_blocks_parallel_sessions(self):
        with patch("chainlit.data.get_data_layer", return_value=self.layer):
            with self.assertRaisesRegex(ValueError, "simulado"):
                async with usage("chat"):
                    with self.assertRaises(UsageLimit):
                        async with usage("chat"):
                            pass
                    raise ValueError("simulado")
            for _ in range(9):
                async with usage("chat"):
                    pass
            with self.assertRaises(UsageLimit):
                async with usage("chat"):
                    pass
        self.assertEqual(await self.admin.fetchval("SELECT count(*) FROM study_usage WHERE NOT released"), 0)

    async def test_delete_element_does_not_delete_foreign_object(self):
        identifier = uuid4()
        await self.admin.execute('INSERT INTO elements (id,"threadId",name) VALUES ($1,$2,$3)', identifier, self.threads[1], "EscadaDicas")
        await self.layer.delete_element(str(identifier), str(self.threads[1]))
        self.assertEqual(await self.admin.fetchval("SELECT count(*) FROM elements WHERE id=$1", identifier), 1)

    async def test_backup_restores_accounts_history_and_rejects_nonempty_target(self):
        from src.services.backups import export_database, restore_database
        restored = "security_test_" + uuid4().hex
        with tempfile.TemporaryDirectory() as directory:
            backup = Path(directory) / "snapshot"
            await export_database(self.admin, backup)
            await self.admin.execute(f'CREATE SCHEMA "{restored}"')
            try:
                await self.admin.execute(f'SET search_path TO "{restored}"')
                await restore_database(self.admin, backup)
                self.assertEqual(await self.admin.fetchval("SELECT count(*) FROM users"), 2)
                self.assertEqual(await self.admin.fetchval("SELECT count(*) FROM steps"), 2)
                with self.assertRaises(ValueError):
                    await restore_database(self.admin, backup)
            finally:
                await self.admin.execute(f'SET search_path TO "{self.schema}"')
                await self.admin.execute(f'DROP SCHEMA "{restored}" CASCADE')

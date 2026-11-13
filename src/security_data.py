"""Persistência de passos com identidade imutável e autorização de feedback."""
import json
from uuid import UUID, uuid4

from chainlit.data.sql_alchemy import SQLAlchemyDataLayer
from chainlit.data.utils import queue_until_user_message
from chainlit.utils import utc_now
from fastapi import HTTPException
from sqlalchemy import text


class StudyDataLayer(SQLAlchemyDataLayer):
    async def get_current_timestamp(self):
        return utc_now()

    @queue_until_user_message()
    async def create_step(self, step_dict):
        from chainlit.context import context
        if step_dict.get("threadId") != context.session.thread_id:
            raise ValueError("Mensagem indisponível.")
        await self.update_thread(step_dict["threadId"])
        # Colunas controladas pelo servidor; metadados continuam aceitando a Escada.
        columns = {"id", "name", "type", "threadId", "parentId", "streaming", "waitForAnswer",
                   "isError", "metadata", "tags", "input", "output", "createdAt", "start", "end",
                   "generation", "showInput", "language", "defaultOpen", "autoCollapse"}
        values = {k: v for k, v in step_dict.items() if k in columns and v is not None}
        for key in ("metadata", "generation"):
            values[key] = json.dumps(step_dict.get(key) or {})
        if "showInput" in values:
            values["showInput"] = str(values["showInput"]).lower()
        async with self.engine.begin() as conn:
            # O pai não pode apontar para dados de outra conversa.
            parent = values.get("parentId")
            if parent:
                other = (await conn.execute(text('SELECT "threadId" FROM steps WHERE id=:id'),
                                            {"id": UUID(parent)})).scalar_one_or_none()
                if other and str(other) != values["threadId"]:
                    raise ValueError("Mensagem indisponível.")
            names = ", ".join(f'"{k}"' for k in values)
            binds = ", ".join(f":{k}" for k in values)
            updates = ", ".join(f'"{k}"=EXCLUDED."{k}"' for k in values if k not in ("id", "threadId"))
            result = await conn.execute(text(f'''INSERT INTO steps ({names}) VALUES ({binds})
                ON CONFLICT (id) DO UPDATE SET {updates}
                WHERE steps."threadId"=EXCLUDED."threadId" RETURNING id'''), values)
            if result.scalar_one_or_none() is None:
                raise ValueError("Mensagem indisponível.")

    async def secure_feedback(self, user_id, feedback=None, delete_id=None):
        owner = UUID(user_id)
        async with self.engine.begin() as conn:
            # Serializa gravações de feedback da conta e impede retargeting de IDs.
            await conn.execute(text("SELECT id FROM users WHERE id=:owner FOR UPDATE"), {"owner": owner})
            existing_id = delete_id or (feedback.id if feedback else None)
            if existing_id:
                existing = (await conn.execute(text('''
                    SELECT f."forId", f."threadId" FROM feedbacks f
                    JOIN steps s ON s.id=f."forId" JOIN threads t ON t.id=s."threadId"
                    WHERE f.id=:id AND t."userId"=:owner FOR UPDATE OF f
                '''), {"id": UUID(existing_id), "owner": owner})).first()
                if not existing:
                    raise HTTPException(404, "Avaliação indisponível.")
                if delete_id:
                    await conn.execute(text("DELETE FROM feedbacks WHERE id=:id"), {"id": UUID(existing_id)})
                    return existing_id
                if str(existing.forId) != feedback.forId:
                    raise HTTPException(404, "Avaliação indisponível.")
            thread = (await conn.execute(text('''
                SELECT s."threadId" FROM steps s JOIN threads t ON t.id=s."threadId"
                WHERE s.id=:step AND t."userId"=:owner
            '''), {"step": UUID(feedback.forId), "owner": owner})).scalar_one_or_none()
            if not thread:
                raise HTTPException(404, "Mensagem indisponível.")
            identifier = UUID(existing_id) if existing_id else uuid4()
            await conn.execute(text('''
                INSERT INTO feedbacks (id, "forId", "threadId", value, comment)
                VALUES (:id, :step, :thread, :value, :comment)
                ON CONFLICT (id) DO UPDATE SET value=EXCLUDED.value, comment=EXCLUDED.comment
                WHERE feedbacks."forId"=EXCLUDED."forId" AND feedbacks."threadId"=EXCLUDED."threadId"
            '''), {"id": identifier, "step": UUID(feedback.forId), "thread": thread,
                   "value": feedback.value, "comment": feedback.comment})
            return str(identifier)

    @queue_until_user_message()
    async def delete_element(self, element_id, thread_id=None):
        from chainlit.context import context
        session = context.session
        owner = getattr(session.user, "id", None)
        if not owner:
            return
        async with self.engine.begin() as conn:
            await conn.execute(text('''DELETE FROM elements e USING threads t
                WHERE e.id=:id AND e."threadId"=t.id AND t."userId"=:owner
                AND t.id=:thread'''), {"id": UUID(element_id), "owner": UUID(owner),
                                       "thread": UUID(session.thread_id)})

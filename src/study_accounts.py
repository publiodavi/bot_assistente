"""Conta Google e armazenamento das preferências do estudante."""
import json
import os
from uuid import UUID

import chainlit as cl


def configure_accounts():
    keys = ("OAUTH_GOOGLE_CLIENT_ID", "OAUTH_GOOGLE_CLIENT_SECRET",
            "CHAINLIT_AUTH_SECRET", "DATABASE_URL")
    values = {key: os.getenv(key, "").strip() for key in keys}
    if not any(values[key] for key in keys[:2]):
        # O banco pode estar preparado antes do cliente Google.
        # Evita a camada automática do Chainlit no modo de demonstração.
        cl.data_layer(lambda: None)
        return None
    missing = [key for key in keys if not values[key]]
    if missing:
        raise RuntimeError("Configure as variáveis de conta e histórico: " + ", ".join(missing))

    from chainlit.data.sql_alchemy import SQLAlchemyDataLayer
    from chainlit.utils import utc_now

    class StudyDataLayer(SQLAlchemyDataLayer):
        # No Chainlit 2.12.0, usuários e conversas recebem a hora local com o
        # sufixo "Z". Fora de UTC, o histórico mostrava datas deslocadas.
        async def get_current_timestamp(self):
            return utc_now()

    url = values["DATABASE_URL"]
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if not url.startswith("postgresql+asyncpg://"):
        raise RuntimeError("DATABASE_URL deve apontar para PostgreSQL.")
    layer = StudyDataLayer(conninfo=url)
    cl.data_layer(lambda: layer)
    cl.oauth_callback(google_user)
    return layer


async def google_user(provider_id, token, raw_user_data, default_app_user, id_token=None):
    google_id = raw_user_data.get("id")
    if (provider_id != "google" or not isinstance(google_id, str)
            or not google_id.isascii() or not google_id.isdecimal()):
        return None
    name = str(raw_user_data.get("name") or "Estudante")[:60]
    return cl.User(
        identifier=f"google:{google_id}",
        display_name=name,
        metadata={"provider": "google", "display_name": name},
    )


async def profile_data(layer, user, transform=None):
    """Merge com bloqueio de linha para preservar edições de outras abas."""
    from sqlalchemy import text

    user_id = UUID(user.id)
    async with layer.engine.begin() as connection:
        if transform:
            await connection.execute(text(
                "INSERT INTO study_profiles (user_id) VALUES (:id) ON CONFLICT DO NOTHING"
            ), {"id": user_id})
        query = "SELECT data FROM study_profiles WHERE user_id = :id"
        if transform:
            query += " FOR UPDATE"
        row = (await connection.execute(text(query), {"id": user_id})).scalar_one_or_none()
        data = json.loads(row) if isinstance(row, str) else (row or {})
        if transform:
            data = transform(data)
            await connection.execute(text(
                "UPDATE study_profiles SET data = CAST(:data AS jsonb) WHERE user_id = :id"
            ), {"data": json.dumps(data), "id": user_id})
        return data


async def advance_trail(layer, user, thread_id, stage):
    from sqlalchemy import text

    async with layer.engine.begin() as connection:
        result = await connection.execute(text("""
            INSERT INTO study_trail_progress (thread_id, stage)
            SELECT id, :next FROM threads
            WHERE id = :id AND "userId" = :owner AND (
                CAST(:stage AS int) = 0 OR EXISTS (
                    SELECT 1 FROM study_trail_progress WHERE thread_id = :id
                )
            )
            ON CONFLICT (thread_id) DO UPDATE SET stage = EXCLUDED.stage
            WHERE study_trail_progress.stage = :stage
        """), {"id": UUID(thread_id), "owner": UUID(user.id), "stage": stage, "next": stage + 1})
        return result.rowcount == 1


async def record_reveal(layer, user, thread_id, step_id, level):
    """Registra a camada aberta somente na sequência e em conversa do próprio usuário."""
    from sqlalchemy import text

    async with layer.engine.begin() as connection:
        result = await connection.execute(text("""
            UPDATE steps SET metadata = jsonb_set(metadata, '{study_step,reveladas}', to_jsonb(CAST(:level AS int)))
            WHERE id = :step AND "threadId" = :thread
              AND "threadId" IN (SELECT id FROM threads WHERE "userId" = :owner)
              AND metadata ? 'study_step'
              AND COALESCE((metadata->'study_step'->>'reveladas')::int, 0) = CAST(:level AS int) - 1
        """), {"step": UUID(step_id), "thread": UUID(thread_id), "owner": UUID(user.id), "level": level})
        return result.rowcount == 1


async def recent_notebooks(layer, user, limit=3):
    """Últimas conversas da conta, com o maior degrau alcançado em cada uma."""
    from sqlalchemy import text

    async with layer.engine.connect() as connection:
        rows = await connection.execute(text("""
            SELECT t.id, t.name, MAX(s."createdAt") AS updated,
                   MAX(CASE WHEN s.metadata->'study_step'->>'degrau' ~ '^[0-9]{1,3}$'
                            THEN (s.metadata->'study_step'->>'degrau')::int END) AS degrau
            FROM threads t LEFT JOIN steps s ON s."threadId" = t.id
            WHERE t."userId" = :owner AND t.name IS NOT NULL
            GROUP BY t.id, t.name
            ORDER BY updated DESC NULLS LAST
            LIMIT :limit
        """), {"owner": UUID(user.id), "limit": limit})
        return [
            {"id": str(row.id), "name": str(row.name)[:80], "degrau": row.degrau}
            for row in rows
        ]


async def trail_progress(layer, user, thread_id):
    from sqlalchemy import text

    async with layer.engine.connect() as connection:
        result = await connection.execute(text("""
            SELECT p.stage FROM study_trail_progress p JOIN threads t ON p.thread_id = t.id
            WHERE t.id = :id AND t."userId" = :owner
        """), {"id": UUID(thread_id), "owner": UUID(user.id)})
        return result.scalar_one_or_none()

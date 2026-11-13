"""Conta Google e armazenamento das preferências do estudante."""
import json
import os
import logging
from uuid import UUID

import chainlit as cl


def configure_accounts():
    from src.security import validate_production
    validate_production()
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

    from src.security_data import StudyDataLayer

    url = values["DATABASE_URL"]
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if not url.startswith("postgresql+asyncpg://"):
        raise RuntimeError("DATABASE_URL deve apontar para PostgreSQL.")
    layer = StudyDataLayer(conninfo=url)
    cl.data_layer(lambda: layer)
    cl.oauth_callback(google_user)
    return layer


def allowed_email(email, allowed=None):
    """Lista opcional de e-mails autorizados (STUDY_ALLOWED_EMAILS, separados por vírgula).

    Vazia, qualquer conta Google entra; preenchida, só os e-mails listados, o que evita
    que um site público consuma os créditos da API por pessoas não convidadas."""
    if allowed is None and os.getenv("STUDY_ACCESS_MODE", "invited") == "public":
        return True
    raw = os.getenv("STUDY_ALLOWED_EMAILS", "") if allowed is None else allowed
    emails = {item.strip().casefold() for item in raw.split(",") if item.strip()}
    return not emails or (isinstance(email, str) and email.strip().casefold() in emails)


async def google_user(provider_id, token, raw_user_data, default_app_user, id_token=None):
    from src.security import login_rejection
    google_id = raw_user_data.get("id")
    if (provider_id != "google" or not isinstance(google_id, str)
            or not google_id.isascii() or not google_id.isdecimal()):
        return None
    if not isinstance(raw_user_data.get("email"), str) or raw_user_data.get("verified_email") is not True:
        login_rejection.set("email_not_verified")
        logging.getLogger(__name__).warning("Login Google recusado: email_not_verified")
        return None
    if not allowed_email(raw_user_data.get("email")):
        login_rejection.set("account_not_invited")
        logging.getLogger(__name__).warning("Login Google recusado: account_not_invited")
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


async def owned_thread_ids(layer, user, ids):
    """Filtra referências de ferramentas sem expor conversas de outras contas."""
    from sqlalchemy import text
    requested = [UUID(str(identifier)) for identifier in ids]
    if not requested:
        return set()
    async with layer.engine.connect() as connection:
        result = await connection.execute(text(
            'SELECT id FROM threads WHERE "userId" = :owner AND id = ANY(CAST(:ids AS uuid[]))'
        ), {"owner": UUID(user.id), "ids": requested})
        return {str(row.id) for row in result}


async def study_statistics(layer, user):
    """Agrega avaliações de respostas existentes; não mede aprendizagem comprovada."""
    from sqlalchemy import text
    async with layer.engine.connect() as connection:
        rows = await connection.execute(text('''
            SELECT t.id,
                MAX(CASE WHEN s.metadata->'study_step'->>'degrau' ~ '^([1-9]|[1-4][0-9]|50)$'
                    THEN (s.metadata->'study_step'->>'degrau')::int END) AS degraus,
                COUNT(DISTINCT (s.metadata->'study_step'->>'degrau')) FILTER (
                    WHERE s.metadata->'study_step'->>'tipo' = 'conquista'
                      AND s.metadata->'study_step'->>'subiu_sozinho' = 'true'
                      AND s.metadata->'study_step'->>'degrau' ~ '^([1-9]|[1-4][0-9]|50)$') AS sozinho,
                COUNT(s.id) FILTER (WHERE s.metadata->'study_step'->>'tipo' = 'ensino') AS ensino
            FROM threads t LEFT JOIN steps s ON s."threadId" = t.id
                AND s.type = 'assistant_message' AND s.streaming IS NOT TRUE AND s."isError" IS NOT TRUE
            WHERE t."userId" = :owner AND t.name IS NOT NULL
            GROUP BY t.id
        '''), {"owner": UUID(user.id)})
        records = list(rows)
        return {"cadernos": len(records), "degraus": sum(row.degraus or 0 for row in records),
                "sozinho": sum(row.sozinho for row in records), "ensino": sum(row.ensino for row in records)}


async def deck_data(layer, user, thread_id, transform=None):
    """Baralho de um caderno do próprio usuário; o transform grava com bloqueio de linha."""
    from sqlalchemy import text

    owner, thread = UUID(user.id), UUID(thread_id)
    async with layer.engine.begin() as connection:
        owned = (await connection.execute(text(
            'SELECT 1 FROM threads WHERE id = :thread AND "userId" = :owner'
        ), {"thread": thread, "owner": owner})).scalar_one_or_none()
        if not owned:
            raise ValueError("Conversa indisponível.")
        row = (await connection.execute(text(
            "SELECT data FROM study_card_decks WHERE thread_id = :thread AND user_id = :owner"
            + (" FOR UPDATE" if transform else "")
        ), {"thread": thread, "owner": owner})).scalar_one_or_none()
        data = json.loads(row) if isinstance(row, str) else (row or {})
        if transform:
            data = transform(data)
            await connection.execute(text("""
                INSERT INTO study_card_decks (thread_id, user_id, data, updated_at)
                VALUES (:thread, :owner, CAST(:data AS jsonb), now())
                ON CONFLICT (thread_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
                WHERE study_card_decks.user_id = :owner
            """), {"thread": thread, "owner": owner, "data": json.dumps(data)})
        return data


async def all_decks(layer, user):
    """Baralhos da conta, do mais recente ao mais antigo, como pares (thread_id, dados)."""
    from sqlalchemy import text

    async with layer.engine.connect() as connection:
        rows = await connection.execute(text("""
            SELECT d.thread_id, d.data FROM study_card_decks d JOIN threads t ON t.id = d.thread_id
            WHERE d.user_id = :owner AND t."userId" = :owner
            ORDER BY d.updated_at DESC LIMIT 50
        """), {"owner": UUID(user.id)})
        return [(str(row.thread_id), json.loads(row.data) if isinstance(row.data, str) else (row.data or {}))
                for row in rows]


MAX_MATERIALS = 20


async def list_materials(layer, user_id):
    from sqlalchemy import text

    async with layer.engine.connect() as connection:
        rows = await connection.execute(text("""
            SELECT id, name, pages, chunks, status, error, created_at FROM study_materials
            WHERE user_id = :owner ORDER BY created_at DESC
        """), {"owner": UUID(user_id)})
        return [{"id": str(row.id), "name": row.name, "pages": row.pages, "chunks": row.chunks,
                 "status": row.status, "error": row.error, "created_at": row.created_at.isoformat()} for row in rows]


async def create_material(layer, user_id, material_id, name):
    """Reserva o material como "processando"; recusa acima do limite por conta."""
    from sqlalchemy import text

    async with layer.engine.begin() as connection:
        # Bloqueia a linha da conta para que dois envios simultâneos não passem do limite.
        await connection.execute(text("SELECT id FROM users WHERE id = :owner FOR UPDATE"), {"owner": UUID(user_id)})
        count = (await connection.execute(text(
            "SELECT count(*) FROM study_materials WHERE user_id = :owner"), {"owner": UUID(user_id)})).scalar_one()
        if count >= MAX_MATERIALS:
            raise ValueError(f"Você já tem {MAX_MATERIALS} materiais. Remova um para enviar outro.")
        pending = (await connection.execute(text(
            "SELECT count(*) FROM study_materials WHERE user_id=:owner AND status='processing'"
        ), {"owner": UUID(user_id)})).scalar_one()
        if pending >= 3:
            raise ValueError("Aguarde seus materiais terminarem de processar antes de enviar outro.")
        await connection.execute(text(
            "INSERT INTO study_materials (id, user_id, name) VALUES (:id, :owner, :name)"
        ), {"id": UUID(material_id), "owner": UUID(user_id), "name": name})


async def finish_material(layer, user_id, material_id, status, pages=0, chunks=0, error=None):
    from sqlalchemy import text

    async with layer.engine.begin() as connection:
        result = await connection.execute(text("""
            UPDATE study_materials SET status = :status, pages = :pages, chunks = :chunks, error = :error
            WHERE id = :id AND user_id = :owner
        """), {"id": UUID(material_id), "owner": UUID(user_id), "status": status,
               "pages": pages, "chunks": chunks, "error": error})
        return result.rowcount == 1


async def delete_material(layer, user_id, material_id):
    from sqlalchemy import text

    async with layer.engine.begin() as connection:
        result = await connection.execute(text(
            "DELETE FROM study_materials WHERE id = :id AND user_id = :owner"
        ), {"id": UUID(material_id), "owner": UUID(user_id)})
        return result.rowcount == 1


async def ready_material_count(layer, user_id):
    from sqlalchemy import text

    async with layer.engine.connect() as connection:
        return (await connection.execute(text(
            "SELECT count(*) FROM study_materials WHERE user_id = :owner AND status = 'ready'"
        ), {"owner": UUID(user_id)})).scalar_one()

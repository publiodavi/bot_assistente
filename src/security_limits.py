"""Concessões de uso por conta, atômicas no PostgreSQL e liberadas em finally."""
import time
from collections import deque
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

RULES = {"chat": (10, 60), "cards": (5, 600), "upload": (20, 60)}
_local = {}


class UsageLimit(ValueError):
    pass


def session_account():
    from chainlit.context import context
    try:
        session = context.session
        return getattr(session.user, "id", None), session.id
    except Exception:
        return None, "local"


@asynccontextmanager
async def usage(operation, account_id=None):
    from chainlit.data import get_data_layer
    from sqlalchemy import text

    maximum, seconds = RULES[operation]
    account, local_key = session_account()
    account = account_id or account
    layer = get_data_layer() if account else None
    identifier = uuid4()
    if layer:
        owner = UUID(account)
        async with layer.engine.begin() as conn:
            await conn.execute(text("SELECT id FROM users WHERE id=:owner FOR UPDATE"), {"owner": owner})
            await conn.execute(text("DELETE FROM study_usage WHERE user_id=:owner AND created_at < now() - interval '1 day'"), {"owner": owner})
            row = (await conn.execute(text("""
                SELECT count(*) FILTER (WHERE created_at > now() - make_interval(secs => :seconds)) AS recent,
                       count(*) FILTER (WHERE NOT released AND expires_at > now()) AS active
                FROM study_usage WHERE user_id=:owner AND operation=:operation
            """), {"owner": owner, "operation": operation, "seconds": seconds})).one()
            if row.active or row.recent >= maximum:
                raise UsageLimit("Espere a tarefa atual terminar ou aguarde alguns instantes antes de tentar novamente.")
            await conn.execute(text("""
                INSERT INTO study_usage (id, user_id, operation, expires_at)
                VALUES (:id, :owner, :operation, now() + interval '130 seconds')
            """), {"id": identifier, "owner": owner, "operation": operation})
    else:
        key = (local_key, operation)
        now = time.monotonic()
        entries, active = _local.get(key, (deque(), False))
        while entries and entries[0] <= now - seconds:
            entries.popleft()
        if active or len(entries) >= maximum:
            raise UsageLimit("Espere a tarefa atual terminar ou aguarde alguns instantes antes de tentar novamente.")
        entries.append(now)
        _local[key] = (entries, True)
    try:
        yield
    finally:
        if layer:
            async with layer.engine.begin() as conn:
                await conn.execute(text("UPDATE study_usage SET released=true WHERE id=:id AND user_id=:owner"),
                                   {"id": identifier, "owner": owner})
        else:
            _local[key] = (entries, False)
            # Sessões locais não mantêm entradas indefinidamente.
            stale = [k for k, (items, busy) in _local.items() if not busy and items and items[-1] < time.monotonic() - 600]
            for item in stale:
                _local.pop(item, None)

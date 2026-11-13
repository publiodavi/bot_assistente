"""Concessões de uso por conta, atômicas no PostgreSQL e liberadas em finally."""
import time
from collections import deque
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

import os

RULES = {"chat": (10, 60), "cards": (5, 600), "upload": (20, 60)}
# Cotas de 24 h: por conta e somando todas as contas (teto de gasto do site público).
DAILY = {"chat": 150, "cards": 30, "upload": 40}
GLOBAL_DAILY = {"chat": 3000, "cards": 400, "upload": 600}
_local = {}
BUSY = "Espere a tarefa atual terminar ou aguarde alguns instantes antes de tentar novamente."


class UsageLimit(ValueError):
    """Limite de uso atingido; a mensagem é mostrada ao estudante."""
    pass


def global_daily(operation):
    """Teto global configurável por STUDY_GLOBAL_DAILY_<OPERAÇÃO>; inválido mantém o padrão."""
    try:
        value = int(os.getenv(f"STUDY_GLOBAL_DAILY_{operation.upper()}", GLOBAL_DAILY[operation]))
        return value if value > 0 else GLOBAL_DAILY[operation]
    except ValueError:
        return GLOBAL_DAILY[operation]


def limit_message(operation, active, recent, daily, everyone):
    """Motivo da recusa, do mais imediato ao mais amplo; None quando a operação pode seguir."""
    maximum = RULES[operation][0]
    if active or recent >= maximum:
        return BUSY
    if daily >= DAILY[operation]:
        return "Você chegou ao limite de uso de hoje para esta função. Volte amanhã para continuar."
    if everyone >= global_daily(operation):
        return "O AjudAI atingiu o limite de uso de hoje. Tente novamente amanhã."
    return None


def session_account():
    """Identificador da conta da sessão atual, ou None no modo de demonstração."""
    from chainlit.context import context
    try:
        session = context.session
        return getattr(session.user, "id", None), session.id
    except Exception:
        return None, "local"


@asynccontextmanager
async def usage(operation, account_id=None):
    """Reserva uma operação (chat, cartões ou envio) dentro dos limites por minuto, diários
    e globais, e libera a reserva ao final, mesmo em caso de erro."""
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
                       count(*) FILTER (WHERE NOT released AND expires_at > now()) AS active,
                       count(*) FILTER (WHERE created_at > now() - interval '1 day') AS daily
                FROM study_usage WHERE user_id=:owner AND operation=:operation
            """), {"owner": owner, "operation": operation, "seconds": seconds})).one()
            everyone = (await conn.execute(text("""
                SELECT count(*) FROM study_usage
                WHERE operation=:operation AND created_at > now() - interval '1 day'
            """), {"operation": operation})).scalar_one()
            reason = limit_message(operation, row.active, row.recent, row.daily, everyone)
            if reason:
                raise UsageLimit(reason)
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
            raise UsageLimit(BUSY)
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

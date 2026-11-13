"""Aplica as migrações SQL em ordem a cada início do app.

Todas podem ser executadas de novo sem apagar dados: criam tabelas e índices com
IF NOT EXISTS, a 002 corrige referências órfãs com UPDATE e a 004 recria funções e
gatilhos com CREATE OR REPLACE.
"""
import asyncio
import os
import sys
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


async def main():
    """Aplica as migrações em ordem; sem DATABASE_URL, não faz nada."""
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        print("DATABASE_URL ausente; migrações ignoradas.")
        return
    url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    connection = await asyncpg.connect(url)
    try:
        for path in sorted((ROOT / "migrations").glob("*.sql")):
            await connection.execute(path.read_text(encoding="utf-8"))
            print(f"Migração aplicada: {path.name}")
    finally:
        await connection.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"Falha ao aplicar migrações: {exc}", file=sys.stderr)
        raise

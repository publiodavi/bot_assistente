"""Aplica as migrações SQL em ordem. Todas são aditivas (IF NOT EXISTS) e podem rodar a cada deploy."""
import asyncio
import os
import sys
from pathlib import Path

import asyncpg

ROOT = Path(__file__).resolve().parents[1]


async def main():
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

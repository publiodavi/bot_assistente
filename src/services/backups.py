"""Cópia consistente das tabelas do app; restauração somente em schema vazio.

O formato COPY binário destina-se à mesma versão principal do PostgreSQL.
Não substitui cópia externa nem inclui roles, extensões ou outros bancos.
"""
import asyncio
import hashlib
import json
import os
from pathlib import Path
import shutil

import asyncpg

TABLES = {"users", "threads", "steps", "elements", "feedbacks", "study_profiles",
          "study_trail_progress", "study_card_decks", "study_materials", "study_usage"}


def quoted(value):
    """Nome de tabela entre aspas duplas, para uso seguro no SQL."""
    return '"' + value.replace('"', '""') + '"'


def digest(path):
    """Hash SHA-256 de um arquivo da cópia, usado para conferir a integridade."""
    with Path(path).open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


async def export_database(connection, destination):
    """Exporta as tabelas conhecidas do app em COPY binário, com manifesto e hashes."""
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False, mode=0o700)
    manifest = {"format": 1, "tables": []}
    async with connection.transaction(isolation="repeatable_read", readonly=True):
        schema = await connection.fetchval("SELECT current_schema()")
        manifest["postgres_major"] = int(await connection.fetchval("SHOW server_version_num")) // 10000
        records = await connection.fetch("SELECT tablename FROM pg_tables WHERE schemaname=$1", schema)
        for name in sorted(record["tablename"] for record in records if record["tablename"] in TABLES):
            columns = await connection.fetch('''
                SELECT a.attname AS name, format_type(a.atttypid,a.atttypmod) AS type,
                       a.attnotnull AS required, pg_get_expr(d.adbin,d.adrelid) AS default_value
                FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
                JOIN pg_namespace n ON n.oid=c.relnamespace
                LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
                WHERE n.nspname=$1 AND c.relname=$2 AND a.attnum>0 AND NOT a.attisdropped
                ORDER BY a.attnum''', schema, name)
            constraints = await connection.fetch('''
                SELECT conname AS name, pg_get_constraintdef(con.oid) AS definition
                FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
                JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2
            ''', schema, name)
            indexes = await connection.fetch('''
                SELECT pg_get_indexdef(i.indexrelid) AS definition FROM pg_index i
                JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace
                LEFT JOIN pg_constraint con ON con.conindid=i.indexrelid
                WHERE n.nspname=$1 AND c.relname=$2 AND con.oid IS NULL
            ''', schema, name)
            path = destination / (name + ".copy")
            await connection.copy_from_table(name, schema_name=schema, output=str(path), format="binary")
            def unqualify(value):
                return value.replace(quoted(schema) + ".", "").replace(schema + ".", "")
            manifest["tables"].append({"name": name, "columns": [dict(c) for c in columns],
                "constraints": [{"name": c["name"], "definition": unqualify(c["definition"])} for c in constraints],
                "indexes": [unqualify(i["definition"]) for i in indexes],
                "sha256": digest(path)})
    (destination / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


async def restore_database(connection, source):
    """Usar apenas cópia confiável; nenhum objeto existente é removido."""
    source = Path(source)
    manifest = json.loads((source / "manifest.json").read_text(encoding="utf-8"))
    major = int(await connection.fetchval("SHOW server_version_num")) // 10000
    if manifest.get("format") != 1 or manifest.get("postgres_major") != major:
        raise ValueError("Formato ou versão principal do PostgreSQL incompatível.")
    if await connection.fetchval("SELECT count(*) FROM pg_tables WHERE schemaname=current_schema()"):
        raise ValueError("A restauração exige um schema vazio.")
    async with connection.transaction():
        for table in manifest["tables"]:
            if table["name"] not in TABLES:
                raise ValueError("Tabela desconhecida na cópia.")
            data = source / (table["name"] + ".copy")
            if digest(data) != table["sha256"]:
                raise ValueError("Cópia corrompida.")
            columns = []
            for column in table["columns"]:
                definition = quoted(column["name"]) + " " + column["type"]
                if column["required"]:
                    definition += " NOT NULL"
                if column["default_value"] is not None:
                    definition += " DEFAULT " + column["default_value"]
                columns.append(definition)
            await connection.execute("CREATE TABLE " + quoted(table["name"]) + " (" + ", ".join(columns) + ")")
            await connection.copy_to_table(table["name"], source=str(data), format="binary")
        # Chaves antes de referências: constraints de uma tabela podem depender de outra.
        for foreign in (False, True):
            for table in manifest["tables"]:
                for constraint in table["constraints"]:
                    if constraint["definition"].startswith("FOREIGN KEY") == foreign:
                        await connection.execute("ALTER TABLE " + quoted(table["name"]) + " ADD CONSTRAINT " +
                                                 quoted(constraint["name"]) + " " + constraint["definition"])
        for table in manifest["tables"]:
            for index in table["indexes"]:
                await connection.execute(index)


async def preflight():
    """Em produção, cria a cópia de recuperação antes da primeira aplicação da migração 004."""
    if os.getenv("STUDY_ENV") != "production":
        return
    from src.security import validate_production
    validate_production()
    os.umask(0o077)
    connection = await asyncpg.connect(os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://", 1))
    try:
        if await connection.fetchval("SELECT to_regclass('study_usage')"):
            return
        root = Path("/data/backups/security-before-004")
        if (root / "complete").exists():
            return
        if root.exists():
            # Não sobrescreve uma tentativa incompleta ou uma cópia anterior.
            raise RuntimeError("Cópia de recuperação incompleta; verifique /data/backups antes de continuar.")
        root.mkdir(parents=True, mode=0o700)
        await export_database(connection, root / "database")
        chroma = Path(os.getenv("STUDY_CHROMA_DIR", "/data/chroma"))
        if chroma.exists():
            await asyncio.to_thread(shutil.copytree, chroma, root / "chroma")
        (root / "complete").write_text("Cópia anterior à migração 004. Não expor pela web.\n", encoding="utf-8")
        print("Cópia de recuperação anterior à migração 004 concluída no volume privado.")
    finally:
        await connection.close()


if __name__ == "__main__":
    try:
        asyncio.run(preflight())
    except Exception:
        print("Falha na cópia de recuperação; migrações não iniciadas.")
        raise SystemExit(1) from None

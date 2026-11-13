"""Extração com prazo real: cancelar uma thread não interromperia o parser."""
import asyncio
import json
import os
from pathlib import Path
import sys
import tempfile


async def extract_isolated(path):
    with tempfile.TemporaryDirectory(prefix="ajudai-extract-") as directory:
        output = Path(directory) / "result.json"
        env = {k: v for k, v in os.environ.items() if k.upper() in
               ("PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "LANG", "LC_ALL")}
        process = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "src.rag.pdf_worker", str(path), str(output),
            cwd=str(Path(__file__).resolve().parents[2]), env=env,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
        )
        try:
            await asyncio.wait_for(process.wait(), timeout=60)
            if process.returncode or not output.exists() or output.stat().st_size > 16 * 1024 * 1024:
                raise ValueError("O PDF excedeu os limites de processamento ou não pôde ser lido.")
            data = json.loads(output.read_text(encoding="utf-8"))
            if "error" in data:
                raise ValueError(data["error"])
            return data["pages"], data["chunks"]
        except TimeoutError as exc:
            raise ValueError("O PDF demorou mais de 60 segundos para ser lido.") from exc
        finally:
            if process.returncode is None:
                process.kill()
                await process.wait()

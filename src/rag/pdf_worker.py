"""Processo descartável de extração; nunca recebe chaves da API."""
import json
import sys
from pathlib import Path


def main():
    """Extrai o texto do PDF em processo separado. Fora do Windows, limita CPU, memória
    e tamanho de arquivo (o módulo resource não existe no Windows)."""
    if sys.platform != "win32":
        import resource
        resource.setrlimit(resource.RLIMIT_CPU, (60, 60))
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_FSIZE, (16 * 1024 * 1024, 16 * 1024 * 1024))
    from src.rag.indexer import extract_pages, chunk_pages
    try:
        pages = extract_pages(sys.argv[1])
        chunks = chunk_pages(pages)
        result = {"pages": len(pages), "chunks": chunks}
    except Exception:
        # Não expõe mensagens do parser, caminhos ou conteúdo do material.
        result = {"error": "PDF inválido, protegido ou acima dos limites de processamento."}
    Path(sys.argv[2]).write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()

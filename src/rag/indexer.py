"""Materiais do estudante em PDF: extração, segmentação e busca semântica local.

Cada estudante envia os próprios materiais (apostilas, livros, listas de exercícios).
O PDF não é guardado: o texto é dividido em trechos com a página de origem e indexado
num ChromaDB local, filtrado pela conta. O modelo de embeddings padrão do ChromaDB foi
treinado sobretudo em inglês; por isso a ordem final combina a distância semântica com a
sobreposição de termos sem acento, e trechos sem relação aparente são descartados.
"""
import os
import re
import threading
import unicodedata

MAX_PAGES = 400
MAX_TEXT_CHARS = 2_000_000
MAX_CHUNKS = 3000
CHUNK_SIZE, CHUNK_OVERLAP = 900, 150
STOPWORDS = set("""a o as os um uma uns umas de da do das dos em na no nas nos e ou que se por para
com como sem sobre entre ao aos à às é ser foi era são há mais menos muito pouco isso isto
esse essa este esta qual quais quando onde porque porquê pra pro me te lhe nos vos eu tu ele
ela eles elas você vocês meu minha seu sua não sim já também só então mas""".split())


def fold(text):
    """Minúsculas sem acentos, para comparar termos em português."""
    normalized = unicodedata.normalize("NFKD", text.casefold())
    return "".join(char for char in normalized if not unicodedata.combining(char))


def terms(text):
    """Palavras significativas de um texto, sem acentos e sem palavras comuns."""
    return {word for word in re.findall(r"[a-z0-9]{3,}", fold(text)) if word not in STOPWORDS}


def extract_pages(path):
    """Texto de cada página; PDFs digitalizados como imagem não têm texto extraível."""
    from pypdf import PdfReader

    reader = PdfReader(path)
    if reader.is_encrypted:
        raise ValueError("O PDF está protegido por senha.")
    if len(reader.pages) > MAX_PAGES:
        raise ValueError(f"O PDF tem mais de {MAX_PAGES} páginas.")
    pages, total = [], 0
    for number, page in enumerate(reader.pages, start=1):
        value = page.extract_text() or ""
        total += len(value)
        if total > MAX_TEXT_CHARS:
            raise ValueError("O texto do PDF excede o limite de 2 milhões de caracteres.")
        pages.append((number, value))
    if sum(len(text.strip()) for _, text in pages) < 200:
        raise ValueError("Não foi possível ler o texto: o PDF parece ser uma imagem digitalizada.")
    return pages


def chunk_pages(pages, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Trechos de até `size` caracteres com sobreposição, sempre dentro da mesma página."""
    chunks = []
    for number, text in pages:
        clean = " ".join(text.split())
        start = 0
        while start < len(clean):
            end = min(len(clean), start + size)
            if end < len(clean):
                # Corta no último espaço para não partir palavras.
                space = clean.rfind(" ", start + size // 2, end)
                end = space if space > start else end
            piece = clean[start:end].strip()
            if len(piece) >= 40:
                chunks.append({"page": number, "text": piece})
                if len(chunks) > MAX_CHUNKS:
                    raise ValueError("O PDF excede o limite de 3.000 trechos.")
            if end >= len(clean):
                break
            # O trecho seguinte recomeça na primeira palavra inteira da sobreposição.
            space = clean.find(" ", max(end - overlap, start + 1), end)
            start = space + 1 if space != -1 else end
    return chunks


def rerank(query, hits, limit=3, max_distance=0.75, strong=0.45):
    """Ordena por distância e termos em comum; descarta o que não parece relacionado."""
    wanted = terms(query)
    scored = []
    for hit in hits:
        overlap = len(wanted & terms(hit["text"])) / len(wanted) if wanted else 0
        if hit["distance"] > max_distance or (overlap == 0 and hit["distance"] > strong):
            continue
        scored.append(((1 - hit["distance"]) + overlap, hit))
    return [hit for _, hit in sorted(scored, key=lambda item: item[0], reverse=True)[:limit]]


class MaterialIndex:
    """Coleção única no ChromaDB local; cada trecho leva a conta, o material e a página."""

    def __init__(self, path=None):
        self.path = path or os.getenv("STUDY_CHROMA_DIR", os.path.join(".local", "chroma"))
        self._collection = None
        self._lock = threading.Lock()

    def collection(self):
        """Coleção do ChromaDB, aberta na primeira utilização."""
        with self._lock:
            if self._collection is None:
                import chromadb
                from chromadb.config import Settings
                from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

                # Telemetria desligada: nada sobre os materiais sai da máquina.
                client = chromadb.PersistentClient(path=self.path, settings=Settings(anonymized_telemetry=False))
                self._collection = client.get_or_create_collection(
                    "materiais", embedding_function=DefaultEmbeddingFunction(), metadata={"hnsw:space": "cosine"})
            return self._collection

    def warm_up(self):
        """Carrega o modelo de embeddings (baixado uma única vez) antes do primeiro envio."""
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

        self.collection()
        DefaultEmbeddingFunction()(["aquecimento"])

    def add(self, user_id, material_id, name, chunks, batch=64):
        """Indexa os trechos de um material, identificados pela conta e pela página."""
        collection = self.collection()
        for start in range(0, len(chunks), batch):
            part = chunks[start:start + batch]
            collection.add(
                ids=[f"{material_id}:{start + offset}" for offset in range(len(part))],
                documents=[chunk["text"] for chunk in part],
                metadatas=[{"user_id": user_id, "material_id": material_id, "name": name, "page": chunk["page"]}
                           for chunk in part],
            )

    def remove(self, user_id, material_id):
        """Remove do índice todos os trechos de um material da conta."""
        self.collection().delete(where={"$and": [{"user_id": user_id}, {"material_id": material_id}]})

    def search(self, user_id, query, limit=3):
        """Busca os trechos da conta mais próximos da pergunta e os reordena por relevância."""
        collection = self.collection()
        result = collection.query(query_texts=[query[:2000]], n_results=12, where={"user_id": user_id},
                                  include=["documents", "metadatas", "distances"])
        hits = [
            {"text": text, "name": meta.get("name", ""), "page": meta.get("page"), "distance": distance}
            for text, meta, distance in zip(result["documents"][0], result["metadatas"][0], result["distances"][0])
        ]
        return rerank(query, hits, limit)

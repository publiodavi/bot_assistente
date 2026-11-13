# Imagem de produção do AjudAI (Railway ou qualquer serviço com Docker).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    # Materiais e cache do modelo de busca ficam no volume montado em /data.
    STUDY_CHROMA_DIR=/data/chroma \
    HOME=/data

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN mkdir -p /data

# O Railway informa a porta em $PORT; localmente, usa 8000.
CMD ["sh", "-c", "python scripts/migrate.py && exec python -m chainlit run src/app.py --headless --host 0.0.0.0 --port ${PORT:-8000}"]

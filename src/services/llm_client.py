"""Comunicação com a API de linguagem."""
import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()


class ConfigurationError(ValueError):
    """Configuração ausente, com mensagem que pode ser exibida ao estudante."""


def create_client():
    key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not key or key == "sua_chave_aqui":
        raise ConfigurationError("Configure DEEPSEEK_API_KEY no arquivo .env antes de iniciar uma conversa.")
    return AsyncOpenAI(api_key=key, base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"))


async def stream_reply(messages):
    client = create_client()
    stream = await client.chat.completions.create(
        model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        messages=messages,
        stream=True,
    )
    async for chunk in stream:
        if chunk.choices:
            content = chunk.choices[0].delta.content
            if content:
                yield content

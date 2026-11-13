"""Comunicação com a API de linguagem."""
import os
import asyncio

from dotenv import load_dotenv
from openai import AsyncOpenAI
from src.security_limits import usage

load_dotenv()


class ConfigurationError(ValueError):
    """Configuração ausente, com mensagem que pode ser exibida ao estudante."""


def create_client():
    key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not key or key == "sua_chave_aqui":
        raise ConfigurationError("Configure DEEPSEEK_API_KEY no arquivo .env antes de iniciar uma conversa.")
    # Uma nova tentativa cobre falhas passageiras (429/5xx); o prazo total continua no chamador.
    return AsyncOpenAI(api_key=key, base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
                       timeout=60, max_retries=1)


# Respostas do chat seguem o limite pedagógico (até ~180 palavras); 2.048 tokens dão folga
# sem permitir gerações que ultrapassem o prazo total.
CHAT_MAX_TOKENS = 2048
STREAM_DEADLINE = 120


async def complete_json(messages):
    """Resposta única em JSON, para tarefas estruturadas como a geração de flash cards."""
    async with usage("cards"), asyncio.timeout(120), create_client() as client:
        response = await client.chat.completions.create(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"), messages=messages,
            response_format={"type": "json_object"}, max_tokens=8192,
        )
        return response.choices[0].message.content or ""


async def stream_reply(messages):
    """Gerador do streaming. O prazo total fica no consumidor: um asyncio.timeout aberto
    dentro de um gerador atravessa os yields e cancelaria a tarefa inteira do chamador."""
    async with usage("chat"), create_client() as client:
        stream = await client.chat.completions.create(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"), messages=messages,
            stream=True, max_tokens=CHAT_MAX_TOKENS,
        )
        async with stream:
            async for chunk in stream:
                if chunk.choices:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content

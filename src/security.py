"""Limites e proteção HTTP, sem dependência de estado do navegador."""
import asyncio
import os
import tempfile
from contextvars import ContextVar
from urllib.parse import urlsplit

from starlette.responses import JSONResponse

MAX_FILE_BYTES = 25 * 1024 * 1024
MAX_BODY_BYTES = 30 * 1024 * 1024
MAX_MESSAGE_CHARS = 20_000
login_rejection = ContextVar("study_login_rejection", default=None)


def production():
    """Indica se o app roda em produção (Railway ou STUDY_ENV=production)."""
    return bool(os.getenv("RAILWAY_ENVIRONMENT_ID") or os.getenv("STUDY_ENV") == "production")


def origins():
    """Origens permitidas para CORS e WebSocket, derivadas de CHAINLIT_URL."""
    url = os.getenv("CHAINLIT_URL", "http://localhost:8103").strip().rstrip("/")
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.netloc or parts.username or parts.path:
        raise RuntimeError("CHAINLIT_URL deve conter somente a origem pública do app.")
    result = {f"{parts.scheme}://{parts.netloc}"}
    if not production():
        result.update({"http://localhost:8103", "http://127.0.0.1:8103"})
    return result


def validate_production():
    """Em produção, interrompe a inicialização se faltar alguma configuração obrigatória."""
    if not production():
        return
    if os.getenv("STUDY_ACCESS_MODE", "public") not in ("public", "invited"):
        raise RuntimeError("STUDY_ACCESS_MODE deve ser public ou invited.")
    required = ("OAUTH_GOOGLE_CLIENT_ID", "OAUTH_GOOGLE_CLIENT_SECRET", "CHAINLIT_AUTH_SECRET",
                "DATABASE_URL", "CHAINLIT_URL", "DEEPSEEK_API_KEY")
    missing = [key for key in required if not os.getenv(key, "").strip()]
    if missing:
        raise RuntimeError("Configuração de produção incompleta: " + ", ".join(missing))
    if len(os.environ["CHAINLIT_AUTH_SECRET"].strip()) < 32:
        raise RuntimeError("CHAINLIT_AUTH_SECRET deve ter pelo menos 32 caracteres.")
    if not os.environ["CHAINLIT_URL"].startswith("https://"):
        raise RuntimeError("A URL de produção deve usar HTTPS.")


class SecurityMiddleware:
    """Limita o corpo antes do parser multipart e mantém cabeçalhos mesmo em erros."""

    def __init__(self, app, allowed_origins, secure=False):
        self.app, self.allowed, self.secure = app, set(allowed_origins), secure

    async def __call__(self, scope, receive, send):
        """Aplica a verificação de origem, os limites de corpo e os cabeçalhos de segurança."""
        if scope["type"] not in ("http", "websocket"):
            return await self.app(scope, receive, send)
        headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        login_rejection.set(None)
        origin = headers.get("origin")
        path = scope.get("path", "")
        if scope["type"] == "websocket":
            if origin not in self.allowed:
                return await send({"type": "websocket.close", "code": 1008})
            return await self.app(scope, receive, send)

        async def protected_send(message):
            if message["type"] == "http.response.start":
                response_headers = list(message.get("headers", []))
                response_headers.extend([
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    (b"content-security-policy-report-only", b"default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"),
                ])
                if self.secure:
                    response_headers.append((b"strict-transport-security", b"max-age=31536000"))
                    response_headers = [(k, v + b"; Secure" if k.lower() == b"set-cookie"
                                         and b"secure" not in v.lower().split(b";")
                                         and b"; secure" not in v.lower() else v)
                                        for k, v in response_headers]
                if path.startswith("/project/file/"):
                    response_headers = [(k, v) for k, v in response_headers if k.lower() != b"content-disposition"]
                    response_headers.append((b"content-disposition", b"attachment"))
                if path.startswith(("/auth/", "/study/", "/project/")):
                    response_headers.append((b"cache-control", b"no-store"))
                message = {**message, "headers": response_headers}
            await send(message)

        async def reject(status, text):
            await JSONResponse({"detail": text}, status_code=status)(scope, receive, protected_send)

        mutable = scope.get("method") in ("POST", "PUT", "PATCH", "DELETE")
        # O callback OAuth é GET. Polling Socket.IO também passa por esta verificação.
        if mutable and (origin and origin not in self.allowed or
                        headers.get("sec-fetch-site") == "cross-site" or
                        "cookie" in headers and not origin and not headers.get("authorization")):
            return await reject(403, "Origem da solicitação não autorizada.")
        if self.secure and mutable and path in ("/study/materials", "/project/file"):
            # Recusa anônimos antes de receber o corpo multipart no volume temporário.
            from chainlit.auth.cookie import get_token_from_cookies
            from chainlit.auth.jwt import decode_jwt
            from starlette.requests import cookie_parser
            token = get_token_from_cookies(cookie_parser(headers.get("cookie", "")))
            if not token and headers.get("authorization", "").lower().startswith("bearer "):
                token = headers["authorization"][7:]
            try:
                decode_jwt(token)
            except Exception:
                return await reject(401, "Entre na sua conta antes de enviar arquivos.")
        if not mutable:
            return await self.app(scope, receive, protected_send)
        limit = MAX_BODY_BYTES if path in ("/study/materials", "/project/file") else 256 * 1024
        try:
            length = int(headers.get("content-length", "0"))
            if length < 0 or length > limit:
                return await reject(413, "A solicitação excede o tamanho permitido.")
        except ValueError:
            return await reject(400, "Tamanho inválido.")
        # O corpo é recebido antes do parser; nunca se confia somente em Content-Length.
        with tempfile.SpooledTemporaryFile(max_size=1024 * 1024) as body:
            size = 0
            try:
                async with asyncio.timeout(30):
                    while True:
                        message = await receive()
                        if message["type"] == "http.disconnect":
                            return
                        block = message.get("body", b"")
                        size += len(block)
                        if size > limit:
                            return await reject(413, "A solicitação excede o tamanho permitido.")
                        body.write(block)
                        if not message.get("more_body"):
                            break
            except TimeoutError:
                return await reject(408, "O envio demorou demais. Tente novamente.")
            body.seek(0)
            replayed = 0

            async def replay():
                nonlocal replayed
                if replayed >= size:
                    return await receive()
                block = body.read(64 * 1024)
                replayed += len(block)
                return {"type": "http.request", "body": block, "more_body": replayed < size}

            if not size:
                async def replay_empty():
                    return {"type": "http.request", "body": b"", "more_body": False}
                await self.app(scope, replay_empty, protected_send)
            else:
                await self.app(scope, replay, protected_send)

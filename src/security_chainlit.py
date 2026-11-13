"""Adaptador de segurança para as interfaces do Chainlit 2.12.0."""
import asyncio
from uuid import UUID

import chainlit as cl
from chainlit.auth import get_current_user
from chainlit.context import init_ws_context
from chainlit.data import get_data_layer
from chainlit.session import WebsocketSession
from chainlit.types import UpdateFeedbackRequest, DeleteFeedbackRequest, ElementRequest
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import text

from src.security import MAX_MESSAGE_CHARS, MAX_FILE_BYTES, SecurityMiddleware, origins, production, login_rejection


def uuid_value(value):
    """Normaliza um UUID recebido do navegador; devolve None se for inválido."""
    try:
        return str(UUID(value)) if isinstance(value, str) else None
    except ValueError:
        return None


def require_account(user):
    """Exige uma conta autenticada e devolve seu identificador."""
    if not user or not getattr(user, "id", None):
        raise HTTPException(401, "Entre na sua conta.")
    return user.id


def owned_session(user, session_id):
    """Devolve a sessão de WebSocket somente se ela pertencer ao usuário autenticado."""
    require_account(user)
    session = WebsocketSession.get_by_id(session_id)
    if not session or not session.user or session.user.identifier != user.identifier:
        raise HTTPException(404, "Sessão indisponível.")
    return session


async def element_access(layer, user, session, data):
    """Confere se o elemento (Escada de dicas) pertence à conversa e à mensagem da sessão."""
    if not isinstance(data, dict) or data.get("type") != "custom" or data.get("name") != "EscadaDicas":
        raise HTTPException(400, "Elemento inválido.")
    for key in ("id", "threadId", "forId"):
        if not uuid_value(data.get(key)):
            raise HTTPException(400, "Elemento inválido.")
    if data["threadId"] != session.thread_id:
        raise HTTPException(404, "Elemento indisponível.")
    async with layer.engine.connect() as conn:
        owned = (await conn.execute(text('''SELECT 1 FROM steps s JOIN threads t ON t.id=s."threadId"
            WHERE s.id=:step AND t.id=:thread AND t."userId"=:owner'''),
            {"step": UUID(data["forId"]), "thread": UUID(session.thread_id), "owner": UUID(user.id)})).scalar_one_or_none()
        existing = (await conn.execute(text('SELECT "threadId" FROM elements WHERE id=:id'),
                                       {"id": UUID(data["id"])})).scalar_one_or_none()
    if not owned or existing and str(existing) != session.thread_id:
        raise HTTPException(404, "Elemento indisponível.")


def clean_message(payload):
    """Valida uma mensagem do estudante e descarta autoria e metadados enviados pelo navegador."""
    if not isinstance(payload, dict) or not isinstance(payload.get("message"), dict):
        raise ValueError("Mensagem inválida.")
    message = payload["message"]
    identifier, output = uuid_value(message.get("id")), message.get("output")
    if not identifier or UUID(identifier).version != 4 or not isinstance(output, str) or not 1 <= len(output.strip()) <= MAX_MESSAGE_CHARS:
        raise ValueError("Escreva uma mensagem de até 20.000 caracteres.")
    from chainlit.utils import utc_now
    refs = payload.get("fileReferences") or []
    if not isinstance(refs, list) or len(refs) > 20 or any(
            not isinstance(item, dict) or not uuid_value(item.get("id")) for item in refs):
        raise ValueError("Anexos inválidos.")
    return {"message": {"id": identifier, "output": output, "createdAt": utc_now(),
                        "type": "user_message", "name": "Estudante", "metadata": {}}, "fileReferences": refs}


def install_security():
    """Substitui rotas e eventos do Chainlit 2.12.0 por versões com autorização e limites."""
    from chainlit import server, socket
    from starlette.middleware.cors import CORSMiddleware

    if getattr(server.app.state, "study_security", False):
        return
    allowed = origins()
    server.app.state.study_security = True
    # O middleware CORS já foi criado pelo servidor antes de carregar src/app.py.
    for middleware in server.app.user_middleware:
        if middleware.cls is CORSMiddleware:
            middleware.kwargs["allow_origins"] = sorted(allowed)
    server.sio.eio.cors_allowed_origins = sorted(allowed)
    server.sio.eio.max_http_buffer_size = 256 * 1024
    server.app.add_middleware(SecurityMiddleware, allowed_origins=allowed, secure=production())
    router = APIRouter()

    @router.post("/project/file")
    async def native_upload(session_id: str, file: UploadFile, ask_parent_id: str | None = None,
                            user=Depends(get_current_user)):
        session = owned_session(user, session_id) if user else WebsocketSession.get_by_id(session_id)
        if not session or (not user and production()):
            await file.close()
            raise HTTPException(401, "Entre na sua conta.")
        if len(session.files) >= 20 or sum(f.get("size", 0) for f in session.files.values()) + (file.size or 0) > 100 * 1024 * 1024:
            await file.close()
            raise HTTPException(413, "Esta sessão atingiu o limite de anexos (20 arquivos ou 100 MB). Abra outro caderno.")
        if file.size is None or file.size > MAX_FILE_BYTES:
            await file.close()
            raise HTTPException(413, "O arquivo passa de 25 MB.")
        from src.security_limits import usage, UsageLimit
        init_ws_context(session)
        try:
            async with usage("upload"):
                return await server.upload_file(user, session_id, file, ask_parent_id)
        except UsageLimit as exc:
            raise HTTPException(429, str(exc)) from None
        finally:
            await file.close()

    @router.put("/feedback")
    async def feedback(update: UpdateFeedbackRequest, user=Depends(get_current_user)):
        require_account(user)
        owned_session(user, update.sessionId)
        if (not uuid_value(update.feedback.forId) or
                update.feedback.id and not uuid_value(update.feedback.id) or
                update.feedback.value not in (0, 1) or
                update.feedback.comment and len(update.feedback.comment) > 2000):
            raise HTTPException(400, "Avaliação inválida.")
        identifier = await get_data_layer().secure_feedback(user.id, feedback=update.feedback)
        return {"success": True, "feedbackId": identifier}

    @router.delete("/feedback")
    async def remove_feedback(payload: DeleteFeedbackRequest, user=Depends(get_current_user)):
        require_account(user)
        if not uuid_value(payload.feedbackId):
            raise HTTPException(400, "Avaliação inválida.")
        await get_data_layer().secure_feedback(user.id, delete_id=payload.feedbackId)
        return {"success": True}

    @router.put("/project/element")
    async def element_update(payload: ElementRequest, user=Depends(get_current_user)):
        session = owned_session(user, payload.sessionId)
        await element_access(get_data_layer(), user, session, payload.element)
        return await server.update_thread_element(payload, user)

    @router.delete("/project/element")
    async def element_delete(payload: ElementRequest, user=Depends(get_current_user)):
        session = owned_session(user, payload.sessionId)
        await element_access(get_data_layer(), user, session, payload.element)
        return await server.delete_thread_element(payload, user)

    # Mensagens compreensíveis sem alterar o mecanismo de troca de código OAuth.
    original_redirect = server._get_oauth_redirect_error

    def login_error(request, error, **kwargs):
        reason = login_rejection.get()
        response = original_redirect(request, error, **kwargs)
        if reason:
            from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
            url = urlsplit(response.headers["location"])
            query = dict(parse_qsl(url.query))
            query["study_error"] = reason
            response.headers["location"] = urlunsplit(url._replace(query=urlencode(query)))
        return response

    server._get_oauth_redirect_error = login_error
    before = len(server.app.router.routes)
    server.app.include_router(router)
    added = server.app.router.routes[before:]
    del server.app.router.routes[before:]
    server.app.router.routes[0:0] = added

    original_connect = server.sio.handlers["/"]["connect"]

    async def secure_connect(sid, environ, auth):
        if not isinstance(auth, dict) or not uuid_value(auth.get("sessionId")):
            raise ConnectionRefusedError("Sessão inválida.")
        if auth.get("threadId") and not uuid_value(auth["threadId"]):
            raise ConnectionRefusedError("Conversa inválida.")
        return await original_connect(sid, environ, auth)

    server.sio.on("connect", secure_connect)

    async def notice(session, message):
        init_ws_context(session)
        await cl.Message(content=message).send()

    async def accept(sid, payload, edit=False):
        session = WebsocketSession.require(sid)
        try:
            safe = clean_message(payload)
            if getattr(session, "study_message_busy", False):
                raise ValueError("Espere a resposta atual terminar.")
            init_ws_context(session)
            from chainlit.chat_context import chat_context
            if edit and not any(m.id == safe["message"]["id"] and m.type == "user_message" for m in chat_context.get()):
                raise ValueError("Mensagem indisponível para edição.")
            if not edit and (layer := get_data_layer()):
                async with layer.engine.connect() as conn:
                    exists = (await conn.execute(text("SELECT 1 FROM steps WHERE id=:id"),
                                                 {"id": UUID(safe["message"]["id"])})).scalar_one_or_none()
                    if exists:
                        raise ValueError("Mensagem já recebida. Atualize a conversa.")
            # Não há await entre a reserva e o início da tarefa.
            if getattr(session, "study_message_busy", False):
                raise ValueError("Espere a resposta atual terminar.")
            session.study_message_busy = True

            async def run():
                try:
                    if edit:
                        await socket.edit_message(sid, safe)
                    else:
                        await socket.process_message(session, safe)
                finally:
                    session.study_message_busy = False
            session.current_task = asyncio.create_task(run())
        except ValueError as exc:
            await notice(session, str(exc))

    async def client_message(sid, payload):
        await accept(sid, payload)

    async def edit_message(sid, payload):
        await accept(sid, payload, edit=True)

    server.sio.on("client_message", client_message)
    server.sio.on("edit_message", edit_message)

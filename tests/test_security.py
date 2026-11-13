"""Regressões das fronteiras HTTP e OAuth, sem credenciais reais."""
import asyncio
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from src.security import SecurityMiddleware, validate_production, origins
from src.security_chainlit import clean_message
from src.study_accounts import google_user, allowed_email
from src.rag.safe_extract import extract_isolated


class HttpSecurityTests(unittest.IsolatedAsyncioTestCase):
    async def request(self, method="GET", path="/login", headers=None, chunks=None, secure=True):
        output, received = [], []
        chunks = list(chunks or [b""])
        async def app(scope, receive, send):
            if scope["type"] == "websocket":
                return await send({"type": "websocket.accept"})
            if method in ("POST", "PUT", "DELETE"):
                while True:
                    item = await receive()
                    received.append(item.get("body", b""))
                    if not item.get("more_body"):
                        break
            await send({"type": "http.response.start", "status": 200,
                        "headers": [(b"set-cookie", b"oauth_state=test; HttpOnly; SameSite=lax")]})
            await send({"type": "http.response.body", "body": b"ok"})
        async def receive():
            if not chunks:
                return {"type": "http.disconnect"}
            data = chunks.pop(0)
            return {"type": "http.request", "body": data, "more_body": bool(chunks)}
        async def send(message):
            output.append(message)
        scope = {"type": "websocket" if method == "WS" else "http", "method": method, "path": path,
                 "headers": [(k.encode(), v.encode()) for k, v in (headers or {}).items()]}
        await SecurityMiddleware(app, ["https://study.example"], secure)(scope, receive, send)
        return output, b"".join(received)

    async def test_headers_and_secure_cookie(self):
        response, _ = await self.request()
        headers = dict(response[0]["headers"])
        self.assertIn(b"Secure", headers[b"set-cookie"])
        self.assertEqual(headers[b"x-frame-options"], b"DENY")
        self.assertIn(b"strict-transport-security", headers)
        self.assertIn(b"content-security-policy-report-only", headers)

    async def test_local_does_not_force_secure(self):
        response, _ = await self.request(secure=False)
        self.assertNotIn(b"Secure", dict(response[0]["headers"])[b"set-cookie"])

    async def test_cross_origin_and_missing_origin_cookie_rejected(self):
        for headers in ({"origin": "https://evil.example"}, {"cookie": "access_token=x"}):
            response, body = await self.request("POST", headers=headers, chunks=[b"data"])
            self.assertEqual(response[0]["status"], 403)
            self.assertEqual(body, b"")

    async def test_same_origin_body_replayed_exactly(self):
        response, body = await self.request("POST", headers={"origin": "https://study.example", "cookie": "access_token=x"},
                                            chunks=[b"abc", b"def"])
        self.assertEqual(response[0]["status"], 200)
        self.assertEqual(body, b"abcdef")

    async def test_chunked_limit_before_parser(self):
        with patch("src.security.MAX_BODY_BYTES", 8):
            response, body = await self.request("POST", "/study/materials", chunks=[b"12345", b"67890"], secure=False)
        self.assertEqual(response[0]["status"], 413)
        self.assertEqual(body, b"")

    async def test_anonymous_upload_rejected_before_receiving_file(self):
        response, body = await self.request("POST", "/study/materials", chunks=[b"data"])
        self.assertEqual(response[0]["status"], 401)
        self.assertEqual(body, b"")

    async def test_content_length_limit_and_invalid_value(self):
        for length, expected in (("999999999", 413), ("invalid", 400)):
            response, _ = await self.request("POST", headers={"content-length": length})
            self.assertEqual(response[0]["status"], expected)

    async def test_websocket_origin(self):
        response, _ = await self.request("WS", headers={"origin": "https://evil.example"})
        self.assertEqual(response[0]["code"], 1008)
        response, _ = await self.request("WS", headers={"origin": "https://study.example"})
        self.assertEqual(response[0]["type"], "websocket.accept")

    async def test_attachment_download(self):
        response, _ = await self.request(path="/project/file/id")
        self.assertEqual(dict(response[0]["headers"])[b"content-disposition"], b"attachment")


class AuthSecurityTests(unittest.IsolatedAsyncioTestCase):
    async def test_public_accepts_second_verified_account_despite_old_list(self):
        with patch.dict(os.environ, {"STUDY_ACCESS_MODE": "public", "STUDY_ALLOWED_EMAILS": "owner@example.com"}):
            for google_id, email in (("123", "owner@example.com"), ("456", "second@example.com")):
                user = await google_user("google", "unused", {"id": google_id, "email": email, "verified_email": True}, None)
                self.assertEqual(user.identifier, "google:" + google_id)

    async def test_unverified_or_missing_email_rejected(self):
        with patch.dict(os.environ, {"STUDY_ACCESS_MODE": "public"}):
            for verified in (False, None, "true"):
                self.assertIsNone(await google_user("google", "unused", {"id": "123", "email": "a@example.com", "verified_email": verified}, None))

    async def test_invitation_policy_remains_available(self):
        with patch.dict(os.environ, {"STUDY_ACCESS_MODE": "invited", "STUDY_ALLOWED_EMAILS": "owner@example.com"}):
            self.assertFalse(allowed_email("second@example.com"))
            self.assertTrue(allowed_email("OWNER@example.com"))

    async def test_production_cannot_fall_back_to_demo(self):
        with patch.dict(os.environ, {"STUDY_ENV": "production"}, clear=True):
            with self.assertRaises(RuntimeError):
                validate_production()

    async def test_origin_cannot_include_callback(self):
        with patch.dict(os.environ, {"CHAINLIT_URL": "https://example.com/auth/oauth/google/callback"}):
            with self.assertRaises(RuntimeError):
                origins()


class PayloadTests(unittest.TestCase):
    def test_browser_cannot_forge_author_or_metadata(self):
        payload = clean_message({"message": {"id": str(uuid4()), "output": "Olá", "type": "assistant_message",
                                               "name": "Eva", "metadata": {"study_step": {"degrau": 50}}}})
        self.assertEqual(payload["message"]["type"], "user_message")
        self.assertEqual(payload["message"]["metadata"], {})

    def test_invalid_and_oversized_messages(self):
        for content in (None, " ", "x" * 20001):
            with self.assertRaises(ValueError):
                clean_message({"message": {"id": str(uuid4()), "output": content}})


class PdfProcessTests(unittest.IsolatedAsyncioTestCase):
    async def test_invalid_pdf_is_rejected_by_child(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid.pdf"
            path.write_bytes(b"%PDF-invalid")
            with self.assertRaises(ValueError):
                await extract_isolated(path)


class UsageRuleTests(unittest.TestCase):
    def test_daily_and_global_caps(self):
        from src.security_limits import BUSY, DAILY, limit_message
        self.assertIsNone(limit_message("chat", 0, 0, 0, 0))
        self.assertEqual(limit_message("chat", 1, 0, 0, 0), BUSY)
        self.assertEqual(limit_message("chat", 0, 10, 0, 0), BUSY)
        self.assertIn("limite de uso de hoje", limit_message("chat", 0, 0, DAILY["chat"], 0))
        self.assertIn("AjudAI atingiu", limit_message("cards", 0, 0, 0, 400))
        with patch.dict(os.environ, {"STUDY_GLOBAL_DAILY_CARDS": "1000"}):
            self.assertIsNone(limit_message("cards", 0, 0, 0, 400))
        with patch.dict(os.environ, {"STUDY_GLOBAL_DAILY_CARDS": "invalido"}):
            self.assertIsNotNone(limit_message("cards", 0, 0, 0, 400))


class StreamDeadlineTests(unittest.IsolatedAsyncioTestCase):
    async def test_deadline_in_consumer_raises_timeout_and_closes_stream(self):
        # Mesmo padrão do on_message: prazo no consumidor e aclose no finally.
        closed = []

        async def slow_stream():
            try:
                for index in range(100):
                    yield str(index)
            finally:
                closed.append(True)

        received = []
        stream = slow_stream()
        with self.assertRaises(TimeoutError):
            try:
                async with asyncio.timeout(0.2):
                    async for token in stream:
                        received.append(token)
                        await asyncio.sleep(0.05)
            finally:
                await stream.aclose()
        self.assertTrue(closed)
        self.assertGreater(len(received), 0)
        self.assertFalse(asyncio.current_task().cancelling())

    def test_interrupted_reply_stays_out_of_model_context(self):
        from src.services.conversation import restore_history
        steps = [{"id": "q", "type": "user_message", "output": "Pergunta"},
                 {"id": "a", "type": "assistant_message", "output": "Parcial",
                  "metadata": {"study_reply_to": "q", "study_interrupted": True}}]
        self.assertEqual(restore_history(steps), [])

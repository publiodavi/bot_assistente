"""Controle mínimo do Microsoft Edge pelo Chrome DevTools Protocol.

Ferramenta de apoio à monografia (não faz parte da aplicação): abre o Edge em modo
headless, navega, executa JavaScript e salva capturas de tela recortadas.
"""
import asyncio
import base64
import json
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websockets

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"


class Browser:
    def __init__(self, port=None, width=1440, height=900, scale=2):
        self.port = port or __import__("random").randint(9400, 9900)
        self.width, self.height, self.scale = width, height, scale
        self.profile = tempfile.mkdtemp(prefix="edge-cdp-")
        self.process = None
        self.ws = None
        self.counter = 0
        self.events = []

    async def __aenter__(self):
        self.process = subprocess.Popen([
            EDGE, "--headless=new", f"--remote-debugging-port={self.port}",
            f"--user-data-dir={self.profile}", "--no-first-run", "--disable-extensions",
            "--hide-scrollbars", f"--window-size={self.width},{self.height}", "about:blank",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json"))
                page = next(t for t in targets if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.2)
        else:
            raise RuntimeError("O Edge não abriu a porta de depuração.")
        self.ws = await websockets.connect(page["webSocketDebuggerUrl"], max_size=64 * 1024 * 1024)
        await self.send("Page.enable")
        await self.send("Runtime.enable")
        await self.resize(self.width, self.height)
        return self

    async def __aexit__(self, *exc):
        try:
            await self.ws.close()
        finally:
            self.process.terminate()

    async def send(self, method, **params):
        self.counter += 1
        ident = self.counter
        await self.ws.send(json.dumps({"id": ident, "method": method, "params": params}))
        while True:
            message = json.loads(await self.ws.recv())
            if message.get("id") == ident:
                if "error" in message:
                    raise RuntimeError(f"{method}: {message['error']}")
                return message.get("result", {})
            self.events.append(message)

    async def resize(self, width, height):
        self.width, self.height = width, height
        await self.send("Emulation.setDeviceMetricsOverride", width=width, height=height,
                        deviceScaleFactor=self.scale, mobile=False)

    async def goto(self, url, wait=1.5):
        await self.send("Page.navigate", url=url)
        await asyncio.sleep(wait)

    async def js(self, expression, wait=0.0):
        result = await self.send("Runtime.evaluate", expression=expression, awaitPromise=True,
                                 returnByValue=True)
        if "exceptionDetails" in result:
            raise RuntimeError(json.dumps(result["exceptionDetails"])[:600])
        if wait:
            await asyncio.sleep(wait)
        return result.get("result", {}).get("value")

    async def wait_for(self, expression, timeout=30):
        end = time.time() + timeout
        while time.time() < end:
            try:
                if await self.js(f"!!({expression})"):
                    return True
            except RuntimeError:
                pass  # a página ainda está carregando
            await asyncio.sleep(0.3)
        raise TimeoutError(expression)

    async def shot(self, path, selector=None, pad=0):
        clip = None
        if selector:
            rect = await self.js(
                f"(() => {{ const r = document.querySelector({json.dumps(selector)}).getBoundingClientRect();"
                f" return {{x: r.x, y: r.y, width: r.width, height: r.height}}; }})()")
            clip = {"x": max(rect["x"] - pad, 0), "y": max(rect["y"] - pad, 0),
                    "width": rect["width"] + 2 * pad, "height": rect["height"] + 2 * pad, "scale": 1}
        params = {"format": "png", "captureBeyondViewport": bool(clip)}
        if clip:
            params["clip"] = clip
        data = await self.send("Page.captureScreenshot", **params)
        Path(path).write_bytes(base64.b64decode(data["data"]))

"""Renderiza os diagramas Mermaid de figuras/*.mmd em PNG, pelo Edge headless."""
import asyncio
import html
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from cdp import Browser  # noqa: E402

ROOT = Path(__file__).parent / "figuras"
MERMAID = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"
PAGE = """<!doctype html><html><head><meta charset="utf-8">
<style>body{{margin:0;background:#fff;font-family:Arial,sans-serif}}#box{{display:inline-block;padding:16px}}</style>
<script src="{mermaid}"></script></head><body><div id="box"><pre class="mermaid">{code}</pre></div>
<script>mermaid.initialize({{startOnLoad:false, theme:'neutral', fontFamily:'Arial',
 themeVariables:{{fontSize:'16px'}},
 flowchart:{{htmlLabels:true, curve:'basis', useMaxWidth:false}}, er:{{fontSize:15, useMaxWidth:false}},
 sequence:{{mirrorActors:false, useMaxWidth:false, actorFontSize:15, messageFontSize:15, noteFontSize:15}}}});
mermaid.run().then(()=>{{document.body.dataset.ok='1'}}).catch(e=>{{document.body.dataset.err=String(e)}});</script>
</body></html>"""


async def main(names):
    async with Browser(width=1400, height=900, scale=2) as browser:
        for source in sorted(ROOT.glob("*.mmd")):
            if names and source.stem not in names:
                continue
            page = ROOT / f"_{source.stem}.html"
            page.write_text(PAGE.format(mermaid=MERMAID, code=html.escape(source.read_text(encoding="utf-8"))),
                            encoding="utf-8")
            await browser.goto(page.resolve().as_uri(), wait=0.5)
            await browser.wait_for("document.body.dataset.ok || document.body.dataset.err", timeout=40)
            error = await browser.js("document.body.dataset.err || ''")
            if error:
                raise RuntimeError(f"{source.name}: {error}")
            await browser.shot(ROOT / f"fig_{source.stem}.png", selector="#box svg", pad=10)
            page.unlink()
            print("ok", source.stem)


if __name__ == "__main__":
    asyncio.run(main(set(sys.argv[1:])))

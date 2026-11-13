"""Capturas de tela reais do AjudAI para a monografia (instância local, conta fictícia)."""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8120"
OUT = Path(__file__).parent / "figuras"


async def login(b, user="monografia"):
    await b.goto(BASE + "/login", wait=2.5)
    await b.wait_for("document.querySelectorAll('input[type=password]').length", timeout=60)
    await b.js("""(() => {
      const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el, v);
        el.dispatchEvent(new Event('input', {bubbles:true})); };
      const inputs = [...document.querySelectorAll('input')];
      set(inputs.find(i => i.type !== 'password'), '__USER__');
      set(inputs.find(i => i.type === 'password'), 'capturas-local');
      [...document.querySelectorAll('button')].find(x => x.type === 'submit' || /continuar|entrar|sign/i.test(x.textContent)).click();
    })()""".replace("__USER__", user))
    await asyncio.sleep(4)


async def explore(b, expr):
    print(json.dumps(await b.js(expr), ensure_ascii=False, indent=1)[:6000])


def click(text, scope="document"):
    return f"""(() => {{ const t = {json.dumps(text)};
      const el = [...{scope}.querySelectorAll('button,[role=button],label')].filter(e => e.offsetParent)
        .find(e => (e.getAttribute('aria-label')||'').trim() === t || e.textContent.trim() === t)
        || [...{scope}.querySelectorAll('button,[role=button],label')].filter(e => e.offsetParent)
        .find(e => e.textContent.trim().startsWith(t) || (e.getAttribute('aria-label')||'').startsWith(t));
      if (!el) throw new Error('sem botão: ' + t); el.click(); return true; }})()"""


def type_into(selector, text):
    return f"""(() => {{ const el = document.querySelector({json.dumps(selector)});
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, {json.dumps(text)});
      el.dispatchEvent(new Event('input', {{bubbles:true}})); return true; }})()"""


async def all_steps(b):
    await b.js(click("Fechar"), wait=1)
    if not (OUT / "cap_capa.png").exists():
        await b.shot(OUT / "cap_capa.png")
    await b.js(type_into("textarea", "Frações equivalentes"), wait=0.5)
    await b.js(click("Abrir o caderno"), wait=2)
    try:
        await b.wait_for("[...document.querySelectorAll('button')].some(e => /dica 1/i.test(e.textContent))", timeout=90)
        await asyncio.sleep(2)
        await b.js(click("Ver dica 1"), wait=3)
    except TimeoutError:
        print("resposta sem Escada nesta rodada")
    if not (OUT / "cap_conversa.png").exists():
        await b.shot(OUT / "cap_conversa.png")
    await b.js(click("Flash cards"), wait=1.5)
    dlg = "document.querySelector('.study-dialog--cards')"
    await b.js(click("5", dlg), wait=0.5)
    await b.js(click("Criar cart", dlg), wait=3)
    await b.wait_for("/Cartões prontos/.test(document.querySelector('.study-dialog--cards').innerText)", timeout=150)
    await b.js(click("Estudar", dlg), wait=2)
    print(await b.js("[...document.querySelectorAll('.study-dialog--cards *')].filter(e=>e.offsetParent && /card|flip|cartao/i.test(e.className)).map(e=>e.tagName+'.'+e.className).slice(0,15)"))
    print(await b.js("[...document.querySelectorAll('.study-dialog--cards button')].filter(e=>e.offsetParent).map(e=>e.textContent.trim())"))
    await b.js("(() => { const c = document.querySelector('.study-dialog--cards [class*=card][class*=flip], .study-dialog--cards .study-card, .study-dialog--cards [class*=cartao]'); if (c) c.click(); return !!c; })()", wait=1.5)
    await b.shot(OUT / "cap_flashcards.png", selector=".study-dialog--cards", pad=0)
    await b.js(click("Fechar", dlg), wait=1)
    await b.js(click("Temas"), wait=1.5)
    await b.shot(OUT / "cap_temas.png", selector=".study-dialog--themes", pad=0)


async def capa_limpa(b):
    """Figura 1: conta fictícia sem histórico, com um único caderno criado antes da captura."""
    await b.js(click("Fechar"), wait=1)
    await b.js(type_into("textarea", "Frações equivalentes"), wait=0.5)
    await b.js(click("Abrir o caderno"), wait=2)
    await b.wait_for("document.querySelector('main') && /Degrau|[?]/.test(document.querySelector('main').innerText)", timeout=120)
    await asyncio.sleep(25)  # espera o fim do streaming da primeira resposta
    await b.js(click("Novo caderno"), wait=2)
    # o Chainlit pode pedir confirmação para abrir um caderno novo
    await b.js("(() => { const ok = [...document.querySelectorAll('[role=dialog] button, dialog button')]"
               ".find(e => e.offsetParent && /confirm/i.test(e.textContent)); if (ok) ok.click(); return !!ok; })()", wait=3)
    await b.shot(OUT / "cap_capa.png")


async def main(step):
    async with Browser(width=1440, height=900, scale=1.5) as b:
        await login(b, "monografia-capa" if step == "capa" else "monografia")
        if step == "capa":
            await capa_limpa(b)
        if step == "all":
            try:
                await all_steps(b)
            except Exception:
                await b.shot(OUT / "_erro.png")
                print(await b.js("document.querySelector('main')?.innerText.slice(0,1500) || document.body.innerText.slice(0,1500)"))
                raise
        if step == "explore":
            await explore(b, """[...document.querySelectorAll('button,[role=button],a,input,textarea,dialog')]
              .filter(e => e.offsetParent || e.tagName==='DIALOG').map(e => [e.tagName, e.id, (e.className||'').toString().slice(0,60),
               (e.getAttribute('aria-label')||e.textContent||e.placeholder||'').trim().slice(0,50)])""")
            await b.shot(OUT / "_explore.png")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "explore"))

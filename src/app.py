"""Interface de conversa do assistente educacional."""
import asyncio
import json
import logging
import time
import unicodedata
from uuid import uuid4

import chainlit as cl
from chainlit.chat_context import chat_context
from chainlit.context import context

from src.pedagogy.study_trail import QUESTIONS
from src.pedagogy.study_intro import BARRIERS, GOALS, intro_transition
from src.prompts.companions import (
    DEFAULT_NAMES, clean_nickname, companion_names, companion_voice, stored_nicknames,
)
from src.prompts.pedagogical_prompt import ESCADA_FORMAT, MODE_INSTRUCTIONS, SYSTEM_PROMPT, ZDP_INSTRUCTIONS
from src.services.escada import EscadaStream, as_context, layers, parse_step, tidy_visible
from src.services.llm_client import ConfigurationError, stream_reply
from src.services.study_tools import MOODS, clean_text, note_update, validate_avatar
from src.study_accounts import (
    advance_trail, configure_accounts, profile_data, recent_notebooks, record_reveal, trail_progress, owned_thread_ids, study_statistics,
)


THEMES = {
    "Caderno Vintage": "vintage",
    "Castelo da Magia": "castelo",
    "Herói Aracnídeo": "aracnideo",
    "Cyberpunk": "cyberpunk",
    "Café Lo-fi": "cafe",
    "Jardim / Estufa": "jardim",
}
MASCOTS = {
    "Coruja": "coruja", "Raposa": "raposa", "Robô": "robo", "Harry": "harry",
    "Hermione": "hermione", "Dumbledore": "dumbledore", "Voldemort": "voldemort",
    "Homem-Aranha": "spiderman", "Miles Morales": "miles", "Oculto": "oculto",
}
ZDP_LEVELS = {"Menos dicas": "menos", "Dicas guiadas": "guiadas", "Mais apoio": "mais"}
DEFAULTS = {
    "theme": "vintage", "appearance": "light", "animations": "enabled",
    "mascot": "coruja", "mascot_name": "Lumi", "zdp": "guiadas",
    "accent": "1", "scene_intensity": "normal", "text_size": "normal",
}
TRAIL_START = "Quero praticar na trilha."
CHANNEL = "fatec-study"
DATA_LAYER = configure_accounts()
logger = logging.getLogger(__name__)
PROFILE_DEFAULTS = {"goal": "", "barrier": "", "intro": "new", "hint": "",
                    "tagline": "", "avatar": {"kind": "initials", "color": "terra"}, "fichario": []}


def study_session():
    state = getattr(context.session, "study_runtime", None)
    if state is None:
        state = {
            "id": uuid4().hex,
            "prefs": DEFAULTS.copy(),
            "confirmed": False,
            "revision": 0,
            "expression": "idle",
            "expression_until": None,
            "turn": None,
            "trail_stage": None,
            "trail_lock": asyncio.Lock(),
            "trail_actions": {},
            "profile": PROFILE_DEFAULTS.copy(),
            "profile_lock": asyncio.Lock(),
            "profile_loaded": False,
            "starting": False,
            # Escada de dicas e modo de condução da conversa atual.
            "mode": "guia",
            "teach_next": False,
            "steps": {},
            "elements": {},
            "recent": [],
            # Apelidos por personagem e autoria das respostas exibidas.
            "nicknames": {},
            "authors": {},
            "mood": None, "notebooks": [], "statistics": {}, "note_links": set(),
        }
        context.session.study_runtime = state
    return state


def normalize_preferences(current, changes):
    prefs = current.copy()
    options_by_key = {
        "theme": THEMES.values(), "mascot": MASCOTS.values(), "zdp": ZDP_LEVELS.values(),
        "appearance": ("light", "dark"), "animations": ("enabled", "paused"),
        "accent": ("1", "2", "3", "4"), "scene_intensity": ("suave", "normal", "vivo"),
        "text_size": ("normal", "grande", "extra"),
    }
    for key, options in options_by_key.items():
        value = changes.get(key)
        if isinstance(value, str) and value in options:
            prefs[key] = value
    return prefs


def resolve_companion(state):
    """Fonte única do nome exibido: apelido do personagem atual ou seu nome padrão."""
    mascot = state["prefs"]["mascot"]
    state["prefs"]["mascot_name"] = state["nicknames"].get(mascot) or DEFAULT_NAMES[mascot]
    return state["prefs"]["mascot_name"]


def author_of(step):
    """Personagem que assinou uma resposta gravada.

    Antes dos apelidos individuais, todos os companheiros se chamavam "Lumi"; por
    isso o nome sozinho não identifica o personagem. Sem o registro, o selo mostra
    apenas o nome gravado como autor.
    """
    saved = (step.get("metadata") or {}).get("study_companion")
    return saved if saved in DEFAULT_NAMES else None


async def publish_state(state, request_id=None, error=None):
    state["revision"] += 1
    remaining_ms = None
    expression = state["expression"]
    if state["expression_until"] is not None:
        remaining_ms = max(0, int((state["expression_until"] - time.monotonic()) * 1000))
        if remaining_ms == 0:
            expression = "idle"
    await cl.send_window_message({
        "channel": CHANNEL, "version": 1, "direction": "server", "type": "study.state",
        "session_id": state["id"], "revision": state["revision"],
        "preferences": state["prefs"], "confirmed": state["confirmed"],
        "account": getattr(context.session.user, "id", None),
        "profile": state["profile"],
        "request_id": request_id, "error": error,
        "mascot": {"expression": expression, "remaining_ms": remaining_ms},
        "mode": state["mode"],
        "escada": escada_summary(state),
        "recent": state["recent"],
        "companions": companion_names(state["nicknames"]),
        "authors": dict(list(state["authors"].items())[-80:]),
        "thread_id": context.session.thread_id if context.session.has_first_interaction else None,
        "notebooks": state["notebooks"], "statistics": state["statistics"], "mood": state["mood"],
        "note_links": sorted(state["note_links"]),
    })


def escada_summary(state):
    """Degraus da conversa atual, na ordem das respostas, para o painel da mesa."""
    return [
        {"degrau": step["degrau"], "tipo": step["tipo"], "sozinho": step["subiu_sozinho"],
         "reveladas": step["reveladas"]}
        for *_, step, _ in state.get("history", []) if step
    ][-12:]


async def express(state, expression, seconds=None):
    state["expression"] = expression
    state["expression_until"] = time.monotonic() + seconds if seconds else None
    await publish_state(state)


@cl.on_chat_start
async def initialize_study():
    state = study_session()
    async with state["profile_lock"]:
        await load_profile(state)
    await load_recent(state)
    await publish_state(state)


async def load_recent(state):
    user = context.session.user
    if DATA_LAYER and user:
        try:
            state["notebooks"] = await recent_notebooks(DATA_LAYER, user, limit=200)
            state["recent"] = state["notebooks"][:3]
            state["statistics"] = await study_statistics(DATA_LAYER, user)
            ids = [note["thread_id"] for note in state["profile"].get("fichario", []) if isinstance(note, dict) and "thread_id" in note]
            state["note_links"] = await owned_thread_ids(DATA_LAYER, user, ids)
        except Exception:
            logger.exception("Erro ao carregar cadernos recentes")

def display_name(value):
    if not isinstance(value, str):
        return ""
    return "".join(char for char in value if not unicodedata.category(char).startswith("C")).strip()[:60]


def install_profile(state, stored):
    user = context.session.user
    initial_name = display_name(user.metadata.get("display_name")) if user else ""
    state["profile"] = {
        **PROFILE_DEFAULTS, "name": initial_name or "Estudante",
        **{key: stored[key] for key in (*PROFILE_DEFAULTS, "name") if key in stored},
    }
    state["prefs"] = normalize_preferences(DEFAULTS, stored)
    state["nicknames"] = stored_nicknames(stored)
    resolve_companion(state)
    if state["profile"]["intro"] not in ("new", "done", "skipped"):
        state["profile"]["intro"] = "topic"


async def load_profile(state):
    if state["profile_loaded"]:
        return
    user = context.session.user
    if DATA_LAYER and user:
        install_profile(state, await profile_data(DATA_LAYER, user))
        state["confirmed"] = True
    else:
        install_profile(state, {})
    state["profile_loaded"] = True


async def update_profile(state, transform):
    def merge(stored):
        return {**stored, **transform(stored)}

    user = context.session.user
    if DATA_LAYER and user:
        updated = await profile_data(DATA_LAYER, user, merge)
    else:
        updated = merge({**state["profile"], **state["prefs"], "nicknames": dict(state["nicknames"])})
    install_profile(state, updated)


@cl.on_window_message
async def synchronize_study(data):
    if not isinstance(data, dict) or (
        data.get("channel"), data.get("version"), data.get("direction")
    ) != (CHANNEL, 1, "client"):
        return

    state = study_session()
    kind = data.get("type")
    if kind == "study.ready":
        if data.get("session_id") not in (None, state["id"]):
            return
        async with state["profile_lock"]:
            await load_profile(state)
            if not state["confirmed"]:
                cached = data.get("preferences")
                if isinstance(cached, dict):
                    state["prefs"] = normalize_preferences(state["prefs"], cached)
                    resolve_companion(state)
                state["confirmed"] = True
        await publish_state(state)
        return

    request_id = data.get("request_id")
    if (data.get("session_id") != state["id"] or not isinstance(request_id, str)
            or len(request_id) > 80 or kind not in (
                "study.preferences", "study.profile", "study.intro", "study.start", "study.mode",
                "study.nickname", "study.note", "study.checkin",
            )):
        return

    error = None
    if kind == "study.checkin":
        mood = data.get("mood")
        if mood is not None and mood not in MOODS:
            error = "Escolha um dos estados disponíveis."
        else:
            state["mood"] = mood
        await publish_state(state, request_id, error)
        return
    if kind == "study.mode":
        try:
            await set_mode(state, data.get("mode"))
        except Exception:
            logger.exception("Erro ao trocar o modo da conversa")
            error = "Não foi possível trocar quem conduz. Tente novamente."
        await publish_state(state, request_id, error)
        return

    try:
        async with state["profile_lock"]:
            await load_profile(state)
            if kind == "study.preferences":
                changes = data.get("preferences")
                if not isinstance(changes, dict) or any(
                    key not in ("theme", "mascot", "appearance", "animations", "zdp", "accent", "scene_intensity", "text_size") for key in changes
                ):
                    raise ValueError("Preferência inválida")
                normalized = normalize_preferences(DEFAULTS, changes)
                if any(value != normalized[key] for key, value in changes.items()):
                    raise ValueError("Preferência inválida")
                await update_profile(state, lambda stored: {
                    key: value for key, value in normalize_preferences(
                        normalize_preferences(DEFAULTS, stored), changes
                    ).items() if key in changes
                })
            elif kind == "study.note":
                thread_id = data.get("thread_id")
                user = context.session.user
                if not DATA_LAYER or not user or not isinstance(thread_id, str):
                    raise ValueError("Entre na sua conta para salvar uma descoberta.")
                if thread_id not in await owned_thread_ids(DATA_LAYER, user, [thread_id]):
                    raise ValueError("Conversa indisponível.")
                await update_profile(state, lambda stored: {"fichario": note_update(
                    stored.get("fichario", []), thread_id, data.get("text"), data.get("review", False))})
                await load_recent(state)
            elif kind == "study.profile":
                name, goal, barrier = display_name(data.get("name")), data.get("goal"), data.get("barrier")
                if not name or not isinstance(goal, str) or not isinstance(barrier, str):
                    raise ValueError("Perfil inválido")
                if goal not in (*GOALS, "") or barrier not in (*BARRIERS, ""):
                    raise ValueError("Preferência inválida")
                tagline = clean_text(data.get("tagline", state["profile"].get("tagline", "")), 120)
                avatar = validate_avatar(data.get("avatar", state["profile"]["avatar"]))
                await update_profile(state, lambda stored: {"name": name, "goal": goal, "barrier": barrier,
                                                          "tagline": tagline, "avatar": avatar})
            elif kind == "study.intro":
                await update_profile(state, lambda stored: intro_transition(
                    stored, data.get("command"), data.get("value")
                ))
            elif kind == "study.nickname":
                mascot, raw = data.get("mascot"), data.get("name")
                if mascot not in DEFAULT_NAMES or not isinstance(raw, str) or len(raw) > 200:
                    raise ValueError("Apelido inválido")
                name = clean_nickname(raw)

                def rename(stored):
                    nicknames = stored_nicknames(stored)
                    if name and name != DEFAULT_NAMES[mascot]:
                        nicknames[mascot] = name
                    else:
                        nicknames.pop(mascot, None)
                    # O nome único antigo deixa de valer depois da primeira gravação por personagem.
                    return {"nicknames": nicknames, "mascot_name": None}

                await update_profile(state, rename)
            else:
                topic, goal = data.get("topic"), data.get("goal")
                if not isinstance(topic, str) or not 1 <= len(topic.strip()) <= 2000:
                    raise ValueError("Escreva o assunto que você quer estudar.")
                if goal not in (*GOALS, ""):
                    raise ValueError("Objetivo inválido")
                if state["turn"] or state["starting"]:
                    raise ValueError("Espere a resposta atual terminar.")
                await update_profile(state, lambda stored: {
                    "intro": "done", "hint": "", **({"goal": goal} if goal else {})
                })
                state["starting"] = True
                await context.emitter.task_start()
                task = asyncio.create_task(start_topic(state, topic.strip(), goal))
                context.session.current_task = task
            state["confirmed"] = True
    except Exception:
        logger.exception("Erro ao atualizar a experiência de estudo")
        error = "Não foi possível concluir a alteração. Tente novamente."
    await publish_state(state, request_id, error)


# O painel nativo de configurações do Chainlit foi retirado: nível de dicas e apelido
# do companheiro são editados nos painéis Perfil e Companheiros, pela mesma ponte
# de mensagens das demais preferências.


def stored_step(metadata):
    """Revalida os dados da escada gravados no passo; formatos antigos viram None."""
    saved = metadata.get("study_step")
    if not isinstance(saved, dict):
        return None
    step = parse_step(json.dumps(saved))
    if step:
        revealed = saved.get("reveladas")
        step["reveladas"] = revealed if type(revealed) is int and 0 <= revealed <= layers(step) else 0
    return step


def restore_history(steps):
    """Turnos concluídos (id da pergunta, pergunta, resposta visível, escada, id da resposta)."""
    users = {step["id"]: step.get("output") for step in steps if step.get("type") == "user_message"}
    history = []
    for step in steps:
        metadata = step.get("metadata") or {}
        if step.get("type") != "assistant_message" or step.get("streaming") or step.get("isError"):
            continue
        question_id = metadata.get("study_reply_to")
        prompt = users.get(question_id)
        if prompt and step.get("output"):
            history.append((question_id, prompt, step["output"], stored_step(metadata), step["id"]))
    return history


def conversation_context(history, message):
    """Mantém apenas os turnos cujas perguntas ainda estão na conversa.

    Ao editar uma mensagem, o Chainlit remove as mensagens seguintes da tela e do
    banco e chama on_message novamente com o mesmo ID; os turnos removidos e o
    turno antigo da pergunta editada não podem continuar no contexto do modelo.
    A resposta volta ao modelo no mesmo formato pedido, com as camadas reveladas.
    """
    present = {item.id for item in chat_context.get()}
    history[:] = [turn for turn in history if turn[0] in present and turn[0] != message.id]
    return [entry for _, prompt, answer, step, _ in history for entry in (
        {"role": "user", "content": prompt}, {"role": "assistant", "content": as_context(answer, step)},
    )]


def escada_element(state, reply_id, step, companion):
    """Elemento da escada; o nome é o do companheiro que assinou aquela resposta."""
    props = {**step, "companheiro": companion, "message_id": reply_id}
    element = cl.CustomElement(name="EscadaDicas", props=props, display="inline")
    element.for_id = reply_id
    state["steps"][reply_id] = step
    state["elements"][reply_id] = element
    return element


async def set_mode(state, mode):
    if mode not in MODE_INSTRUCTIONS:
        raise ValueError("Modo inválido")
    state["mode"] = mode
    state["teach_next"] = False
    thread_id = context.session.thread_id
    if DATA_LAYER and context.session.user and context.session.has_first_interaction:
        await DATA_LAYER.update_thread(thread_id, metadata={"study_mode": mode})


@cl.on_chat_resume
async def resume_study(thread):
    steps = thread.get("steps") or []
    # O perfil da conta prevalece sobre as configurações de uma conversa antiga.
    (thread.get("metadata") or {}).pop("chat_settings", None)
    state = study_session()
    state["trail_actions"].clear()
    state["history"] = restore_history(steps)
    mode = (thread.get("metadata") or {}).get("study_mode")
    state["mode"] = mode if mode in MODE_INSTRUCTIONS else "guia"
    stage = await trail_progress(DATA_LAYER, context.session.user, thread["id"])
    if type(stage) is int and 0 <= stage <= len(QUESTIONS):
        state["trail_stage"] = stage
    elif any(step.get("type") == "user_message" and step.get("output") == TRAIL_START for step in steps):
        state["trail_stage"] = 0
    await initialize_study()
    # Elementos não são gravados sem armazenamento de arquivos. A escada é
    # recomposta a partir dos metadados e entregue junto com a própria retomada,
    # pois o frontend substitui a lista de elementos ao receber a conversa.
    if not isinstance(thread.get("elements"), list):
        thread["elements"] = []
    # Cada resposta mantém o companheiro que a assinou, mesmo após trocas posteriores.
    names = {step["id"]: step.get("name") for step in steps if step.get("type") == "assistant_message"}
    for step in steps:
        if step.get("type") == "assistant_message":
            state["authors"][step["id"]] = {"mascot": author_of(step), "name": str(step.get("name") or "")[:40]}
    for *_, step, reply_id in state["history"]:
        if step:
            companion = names.get(reply_id) or state["prefs"]["mascot_name"]
            thread["elements"].append(escada_element(state, reply_id, step, companion).to_dict())
    await publish_state(state)
    if state["trail_stage"] is not None and state["trail_stage"] < len(QUESTIONS):
        question = next((
            step for step in reversed(steps)
            if step.get("type") == "assistant_message"
            and (step.get("metadata") or {}).get("study_trail_stage") == state["trail_stage"]
        ), None)
        await send_question(state, question_id=question["id"] if question else None)


@cl.set_starters
async def study_starters():
    return [
        cl.Starter(
            label="Destravar um exercício",
            message="Travei em um exercício. Peça o enunciado e minha tentativa e me dê uma dica por vez.",
        ),
        cl.Starter(
            label="Entender um conceito",
            message="Quero entender um conceito. Pergunte qual é e use um exemplo curto para me ajudar a raciocinar.",
        ),
        cl.Starter(
            label="Praticar com menos ajuda",
            message="Quero praticar um assunto. Pergunte qual é e proponha um desafio curto para eu tentar sozinho primeiro.",
        ),
    ]


async def start_topic(state, topic, goal):
    try:
        content = f"{GOALS[goal]}: {topic}" if goal else topic
        message = cl.Message(content=content, type="user_message", author="Você")
        if not context.session.has_first_interaction:
            context.session.has_first_interaction = True
            await context.emitter.init_thread(content[:100])
        await message.send()
        await on_message(message)
    except Exception:
        logger.exception("Erro ao iniciar conversa por assunto")
        await cl.Message(content="Não foi possível iniciar a conversa. Tente novamente.").send()
    finally:
        state["starting"] = False
        await context.emitter.task_end()


async def send_question(state, question_id=None):
    stage = state["trail_stage"]
    question = QUESTIONS[stage]
    actions = [
        cl.Action(name="study_trail", label=label, payload={"choice": choice})
        for choice, label in question.choices.items()
    ]
    actions.append(cl.Action(name="study_trail", label="Preciso de uma dica",
                             payload={"choice": "hint"}))
    if question_id:
        for action in actions:
            await action.send(question_id)
    else:
        await cl.Message(
            content=f"**Etapa {stage + 1} de {len(QUESTIONS)}**\n\n{question.prompt}",
            actions=actions,
            metadata={"study_trail_stage": stage},
        ).send()
    state["trail_actions"] = {action.id: action for action in actions}


async def start_trail(state):
    async with state["trail_lock"]:
        stage = state["trail_stage"]
        if stage == len(QUESTIONS):
            await cl.Message(content="Você já concluiu a trilha nesta conversa.").send()
        elif stage is None or not state["trail_actions"]:
            if stage is None:
                state["trail_stage"] = 0
            await send_question(state)
        else:
            await cl.Message(content="Continue pela questão aberta acima.").send()


@cl.action_callback("study_trail")
async def respond_to_question(action):
    state = study_session()
    async with state["trail_lock"]:
        issued = state["trail_actions"].get(action.id)
        if issued is None or issued.payload != action.payload:
            return
        question = QUESTIONS[state["trail_stage"]]
        choice = issued.payload["choice"]
        if choice == "hint" or choice != question.answer:
            await express(state, "encouraging", seconds=4)
            prefix = "" if choice == "hint" else "Tente outra alternativa. "
            await cl.Message(content=prefix + question.hint).send()
            if choice != "hint":
                del state["trail_actions"][issued.id]
                await issued.remove()
            return

        actions = list(state["trail_actions"].values())
        if DATA_LAYER and not await advance_trail(
            DATA_LAYER, context.session.user, context.session.thread_id, state["trail_stage"]
        ):
            await cl.Message(content="Não foi possível avançar. Reabra a conversa para atualizar a trilha.").send()
            return
        state["trail_actions"].clear()
        state["trail_stage"] += 1
        finished = state["trail_stage"] == len(QUESTIONS)
        await express(state, "celebrating" if finished else "unlocked", seconds=4)
        for old_action in actions:
            await old_action.remove()
        result = "Trilha concluída!" if finished else "Próxima etapa liberada."
        await cl.Message(content=f"{question.explanation}\n\n**{result}**").send()
        if not finished:
            await send_question(state)


@cl.action_callback("study_reveal")
async def reveal_layer(action):
    """Abre a próxima camada da escada; não permite pular nem retroceder."""
    state = study_session()
    payload = action.payload if isinstance(action.payload, dict) else {}
    reply_id, level = payload.get("message_id"), payload.get("nivel")
    step = state["steps"].get(reply_id) if isinstance(reply_id, str) else None
    if not step or type(level) is not int or level != step["reveladas"] + 1 or level > layers(step):
        return {"ok": False, "reveladas": step["reveladas"] if step else 0}
    if DATA_LAYER and context.session.user and not await record_reveal(
        DATA_LAYER, context.session.user, context.session.thread_id, reply_id, level
    ):
        return {"ok": False, "reveladas": step["reveladas"]}
    step["reveladas"] = level
    element = state["elements"].get(reply_id)
    if element:
        element.props["reveladas"] = level
        await element.update()
    await express(state, "encouraging", seconds=4)
    return {"ok": True, "reveladas": level}


@cl.action_callback("study_teach")
async def teach_companion(action):
    """Último degrau: o próximo turno coloca o companheiro no papel de aprendiz."""
    state = study_session()
    payload = action.payload if isinstance(action.payload, dict) else {}
    step = state["steps"].get(payload.get("message_id"))
    if not step or not step["pronto_para_ensinar"] or state["turn"]:
        return {"ok": False}
    state["teach_next"] = True
    await express(state, "encouraging", seconds=4)
    return {"ok": True}


@cl.on_stop
async def stop_study_turn():
    state = study_session()
    turn = state["turn"]
    if turn is not None and turn.cancelling():
        await finish_turn(state, turn)


async def finish_turn(state, turn):
    if state["turn"] is turn:
        state["turn"] = None
        if state["expression_until"] is None:
            await express(state, "idle")


@cl.on_message
async def on_message(message: cl.Message):
    state = study_session()
    if message.content.strip() == TRAIL_START:
        await start_trail(state)
        return

    async with state["profile_lock"]:
        await load_profile(state)
        prefs, profile = state["prefs"], state["profile"]
        zdp = ZDP_INSTRUCTIONS[prefs["zdp"]]
        goal = GOALS.get(profile["goal"], "não informado")
        barrier = BARRIERS.get(profile["barrier"], "não informada")
        mascot = prefs["mascot"]
        companion = resolve_companion(state)
        voice = companion_voice(mascot, companion)
    mood = state["mood"]
    state["mood"] = None
    # O convite "Explique para o companheiro" vale apenas para o turno seguinte.
    mode = "aprendiz" if state["teach_next"] else state["mode"]
    state["teach_next"] = False
    turn = asyncio.current_task()
    state["turn"] = turn
    history = state.setdefault("history", [])
    messages = [{"role": "system", "content": (
        f"{SYSTEM_PROMPT}\n{voice}\n{MODE_INSTRUCTIONS[mode]}\n"
        f"{MOODS.get(mood, '')}\n"
        f"Nível de apoio escolhido: {zdp}\n"
        f"Nome do estudante: {profile.get('name') or 'Estudante'}. "
        f"Objetivo preferido: {goal}. Dificuldade mais comum: {barrier}.\n{ESCADA_FORMAT}"
    )},
                *conversation_context(history, message)]
    if mode == "aprendiz":
        # Lembrete junto ao turno: instruções só no início perdem força em conversas longas.
        messages.append({"role": "system", "content": (
            f"Neste turno, o estudante está ensinando {companion}. Responda no modo aprendiz. "
            "Somente no JSON depois do marcador, use o tipo ensino e inclua a nota com o que ficou "
            "claro e o que faltou; o texto visível não cita esses campos."
        )})
    messages.append({"role": "user", "content": message.content})
    reply = cl.Message(content="", author=companion)
    # A autoria é registrada antes do streaming para o selo aparecer já na primeira palavra.
    state["authors"][reply.id] = {"mascot": mascot, "name": companion}
    try:
        wants_hint = message.content.strip().casefold().rstrip(".!") == "preciso de uma dica"
        await express(state, "encouraging" if wants_hint else "thinking")
        escada = EscadaStream()
        async for token in stream_reply(messages):
            await reply.stream_token(escada.feed(token))
        rest, step = escada.finish()
        await reply.stream_token(rest)
        reply.content = tidy_visible(escada.visible.strip())
        if not reply.content:
            raise RuntimeError("Resposta sem texto visível")
        reply.metadata = {
            "study_reply_to": message.id, "study_companion": mascot,
            **({"study_step": step} if step else {}),
        }
        if step:
            reply.elements = [escada_element(state, reply.id, step, companion)]
        await reply.send()
        history.append((message.id, message.content, reply.content, step, reply.id))
        await load_recent(state)
        if step and (step["tipo"] == "conquista" or (
                step["tipo"] == "ensino" and step.get("nota") and not step["nota"]["faltou"])):
            await express(state, "celebrating", seconds=4)
        else:
            await publish_state(state)
    except ConfigurationError as exc:
        await cl.Message(content=str(exc), author=companion).send()
    except Exception:
        logger.exception("Erro ao gerar a resposta")
        await cl.Message(author=companion, content=("Não consegui obter uma resposta. Confira a conexão, "
                                  "a chave e a disponibilidade da API e tente novamente.")).send()
    finally:
        await finish_turn(state, turn)

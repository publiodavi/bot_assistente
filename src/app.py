"""Interface de conversa do assistente educacional."""
import asyncio
import logging
import time
import unicodedata
from uuid import uuid4

import chainlit as cl
from chainlit.config import config
from chainlit.context import context
from chainlit.input_widget import Select, TextInput
from chainlit.utils import wrap_user_function

from src.pedagogy.study_trail import QUESTIONS
from src.pedagogy.study_intro import BARRIERS, GOALS, intro_transition
from src.prompts.pedagogical_prompt import SYSTEM_PROMPT, ZDP_INSTRUCTIONS
from src.services.llm_client import stream_reply
from src.study_accounts import advance_trail, configure_accounts, profile_data, trail_progress


THEMES = {
    "Caderno Vintage": "vintage",
    "Castelo da Magia": "castelo",
    "Herói Aracnídeo": "aracnideo",
    "Cyberpunk": "cyberpunk",
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
}
TRAIL_START = "Quero praticar na trilha."
CHANNEL = "fatec-study"
DATA_LAYER = configure_accounts()
logger = logging.getLogger(__name__)
PROFILE_DEFAULTS = {"goal": "", "barrier": "", "intro": "new", "hint": ""}


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
        }
        context.session.study_runtime = state
    return state


def normalize_preferences(current, changes):
    prefs = current.copy()
    options_by_key = {
        "theme": THEMES.values(), "mascot": MASCOTS.values(), "zdp": ZDP_LEVELS.values(),
        "appearance": ("light", "dark"), "animations": ("enabled", "paused"),
    }
    for key, options in options_by_key.items():
        value = changes.get(key)
        if isinstance(value, str) and value in options:
            prefs[key] = value
    name = changes.get("mascot_name")
    if isinstance(name, str):
        name = "".join(char for char in name if not unicodedata.category(char).startswith("C"))
        prefs["mascot_name"] = name.strip()[:24].rstrip() or DEFAULTS["mascot_name"]
    return prefs


def settings_panel(prefs):
    return cl.ChatSettings([
        TextInput(id="mascot_name", label="Nome do companheiro", initial=prefs["mascot_name"],
                  placeholder=DEFAULTS["mascot_name"]),
        Select(id="zdp", label="Nível de dicas", items=ZDP_LEVELS, initial_value=prefs["zdp"]),
    ])


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
    })


async def express(state, expression, seconds=None):
    state["expression"] = expression
    state["expression_until"] = time.monotonic() + seconds if seconds else None
    await publish_state(state)


@cl.on_chat_start
async def initialize_study():
    state = study_session()
    async with state["profile_lock"]:
        await load_profile(state)
        await settings_panel(state["prefs"]).send()
    await publish_state(state)


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
        updated = merge({**state["profile"], **state["prefs"]})
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
                state["confirmed"] = True
                await settings_panel(state["prefs"]).send()
        await publish_state(state)
        return

    request_id = data.get("request_id")
    if (data.get("session_id") != state["id"] or not isinstance(request_id, str)
            or len(request_id) > 80 or kind not in (
                "study.preferences", "study.profile", "study.intro", "study.start"
            )):
        return

    error = None
    try:
        async with state["profile_lock"]:
            await load_profile(state)
            if kind == "study.preferences":
                changes = data.get("preferences")
                if not isinstance(changes, dict) or any(
                    key not in ("theme", "mascot", "appearance", "animations") for key in changes
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
            elif kind == "study.profile":
                name, goal, barrier = display_name(data.get("name")), data.get("goal"), data.get("barrier")
                if not name or not isinstance(goal, str) or not isinstance(barrier, str):
                    raise ValueError("Perfil inválido")
                if goal not in (*GOALS, "") or barrier not in (*BARRIERS, ""):
                    raise ValueError("Preferência inválida")
                await update_profile(state, lambda stored: {"name": name, "goal": goal, "barrier": barrier})
            elif kind == "study.intro":
                previous = state["prefs"]["zdp"]
                await update_profile(state, lambda stored: intro_transition(
                    stored, data.get("command"), data.get("value")
                ))
                if state["prefs"]["zdp"] != previous:
                    await settings_panel(state["prefs"]).send()
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


async def apply_study_settings(changes):
    state = study_session()
    async with state["profile_lock"]:
        await load_profile(state)
        changes = {key: changes[key] for key in ("mascot_name", "zdp") if key in changes}
        try:
            await update_profile(state, lambda stored: {
                key: value for key, value in normalize_preferences(
                    normalize_preferences(DEFAULTS, stored), changes
                ).items() if key in changes
            })
            state["confirmed"] = True
        except Exception:
            logger.exception("Erro ao salvar configurações")
            await cl.Message(content="Não foi possível salvar suas configurações.").send()
        await settings_panel(state["prefs"]).send()
    await publish_state(state)


# Chainlit 2.12's decorator emits task_end for every settings update.
# Register the same socket callback without touching the active stream's task state.
config.code.on_settings_update = wrap_user_function(apply_study_settings, with_task=False)


def restore_history(steps):
    users = {step["id"]: step.get("output") for step in steps if step.get("type") == "user_message"}
    history = []
    for step in steps:
        metadata = step.get("metadata") or {}
        if step.get("type") != "assistant_message" or step.get("streaming") or step.get("isError"):
            continue
        prompt = users.get(metadata.get("study_reply_to"))
        if prompt and step.get("output"):
            history.extend([{"role": "user", "content": prompt},
                            {"role": "assistant", "content": step["output"]}])
    return history


@cl.on_chat_resume
async def resume_study(thread):
    steps = thread.get("steps") or []
    # O perfil da conta prevalece sobre as configurações de uma conversa antiga.
    (thread.get("metadata") or {}).pop("chat_settings", None)
    state = study_session()
    state["trail_actions"].clear()
    state["history"] = restore_history(steps)
    stage = await trail_progress(DATA_LAYER, context.session.user, thread["id"])
    if type(stage) is int and 0 <= stage <= len(QUESTIONS):
        state["trail_stage"] = stage
    elif any(step.get("type") == "user_message" and step.get("output") == TRAIL_START for step in steps):
        state["trail_stage"] = 0
    await initialize_study()
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
        zdp = ZDP_INSTRUCTIONS[state["prefs"]["zdp"]]
        goal = GOALS.get(state["profile"]["goal"], "não informado")
        barrier = BARRIERS.get(state["profile"]["barrier"], "não informada")
    turn = asyncio.current_task()
    state["turn"] = turn
    history = state.setdefault("history", [])
    messages = [{"role": "system", "content": (
        f"{SYSTEM_PROMPT}\nNível de apoio escolhido: {zdp}\n"
        f"Objetivo preferido: {goal}. Dificuldade mais comum: {barrier}."
    )},
                *history,
                {"role": "user", "content": message.content}]
    reply = cl.Message(content="")
    try:
        wants_hint = message.content.strip().casefold().rstrip(".!") == "preciso de uma dica"
        await express(state, "encouraging" if wants_hint else "thinking")
        async for token in stream_reply(messages):
            await reply.stream_token(token)
        reply.metadata = {"study_reply_to": message.id}
        await reply.send()
        history.extend([
            {"role": "user", "content": message.content},
            {"role": "assistant", "content": reply.content},
        ])
    except ValueError as exc:
        await cl.Message(content=str(exc)).send()
    except Exception:
        await cl.Message(content=("Não consegui obter uma resposta. Confira a conexão, "
                                  "a chave e a disponibilidade da API e tente novamente.")).send()
    finally:
        await finish_turn(state, turn)

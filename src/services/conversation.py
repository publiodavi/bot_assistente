"""Reconstrução pura de autoria e contexto de conversas."""
import json
from src.prompts.companions import DEFAULT_NAMES
from src.services.escada import as_context, layers, parse_step


def author_of(step):
    """Personagem que assinou uma resposta gravada.

    Antes dos apelidos individuais, todos os companheiros se chamavam "Lumi"; por
    isso o nome sozinho não identifica o personagem. Sem o registro, o selo mostra
    apenas o nome gravado como autor.
    """
    saved = (step.get("metadata") or {}).get("study_companion")
    return saved if saved in DEFAULT_NAMES else None



def stored_step(metadata):
    """Revalida os dados da escada gravados no passo; formatos antigos viram None."""
    saved = metadata.get("study_step")
    if not isinstance(saved, dict):
        return None
    step = parse_step(json.dumps(saved))
    if step:
        revealed = saved.get("reveladas")
        step["reveladas"] = revealed if type(revealed) is int and 0 <= revealed <= layers(step) else 0
        sources = clean_sources(saved.get("fontes"))
        if sources:
            step["fontes"] = sources
    return step


def clean_sources(value):
    """Fontes consultadas nos materiais; só o servidor as grava, nunca o modelo."""
    if not isinstance(value, list):
        return []
    sources = []
    for item in value[:3]:
        if (isinstance(item, dict) and isinstance(item.get("nome"), str) and item["nome"].strip()
                and type(item.get("pagina")) is int and 1 <= item["pagina"] <= 9999):
            sources.append({"nome": item["nome"].strip()[:80], "pagina": item["pagina"]})
    return sources


def restore_history(steps):
    """Turnos concluídos (id da pergunta, pergunta, resposta visível, escada, id da resposta)."""
    users = {step["id"]: step.get("output") for step in steps if step.get("type") == "user_message"}
    history = []
    for step in steps:
        metadata = step.get("metadata") or {}
        if (step.get("type") != "assistant_message" or step.get("streaming") or step.get("isError")
                or metadata.get("study_interrupted")):
            continue
        question_id = metadata.get("study_reply_to")
        prompt = users.get(question_id)
        if prompt and step.get("output"):
            history.append((question_id, prompt, step["output"], stored_step(metadata), step["id"]))
    return history


def conversation_context(history, message, present_ids):
    """Mantém apenas os turnos cujas perguntas ainda estão na conversa.

    Ao editar uma mensagem, o Chainlit remove as mensagens seguintes da tela e do
    banco e chama on_message novamente com o mesmo ID; os turnos removidos e o
    turno antigo da pergunta editada não podem continuar no contexto do modelo.
    A resposta volta ao modelo no mesmo formato pedido, com as camadas reveladas.
    """
    present = set(present_ids)
    history[:] = [turn for turn in history if turn[0] in present and turn[0] != message.id]
    return [entry for _, prompt, answer, step, _ in history for entry in (
        {"role": "user", "content": prompt}, {"role": "assistant", "content": as_context(answer, step)},
    )]

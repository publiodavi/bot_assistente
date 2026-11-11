"""ReconstruÃ§Ã£o pura de autoria e contexto de conversas."""
import json
from src.prompts.companions import DEFAULT_NAMES
from src.services.escada import as_context, layers, parse_step


def author_of(step):
    """Personagem que assinou uma resposta gravada.

    Antes dos apelidos individuais, todos os companheiros se chamavam "Lumi"; por
    isso o nome sozinho nÃ£o identifica o personagem. Sem o registro, o selo mostra
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
    return step


def restore_history(steps):
    """Turnos concluÃ­dos (id da pergunta, pergunta, resposta visÃ­vel, escada, id da resposta)."""
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


def conversation_context(history, message, present_ids):
    """MantÃ©m apenas os turnos cujas perguntas ainda estÃ£o na conversa.

    Ao editar uma mensagem, o Chainlit remove as mensagens seguintes da tela e do
    banco e chama on_message novamente com o mesmo ID; os turnos removidos e o
    turno antigo da pergunta editada nÃ£o podem continuar no contexto do modelo.
    A resposta volta ao modelo no mesmo formato pedido, com as camadas reveladas.
    """
    present = set(present_ids)
    history[:] = [turn for turn in history if turn[0] in present and turn[0] != message.id]
    return [entry for _, prompt, answer, step, _ in history for entry in (
        {"role": "user", "content": prompt}, {"role": "assistant", "content": as_context(answer, step)},
    )]

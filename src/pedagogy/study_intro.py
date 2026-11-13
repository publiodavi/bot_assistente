"""Objetivos e dificuldades oferecidos na introdução e transições da tela de entrada."""

GOALS = {
    "entender": "Entender um conceito",
    "destravar": "Destravar uma dúvida",
    "praticar": "Praticar um assunto",
}
BARRIERS = {
    "comecar": "Começar", "proximo": "Escolher o próximo passo",
    "conferir": "Conferir meu raciocínio",
}


def intro_transition(profile, command, value):
    """Próximo estado da introdução a partir do comando recebido da interface."""
    if command in ("begin", "replay"):
        return {"intro": "topic", "hint": ""}
    if command == "skip":
        return {"intro": "skipped", "hint": ""}
    return {}

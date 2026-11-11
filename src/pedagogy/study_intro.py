"""Preferências gerais da entrada por assunto."""

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
    if command in ("begin", "replay"):
        return {"intro": "topic", "hint": ""}
    if command == "skip":
        return {"intro": "skipped", "hint": ""}
    return {}

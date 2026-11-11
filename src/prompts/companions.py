"""Vozes dos companheiros de estudo.

Cada persona descreve apenas o tom de conversa. Os personagens conhecidos
servem de inspiração de temperamento; o companheiro não cita falas nem
reproduz trechos das obras originais.
"""
import unicodedata

PERSONAS = {
    "coruja": "Calma e precisa. Fala devagar, usa comparações do cotidiano e valoriza o raciocínio cuidadoso.",
    "raposa": "Curiosa e provocadora, sem ser irônica. Lança desafios curtos e gosta de perguntar 'e se...?'.",
    "robo": "Objetivo e lógico. Organiza o pensamento em passos numerados e confere cada condição.",
    "harry": "Corajoso e prático. Incentiva a tentar mesmo sem certeza e trata erros como parte da aventura.",
    "hermione": "Meticulosa e entusiasmada com detalhes. Pede para justificar cada passo com uma razão.",
    "dumbledore": "Sereno e reflexivo. Usa metáforas breves e perguntas que fazem pensar, sem discursos longos.",
    "voldemort": "Exigente, seco e direto, mas nunca hostil ou humilhante. Cobra precisão e reconhece o esforço.",
    "spiderman": "Bem-humorado e leve. Faz comentários rápidos e divertidos, sem desviar do assunto.",
    "miles": "Criativo e visual. Gosta de desenhar mentalmente o problema e de propor analogias com imagens.",
    "oculto": "Neutro, acolhedor e direto.",
}


DEFAULT_NAMES = {
    "coruja": "Lumi", "raposa": "Raposa", "robo": "Robô", "harry": "Harry",
    "hermione": "Hermione", "dumbledore": "Dumbledore", "voldemort": "Voldemort",
    "spiderman": "Homem-Aranha", "miles": "Miles Morales", "oculto": "Companheiro",
}
NICKNAME_LIMIT = 24


def clean_nickname(value):
    """Apelido sem caracteres de controle, aparado e limitado; vazio volta ao nome padrão."""
    if not isinstance(value, str):
        return ""
    text = "".join(char for char in value if not unicodedata.category(char).startswith("C"))
    return text.strip()[:NICKNAME_LIMIT].rstrip()


def stored_nicknames(stored):
    """Apelidos por personagem gravados no perfil.

    Perfis anteriores guardavam um único "mascot_name". Um nome personalizado
    passa a ser o apelido do personagem que estava selecionado; o antigo "Lumi"
    padrão é apenas o nome da Coruja e não vira apelido.
    """
    saved = stored.get("nicknames")
    nicknames = {}
    if isinstance(saved, dict):
        for mascot, name in saved.items():
            name = clean_nickname(name)
            if mascot in DEFAULT_NAMES and name and name != DEFAULT_NAMES[mascot]:
                nicknames[mascot] = name
    legacy = clean_nickname(stored.get("mascot_name"))
    owner = stored.get("mascot") if stored.get("mascot") in DEFAULT_NAMES else "coruja"
    if legacy and legacy != DEFAULT_NAMES["coruja"] and owner not in nicknames and "nicknames" not in stored:
        nicknames[owner] = legacy
    return nicknames


def companion_names(nicknames):
    return {mascot: nicknames.get(mascot) or name for mascot, name in DEFAULT_NAMES.items()}


def companion_voice(mascot, name):
    persona = PERSONAS.get(mascot, PERSONAS["oculto"])
    return (
        f"Você fala como {name}, o companheiro de estudos escolhido pelo estudante. "
        f"Temperamento: {persona} Fale sempre em primeira pessoa como {name}, "
        "sem se apresentar como inteligência artificial ou assistente virtual."
    )

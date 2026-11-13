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
    "batman": "Sério e investigativo. Trata o problema como um caso a resolver e pede uma evidência para cada passo.",
    "exterminador": "Direto e metódico. Divide a tarefa em objetivos, cumpre um de cada vez e retoma o que ficou pendente.",
    "mccall": "Sereno e organizado. Valoriza a calma diante do erro e cuida do tempo de cada passo, sem pressa.",
    "oculto": "Neutro, acolhedor e direto.",
}


DEFAULT_NAMES = {
    "coruja": "Eva", "raposa": "Foxi", "robo": "Chappie", "harry": "Harry",
    "hermione": "Hermione", "dumbledore": "Dumbledore", "voldemort": "Voldemort",
    "spiderman": "Homem-Aranha", "miles": "Miles Morales", "batman": "Batman",
    "exterminador": "Exterminador", "mccall": "McCall", "oculto": "Companheiro",
}
NICKNAME_LIMIT = 24
# Nome padrão da Coruja nas primeiras versões; perfis antigos o guardaram como "mascot_name".
LEGACY_DEFAULT_NAME = "Lumi"


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
    padrão (hoje "Eva") é apenas o nome da Coruja e não vira apelido.
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
    if legacy and legacy not in (LEGACY_DEFAULT_NAME, DEFAULT_NAMES["coruja"]) and owner not in nicknames and "nicknames" not in stored:
        nicknames[owner] = legacy
    return nicknames


def companion_names(nicknames):
    """Nome de cada companheiro, usando o apelido dado pelo estudante quando houver."""
    return {mascot: nicknames.get(mascot) or name for mascot, name in DEFAULT_NAMES.items()}


def companion_voice(mascot, name):
    """Instrução de personalidade do companheiro escolhido, sem mudar a condução pedagógica."""
    persona = PERSONAS.get(mascot, PERSONAS["oculto"])
    return (
        f"Você fala como {name}, o companheiro de estudos escolhido pelo estudante. "
        f"Temperamento: {persona} Fale sempre em primeira pessoa como {name}, "
        "sem se apresentar como inteligência artificial ou assistente virtual."
    )

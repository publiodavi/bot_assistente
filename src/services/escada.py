"""Separação entre o texto visível da resposta e os dados da Escada de dicas.

O modelo escreve primeiro o texto que o estudante lê e, depois de uma linha
com o delimitador, um objeto JSON com as dicas em camadas. Durante o
streaming, apenas o texto anterior ao delimitador é repassado à interface.
"""
import json
import re

DELIMITER = "@@ESCADA@@"
KINDS = ("pergunta", "dica", "verificacao", "conquista", "ensino")
MAX_HINTS = 3
MAX_TEXT = 600


class EscadaStream:
    """Recebe tokens e devolve somente a parte visível, sem vazar o delimitador."""

    def __init__(self):
        self.visible = ""
        self.tail = ""
        self.block = None

    def feed(self, token):
        """Recebe um trecho do streaming e devolve só o texto visível, guardando o que vier
        depois do marcador @@ESCADA@@, inclusive quando o marcador chega partido."""
        if self.block is not None:
            self.block += token
            return ""
        text = self.tail + token
        index = text.find(DELIMITER)
        if index >= 0:
            self.block = text[index + len(DELIMITER):]
            self.tail = ""
            return self._emit(text[:index])
        # Guarda um possível começo do delimitador partido entre tokens.
        keep = 0
        for size in range(min(len(DELIMITER) - 1, len(text)), 0, -1):
            if DELIMITER.startswith(text[-size:]):
                keep = size
                break
        self.tail = text[len(text) - keep:] if keep else ""
        return self._emit(text[:len(text) - keep])

    def finish(self):
        """Libera o que restou e devolve os dados validados (ou None)."""
        rest = self._emit(self.tail) if self.block is None else ""
        self.tail = ""
        return rest, parse_step(self.block)

    def _emit(self, text):
        self.visible += text
        return text


_FORMAT_ECHO = re.compile(r"\s*\(?\b(tipo|degrau)\s*:\s*[\wçãéí]+\)?\.?\s*$", re.IGNORECASE)


def tidy_visible(text):
    """Remove eco do formato no fim do texto (ex.: "Tipo: ensino."), que o modelo às vezes repete."""
    cleaned = text.rstrip()
    while True:
        trimmed = _FORMAT_ECHO.sub("", cleaned)
        if trimmed == cleaned:
            return cleaned
        cleaned = trimmed.rstrip()


def _clean(value, limit=MAX_TEXT):
    if not isinstance(value, str):
        return ""
    text = "".join(char for char in value if char in "\n\t" or char.isprintable()).strip()
    return text[:limit].rstrip()


def _clean_list(value, limit=4):
    if not isinstance(value, list):
        return []
    return [text for text in (_clean(item, 240) for item in value[:limit]) if text]


def parse_step(block):
    """Valida o JSON da escada. Qualquer formato inesperado resulta em None."""
    if not block:
        return None
    raw = block.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw[raw.find("{"):] if "{" in raw else ""
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(raw[start:end + 1])
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    kind = data.get("tipo")
    step = {
        "tipo": kind if kind in KINDS else "pergunta",
        "degrau": data["degrau"] if type(data.get("degrau")) is int and 1 <= data["degrau"] <= 50 else 1,
        "subiu_sozinho": data.get("subiu_sozinho") is True,
        "dicas": _clean_list(data.get("dicas"), MAX_HINTS),
        "exemplo_parcial": _clean(data.get("exemplo_parcial")),
        "pronto_para_ensinar": data.get("pronto_para_ensinar") is True,
        "reveladas": 0,
    }
    nota = data.get("nota")
    if step["tipo"] == "ensino" and isinstance(nota, dict):
        step["nota"] = {"claro": _clean_list(nota.get("claro")), "faltou": _clean_list(nota.get("faltou"))}
    return step


def layers(step):
    """Quantidade de camadas reveláveis: dicas e, por último, o exemplo parcial."""
    return len(step["dicas"]) + (1 if step["exemplo_parcial"] else 0)


def as_context(visible, step):
    """Reconstrói a resposta no formato pedido ao modelo para o histórico."""
    if not step:
        return visible
    return f"{visible}\n{DELIMITER}\n{json.dumps(step, ensure_ascii=False)}"

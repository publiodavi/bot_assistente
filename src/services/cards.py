"""Flash cards: validação dos cartões gerados e revisão espaçada em caixas (Leitner)."""
import json
import re
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from src.services.study_tools import clean_text

MIN_CARDS, MAX_CARDS = 4, 20
COUNTS = (5, 10, 15, 20)
FRONT_LIMIT, BACK_LIMIT = 160, 400
# "Lembrei" sobe uma caixa; cada caixa adia mais a próxima vez.
GOOD_INTERVALS = (7, 14, 30)
RATINGS = {"again": "Não lembrei", "hard": "Quase", "good": "Lembrei"}


def _short(value, limit):
    if not isinstance(value, str):
        return ""
    text = " ".join(clean_text(value[:limit * 2], limit * 2).split())
    return text[:limit].rstrip()


def parse_deck(text, now=None, wanted=10):
    """Lista de cartões válidos a partir da resposta da IA; erro se não houver o mínimo.

    Cartões complementares (fora da conversa, mesmo tema) chegam com "extra": true."""
    wanted = min(max(int(wanted), 1), MAX_CARDS)
    now = now or datetime.now(timezone.utc)
    if not isinstance(text, str):
        raise ValueError("Resposta vazia.")
    # A IA pode cercar o JSON com texto ou bloco de código; usa o primeiro objeto completo.
    match = re.search(r"\{.*\}", text, re.S)
    try:
        data = json.loads(match.group(0) if match else text)
    except (json.JSONDecodeError, AttributeError) as exc:
        raise ValueError("Os cartões vieram em formato inválido.") from exc
    raw = data.get("cartoes") if isinstance(data, dict) else data
    if not isinstance(raw, list):
        raise ValueError("Os cartões vieram em formato inválido.")
    cards, seen = [], set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        front, back = _short(item.get("frente"), FRONT_LIMIT), _short(item.get("verso"), BACK_LIMIT)
        key = front.casefold()
        if not front or not back or key in seen:
            continue
        seen.add(key)
        cards.append({"id": uuid4().hex[:10], "frente": front, "verso": back,
                      "caixa": 0, "due": now.isoformat(), "extra": item.get("extra") is True})
        if len(cards) == wanted:
            break
    if len(cards) < min(MIN_CARDS, wanted):
        raise ValueError("A conversa ainda não rendeu cartões suficientes.")
    return cards


def rate_card(card, rating, now=None):
    """Nova caixa e data do cartão conforme a lembrança informada pelo estudante."""
    if rating not in RATINGS:
        raise ValueError("Avaliação inválida.")
    now = now or datetime.now(timezone.utc)
    box = card.get("caixa") if type(card.get("caixa")) is int and 0 <= card.get("caixa") <= len(GOOD_INTERVALS) else 0
    if rating == "again":
        box, days = 0, 1
    elif rating == "hard":
        days = 3
    else:
        box = min(box + 1, len(GOOD_INTERVALS))
        days = GOOD_INTERVALS[box - 1]
    return {**card, "caixa": box, "due": (now + timedelta(days=days)).isoformat(), "last": rating}


def is_due(card, until):
    try:
        return datetime.fromisoformat(card["due"]) <= until
    except (KeyError, TypeError, ValueError):
        return True


def deck_summary(thread_id, deck):
    """Resumo leve do baralho: as datas bastam para o cliente contar o que vence no dia local."""
    cards = deck.get("cards") if isinstance(deck, dict) and isinstance(deck.get("cards"), list) else []
    return {"thread_id": thread_id, "total": len(cards),
            "dues": [card.get("due") for card in cards if isinstance(card, dict) and isinstance(card.get("due"), str)]}


def transcript(history, limit=6000):
    """Texto das trocas concluídas, das mais recentes para trás, dentro do limite de caracteres."""
    parts, size = [], 0
    for _, prompt, answer, *_ in reversed(history):
        entry = f"Estudante: {prompt}\nCompanheiro: {answer}"
        if size + len(entry) > limit and parts:
            break
        parts.append(entry[:limit])
        size += len(entry)
    return "\n\n".join(reversed(parts))

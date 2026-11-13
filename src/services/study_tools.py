"""Validação pura das ferramentas de estudo e imagens de perfil."""
import base64
import struct
import unicodedata
from datetime import datetime, timedelta, timezone

MOODS = {
    "curioso": "Acolha a curiosidade e proponha uma pergunta exploratória curta.",
    "cansado": "Use uma explicação breve, com um passo pequeno por vez e sem pressão.",
    "travado": "Ajude a identificar o primeiro passo com uma pista concreta e curta.",
    "ansioso": "Use um tom tranquilo, sem cobrança, e proponha uma ação pequena e possível.",
}


def clean_text(value, limit):
    if not isinstance(value, str) or len(value) > limit:
        raise ValueError("Texto inválido ou muito longo.")
    return "".join(c for c in value if not unicodedata.category(c).startswith("C") or c == "\n").strip()


# Revisão espaçada: a primeira em 3 dias; cada revisão feita adia a próxima; depois da última, encerra.
REVIEW_INTERVALS = (3, 7, 14, 30)


def review_count(note):
    count = note.get("reviews")
    return count if type(count) is int and 0 <= count <= len(REVIEW_INTERVALS) else 0


def note_update(notes, thread_id, text, review=False, now=None):
    """Uma descoberta por conversa; datas UTC e revisão opcional em três dias.

    Reescrever a descoberta mantém a revisão já agendada e a contagem de revisões feitas."""
    text = clean_text(text, 1000)
    if not text or type(review) is not bool:
        raise ValueError("Escreva sua descoberta.")
    now = now or datetime.now(timezone.utc)
    previous = next((n for n in notes if isinstance(n, dict) and n.get("thread_id") == thread_id), {})
    entries = [dict(n) for n in notes if isinstance(n, dict) and n.get("thread_id") != thread_id]
    if len(entries) >= 100:
        raise ValueError("O fichário aceita até 100 descobertas.")
    scheduled = previous.get("review_at") if isinstance(previous.get("review_at"), str) else None
    review_at = (scheduled or (now + timedelta(days=REVIEW_INTERVALS[0])).isoformat()) if review else None
    entries.insert(0, {"thread_id": thread_id, "text": text, "date": now.isoformat(),
                       "review_at": review_at, "reviews": review_count(previous)})
    return entries


def review_note(notes, thread_id):
    """Texto da descoberta com revisão agendada nesta conversa, ou None."""
    for note in notes:
        if (isinstance(note, dict) and note.get("thread_id") == thread_id
                and isinstance(note.get("review_at"), str) and isinstance(note.get("text"), str)):
            return note["text"]
    return None


def review_done(notes, thread_id, now=None):
    """Registra uma revisão feita e agenda a próxima no intervalo seguinte."""
    now = now or datetime.now(timezone.utc)
    result, found = [], False
    for note in notes:
        if (isinstance(note, dict) and note.get("thread_id") == thread_id
                and isinstance(note.get("review_at"), str)):
            count = min(review_count(note) + 1, len(REVIEW_INTERVALS))
            following = (now + timedelta(days=REVIEW_INTERVALS[count])).isoformat() if count < len(REVIEW_INTERVALS) else None
            note = {**note, "reviews": count, "review_at": following, "reviewed_at": now.isoformat()}
            found = True
        result.append(note)
    if not found:
        raise ValueError("Não há revisão marcada para este caderno.")
    return result


def validate_avatar(value):
    """Aceita referências locais ou WebP estático 256px com estrutura RIFF válida."""
    if not isinstance(value, dict) or value.get("kind") not in ("initials", "illustration", "upload"):
        raise ValueError("Avatar inválido.")
    kind = value["kind"]
    if kind == "initials":
        color = value.get("color", "terra")
        if color not in ("terra", "verde", "azul", "ameixa"):
            raise ValueError("Cor inválida.")
        return {"kind": kind, "color": color}
    if kind == "illustration":
        identifier = value.get("id")
        allowed = {f"student-{i}" for i in range(1, 9)} | {
            "coruja", "raposa", "robo", "harry", "hermione", "dumbledore", "voldemort", "spiderman", "miles",
            "batman", "exterminador", "mccall"}
        if identifier not in allowed:
            raise ValueError("Ilustração inválida.")
        return {"kind": kind, "id": identifier}
    source = value.get("data")
    prefix = "data:image/webp;base64,"
    if not isinstance(source, str) or not source.startswith(prefix) or len(source) > 110000:
        raise ValueError("Envie uma imagem WebP de até 80 KB.")
    try:
        data = base64.b64decode(source[len(prefix):], validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise ValueError("Imagem inválida.") from exc
    if not 20 <= len(data) <= 80 * 1024 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("Imagem inválida.")
    if struct.unpack_from("<I", data, 4)[0] != len(data) - 8:
        raise ValueError("Imagem incompleta.")
    offset, dimensions, frames = 12, None, 0
    while offset < len(data):
        if offset + 8 > len(data):
            raise ValueError("Imagem incompleta.")
        tag = data[offset:offset+4]
        size = struct.unpack_from("<I", data, offset+4)[0]
        payload = data[offset+8:offset+8+size]
        if len(payload) != size or tag in (b"ANIM", b"ANMF", b"EXIF", b"XMP "):
            raise ValueError("Use uma imagem estática sem metadados.")
        if tag == b"VP8 " and len(payload) >= 10 and payload[3:6] == b"\x9d\x01\x2a":
            width, height = struct.unpack_from("<HH", payload, 6)
            dimensions = (width & 0x3fff, height & 0x3fff)
            frames += 1
        elif tag == b"VP8L" and len(payload) >= 5 and payload[0] == 0x2f:
            bits = int.from_bytes(payload[1:5], "little")
            dimensions = ((bits & 0x3fff)+1, ((bits >> 14) & 0x3fff)+1)
            frames += 1
        elif tag == b"VP8X" and (len(payload) < 10 or payload[0] & 2):
            raise ValueError("Imagem animada inválida.")
        elif tag not in (b"VP8X", b"ALPH", b"VP8 ", b"VP8L", b"ICCP"):
            raise ValueError("Estrutura de imagem não permitida.")
        offset += 8 + size + size % 2
    if dimensions != (256, 256) or frames != 1 or offset != len(data):
        raise ValueError("O avatar deve ter 256 × 256 pixels.")
    return {"kind": kind, "data": source}

"""Regressões puras da escada, apelidos, contexto e ferramentas."""
import base64
import json
import struct
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from src.services.escada import DELIMITER, EscadaStream, parse_step, layers, tidy_visible
from src.prompts.companions import clean_nickname, stored_nicknames, companion_names
from src.services.conversation import author_of, restore_history, conversation_context
from src.services.study_tools import note_update, validate_avatar, clean_text


class EscadaTests(unittest.TestCase):
    def test_delimitador_partido_em_qualquer_token(self):
        text = "Uma pista.\n" + DELIMITER + '\n{"tipo":"dica","degrau":3,"dicas":["Tente separar os dados."]}'
        for boundary in range(len(text) + 1):
            stream = EscadaStream()
            visible = stream.feed(text[:boundary]) + stream.feed(text[boundary:])
            tail, step = stream.finish()
            self.assertEqual(visible + tail, "Uma pista.\n")
            self.assertEqual(step["degrau"], 3)

    def test_json_invalido_preserva_texto(self):
        stream = EscadaStream()
        self.assertEqual(stream.feed("Olá " + DELIMITER + "{x}"), "Olá ")
        self.assertEqual(stream.finish(), ("", None))

    def test_validacao_limites(self):
        step = parse_step(json.dumps({"degrau": True, "dicas": ["a"] * 10, "exemplo_parcial": "x" * 900}))
        self.assertEqual(step["degrau"], 1)
        self.assertEqual(layers(step), 4)
        self.assertEqual(len(step["exemplo_parcial"]), 600)
        self.assertEqual(tidy_visible("Resposta. Tipo: ensino."), "Resposta.")


class CompanionTests(unittest.TestCase):
    def test_apelido_migra_somente_personagem_anterior(self):
        names = stored_nicknames({"mascot": "harry", "mascot_name": "Meu guia"})
        self.assertEqual(names, {"harry": "Meu guia"})
        self.assertEqual(companion_names(names)["coruja"], "Lumi")
        self.assertEqual(stored_nicknames({"mascot": "harry", "mascot_name": "Lumi"}), {})

    def test_limite_controles_e_reset(self):
        self.assertEqual(clean_nickname("  A\x00B  "), "AB")
        self.assertEqual(len(clean_nickname("á" * 50)), 24)
        self.assertEqual(stored_nicknames({"mascot_name": "Antigo", "nicknames": {}}), {})
        self.assertEqual(stored_nicknames({"nicknames": {"invalido": "X"}}), {})


class ConversationTests(unittest.TestCase):
    def test_somente_pares_concluidos_com_autoria(self):
        steps = [{"id": "q", "type": "user_message", "output": "Pergunta"},
                 {"id": "a", "type": "assistant_message", "output": "Pista", "metadata": {"study_reply_to": "q", "study_companion": "harry"}},
                 {"id": "b", "type": "assistant_message", "output": "Interrompida", "streaming": True, "metadata": {"study_reply_to": "q"}},
                 {"id": "c", "type": "assistant_message", "output": "Técnica"}]
        restored = restore_history(steps)
        self.assertEqual(len(restored), 1)
        self.assertEqual(author_of(steps[1]), "harry")
        self.assertIsNone(author_of({"name": "Lumi"}))
        self.assertEqual(restored[0][4], "a")

    def test_edicao_remove_turno_editado_e_posteriores(self):
        history = [("a", "A", "1", None, "r1"), ("b", "B", "2", None, "r2"), ("c", "C", "3", None, "r3")]
        result = conversation_context(history, SimpleNamespace(id="b"), ["a", "b"])
        self.assertEqual(history, [("a", "A", "1", None, "r1")])
        self.assertEqual([item["content"] for item in result], ["A", "1"])


class ToolTests(unittest.TestCase):
    def test_nota_unica_revisao_e_limite(self):
        now = datetime(2026, 11, 11, tzinfo=timezone.utc)
        notes = note_update([], "thread", "Entendi o primeiro passo.", True, now)
        updated = note_update(notes, "thread", "Reescrevi.", False, now)
        self.assertEqual(len(updated), 1)
        self.assertEqual(notes[0]["review_at"], "2026-11-14T00:00:00+00:00")
        with self.assertRaises(ValueError): note_update([], "thread", "x" * 1001)
        with self.assertRaises(ValueError): note_update([{"thread_id": str(i)} for i in range(100)], "nova", "x")

    def test_avatar_apenas_referencias_permitidas(self):
        self.assertEqual(validate_avatar({"kind": "illustration", "id": "student-8"})["id"], "student-8")
        for invalid in ({"kind": "illustration", "id": "../env"}, {"kind": "initials", "color": "url(x)"},
                        {"kind": "upload", "data": "data:image/svg+xml,<svg/>"}, {"kind": "upload", "data": "data:image/webp;base64,AAAA"}):
            with self.assertRaises(ValueError): validate_avatar(invalid)

    def test_avatar_rejeita_animacao_e_tamanho_falso(self):
        chunk = b"ANIM" + struct.pack("<I", 6) + b"123456"
        data = b"RIFF" + struct.pack("<I", len(chunk) + 4) + b"WEBP" + chunk
        with self.assertRaises(ValueError): validate_avatar({"kind": "upload", "data": "data:image/webp;base64," + base64.b64encode(data).decode()})
        with self.assertRaises(ValueError): clean_text("x" * 121, 120)


if __name__ == "__main__":
    unittest.main()

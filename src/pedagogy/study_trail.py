"""Conteúdo da trilha piloto de ADS."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Question:
    prompt: str
    choices: dict[str, str]
    answer: str
    hint: str
    explanation: str


QUESTIONS = (
    Question(
        prompt="Uma pilha recebe A, depois B e depois C. Qual elemento sai no primeiro pop?",
        choices={"a": "A", "b": "B", "c": "C"},
        answer="c",
        hint="Imagine uma pilha de livros. Qual deles está no topo após a última inserção?",
        explanation="O primeiro pop remove C. Uma pilha remove primeiro o último item inserido.",
    ),
    Question(
        prompt="Em SQL, qual cláusula filtra as linhas antes de um GROUP BY?",
        choices={"a": "ORDER BY", "b": "WHERE", "c": "HAVING"},
        answer="b",
        hint="Procure a cláusula que avalia cada linha individualmente antes de formar os grupos.",
        explanation="WHERE filtra as linhas de entrada. HAVING filtra os grupos após a agregação.",
    ),
)

# APÊNDICE A – QUESTIONÁRIO DE AVALIAÇÃO PROPOSTO

Questionário proposto para estudos futuros, ainda não aplicado. A Parte 2 traz os dez itens da System Usability Scale (BROOKE, 1996) em tradução livre dos autores, feita a partir do original em inglês. Essa tradução não foi validada; antes de qualquer aplicação, recomenda-se substituí-la por uma versão em português já validada na literatura e citar sua fonte. As partes 3 e 4 foram elaboradas pelos autores e ficam fora do cálculo da pontuação SUS. As afirmações das partes 2 e 3 devem ser respondidas em uma escala de 1 (discordo totalmente) a 5 (concordo totalmente).

**Parte 1 – Perfil do participante**

- curso e semestre;
- frequência com que usa assistentes de IA para estudar (nunca, às vezes, frequentemente);
- assunto estudado durante o teste.

**Parte 2 – Usabilidade (System Usability Scale)**

- 1. Eu acho que gostaria de usar este sistema com frequência.
- 2. Eu achei o sistema desnecessariamente complexo.
- 3. Eu achei o sistema fácil de usar.
- 4. Eu acho que precisaria de ajuda de uma pessoa com conhecimentos técnicos para usar o sistema.
- 5. Eu achei que as várias funções do sistema estão bem integradas.
- 6. Eu achei que o sistema apresenta muita inconsistência.
- 7. Eu imagino que as pessoas aprenderão a usar este sistema rapidamente.
- 8. Eu achei o sistema muito complicado de usar.
- 9. Eu me senti confiante ao usar o sistema.
- 10. Eu precisei aprender várias coisas antes de conseguir usar o sistema.

**Parte 3 – Experiência pedagógica**

- 11. As explicações do companheiro foram claras para um assunto que eu não conhecia.
- 12. As dicas me ajudaram a avançar sem entregar a resposta pronta.
- 13. Eu senti que eu mesmo cheguei à resposta.
- 14. Explicar o conteúdo para o companheiro (modo Aprende) me ajudou a perceber o que eu ainda não sabia.
- 15. A Revisão do dia e os flash cards me ajudaram a lembrar o que estudei.
- 16. O ambiente visual e o companheiro deixaram o estudo mais agradável.
- 17. O ambiente visual ou as animações me distraíram.

**Parte 4 – Perguntas abertas**

- 18. O que mais ajudou no seu estudo?
- 19. O que atrapalhou ou causou confusão?
- 20. O que você mudaria no sistema?

Para a análise da Parte 2, usa-se o cálculo proposto por Brooke (1996): nos itens ímpares subtrai-se 1 da resposta, nos itens pares subtrai-se a resposta de 5, e a soma é multiplicada por 2,5. O resultado é uma pontuação de 0 a 100, que não deve ser lida como porcentagem.

# APÊNDICE B – ROTEIRO DE TESTE COM USUÁRIOS

Roteiro sugerido para sessões futuras de teste, de aproximadamente 30 minutos, a ser usado com o questionário do Apêndice A. Ele não foi usado na avaliação exploratória descrita no capítulo 5.

- 1. Entrar no sistema com a própria conta Google e conferir o tutorial "Como usar".
- 2. Abrir um caderno sobre um assunto que o participante ainda não domina e ler a primeira explicação.
- 3. Responder à pergunta do companheiro e, se travar, abrir as dicas uma de cada vez.
- 4. Avançar ao menos dois degraus e conferir a escada completa na barra de estudo.
- 5. Usar o modo Aprende e explicar o conteúdo ao companheiro; ler a nota recebida.
- 6. Registrar uma descoberta no Fichário, com revisão agendada.
- 7. Gerar 5 flash cards do caderno e revisá-los com "Acertei" e "Errei".
- 8. Trocar o ambiente visual e o companheiro durante a conversa.
- 9. Iniciar uma sessão de foco com tempo curto e observar a tela de pausa.
- 10. Responder ao questionário.

Durante a sessão, o observador registra, sem interferir, os pontos em que o participante hesita, erra ou pede ajuda, usando o modelo de registro do relatório de testes: data, testador, dispositivo, função, passos para reproduzir, resultado esperado, resultado obtido, gravidade e situação.

# APÊNDICE C – NÚCLEO DAS INSTRUÇÕES PEDAGÓGICAS

Trecho das instruções de sistema enviadas ao modelo de linguagem em toda conversa, extraído do arquivo src/prompts/pedagogical_prompt.py.

!CODE|Quadro 8 – Trecho das instruções de sistema|src/prompts/pedagogical_prompt.py (2026).
Sua abordagem é inspirada na Zona de Desenvolvimento Proximal de Vygotsky:
primeiro você mostra o caminho, depois acompanha o estudante e, aos poucos,
retira o apoio conforme ele demonstra compreensão.
Não afirme fazer diagnóstico clínico nem invente fatos ou fontes.
Reconheça suas limitações.

Como conduzir:
- Assunto novo: quando o estudante pede para aprender ou entender algo e
  ainda não mostrou o que sabe sobre isso, ENSINE primeiro. Explique a ideia
  central em linguagem simples, mostre um exemplo concreto resolvido passo a
  passo e, se ajudar, use uma comparação do dia a dia. Depois da explicação,
  termine obrigatoriamente com uma pergunta de checagem, fácil e sobre o que
  acabou de explicar.
- Tentativa ou dúvida concreta: não entregue a solução completa. Diga
  especificamente o que estava certo e ofereça uma pista por vez para o
  próximo passo.
- Pedido explícito de explicação: explique com clareza, mesmo no meio da
  conversa.
- Reduza o apoio quando o estudante acertar sozinho; aumente quando ele
  travar.

Estilo de escrita:
- Toda resposta termina com uma única pergunta. Ela deve ser direta, em
  português simples, sobre um ponto já explicado, e possível de responder
  em uma ou duas frases.
- Não faça perguntas vagas ("O que você acha?", "Faz sentido?") nem duas
  perguntas juntas.
!ENDCODE

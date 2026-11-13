# Passo a Passo

Um assistente de estudos com inteligência artificial que acompanha o raciocínio do estudante **um degrau de cada vez**. A proposta se inspira na Zona de Desenvolvimento Proximal de Vygotsky: o companheiro primeiro mostra o caminho e, à medida que o estudante avança, retira o apoio aos poucos.

## Como funciona

- **Explica primeiro, pergunta depois.** Em um assunto novo, o companheiro apresenta a ideia central com um exemplo e só então faz uma pergunta curta para conferir o entendimento.
- **Escada de dicas.** Abaixo de cada resposta, as dicas abrem uma por vez, só quando o estudante precisar. Cada degrau marca um avanço no raciocínio; "subiu sozinho" indica que o avanço veio sem dicas.
- **Guia ou Aprende.** No modo Guia, o companheiro conduz. No modo Aprende, o estudante explica o conteúdo e recebe um retorno sobre o que ficou claro e o que faltou.

## Ferramentas

- **Revisão do dia:** traz de volta as descobertas do Fichário e os flash cards na hora de revisar, por recuperação ativa.
- **Fichário de descobertas:** registro, com as palavras do próprio estudante, do que passou a fazer sentido.
- **Flash cards:** cartões gerados a partir da conversa, com a quantidade escolhida, revisados em intervalos crescentes.
- **Materiais:** PDFs da faculdade (apostilas, livros e listas) consultados nas respostas, com a página citada.
- **Foco:** sessões de estudo com pausa, que cobre a tela quando o tempo termina.
- **Temas e Companheiros:** seis ambientes visuais e personagens com vozes diferentes.

Use o botão **Como usar** no topo da página para um passo a passo.

## Privacidade e limites

- Os materiais enviados ficam associados apenas à conta de quem os enviou. O arquivo PDF não é guardado; apenas o texto, dividido em trechos para consulta.
- As respostas são geradas por um modelo de linguagem (DeepSeek) e podem conter erros. Confira informações importantes em fontes confiáveis.
- O companheiro não faz diagnóstico de nenhum tipo e não substitui professores ou profissionais.

## Autoria

Trabalho de Graduação (TG) do **Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas** da **Faculdade de Tecnologia de Guarulhos (Fatec Guarulhos)**, 2026.

- **Autor:** Davi de Souza Públio
- **Disciplina de Trabalho de Graduação:** Prof.ª Jane Maria dos Santos Eberson

Projeto de pesquisa: *Assistente virtual para auxílio a estudantes com dificuldade de aprendizado*.

## Tecnologias

Python, Chainlit, API da DeepSeek (compatível com o SDK da OpenAI), PostgreSQL, ChromaDB e pypdf.

## Créditos

- Fontes locais distribuídas sob licenças abertas (SIL Open Font License).
- Os personagens de obras conhecidas (como Harry Potter, Homem-Aranha, Batman, O Exterminador do Futuro e O Protetor) são ilustrações próprias, inspiradas nessas obras, feitas para uso acadêmico e sem fins comerciais. Os direitos sobre os personagens originais pertencem aos respectivos titulares.

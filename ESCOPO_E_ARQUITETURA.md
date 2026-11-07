# Escopo e Arquitetura do Projeto

Este documento descreve o escopo do protótipo, as etapas de desenvolvimento e a divisão modular de responsabilidades da equipe.

## Metodologia de Desenvolvimento

O projeto é conduzido por meio de uma **metodologia de desenvolvimento iterativo e incremental**. Cada fase entrega um incremento funcional do protótipo, que é avaliado e refinado nas iterações seguintes. Essa abordagem permite validar hipóteses pedagógicas e técnicas continuamente, sem comprometer a qualidade da entrega final.

## Etapas de Desenvolvimento Iterativo

### Fase 1 — Core e Conexão LLM

**Objetivo:** estabelecer a fundação técnica do protótipo: ambiente de desenvolvimento, comunicação com o modelo de linguagem e fluxo mínimo de conversação.

Entregáveis:
- [ ] Configuração do ambiente (ambiente virtual, variáveis de ambiente e dependências).
- [ ] Cliente de conexão com a API DeepSeek via SDK compatível com OpenAI (`src/services/llm_client.py`).
- [ ] Fluxo básico de pergunta e resposta no Chainlit (`src/app.py`).
- [ ] Versionamento e organização inicial do repositório.

**Critério de aceite:** o assistente responde a mensagens do usuário por meio do modelo de linguagem configurado, com streaming de resposta na interface.

### Fase 2 — Engenharia Pedagógica e RAG

**Objetivo:** conferir ao assistente a identidade pedagógica fundamentada na ZDP de Vygotsky e ancorar as respostas no conteúdo das disciplinas.

Entregáveis:
- [ ] Prompt de sistema baseado na ZDP com regras de andaimento pedagógico (`src/prompts/pedagogical_prompt.py`).
- [ ] Fluxo de diagnóstico inicial de lacunas de conhecimento.
- [ ] Pipeline RAG: leitura de PDFs, segmentação de texto, indexação no ChromaDB e busca semântica (`src/rag/indexer.py`).
- [ ] Integração do contexto recuperado ao prompt enviado ao modelo.

**Critério de aceite:** o assistente não entrega respostas prontas; apresenta dicas graduais e perguntas instigantes, fundamentadas nos PDFs indexados.

### Fase 3 — Interface e Validação de Usabilidade

**Objetivo:** aprimorar a experiência do usuário e validar a eficácia pedagógica do protótipo junto ao público-alvo.

Entregáveis:
- [ ] Refinamento da interface conversacional (mensagens de boas-vindas, indicadores de progresso, exibição da trilha de estudos).
- [ ] Roteiro de testes de usabilidade com estudantes do ensino superior.
- [ ] Definição de métricas (engajamento, satisfação, evolução percebida do aprendizado).
- [ ] Ajustes iterativos com base nos resultados dos testes.

**Critério de aceite:** protótipo avaliado positivamente em testes de usabilidade; métricas coletadas e analisadas.

## Divisão Modular de Responsabilidades da Equipe

### Frente A — Core IA, Engenharia de Prompt Pedagógico ZDP e Integração com o Modelo de Linguagem

Responsabilidades:
- Implementação e manutenção do cliente de conexão com a API DeepSeek (`src/services/llm_client.py`).
- Engenharia do prompt de sistema fundamentado na ZDP de Vygotsky (`src/prompts/pedagogical_prompt.py`).
- Estratégias de andaimento (dicas graduais, perguntas instigantes, retirada progressiva do suporte).
- Curadoria das referências teóricas (Vygotsky; Luckin et al.; Zawacki-Richter et al.).
- Avaliação da qualidade pedagógica das respostas do modelo.

### Frente B — Interface Conversacional Chainlit, Pipeline RAG Local para PDFs e Roteiro de Testes de Usabilidade/Métricas

Responsabilidades:
- Implementação da interface conversacional e gerenciamento de sessão (`src/app.py`).
- Pipeline RAG local: processamento de PDFs, indexação no ChromaDB e busca semântica (`src/rag/indexer.py`).
- Organização da base de conhecimento em `data/materiais/`.
- Elaboração e aplicação do roteiro de testes de usabilidade.
- Definição e coleta de métricas de avaliação do protótipo.

## Checklist de Requisitos Funcionais do Protótipo

- [ ] **Diagnóstico inicial:** o assistente realiza perguntas para mapear as lacunas de conhecimento do estudante no início da sessão.
- [ ] **Suporte com andaimento pedagógico:** o assistente guia o estudante com dicas graduais e perguntas instigantes, sem entregar respostas prontas, reduzindo o auxílio conforme o estudante progride.
- [ ] **Sugestão de trilha de estudo:** com base no diagnóstico, o assistente propõe uma sequência personalizada de conteúdos e atividades.
- [ ] **Fundamentação em material didático:** as respostas consideram trechos recuperados dos PDFs das disciplinas via RAG.
- [ ] **Interação em linguagem natural:** a conversa flui em português, em tom acadêmico e acolhedor, adaptado ao ritmo do estudante.
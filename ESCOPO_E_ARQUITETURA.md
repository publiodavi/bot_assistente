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

## Personalização da experiência de estudos

No modo autenticado, o OAuth nativo usa o identificador estável do Google. A camada SQLAlchemy do Chainlit persiste usuários, conversas e passos no PostgreSQL. As preferências e a introdução ficam em `study_profiles` e a etapa concluída fica em `study_trail_progress`. A retomada recompõe o contexto do modelo apenas com pares de mensagens concluídos, vinculados pelo ID da pergunta. O histórico usa as verificações de propriedade do Chainlit e o compartilhamento está desabilitado.

As galerias aplicam tema, aparência e companheiro imediatamente e enviam a escolha pelo canal do chat. A interface mantém a última escolha em tela durante o salvamento e confirma a preferência no cache daquela conta após resposta do servidor. O painel lateral mantém nome do companheiro e nível de dicas. A entrada recebe qualquer assunto e gera a primeira mensagem da conversa, substituindo o exercício fixo.

O painel nativo do Chainlit envia nome do companheiro e nível de dicas para `src/app.py`. Ele permanece acessível durante o streaming pelo botão no cabeçalho. O servidor valida os valores e guarda os controles de execução na sessão ativa, enquanto os dados duráveis ficam no banco. O JavaScript aplica `data-study-theme`, `data-study-appearance` e `data-study-motion`. O nível de dicas é capturado no início de cada resposta. As conversas antigas com a trilha piloto preservam sua retomada.

- **Afetividade e presença social.** O agente visual indica que a resposta está sendo preparada, acolhe novas tentativas e reconhece o progresso. A avaliação pode investigar o acolhimento percebido. [Lester et al., 1997](https://chi1997.acm.org/proceedings/paper/jl.html)
- **Carga cognitiva.** Os controles mantêm a mesma posição em todos os temas. Textura e movimento são contidos e o apoio pedagógico é entregue em passos. A avaliação pode investigar a facilidade para localizar ações e acompanhar as dicas. [Harp e Mayer, 1998](https://doi.org/10.1037/0022-0663.90.3.414)
- **Gamificação e autonomia.** A escolha do ambiente dá ao estudante controle sobre a apresentação, enquanto o feedback e o desbloqueio tornam visível o progresso da atividade. A avaliação pode investigar autonomia e clareza de progresso percebidas. [Sailer et al., 2017](https://doi.org/10.1016/j.chb.2016.12.033), [van Roy e Zaman, 2019](https://www.sciencedirect.com/science/article/pii/S1071581918301927)

### Piloto de usabilidade proposto

Aplicar duas tarefas equivalentes a estudantes universitários, alternando a ordem entre a interface padrão e a personalizada. Registrar conclusão, tempo para localizar as configurações e erros de navegação. Após cada tarefa, coletar respostas em escala de cinco pontos sobre autonomia, acolhimento, clareza do progresso e distração. Interpretar os resultados como dados exploratórios de usabilidade e aceitação.

### Verificação técnica

Na revisão de ambientes animados, as oito combinações de tema e aparência foram conferidas no navegador e os tokens passaram nos testes de contraste de texto e controles. A entrada por assunto foi exercitada com biologia, literatura, matemática, inglês e programação usando respostas simuladas. O PostgreSQL oficial local passou por testes de reconexão, perfis isolados, recuperação de mensagens, trilha, renomeação e exclusão com contas fictícias. O projeto e o cliente OAuth reais foram criados no Google Cloud, com aceite da política autorizado pelo responsável. As credenciais foram salvas no `.env` local e a tela de entrada Google foi verificada após reiniciar o servidor na porta 8103. A inclusão de usuários de teste e o primeiro login real ainda dependem da sessão Google do responsável; não foram registrados como testes concluídos.

A galeria, o retorno ao tema confirmado após falha, a mini prática, a repetição da introdução e o pulo foram exercitados no Edge com largura de 320 px. A migração e a camada SQLAlchemy foram exercitadas em PostgreSQL temporário via PGlite Socket, com usuários fictícios, verificação de propriedade, persistência de perfil e trilha, recomposição do contexto, renomeação e exclusão. A validação do OAuth real exige as credenciais e a URL de retorno do projeto Google.

O fluxo em português brasileiro foi exercitado no Edge. Foram verificados os quatro temas, a preservação do rascunho, a restauração das preferências, o armazenamento bloqueado, a trilha com clique duplicado, o layout de 320 px, o acionamento do mascote por teclado e toque emulado e a preferência por movimento reduzido. A troca de tema durante uma resposta, a mudança de nível no turno seguinte, o cancelamento e a recuperação após falha foram verificados com streaming simulado. A estrutura para tecnologias assistivas foi conferida na árvore de acessibilidade do navegador.

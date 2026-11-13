# AjudAI — revisão de segurança e passagem para revisão independente

Data: 13/11/2026. Repositório: https://github.com/publiodavi/bot_assistente.

## Objetivo e instruções do responsável

O responsável pediu uma revisão de segurança com correções, preservando identidade visual, stack, orientação pedagógica, funcionalidades e dados. Autorizou limites discretos contra abuso, acesso público por contas Google verificadas e publicação na Railway. Solicitou este documento para que o Claude revise e opine de forma independente.

Não interpretar este relatório como certificação de segurança, teste com estudantes ou demonstração de eficácia pedagógica. A base anterior à revisão é o commit `6ee9470`. O arquivo não versionado `Projeto de Pesquisa - Davi Públio.docx` não foi alterado nem incluído nas mudanças.

## Situação da publicação

As alterações foram implementadas e validadas localmente. O resultado da publicação e das verificações externas será acrescentado ao final deste documento. Não considerar a configuração Google nem o deploy concluídos antes desse registro.

## Achados e tratamento

| Achado | Evidência e risco | Tratamento |
|---|---|---|
| Login restrito ao proprietário | A variável efetiva `STUDY_ALLOWED_EMAILS` da Railway continha apenas o e-mail do responsável. O callback devolvia `None` para outras contas e o Chainlit mostrava `oauthSignin`. | A imagem define `STUDY_ACCESS_MODE=public`. Nesse modo, ignora uma lista antiga de convites, mas exige e-mail verificado. `invited` preserva a opção de restringir convidados. |
| Feedback sem autorização de objeto | As rotas nativas chamavam gravação/exclusão apenas pelo ID recebido, sem checar o proprietário. | Rotas prioritárias autenticam a conta e usam `secure_feedback`, com validação da mensagem, do feedback e de propriedade; não permitem transferir um feedback para outra mensagem. |
| Colisão de IDs de mensagens | O navegador escolhe o UUID; a camada original faz upsert sem condicionar a conversa de destino. | A nova camada mantém `threadId` imutável e restringe o conflito no próprio SQL. O adaptador também recusa mensagens já existentes e limpa autoria/metadados vindos do cliente. |
| Elementos com destino controlado pelo cliente | A sessão era checada, mas os IDs do elemento/conversa/mensagem também precisam de autorização. | Validam-se sessão, conversa, mensagem vinculada e elemento persistido. O caminho personalizado aceita somente `EscadaDicas`. A exclusão no banco fica restrita à conta e à conversa da sessão. |
| Upload excessivo | Configuração nativa permitia qualquer tipo até 500 MB; o handler lia antes de validar. | 25 MiB por arquivo e 30 MiB por corpo multipart, contados antes do parser, inclusive sem `Content-Length`. Anônimos são recusados antes do corpo em produção. Anexos nativos permanecem disponíveis, com 20 arquivos/100 MiB por sessão e download como anexo. |
| PDFs custosos | A extração em thread não tinha prazo real nem limite de expansão. Cancelar a espera não interromperia o parser. | Processo separado: 60 s, 512 MiB de espaço de endereçamento e limite de CPU no Linux; 400 páginas, 2 milhões de caracteres, 3.000 trechos. Fila com um indexador ativo, oito admissões por instância e três materiais pendentes/ativos por conta. |
| Consumo de IA entre abas | As barreiras da interface e o estado por sessão não impediam uso simultâneo por uma mesma conta em outras sessões. | Concessões e eventos curtos no PostgreSQL, serializados pela linha da conta, com liberação em `finally` e expiração. |
| Origens e cookies | `allow_origins=["*"]`; cookie OAuth sem `Secure`, observado no deploy anterior. | Origens derivadas de `CHAINLIT_URL`, aplicadas ao CORS e Socket.IO; proteção de origem nas operações mutáveis; cookies `Secure` em produção, mantendo `HttpOnly` e `SameSite=Lax`. |
| Cabeçalhos ausentes | Consultas públicas anteriores não mostraram HSTS, `nosniff`, proteção contra enquadramento nem política de referência. | Middleware adiciona essas proteções, `no-store` em rotas de dados e CSP apenas em modo de relatório. |
| Demonstração em produção por configuração incompleta | A ausência das duas credenciais Google habilitava demonstração mesmo no deploy. | Produção exige Google OAuth, PostgreSQL, chave DeepSeek, segredo de sessão de ao menos 32 caracteres e URL HTTPS. Desenvolvimento mantém demonstração. |
| Falta de cópia recuperável no plano Railway | O painel informa que a criação de backups requer outro plano; não foi contratada assinatura. | Antes da primeira migração 004, copia tabelas do app e o índice Chroma para o volume privado. A restauração do banco foi testada em schema vazio. |

Severidade é uma priorização de engenharia, não pontuação CVSS calculada para o aplicativo. Falhas de autorização dependem de identificadores conhecidos; UUIDs não substituem autorização.

## Organização da implementação

- `src/security.py`: configuração de produção, origens e middleware ASGI. O corpo é recebido em arquivo temporário com limite antes do parser; a leitura também tem prazo. Os cabeçalhos são acrescentados sem mudar o conteúdo das respostas.
- `src/security_chainlit.py`: adaptador para Chainlit 2.12.0. Registra rotas prioritárias para feedback, elementos e upload nativo; envolve os handlers de conexão/mensagem/edição do Socket.IO. Mensagens do cliente recebem tipo e autoria controlados pelo servidor. Não há alteração de arquivos em `.venv`.
- `src/security_data.py`: subclasse da camada SQLAlchemy. Mantém a correção UTC anterior e protege upsert de passos, feedback e exclusão de elementos. Colunas são explicitamente permitidas, sem interpolar nomes recebidos do navegador.
- `src/security_limits.py` e migração `004_security_usage.sql`: histórico curto e concessões expirantes por conta. Não alteram tabelas anteriores nem removem histórico.
- `src/rag/safe_extract.py` e `pdf_worker.py`: execução descartável do parser, sem chaves no ambiente do subprocesso, com encerramento ao exceder o prazo. O índice continua no processo principal e a busca continua filtrada pela conta.
- `src/services/backups.py`: exportação consistente das tabelas conhecidas em COPY binário, metadados de schema e hashes; restauração somente em schema vazio e na mesma versão principal do PostgreSQL.
- `src/app.py`: integra as barreiras, limita a fila, fecha uploads e remove os PDFs temporários, limpa indexações parciais e marca trabalhos interrompidos como erro recuperável após reinício.
- `src/services/llm_client.py`: limites compartilhados, prazo total de 120 segundos, até 8.192 tokens de saída, sem repetição automática de chamadas e fechamento explícito do cliente/stream.
- `Dockerfile`: produção e acesso público explícitos, pip 26.3 e cópia anterior à migração antes de iniciar o app. Não foram acrescentadas dependências Python de aplicação.
- `start.ps1` e `scripts/migrate.py`: o início local passa a aplicar as migrações; o migrador lê o `.env` local sem sobrescrever variáveis fornecidas pelo ambiente.
- `public/custom.js`: aviso específico para recusa por convite ou e-mail não verificado, sem mostrar detalhes internos ou tokens.
- `public/privacy.html`: aviso factual sobre conta Google, armazenamento na Railway, envio de contexto/trechos à DeepSeek, armazenamento no navegador, remoção e limitações das cópias. Página adicional sem reorganizar o fluxo de estudos.

## Contrato de acesso e limites

`STUDY_ACCESS_MODE=public`: qualquer conta Google com e-mail verificado pode entrar, independentemente da lista legada. `STUDY_ACCESS_MODE=invited`: aplica a lista `STUDY_ALLOWED_EMAILS`; uma lista vazia mantém o comportamento anterior de permitir contas verificadas. Na imagem Docker, o padrão explícito é `public`; no desenvolvimento sem variável, é `invited`.

| Operação | Limite |
|---|---|
| Chat | Uma geração por conta, 10 por minuto |
| Flash cards | Uma geração por conta, 5 em 10 minutos |
| Chamadas de IA | 120 s totais, 8.192 tokens de saída, sem retry automático |
| Mensagem nova/editada | 20.000 caracteres; histórico armazenado preservado |
| Upload | 25 MiB por arquivo; 30 MiB por requisição multipart |
| Admissão de upload | Uma por conta por vez, 20 por minuto |
| Anexos nativos | 20 arquivos e 100 MiB acumulados por sessão |
| Materiais | 20 por conta; até três ativos/pendentes por conta |
| Fila global de materiais | Oito admissões por instância; um indexador ativo |
| PDF | 400 páginas; 2 milhões de caracteres; 3.000 trechos; 60 s de extração |

As concessões expiram em 130 s para recuperar processos encerrados abruptamente. Eventos com mais de um dia são removidos durante novas admissões da própria conta. Limites por conta não representam teto de gastos global nem proteção completa contra criação de muitas contas.

## Testes executados

1. **45 testes no Windows passaram**, incluindo os 22 anteriores, 17 testes novos de fronteira HTTP/OAuth/payload/PDF e seis testes de integração PostgreSQL. Os testes de banco criam e removem apenas schemas com prefixo `security_test_` e UUID, usando conexão local explicitamente fornecida.
2. **Imagem Linux**: 39 testes passaram e seis de PostgreSQL foram explicitamente ignorados por não haver `STUDY_TEST_DATABASE_URL`. A integração de banco foi executada separadamente no Windows, sem ignorar esses seis.
3. **HTTP e WebSocket em Docker, com PostgreSQL descartável e IA simulada**: duas contas fictícias criaram respostas em streaming persistidas; acesso ao histórico de outra conta recebeu 401. Foram exercitados temas, aparência, companheiro, perfil, Fichário, modo aprendiz, flash cards, Escada, feedback, renomeação, edição e anexos nativos.
4. **PDF com texto real em Docker**: extração no subprocesso, indexação, consulta com fontes na resposta e exclusão legítima passaram. Exclusão pela outra conta retornou 404.
5. **Cópia e restauração**: contas e mensagens fictícias foram restauradas em schema vazio; a tentativa de restaurar em schema já ocupado foi recusada. A imagem com o comando real de produção criou a cópia anterior à migração e respondeu 200 no login, 401 nas áreas protegidas, com cabeçalhos aplicados.
6. **Verificações estáticas**: `compileall`, `node --check public/custom.js`, `git diff --check` e `pip check`.

O provedor simulado foi usado somente em uma instância local, com credenciais fictícias. A imagem publicada não contém rotas de login de teste nem provedor simulado: o harness está em `.local/`, excluído pelo `.dockerignore` e pelo Git. O teste não comprova comportamento de respostas da DeepSeek real nem login de duas pessoas reais.

## Dependências e segredos

A consulta à OSV cobriu 172 distribuições instaladas no ambiente local. Encontrou avisos no ChromaDB 1.5.9 e no pip 25.0.1. O pip foi atualizado para 26.3 no ambiente virtual e fixado nessa versão na instalação da imagem.

A consulta também foi repetida para as 172 distribuições efetivamente instaladas na imagem Linux final. Restaram apenas os avisos do ChromaDB discutidos abaixo; nenhum aviso de pip foi retornado para a imagem corrigida. Ausência de aviso na OSV não equivale a ausência de vulnerabilidade.

O PyPI consultado oferecia ChromaDB 1.5.9 como versão atual; os avisos consultados não indicavam uma versão corrigida disponível. As condições descritas envolvem a API HTTP do servidor Chroma, configuração remota de embeddings e/ou seu RBAC. O aplicativo usa `PersistentClient` local, uma função de embeddings escolhida pelo servidor e filtros por conta, sem publicar um servidor Chroma. Não foi alegada correção dessas CVEs por atualização; a exposição descrita é evitada nesta arquitetura. Essa conclusão precisa ser reavaliada se o Chroma passar a ser um serviço de rede.

Referências:

- https://github.com/Chainlit/chainlit/security/advisories
- https://github.com/advisories/GHSA-4hhp-mjp7-37r2 — feedback, aviso público não revisado; leitura do código instalado confirmou a ausência da checagem original.
- https://osv.dev/vulnerability/GHSA-f4j7-r4q5-qw2c
- https://osv.dev/vulnerability/GHSA-36p7-vc44-83pf
- https://osv.dev/vulnerability/GHSA-2wm9-hf6c-p5cr
- https://osv.dev/vulnerability/GHSA-xph7-9rjv-w5fr

MCP continua desativado. As correções oficiais de MCP do Chainlit 2.12.0 não resolvem, por si, as falhas de autorização de objetos tratadas pelo adaptador.

Foram examinados 146 objetos de texto do histórico Git por padrões de chaves de API e chaves privadas, sem correspondências. Também não foram encontrados arquivos `.env`/chaves privadas versionados na inspeção por nomes. Isso não constitui prova de inexistência de segredos: padrões incompletos, arquivos binários e dados fora do Git exigem outros métodos. Credenciais reais não foram incluídas no relatório ou nos testes fictícios.

## Recuperação e limites da intervenção

- Cópia anterior à migração: `/data/backups/security-before-004/`. `database/` contém manifesto e arquivos COPY; `chroma/` contém o índice anterior, se existente; o arquivo `complete` marca conclusão.
- A cópia está no mesmo volume do app: protege contra problemas lógicos desta implantação, mas não contra perda ou exclusão do volume. É necessário manter uma cópia externa para esse cenário.
- O formato é voltado às tabelas conhecidas do AjudAI, não a roles, extensões, outros schemas ou outros bancos. O manifesto é confiável apenas quando vem do volume administrado pelo responsável; não usar arquivos de origem desconhecida para restauração.
- A restauração não apaga nem sobrescreve tabelas existentes. Recuperação em produção deve ser ensaiada em banco separado e executada com o app parado. O índice Chroma também requer versão compatível.
- O índice local e a reconciliação de trabalhos foram projetados para **uma réplica**, como no deploy observado. Múltiplas réplicas precisam de fila e armazenamento coordenados.
- CSP é somente relatório. Não foi alegada prevenção completa de XSS. HTML inseguro continua desativado e os componentes próprios mantêm renderização por texto/React.
- No Windows, o subprocesso tem prazo de execução, mas os limites `resource` de memória/CPU só se aplicam no Linux. A validação de produção foi feita em Docker Linux.
- A validação estrutural de avatar já existente não se tornou um decodificador completo de imagens. Não foi acrescentada biblioteca de imagem nem alterado o fluxo de avatar.
- Não houve pentest externo, teste de carga em produção, validação com estudantes ou garantia de ausência de outras vulnerabilidades.

## O que pedir ao Claude para revisar

Revise o diff contra `6ee9470` e este relatório. Priorize autorização de objetos, atomicidade SQL, compatibilidade do adaptador com Chainlit 2.12.0, cancelamento/liberação de concessões, limites antes do parser, encerramento do subprocesso, consistência/recuperação do índice e restauração das cópias. Procure regressões nas funcionalidades existentes e diferenças entre as afirmações e os testes.

Preserve a stack Python + Chainlit + DeepSeek, a orientação pedagógica e os dados. Não exponha credenciais, não execute testes destrutivos em produção e não substitua o framework como parte desta revisão. Questione explicitamente decisões de risco residual e proponha correções pontuais com evidência, sem assumir que a revisão anterior está correta.

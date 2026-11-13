# Segurança do AjudAI

Este documento descreve as proteções do AjudAI publicado, os limites de uso, os testes que as verificam e os riscos que permanecem. Ele não é uma certificação de segurança: não houve pentest externo nem teste de carga em produção.

## Problemas tratados

| Problema | Risco | Tratamento |
|---|---|---|
| Login restrito a uma lista antiga | Contas fora da lista recebiam erro no login publicado. | `STUDY_ACCESS_MODE=public` aceita qualquer conta Google com e-mail verificado; `invited` restringe à lista `STUDY_ALLOWED_EMAILS`. |
| Avaliações (feedback) sem verificação de dono | As rotas nativas gravavam e excluíam apenas pelo ID recebido. | Rotas próprias autenticam a conta e usam `secure_feedback`, que confere a mensagem, a avaliação e a propriedade. |
| Colisão de IDs de mensagens | O navegador escolhe o UUID, e a gravação original não conferia a conversa de destino. | A camada de dados mantém `threadId` imutável. Gatilhos no banco impedem transferir uma conversa de dono e mover mensagens, elementos e avaliações entre conversas. Mensagens repetidas são recusadas, e autoria e metadados vindos do cliente são descartados. |
| Elementos com destino escolhido pelo cliente | IDs de elemento, conversa e mensagem precisavam de autorização. | Sessão, conversa, mensagem e elemento são validados; o único elemento personalizado aceito é `EscadaDicas`. |
| Upload excessivo | A configuração original aceitava qualquer tipo até 500 MB e lia o arquivo antes de validar. | 25 MiB por arquivo e 30 MiB por requisição, contados antes do parser. Anexos nativos: 20 arquivos e 100 MiB por sessão. |
| PDFs pesados | A extração em thread não tinha prazo real. | Processo separado com prazo de 60 s e, no Linux, limites de CPU e memória; até 400 páginas, 2 milhões de caracteres e 3.000 trechos. |
| Uso simultâneo em várias abas | Os limites por sessão não impediam uso paralelo da mesma conta. | Reservas de uso no PostgreSQL, por conta, com liberação garantida e expiração. |
| Origens e cookies | CORS aberto e cookie OAuth sem `Secure`. | Origens derivadas de `CHAINLIT_URL`; cookies `Secure`, `HttpOnly` e `SameSite=Lax` em produção. |
| Cabeçalhos ausentes | Faltavam HSTS, `nosniff`, proteção contra enquadramento e política de referência. | Um middleware ASGI acrescenta esses cabeçalhos, `no-store` nas rotas de dados e CSP em modo de relatório. |
| Modo de demonstração em produção | Sem as credenciais Google, o app abria sem login mesmo publicado. | Em produção, o app só inicia com Google OAuth, PostgreSQL, chave DeepSeek, segredo de sessão com 32 caracteres ou mais e URL HTTPS. |
| Falta de cópia de segurança | O plano gratuito do Railway não oferece backups. | Antes da migração 004, as tabelas do app e o índice do Chroma são copiados para o volume privado. A restauração foi testada em um esquema vazio. |

## Onde cada proteção está

- `src/security.py`: validação da configuração de produção, origens permitidas e middleware ASGI (limite e prazo de leitura do corpo, cabeçalhos de segurança).
- `src/security_chainlit.py`: rotas e eventos do Chainlit 2.12.0 envolvidos com autorização (upload, avaliações, elementos, conexão e mensagens).
- `src/security_data.py`: camada de dados com verificação de propriedade em passos, avaliações e exclusão de elementos.
- `src/security_limits.py` e `migrations/004_security_usage.sql`, `005_usage_daily_index.sql`: reservas de uso, limites por minuto, cotas diárias por conta e teto global.
- `src/rag/safe_extract.py` e `src/rag/pdf_worker.py`: extração de PDF em processo separado, que não recebe as variáveis de credenciais no seu ambiente.
- `src/services/backups.py`: cópia e restauração das tabelas conhecidas do app.
- `src/services/llm_client.py`: prazo total de 120 segundos, até 2.048 tokens no chat e 8.192 na geração de flash cards, uma nova tentativa automática (`max_retries=1`).
- `public/privacy.html`: aviso de privacidade (conta Google, armazenamento no Railway, envio de trechos à DeepSeek, remoção de dados).

## Limites de uso

| Operação | Limite |
|---|---|
| Chat | Uma geração por vez por conta, 10 por minuto, 150 por dia |
| Flash cards | Uma geração por vez por conta, 5 a cada 10 minutos, 30 por dia |
| Envio de arquivos | Um por vez por conta, 20 por minuto, 40 por dia |
| Teto global diário | 3.000 mensagens, 400 gerações de cartões e 600 envios, ajustáveis por `STUDY_GLOBAL_DAILY_CHAT`, `STUDY_GLOBAL_DAILY_CARDS` e `STUDY_GLOBAL_DAILY_UPLOAD` |
| Mensagem nova ou editada | 20.000 caracteres |
| Materiais | 20 por conta, até três em processamento; oito admissões e um indexador ativo por instância |

As reservas expiram em 130 segundos, para não ficarem presas se um processo for encerrado de forma abrupta. Os limites por conta não impedem que alguém crie muitas contas; para isso existe o teto global.

## Testes

A suíte tem 49 testes automatizados. Todos passaram na execução final, inclusive os 7 de banco, que usam um PostgreSQL local e um esquema descartável (variável `STUDY_TEST_DATABASE_URL`). Eles cobrem cabeçalhos e cookies, origem das requisições e do WebSocket, limites de corpo e de upload, política de e-mail, configuração de produção, metadados forjados, PDF inválido, cotas, prazo do streaming, propriedade de avaliações e elementos, gatilhos do banco e cópia de segurança.

Também foram feitos testes em Docker com PostgreSQL descartável e respostas simuladas do modelo: duas contas fictícias criaram conversas, e o acesso de uma ao histórico da outra foi recusado (401). A extração de PDF, a consulta com fontes e a exclusão de materiais por outra conta (404) também foram verificadas.

No ambiente publicado, foram conferidos:
- `/login` e `/public/privacy.html` respondendo 200, e as rotas protegidas respondendo 401 sem autenticação;
- HSTS, `X-Frame-Options: DENY` e cookie OAuth com `Secure`, `HttpOnly` e `SameSite=Lax`;
- o login com duas contas Google distintas. As duas ainda não tinham cadernos, então esse teste não avaliou o acesso cruzado a históricos preenchidos; o isolamento foi verificado com as contas fictícias e com os testes automatizados.

## Dependências

A consulta à base OSV encontrou avisos no ChromaDB 1.5.9, sem versão corrigida disponível na época. Os avisos tratam da API HTTP do servidor Chroma, que o AjudAI não expõe: o índice é local (`PersistentClient`) e as buscas são filtradas por conta. Se o Chroma passar a ser um serviço de rede, essa avaliação precisa ser refeita. O pip foi fixado na versão 26.3 na imagem.

## Riscos que permanecem

- A cópia de segurança fica no mesmo volume do app. Ela protege contra problemas de migração, mas não contra a perda do volume; é recomendável manter uma cópia externa do PostgreSQL.
- A CSP está apenas em modo de relatório.
- No Windows, a extração de PDF tem prazo, mas os limites de CPU e memória só valem no Linux.
- O índice de materiais e a fila foram feitos para uma única réplica do app.
- O adaptador de segurança depende de interfaces internas do Chainlit 2.12.0 e precisa ser revisto antes de atualizar o framework.
- Anexos enviados pelo campo de mensagem são aceitos, mas não são lidos pelo modelo nem guardados de forma permanente.

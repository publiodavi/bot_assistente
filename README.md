# AjudAI

Assistente de estudos que conduz o estudante por etapas, com pistas graduais em vez de respostas prontas. A condução é inspirada na Zona de Desenvolvimento Proximal, de Vygotsky, e no conceito de andaimento (*scaffolding*).

**Acesse:** https://ajudai.up.railway.app (login com conta Google)

- **Trabalho de Graduação:** *Assistente virtual para auxílio a estudantes com dificuldade de aprendizado: o AjudAI*
- **Autores:** Arthur Germano e Davi de Souza Públio
- **Orientadora:** Prof.ª Esp. Jane Maria dos Santos Eberson
- **Fatec Guarulhos**, Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas, 2026
- **Monografia:** [DOCX](docs/TG_AjudAI_Arthur_Germano_Davi_Publio.docx) e [PDF](docs/TG_AjudAI_Arthur_Germano_Davi_Publio.pdf)

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Caderno por assunto | Cada conversa é um caderno aberto a partir de um assunto livre, com objetivo opcional (entender, destravar ou praticar). |
| Escada de dicas | Cada resposta traz até três pistas graduais e um exemplo parcial, abertos um de cada vez pelo estudante. |
| Modos Guia e Aprende | No Guia, o companheiro conduz; no Aprende, o estudante explica o conteúdo e recebe uma nota com o que ficou claro e o que faltou. |
| Níveis de apoio | Menos dicas, dicas guiadas ou mais apoio, escolhidos no perfil. |
| Fichário e Revisão do dia | Uma descoberta por caderno, revisada de memória em intervalos de 3, 7, 14 e 30 dias. |
| Flash cards | Baralhos de 5, 10, 15 ou 20 cartões gerados a partir da conversa, revisados em caixas de Leitner. |
| Materiais | PDFs do próprio estudante, indexados no ChromaDB e usados como fonte das pistas, com nome e página. |
| Foco | Sessões de estudo e pausa ajustáveis, tela de pausa e lembrete após 50 minutos de uso contínuo. |
| Personalização | Seis ambientes (claro e escuro), quatro cores de destaque, tamanho de texto e doze companheiros com apelido. |
| Histórico | Busca, retomada, renomeação e exclusão de cadernos por conta Google. |

## Arquitetura

```text
Navegador (Chainlit + custom.js, custom.css e EscadaDicas.jsx)
    |
    v
Servidor Python (src/app.py)
    +-- camada de segurança --------> limites HTTP, propriedade e cotas de uso
    +-- instruções pedagógicas -----> src/prompts
    +-- modelo de linguagem --------> API DeepSeek, com streaming
    +-- contas e dados -------------> PostgreSQL e Google OAuth
    +-- materiais em PDF -----------> extração em processo separado e ChromaDB
```

| Componente | Tecnologia |
|---|---|
| Aplicação | Python 3.11 ou superior |
| Interface | Chainlit 2.12.0, CSS, JavaScript e um componente React |
| Modelo de linguagem | DeepSeek, pelo SDK da OpenAI |
| Autenticação | Google OAuth |
| Banco de dados | PostgreSQL, com SQLAlchemy e asyncpg |
| Materiais | pypdf e ChromaDB |
| Publicação | Docker e Railway |

Cada resposta do modelo tem duas partes: o texto que o estudante lê e, depois do marcador `@@ESCADA@@`, um JSON com o degrau, as dicas e o exemplo parcial. O servidor separa as duas partes durante o streaming, valida o JSON e só envia as dicas quando o estudante pede.

## Estrutura do repositório

```text
src/
    app.py                  Ciclo da conversa, ferramentas de estudo e rotas dos materiais
    study_accounts.py       Login Google e consultas ao banco
    prompts/                Instruções pedagógicas e personalidade dos companheiros
    pedagogy/               Introdução e trilha legada
    services/               Escada de dicas, conversa, flash cards, Fichário, cliente da API e cópias de segurança
    rag/                    Extração de PDF, indexação e busca
    security*.py            Middleware, autorização, propriedade e cotas de uso
public/                     CSS, JavaScript, componente da Escada, fontes, cenas e companheiros
migrations/                 Estrutura do banco (001 a 005)
scripts/migrate.py          Aplicação das migrações
tests/                      Testes automatizados
docs/                       Publicação, segurança e monografia
Dockerfile                  Imagem de produção
start.ps1                   Inicialização local no Windows
.env.example                Variáveis de ambiente, sem credenciais
```

## Execução local

Requisitos: Python 3.11 ou superior e uma chave da API DeepSeek. PostgreSQL e um cliente OAuth do Google são necessários apenas para contas e histórico.

```powershell
git clone https://github.com/publiodavi/ajudai.git
cd ajudai
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Preencha `DEEPSEEK_API_KEY` no `.env` e inicie o app:

```powershell
.\.venv\Scripts\python.exe -m chainlit run src/app.py --headless --host 127.0.0.1 --port 8103
```

Acesse http://localhost:8103. Sem as credenciais do Google, o app roda em modo de demonstração, com as conversas apenas em memória. No Linux e no macOS, use `.venv/bin/python` e `cp .env.example .env`.

### Contas e histórico

1. Crie um banco PostgreSQL e informe `DATABASE_URL` no `.env`, no formato `postgresql+asyncpg://usuario:senha@localhost:5432/ajudai`.
2. Aplique as migrações com `python scripts/migrate.py`. Elas podem ser executadas novamente sem apagar dados.
3. No Google Cloud, crie um cliente OAuth do tipo **Aplicativo da Web** com o retorno `http://localhost:8103/auth/oauth/google/callback`.
4. Preencha `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET` e `CHAINLIT_AUTH_SECRET`. O segredo pode ser gerado com `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
5. Reinicie o app e entre com **Continuar com Google**.

No Windows, o `start.ps1` aplica as migrações e inicia o app na porta 8103.

## Testes

```powershell
.\.venv\Scripts\python.exe -m unittest
```

São 49 testes. Os de `tests/test_study.py` e `tests/test_security.py` não precisam de banco nem de credenciais e cobrem a Escada de dicas, o histórico, o Fichário, os flash cards, os materiais, os limites HTTP, a política de login, as cotas e o prazo do streaming. Os 7 de `tests/test_security_db.py` usam um esquema descartável num PostgreSQL local, indicado por `STUDY_TEST_DATABASE_URL`.

## Publicação e segurança

- [docs/PUBLICAR.md](docs/PUBLICAR.md): publicação no Railway com PostgreSQL, volume para os materiais e login Google.
- [docs/SEGURANCA.md](docs/SEGURANCA.md): proteções, limites de uso, testes de segurança e riscos que permanecem.

## Limitações

- As dicas e as avaliações de degrau são geradas pelo modelo de linguagem e podem variar ou conter erros.
- O projeto não mediu ganho de aprendizagem; a avaliação feita foi técnica e exploratória.
- A trilha fixa de exercícios de versões anteriores continua no código para manter compatibilidade com conversas antigas.

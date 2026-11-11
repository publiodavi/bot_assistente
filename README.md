# Passo a Passo

Assistente de estudos com orientação por etapas, ambientes personalizáveis e histórico de conversas por conta.

Projeto de Trabalho de Graduação do curso de Análise e Desenvolvimento de Sistemas da Fatec Guarulhos. A pesquisa tem como foco o apoio a estudantes com dificuldades de aprendizagem no ensino superior. O protótipo permite conversar sobre diferentes assuntos, sem limitar a entrada a uma disciplina ou área de conhecimento.

## Proposta

O Passo a Passo utiliza perguntas, dicas graduais e exemplos parciais para ajudar o estudante a desenvolver o próprio raciocínio. A abordagem é inspirada na Zona de Desenvolvimento Proximal de Vygotsky e no conceito de andaimento pedagógico (*scaffolding*).

A personalização visual e o companheiro de estudos complementam essa orientação. Seu efeito sobre acolhimento, autonomia e distração é uma hipótese de experiência do usuário a ser avaliada no TCC; a implementação, por si só, não demonstra ganhos de aprendizagem.

## Recursos implementados

- Conversa com respostas em streaming pela API DeepSeek.
- Entrada por assunto livre e objetivo opcional: entender um conceito, destravar uma dúvida ou praticar.
- Três níveis de apoio: menos dicas, dicas guiadas e mais apoio.
- Quatro ambientes: Caderno Vintage, Castelo da Magia, Herói Aracnídeo e Cyberpunk, todos com aparência clara e escura.
- Troca imediata de tema, aparência e companheiro, preservando a conversa e o rascunho.
- Companheiros com estados visuais de atenção, incentivo e progresso, incluindo a opção de ocultá-los.
- Animações de ambiente com pausa manual e respeito à preferência de movimento reduzido do sistema.
- Autenticação Google, perfil por conta e persistência de conversas em PostgreSQL, quando configurados.
- Histórico lateral com busca, retomada, renomeação e exclusão de conversas pelo Chainlit.
- Interface em português brasileiro, fontes locais e ajustes para telas pequenas.

## Arquitetura

```text
Estudante
    |
    v
Chainlit + CSS e JavaScript locais
    |
    +-- Preferências e perfil ----------> PostgreSQL
    +-- Conversas e mensagens ----------> PostgreSQL
    +-- Autenticação -------------------> Google OAuth
    |
    v
Prompt pedagógico + contexto da conversa
    |
    v
API DeepSeek -> resposta em streaming
```

O Python mantém o estado da conversa e valida as preferências. O navegador aplica os tokens visuais e atualiza os componentes pelo canal de mensagens do Chainlit. O perfil é persistido por conta; o contexto é reconstruído a partir das mensagens concluídas da conversa retomada.

| Componente | Tecnologia |
|---|---|
| Aplicação | Python 3.11 ou superior |
| Interface | Chainlit 2.12.0, CSS e JavaScript |
| Modelo de linguagem | DeepSeek pelo SDK compatível com OpenAI |
| Autenticação | Google OAuth pelo Chainlit |
| Persistência | PostgreSQL, SQLAlchemy e asyncpg |
| Configuração local | python-dotenv |

A recuperação de conteúdo em PDFs com RAG e as trilhas geradas a partir de diagnóstico ainda estão planejadas. O módulo de indexação contém a estrutura inicial, sem integração ao chat. A trilha fixa anterior permanece no código para compatibilidade com conversas existentes.

## Execução local

### Requisitos

- Python 3.11 ou superior; o ambiente local foi exercitado com Python 3.12.
- Chave válida da API DeepSeek para gerar respostas.
- PostgreSQL e cliente OAuth Google para habilitar contas e histórico persistente.

### Instalação no Windows

```powershell
git clone https://github.com/publiodavi/bot_assistente.git
cd bot_assistente
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edite o `.env` com a chave DeepSeek. Execute a cópia do arquivo de exemplo apenas na configuração inicial, preservando um `.env` que já contenha suas credenciais.

```dotenv
DEEPSEEK_API_KEY=sua_chave_aqui
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
CHAINLIT_URL=http://localhost:8103
```

Inicie o aplicativo:

```powershell
.\.venv\Scripts\python.exe -m chainlit run src/app.py --headless --host 127.0.0.1 --port 8103
```

Acesse [http://localhost:8103](http://localhost:8103). Sem as credenciais Google, o app funciona em modo demonstração, com conversas em memória. Esse modo também exige a chave DeepSeek para responder.

No Linux e no macOS, utilize `.venv/bin/python` e `cp .env.example .env` nos comandos equivalentes.

### Conta Google e histórico persistente

1. Crie um banco PostgreSQL e aplique as migrações, em ordem, a partir da raiz do repositório:

   ```shell
   psql -h localhost -U seu_usuario -d passo_a_passo -v ON_ERROR_STOP=1 -f migrations/001_study.sql
   psql -h localhost -U seu_usuario -d passo_a_passo -v ON_ERROR_STOP=1 -f migrations/002_chainlit_2_12_columns.sql
   ```

   A segunda migração acrescenta a coluna `autoCollapse`, exigida pelo Chainlit 2.12.0. Sem ela, as respostas enviadas pelo campo de mensagem não reaparecem quando a conversa é retomada. As duas migrações podem ser executadas novamente sem apagar dados.

2. No Google Cloud, configure a tela de consentimento e crie um cliente OAuth do tipo **Aplicativo da Web**. Cadastre o retorno exato:

   ```text
   http://localhost:8103/auth/oauth/google/callback
   ```

3. Para um aplicativo em teste, adicione as contas do piloto à lista de usuários de teste.
4. Preencha as variáveis abaixo no `.env`:

   ```dotenv
   OAUTH_GOOGLE_CLIENT_ID=
   OAUTH_GOOGLE_CLIENT_SECRET=
   CHAINLIT_AUTH_SECRET=
   DATABASE_URL=postgresql+asyncpg://usuario:senha@localhost:5432/passo_a_passo
   CHAINLIT_URL=http://localhost:8103
   ```

   Gere um segredo de sessão com `python -c "import secrets; print(secrets.token_urlsafe(48))"` e copie o resultado para `CHAINLIT_AUTH_SECRET`.

5. Reinicie o servidor e selecione **Continuar com Google**.

As quatro variáveis de conta devem estar preenchidas para ativar o modo autenticado. O histórico desta versão cobre mensagens de texto. Conversas anônimas anteriores não são migradas para as contas.

O script `start.ps1` inicia o app na porta 8103 e também inicia um PostgreSQL local já preparado em `.local/postgresql`, quando disponível. Ele não instala nem configura um banco em um novo computador. Binários, banco de dados e credenciais locais não fazem parte do repositório.

Referências de configuração: [OAuth no Chainlit](https://docs.chainlit.io/authentication/oauth) e [histórico de conversas](https://docs.chainlit.io/data-persistence/history).

## Estrutura do repositório

```text
.chainlit/
    config.toml                 Configuração da interface
    translations/pt-BR.json     Tradução brasileira
migrations/
    001_study.sql               Estrutura de persistência
public/
    custom.css                  Tokens, temas e componentes visuais
    custom.js                   Galerias, eventos e sincronização
    fonts/                      Fontes locais e licenças
    mascots/                    Imagens dos companheiros
    themes/                     Ilustrações dos ambientes
src/
    app.py                      Ciclo de vida e interação do chat
    study_accounts.py           Autenticação e dados por conta
    pedagogy/                   Introdução e trilha legada
    prompts/                    Orientação pedagógica
    services/llm_client.py       Integração com DeepSeek
    rag/indexer.py              Estrutura inicial de RAG
.env.example                    Variáveis necessárias, sem credenciais
start.ps1                       Inicialização local no Windows
ESCOPO_E_ARQUITETURA.md          Escopo e decisões do projeto
```

## Validação e limites do protótipo

Foram exercitados os oito ambientes visuais, a entrada por diferentes assuntos, a troca de preferências durante streaming simulado, o cancelamento e o layout de 320 px. Os tokens de texto e controles foram verificados quanto ao contraste. A persistência em PostgreSQL foi testada com usuários fictícios, incluindo isolamento de perfis, recuperação de mensagens, renomeação e exclusão.

Em 11/11/2026, o fluxo com uma conta Google real e a API DeepSeek foi verificado no navegador: login e criação do perfil, duas conversas de assuntos diferentes, renomeação, retomada pelo histórico, reinício do servidor com o contexto correto em cada conversa, edição de mensagem sem resíduos no contexto e restauração das preferências visuais a partir do banco, sem depender do cache do navegador. O isolamento visual entre duas contas Google ainda precisa ser conferido com uma segunda conta. Esses testes manuais não substituem um estudo de usabilidade com estudantes.

### Roteiro de demonstração

1. Entre na conta e informe um assunto e um objetivo de estudo.
2. Faça uma tentativa e peça uma dica para avançar no raciocínio.
3. Crie outra conversa sobre um assunto diferente e retome a primeira pelo histórico.
4. Durante uma resposta, altere o ambiente, a aparência e o companheiro.
5. Ajuste o nível de dicas e confira seu efeito no próximo turno.

## Referências acadêmicas

- VYGOTSKY, L. S. **A formação social da mente**. 7. ed. São Paulo: Martins Fontes, 2007.
- LUCKIN, R. et al. **Intelligence Unleashed: an argument for AI in education**. Londres: Pearson, 2016.
- ZAWACKI-RICHTER, O. et al. Systematic review of research on artificial intelligence applications in higher education — where are the educators? **International Journal of Educational Technology in Higher Education**, v. 16, n. 39, 2019.

A fundamentação de personalização, presença social e carga cognitiva está detalhada em [Escopo e arquitetura](ESCOPO_E_ARQUITETURA.md).

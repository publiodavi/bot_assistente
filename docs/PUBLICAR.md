# Publicação no Railway

Este guia descreve como publicar o AjudAI no Railway com banco PostgreSQL, volume para os materiais e login Google. As chaves e senhas são cadastradas apenas nos painéis do Railway e do Google Cloud, nunca no código.

## 1. Projeto

1. No Railway, crie um projeto com **New Project → Deploy from GitHub repo** e escolha o repositório `ajudai`.
2. O Railway usa o `Dockerfile` para construir a imagem. O primeiro deploy falha enquanto as variáveis não forem cadastradas.

## 2. Banco de dados e volume

1. Adicione um banco com **+ New → Database → PostgreSQL**.
2. No serviço do app, crie um volume em **Settings → Volumes → New Volume**, montado em `/data`. Nele ficam o índice dos materiais e o cache do modelo de busca.

## 3. Variáveis do serviço

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`, referência ao banco criado |
| `DEEPSEEK_API_KEY` | chave da API DeepSeek |
| `OAUTH_GOOGLE_CLIENT_ID` | ID do cliente OAuth do Google |
| `OAUTH_GOOGLE_CLIENT_SECRET` | segredo do cliente OAuth do Google |
| `CHAINLIT_AUTH_SECRET` | segredo de sessão com 32 caracteres ou mais, gerado com `python -m chainlit create-secret` |
| `CHAINLIT_URL` | endereço público do app, por exemplo `https://ajudai.up.railway.app`, sem barra no final |
| `STUDY_CHROMA_DIR` | `/data/chroma` |
| `STUDY_ACCESS_MODE` | `public` (qualquer conta Google verificada) ou `invited` (somente a lista abaixo) |
| `STUDY_ALLOWED_EMAILS` | vazio no modo `public`; no modo `invited`, e-mails separados por vírgula |

O `CHAINLIT_URL` define as origens aceitas pelo app. Ele deve conter só o endereço, sem `/login` nem o caminho do callback.

## 4. Endereço

Em **Settings → Networking**, gere um domínio público, por exemplo `https://ajudai.up.railway.app`, e use o mesmo endereço em `CHAINLIT_URL`.

## 5. Login com Google

No Google Cloud Console, no cliente OAuth usado pelo app:

1. Em **URIs de redirecionamento autorizados**, adicione `https://<domínio>/auth/oauth/google/callback`.
2. Na tela de consentimento, o status **Em teste** só permite os e-mails cadastrados como usuários de teste. O status **Em produção** permite qualquer conta Google, respeitando o `STUDY_ACCESS_MODE`.

## 6. Inicialização

A cada deploy, a imagem executa, nesta ordem:

1. a cópia de recuperação anterior à migração 004, feita uma única vez;
2. as migrações do banco;
3. o servidor do Chainlit.

Em produção, o app só inicia se as variáveis obrigatórias estiverem presentes. O primeiro envio de PDF demora alguns segundos a mais, porque o modelo de busca é baixado para o volume.

Cada `git push` para a branch `main` gera um novo deploy. O banco e o volume são preservados entre as versões.

## Cópia de segurança e restauração

Antes da primeira migração 004, o app copia as tabelas e o índice do ChromaDB para `/data/backups/security-before-004/`. O arquivo `complete` indica que a cópia terminou. Essa cópia fica no mesmo volume e não substitui um backup externo do PostgreSQL.

A restauração usa `src.services.backups.restore_database(connection, caminho_database)` num esquema vazio, com a mesma versão principal do PostgreSQL. Depois de restaurar, aplique as migrações novamente para recriar funções e gatilhos. Teste a restauração num banco separado antes de usá-la em produção.

## Custos

O Railway oferece um período de teste com créditos. Depois dele, o plano Hobby é necessário, porque o plano gratuito não comporta o índice de materiais. A API DeepSeek é cobrada por uso.

Os limites de uso e as proteções estão descritos em [SEGURANCA.md](SEGURANCA.md).

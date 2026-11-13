# Publicar o AjudAI no Railway

Passo a passo para colocar o AjudAI na web, com endereço próprio, banco PostgreSQL e materiais guardados em disco. Leva uns 20 minutos.

> As chaves e senhas são digitadas só por você, no painel do Railway e no Google Cloud. Nunca as coloque no código nem no GitHub.

## 1. Criar o projeto

1. Entre em [railway.com](https://railway.com) com a conta do GitHub. O período de teste dá **US$ 5 em créditos por 30 dias**, sem cartão.
2. **New Project → Deploy from GitHub repo** e escolha `bot_assistente`.
3. O Railway encontra o `Dockerfile` e começa a construir o app. O primeiro deploy vai falhar, porque ainda faltam as variáveis; isso é esperado.

## 2. Banco de dados e disco

1. No projeto: **+ New → Database → PostgreSQL**.
2. No serviço do app: **Settings → Volumes → New Volume**, com o caminho de montagem `/data`. É ali que ficam os materiais (PDFs indexados) e o cache do modelo de busca.

## 3. Variáveis do serviço do app

Em **Variables**, adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência ao banco criado acima) |
| `DEEPSEEK_API_KEY` | a sua chave da DeepSeek |
| `OAUTH_GOOGLE_CLIENT_ID` | o mesmo do `.env` local |
| `OAUTH_GOOGLE_CLIENT_SECRET` | o mesmo do `.env` local |
| `CHAINLIT_AUTH_SECRET` | um segredo **novo**: rode `.venv\Scripts\python -m chainlit create-secret` no seu PC e copie o valor |
| `CHAINLIT_URL` | o endereço do passo 4, por exemplo `https://ajudai.up.railway.app` |
| `STUDY_CHROMA_DIR` | `/data/chroma` |
| `STUDY_ALLOWED_EMAILS` | o seu e-mail e o do seu amigo, separados por vírgula |

`STUDY_ALLOWED_EMAILS` garante que só vocês entrem, e assim ninguém mais gasta os créditos da DeepSeek. Para liberar para qualquer conta Google, deixe vazio.

## 4. Endereço do site

**Settings → Networking → Generate Domain**. O Railway cria algo como `https://<nome>.up.railway.app`. Coloque esse endereço em `CHAINLIT_URL`.

## 5. Login com Google

No [Google Cloud Console](https://console.cloud.google.com), dentro do projeto usado no login:

1. **APIs e serviços → Credenciais →** abra o cliente OAuth.
2. Em **URIs de redirecionamento autorizados**, adicione `https://<nome>.up.railway.app/auth/oauth/google/callback`. Mantenha o endereço local, se quiser continuar testando no PC.
3. **Tela de consentimento OAuth** (em algumas versões, "Público-alvo"):
   - status **Em teste**: adicione o e-mail do seu amigo em **Usuários de teste**, porque só esses e-mails conseguem entrar;
   - status **Em produção**: qualquer conta Google consegue chegar ao app. Mesmo assim, o `STUDY_ALLOWED_EMAILS` continua filtrando.

## 6. Primeiro acesso

Depois de salvar as variáveis, o Railway refaz o deploy sozinho.

- A cada início, as migrações do banco rodam sozinhas.
- O primeiro envio de PDF pode demorar uns segundos a mais, porque o modelo de busca é baixado uma única vez para o volume.
- O banco do site começa **vazio**: os cadernos do seu PC continuam só no seu PC.

Teste em ordem: login, um caderno novo, flash cards e o envio de um PDF.

## Atualizações

Cada `git push` para a branch `main` gera uma versão nova, em poucos minutos. O banco e os materiais ficam guardados entre as versões.

## Custos

- O teste dá US$ 5 por 30 dias. Depois disso, o plano **Hobby** custa US$ 5/mês, já com US$ 5 de uso incluídos. O plano Free (0,5 GB) não comporta a busca nos materiais.
- A DeepSeek cobra por uso; confira o saldo no painel dela.

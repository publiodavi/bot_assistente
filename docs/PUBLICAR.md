# Publicar o AjudAI no Railway

Passo a passo para colocar o AjudAI na web, com endereço próprio, banco PostgreSQL e materiais guardados em disco. Leva uns 20 minutos.

> As chaves e senhas são digitadas só por você, no painel do Railway e no Google Cloud. Nunca as coloque no código nem no GitHub.

## 1. Criar o projeto

1. Entre em [railway.com](https://railway.com) com a conta do GitHub. O período de teste dá **US$ 5 em créditos por 30 dias**, sem cartão.
2. **New Project → Deploy from GitHub repo** e escolha o repositório `ajudai`.
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
| `STUDY_ACCESS_MODE` | `public` para qualquer conta Google verificada; `invited` para convidados |
| `STUDY_ALLOWED_EMAILS` | deixar vazio no modo público; no modo `invited`, e-mails separados por vírgula |

A imagem Docker usa `STUDY_ACCESS_MODE=public`. Nesse modo, uma lista antiga em `STUDY_ALLOWED_EMAILS` não bloqueia outras contas. Para restringir o acesso, configure explicitamente `STUDY_ACCESS_MODE=invited` e preencha a lista. Limites por conta reduzem o abuso, mas não estabelecem um teto financeiro global.

## 4. Endereço do site

**Settings → Networking → Generate Domain**. O Railway cria algo como `https://<nome>.up.railway.app`. Coloque esse endereço em `CHAINLIT_URL`.

## 5. Login com Google

No [Google Cloud Console](https://console.cloud.google.com), dentro do projeto usado no login:

1. **APIs e serviços → Credenciais →** abra o cliente OAuth.
2. Em **URIs de redirecionamento autorizados**, adicione `https://<nome>.up.railway.app/auth/oauth/google/callback`. Mantenha o endereço local, se quiser continuar testando no PC.
3. **Tela de consentimento OAuth** (em algumas versões, "Público-alvo"):
   - status **Em teste**: adicione o e-mail do seu amigo em **Usuários de teste**, porque só esses e-mails conseguem entrar;
   - status **Em produção**: qualquer conta Google consegue chegar ao app. No modo `invited`, a lista `STUDY_ALLOWED_EMAILS` continua filtrando; no modo `public`, qualquer conta Google com e-mail verificado pode entrar.

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


## Segurança e recuperação

A imagem exige autenticação Google, banco, chave DeepSeek, segredo de sessão de pelo menos 32 caracteres e `CHAINLIT_URL` HTTPS em produção. Não use um comando de início personalizado que pule os passos do Dockerfile. O modo demonstração continua disponível no desenvolvimento local.

Antes da primeira migração 004, o início faz uma cópia consistente das tabelas do app em `/data/backups/security-before-004/database` e copia o índice Chroma para a mesma pasta, quando existente. Uma falha interrompe o início antes das migrações. O arquivo `complete` indica conclusão. A cópia fica privada no volume; não substitui backup externo e não cobre perda do próprio volume. Não remova o volume durante publicação ou reversão.

A restauração usa `src.services.backups.restore_database(connection, caminho_database)` em um schema **vazio**, com a mesma versão principal do PostgreSQL. Após restaurar, reaplique as migrações do app para recompor funções e triggers. Teste em banco separado antes de recuperar produção. O índice copiado deve ser restaurado com o app parado e com versão compatível do ChromaDB. Não há restauração automática nem exclusão de dados existentes.

O deploy com Chroma local e fila de PDFs usa uma única réplica. Ao reiniciar, materiais interrompidos ficam com erro recuperável; cadernos e materiais prontos permanecem preservados.

Limites: arquivos de 25 MiB, corpo multipart de 30 MiB, 20 anexos/100 MiB por sessão, 20 materiais por conta, até 400 páginas, 2 milhões de caracteres, 3.000 trechos e 60 segundos de extração por PDF. A fila admite até oito materiais por instância e três em processamento/fila por conta. No Linux, o processo de extração também recebe limite de 512 MiB de espaço de endereçamento.

Chat: 20.000 caracteres por mensagem, uma geração simultânea por conta, 10 por minuto, 150 por dia, 2.048 tokens de saída e prazo total de 120 segundos; uma resposta que passa do prazo é encerrada com aviso e fica fora do contexto do modelo. Cartões: uma geração simultânea, cinco a cada dez minutos e 30 por dia. Uploads: uma admissão simultânea, 20 por minuto e 40 por dia. Teto diário somando todas as contas: 3.000 respostas, 400 gerações de cartões e 600 uploads, ajustável por `STUDY_GLOBAL_DAILY_CHAT`, `STUDY_GLOBAL_DAILY_CARDS` e `STUDY_GLOBAL_DAILY_UPLOAD`. Operações excedentes recebem orientação para aguardar. O histórico armazenado não é truncado.

O domínio permitido é derivado de `CHAINLIT_URL`; não acrescente `/login` nem o callback nessa variável. Cookies recebem `Secure` em produção. CSP permanece apenas em modo de relatório, enquanto `nosniff`, proteção contra enquadramento e HSTS já são aplicados.

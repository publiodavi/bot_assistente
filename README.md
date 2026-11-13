# Passo a Passo

Assistente de estudos com orientação por etapas, ambientes personalizáveis e histórico de conversas por conta.

Projeto de Trabalho de Graduação do curso de Análise e Desenvolvimento de Sistemas da Fatec Guarulhos. A pesquisa tem como foco o apoio a estudantes com dificuldades de aprendizagem no ensino superior. O protótipo permite conversar sobre diferentes assuntos, sem limitar a entrada a uma disciplina ou área de conhecimento.

## Proposta

O Passo a Passo utiliza perguntas, dicas graduais e exemplos parciais para ajudar o estudante a desenvolver o próprio raciocínio. A abordagem é inspirada na Zona de Desenvolvimento Proximal de Vygotsky e no conceito de andaimento pedagógico (*scaffolding*).

A personalização visual e o companheiro de estudos complementam essa orientação. Seu efeito sobre acolhimento, autonomia e distração é uma hipótese de experiência do usuário a ser avaliada no TCC; a implementação, por si só, não demonstra ganhos de aprendizagem.

## Recursos implementados

- Conversa com respostas em streaming pela API DeepSeek, na voz do companheiro escolhido.
- **Mesa de estudos:** a conversa é uma folha sobre a mesa de cada ambiente (folha pautada, pergaminho, página de HQ ou painel), com as mensagens do estudante como anotações e, em telas largas, cartões com a escada, a condução e os cadernos.
- **Escada de dicas:** cada resposta traz até três pistas graduais e um exemplo parcial, abertos um de cada vez pelo estudante. A escada registra os degraus e quantas dicas foram usadas em cada um.
- **Ensine o companheiro:** quando o companheiro avalia que o estudante entendeu, convida-o a explicar o conceito; o companheiro faz o papel de aprendiz e devolve uma nota com o que ficou claro e o que faltou. O seletor "Quem conduz?" permite escolher esse modo para toda a conversa.
- Entrada por assunto livre na capa de um caderno, com marcador opcional (entender, destravar ou praticar) e atalhos para continuar as conversas recentes.
- Três níveis de apoio: menos dicas, dicas guiadas e mais apoio.
- Seis ambientes: Caderno Vintage, Castelo da Magia, Herói Aracnídeo, Cyberpunk, Café Lo-fi e Jardim / Estufa, todos com aparência clara e escura.
- Troca imediata de tema, aparência e companheiro, preservando a conversa, o rascunho e a posição de leitura.
- Barra de estudo compacta acima do campo de mensagem, com companheiro, degrau atual (a escada completa abre sob demanda) e o seletor Guia/Aprende.
- Companheiros com nome próprio (Lumi para a Coruja; os demais pelo nome do personagem) e apelido individual guardado no perfil, além da opção de ocultá-los. Cada resposta mantém o nome de quem a assinou.
- Painéis de Temas, Companheiros e Perfil com a mesma estrutura; o nível de apoio fica no Perfil e o apelido no painel Companheiros.
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

Cada estudante pode enviar os próprios PDFs da faculdade no painel Materiais. O texto é dividido em trechos e indexado num ChromaDB local (`.local/chroma`, com o modelo de embeddings padrão, baixado uma única vez para `~/.cache/chroma`); o PDF original não é guardado. Nas respostas, até três trechos da própria conta são consultados, citados como fonte e usados para dar pistas, sem entregar resoluções. As trilhas geradas a partir de diagnóstico ainda estão planejadas. A trilha fixa anterior permanece no código para compatibilidade com conversas existentes.

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
   psql -h localhost -U seu_usuario -d passo_a_passo -v ON_ERROR_STOP=1 -f migrations/003_cards_materials.sql
   ```

   A segunda migração acrescenta a coluna `autoCollapse`, exigida pelo Chainlit 2.12.0. Sem ela, as respostas enviadas pelo campo de mensagem não reaparecem quando a conversa é retomada. A terceira cria as tabelas dos flash cards e dos materiais enviados. Todas podem ser executadas novamente sem apagar dados.

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
    custom.js                   Galerias, mesa de estudos, eventos e sincronização
    elements/EscadaDicas.jsx    Escada de dicas e nota do companheiro
    fonts/                      Fontes locais e licenças
    mascots/                    Imagens dos companheiros
    themes/                     Ilustrações dos ambientes
src/
    app.py                      Ciclo de vida e interação do chat
    study_accounts.py           Autenticação e dados por conta
    pedagogy/                   Introdução e trilha legada
    prompts/                    Orientação pedagógica e vozes dos companheiros
    services/llm_client.py       Integração com DeepSeek
    services/escada.py          Separação do texto visível e das dicas em camadas
    rag/indexer.py              Estrutura inicial de RAG
.env.example                    Variáveis necessárias, sem credenciais
start.ps1                       Inicialização local no Windows
ESCOPO_E_ARQUITETURA.md          Escopo e decisões do projeto
```

## Validação e limites do protótipo

Foram exercitados os oito ambientes visuais, a entrada por diferentes assuntos, a troca de preferências durante streaming simulado, o cancelamento e o layout de 320 px. Os tokens de texto e controles foram verificados quanto ao contraste. A persistência em PostgreSQL foi testada com usuários fictícios, incluindo isolamento de perfis, recuperação de mensagens, renomeação e exclusão.

Em 11/11/2026, o fluxo com uma conta Google real e a API DeepSeek foi verificado no navegador: login e criação do perfil, duas conversas de assuntos diferentes, renomeação, retomada pelo histórico, reinício do servidor com o contexto correto em cada conversa, edição de mensagem sem resíduos no contexto e restauração das preferências visuais a partir do banco, sem depender do cache do navegador. O isolamento visual entre duas contas Google ainda precisa ser conferido com uma segunda conta. Esses testes manuais não substituem um estudo de usabilidade com estudantes.

Na mesma data, a Mesa de estudos, a Escada de dicas e o modo de ensino foram exercitados com a API real: abertura de dicas em sequência com gravação no banco, recomposição da escada após reiniciar o servidor, troca de "Quem conduz?" persistida por conversa, convite para ensinar e nota do companheiro. Os campos "degrau", "subiu sozinho" e "pronto para ensinar" são avaliações do modelo de linguagem, não correções automáticas, e podem variar entre respostas.

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


## Ferramentas e personalização ampliada

O painel de cadernos pode ser redimensionado no desktop por arraste ou pelas setas quando a alça está focada. Home e duplo clique restauram a largura padrão. Em telas pequenas, permanece o painel móvel nativo.

Os seis ambientes têm cenas SVG próprias para claro e escuro, quatro cores de destaque, três intensidades de cenário e três tamanhos de leitura. Companheiros usam um sprite SVG com expressões e enquadramentos próprios para retratos, galeria e cenário.

- **Foco:** estudo e pausa ajustáveis, com início, pausa e reinício. O relógio usa horário de término e fica apenas neste navegador.
- **Fichário:** uma descoberta escrita pelo estudante por conversa, com revisão opcional em três dias. Requer conta; aceita até 100 descobertas de 1.000 caracteres. Uma conversa removida deixa sua anotação disponível, sem link de retorno.
- **Perfil:** cartão de estudante com frase, ilustrações locais, iniciais ou uma imagem preparada como WebP de 256 × 256 pixels e até 80 KiB. A imagem só é enviada ao salvar. A validação estrutural no servidor não equivale a um decodificador completo de imagens.

As estatísticas são calculadas a partir das respostas concluídas existentes da própria conta: quantidade de cadernos, soma do maior degrau por conversa, conquistas solo distintas por degrau/conversa e turnos de ensino. Degraus e conquistas são avaliações do companheiro.

### Testes automatizados

```powershell
.\.venv\Scripts\python.exe -m unittest
.\.venv\Scripts\python.exe -m compileall -q src
node --check public/custom.js
git diff --check
```

Os testes puros cobrem streaming da Escada com delimitador partido entre tokens, dados inválidos, migração e limite dos apelidos, autoria histórica, remoção do contexto após editar mensagens e validação de descobertas e avatares. Não exigem banco ou credenciais.


### Revisão de ambientes, ferramentas e perfil

A revisão ampliada e seus limites estão em [Relatório da interface](docs/REVISAO_INTERFACE.md). Foram medidos 288 pares de contraste nas 48 combinações de ambiente, aparência e destaque. A instância com conta fictícia e streaming simulado permitiu conferir histórico redimensionável, Fichário após reinício, três modalidades de avatar e layouts desktop/móvel. Os onze testes automatizados passaram. A segunda conta Google, leitor de tela real, zoom de 200% e uma nova rodada com DeepSeek real continuam pendentes.


A revisão visual posterior corrigiu os campos do Foco e a composição dos cartões do histórico. A folha agora decora o próprio viewport de rolagem, preenchendo o espaço até a barra de estudo mesmo depois da última mensagem. A lista de mensagens e a rolagem nativa do Chainlit foram preservadas. Os detalhes e capturas locais estão descritos no relatório da interface.


## Direção visual

O arquivo [design.md](design.md) registra a direção visual solicitada pelo responsável, com referências de acabamento do Lovable, critérios para botões, tipografia, navegação e configurações e uma sequência de validação por amostra. É uma orientação para a próxima revisão; sua criação não altera a interface atual.

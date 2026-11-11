# Revisão da interface e ferramentas de estudo

Revisão de 11 de novembro de 2026, baseada no pedido registrado localmente em `.local/PROMPT_CODEX.md` e no complemento de arquitetura aprovado pelo responsável.

## Entrega

- Alça de histórico com arraste, setas, Home, duplo clique e largura persistida. Limites adaptados ao desktop; acesso móvel com lista nativa e alternativa para o contêiner desktop quando o Chainlit não troca corretamente o breakpoint.
- Doze cenas SVG autossuficientes: seis temas, cada um com claro e escuro. As fontes existentes continuam locais.
- Quatro destaques por ambiente, intensidade e tamanho de leitura, pela mesma fila de confirmação das preferências anteriores.
- Sprite SVG com nove companheiros, cinco expressões, enquadramentos de retrato/corpo e vassoura para os bruxos. Mais oito avatares neutros de estudante.
- Foco local, Fichário por conta/conversa e check-in efêmero para a próxima resposta.
- Perfil em formato de cartão, avatar ilustrado, iniciais ou upload WebP, frase e estatísticas filtradas pela conta.

## Validação desta revisão

A instância isolada usa a porta 8120, conta fictícia `qa:revisao-20261111` e respostas simuladas. Os dados dessa conta não aparecem no histórico de outras contas. Nenhuma conversa anterior foi apagada. A autenticação de teste é um auxiliar local ignorado pelo Git e não faz parte da aplicação publicada.

| Cenário | Resultado observado |
|---|---|
| Testes puros em Python | 11 testes passaram, sem banco ou OAuth. |
| Sintaxe | Python compilado, JavaScript conferido com Node e Git sem erros de whitespace. |
| Catálogo vetorial | Símbolos esperados e IDs únicos; doze cenas com viewBox válido. |
| Contraste | 48 combinações de ambiente/aparência/acento; 288 pares medidos nos tokens renderizados, sem falha nos limites de 4,5:1 para texto e 3:1 para borda/superfície. Não representa uma auditoria integral WCAG. |
| Desktop | Capturas em 1440×900 e 1366×768, com painel aberto/fechado. Arraste, teclado e duplo clique conferidos. |
| Celular | Doze combinações de tema/aparência percorridas em 375×812. Chat com texto extra em 320px. Capa corrigida para não alargar fieldsets, ultrapassar o próprio contêiner ou iniciar sob o cabeçalho. |
| Companheiros | Dez opções percorridas; retratos SVG, opção oculta, apelido e símbolo de incentivo conferidos. |
| Histórico e autoria | Respostas anteriores mantiveram Lumi e Guia de teste ao trocar o companheiro. Modo Aprende e apelido restaurados após recarregar. |
| Rascunho | Conteúdo preservado ao trocar ambiente e aparência. |
| Movimento | Pausa manual conferida; CSS também desativa animação com movimento reduzido. A preferência do sistema operacional não foi alterada para simular o cenário. |
| Foco | Sessão de um minuto terminou durante a navegação e avisou na barra. |
| Fichário | Descoberta com revisão em três dias salva e recuperada após reiniciar o servidor de testes. |
| Perfil | Ilustração, iniciais e upload de imagem preparados/salvos pela interface. Avatar ilustrado recuperado após reinício. |
| Banco | Consulta independente, somente leitura, confirmou nota, avatar e estatísticas da conta fictícia. Consulta de propriedade com outro identificador não retornou a conversa. |

As capturas e os dados de contraste ficam em `.local/review/`, fora do Git. Há uma captura inicial antes do refinamento e capturas posteriores nos tamanhos descritos; não há uma matriz completa de capturas anteriores em todas as resoluções.

## Revisão do código

O contexto foi extraído para `src/services/conversation.py`, permitindo testar retomada e edição sem carregar a aplicação. As validações de ferramentas e avatar ficam em `src/services/study_tools.py`. Foram removidas as partes CSS dos personagens e a animação sem uso `study-preview`. Regras repetidas de seis seletores de componentes foram consolidadas, mantendo a última posição na cascata.

A trilha legada foi preservada para retomada de conversas antigas. `spiderArt` continua em uso no cenário Aracnídeo. Os WebP anteriores foram mantidos como assets de compatibilidade; a galeria e a barra atuais usam SVG. O JavaScript e o CSS ainda dependem de um adaptador do DOM nativo do Chainlit 2.12.0, que deve ser revisto antes de atualizar essa versão.

A validação WebP do servidor confere estrutura RIFF, tipo, tamanho, dimensões e ausência de animação/metadados não permitidos. Ela não implementa um decodificador completo do codec. Upload de SVG do usuário não é aceito.

## Pendências e limites

- Segunda conta Google real e leitor de tela real.
- Zoom de 200% e teclado virtual em dispositivo real.
- Reexecutar a matriz pedagógica com a API DeepSeek real depois desta revisão; o registro anterior no README é de outra etapa.
- Cobertura de tempo de leitura/posição de scroll em conversas extensas, falhas de rede induzidas e concorrência entre abas precisa ser ampliada.
- Nem todas as expressões temporárias foram disparadas por um fluxo pedagógico real; o catálogo possui todas e a seleção usa o mesmo estado do servidor.
- O aviso existente de ausência de blob storage permanece: a Escada é recomposta pelos metadados na retomada. Armazenamento geral de anexos continua fora desta entrega.
- Não houve migração destrutiva nem alteração das credenciais. O script e a conta de teste locais não serão enviados ao GitHub.

## Reprodução

```powershell
.\.venv\Scripts\python.exe -m unittest
.\.venv\Scripts\python.exe -m compileall -q src
node --check public/custom.js
git diff --check
```

A aplicação real permanece em `http://localhost:8103`. Usar `start.ps1` com o PostgreSQL local existente; evitar iniciar instâncias duplicadas. Os commits desta revisão são locais, sem push.


## Correções após a revisão de Davi — 11/11/2026

As capturas enviadas pelo responsável mostraram três problemas que a rodada anterior não havia corrigido:

1. **Campos do Foco sem tema:** o contêiner dos campos não tinha a classe `study-form`. Passou a usar as regras comuns de formulário, rótulos acima dos campos e duas colunas no desktop/uma no celular. Campos medidos com 44px de altura; sem rolagem horizontal interna no painel móvel.
2. **Bordas soltas nos cadernos:** o link nativo era inline e recebia borda/padding enquanto continha um botão em bloco. O cartão passou a ser um bloco único, com o selo de degrau contido e atualizado sem duplicação. As ações nativas foram preservadas.
3. **Folha terminando antes do rodapé:** o Chainlit mantém um espaçador depois da lista de mensagens para rolagem. A aparência da folha foi transferida para o viewport de rolagem, incluindo essa área vazia. A lista interna usa `study-sheet-content` para controlar padding e largura de texto. Não foi criado wrapper adicional nem alterada a árvore React. A margem pautada foi ajustada no celular.

No teste de fim de rolagem, a diferença entre o fundo da folha e o topo da barra de estudo foi **0px** nas doze combinações de tema/aparência. A mesma medida foi conferida em 375px de largura. O papel permanece visível atrás do espaçador até o rodapé. Testes feitos com a mesma conta fictícia e streaming simulado da rodada anterior.

Novas capturas e medidas: `.local/review-layout/` (`folha-continua-desktop.png`, `folha-continua-mobile.png`, `foco-corrigido.png`, `foco-mobile.png`, `folha.json`). O adaptador mantém os elementos de scroll nativos e acrescenta foco por teclado ao caderno. Os testes automatizados existentes continuam necessários, mas essas correções dependem também de medição e inspeção visual.

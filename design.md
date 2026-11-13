# Direção visual — AjudAI

> **Situação atual:** direção visual definida em 11/11/2026, quando o projeto ainda se chamava Passo a Passo. Parte dela já foi aplicada; a tipografia por ambiente sugerida nas seções abaixo foi substituída por fontes unificadas (Lora nos títulos, Source Sans na leitura e Inter na interface), e o Check-in de ânimo foi removido a pedido dos usuários.

## 1. Finalidade e origem

Este documento registra a direção visual adotada na revisão da interface de 11/11/2026. Complementa o `README.md` e o `docs/REVISAO_INTERFACE.md`.

A direção orientou um refinamento incremental, preservando recursos, dados e correções existentes.

**Referência principal:** interfaces de ferramentas web atuais de produtividade. O que interessa é a clareza, consistência e acabamento dos componentes, combinados com ambientação expressiva. A proposta é incorporar esses princípios à identidade do AjudAI.

## 2. O que agrada na referência

- Tipografia sem serifa limpa, com uma hierarquia evidente.
- Navegação lateral compacta, com ícones e rótulos, sem um botão contornado para cada ação.
- Superfícies contínuas, divisores discretos e poucas camadas sobrepostas.
- Campo de mensagem confortável, com ferramentas organizadas nas extremidades.
- Destaque concentrado na ação principal.
- Uso expressivo de cor na entrada, com uma área de trabalho tranquila durante a conversa.
- Poucas decisões visuais competindo ao mesmo tempo.

Essas interfaces também usam gradientes e cantos arredondados, e esses recursos não estão proibidos. O problema está no uso repetitivo, sem hierarquia, que dá à interface aparência de template genérico.

## 3. O que precisava melhorar

1. Muitos botões com formato de pílula, contorno e peso semelhantes.
2. Fontes temáticas chegando a controles e textos em que uma fonte de interface seria mais confortável.
3. Painéis de configuração parecendo formulários genéricos com muitos blocos equivalentes.
4. Excesso de bordas, sombras e recipientes para organizar poucas informações.
5. Distância visual entre cabeçalho, histórico, ferramentas e perfil.
6. Necessidade de conferir o acabamento no tamanho real e durante o uso, não apenas em uma tela inicial vazia.

O critério de sucesso é uma interface que pareça mais bem desenhada e fácil de usar, sem perder seus companheiros, o caderno e os ambientes.

## 4. Princípio de composição

**Uma base consistente para usar o aplicativo; uma ambientação própria para cada tema.**

A organização dos controles, a escala de espaçamento e a linguagem de interação permanecem estáveis. Cores, cenas, texturas, títulos e detalhes selecionados dão personalidade aos ambientes.

Durante uma explicação, o conteúdo e o próximo passo devem chamar mais atenção que as configurações. Na entrada e na galeria, a expressão visual pode ser mais intensa.

## 5. Tipografia

Usar inicialmente as fontes locais, sem introduzir dependências ou serviços externos.

| Uso | Direção inicial |
|---|---|
| Navegação, botões, campos e configurações | Inter, com fallback de sistema. |
| Explicações longas | Source Sans 3 ou Inter, com consistência dentro de cada proposta. |
| Títulos temáticos curtos | Famílias existentes: Lora, Cinzel, Barlow Condensed e Space Mono, com uso seletivo. |
| Código | IBM Plex Mono. |

Escala inicial para a amostra: controles de 14–16px; leitura de 16–18px, respeitando os tamanhos escolhidos pelo estudante; subtítulos de 18–22px; títulos de painel de 22–26px. Evitar títulos enormes nas configurações e textos longos inteiramente em caixa alta.

A fonte temática não deve ser aplicada indiscriminadamente a todos os descendentes do tema. Separar tokens de fonte de interface, leitura, título e código quando necessário.

## 6. Botões e hierarquia de ações

| Tipo | Tratamento esperado | Exemplos |
|---|---|---|
| Principal | Preenchido com destaque do tema e contraste adequado. Uma prioridade clara por contexto. | Salvar perfil, começar uma sessão, enviar mensagem. |
| Secundário | Superfície discreta ou contorno leve quando necessário. | Reiniciar, voltar, cancelar. |
| Navegação | Ícone e texto, geralmente sem recipiente contornado permanente; estado de seleção e hover claros. | Temas, Companheiros, Ferramentas e itens laterais. |
| Seleção | Grupo coeso, com estado ativo evidente; formato segmentado ou chips quando fizer sentido. | Claro/Escuro, Guia/Aprende, nível de apoio. |
| Ação de ícone | Área de toque confortável, sem círculo ou borda permanente em todos os estados. | Fechar painel, opções da conversa. |
| Ação pedagógica | Identidade consistente com o fluxo de estudo e prioridade clara. | Ver próxima dica, ensinar o companheiro. |

Referências iniciais: raio de 8px para botões comuns, 12px para cartões e 16px para painéis. São pontos de partida para a amostra, não uma obrigação de tornar tudo idêntico.

Preservar foco visível. Evitar sombra forte, borda, brilho e preenchimento chamativo simultâneos no mesmo botão. Não esconder ações essenciais até o hover em dispositivos de toque.

## 7. Cabeçalho e navegação lateral

- Cabeçalho leve, alinhado e com quantidade controlada de ações.
- Painel lateral com uma lista compacta de cadernos, seleção clara e títulos legíveis.
- Degrau como informação secundária, sem transformar cada conversa em um grande cartão.
- Ferramentas com ícone e texto; reduzir a sequência de botões contornados grandes.
- Agrupar informações por espaço e títulos curtos. Usar divisores apenas quando ajudarem a leitura.
- Manter busca, renomeação, exclusão, nova conversa e redimensionamento existentes.
- Preservar acesso explícito aos cadernos no celular.

A aparência pode ser simplificada sem substituir as funções nativas de histórico por uma lista paralela incompleta.

## 8. Conversa, caderno e editor

O caderno contínuo é uma decisão já confirmada. Ele deve preencher a área de conversa até a barra de estudo, inclusive no fim da rolagem.

- Manter `.study-sheet` no viewport nativo de scroll e `.study-sheet-content` na lista interna.
- Não aplicar o papel somente ao conteúdo e deixar o espaçador final com o fundo da mesa.
- Não remover o espaçador nativo para ocultar o problema.
- Manter medida confortável de leitura, com espaço para código, equações e tabelas.
- Respostas podem usar menos recipientes e bordas, desde que autoria, dicas e sequência da conversa continuem claras.
- Preservar a assinatura histórica do companheiro, mesmo após troca de personagem ou apelido.
- Editor como uma superfície única, com ferramentas agrupadas e ação de enviar evidente.
- Barra de estudo integrada ao editor, visualmente discreta; não deixar a combinação ocupar uma parcela excessiva da tela.

Testar a composição com conversa curta e longa, no começo e no final da rolagem, durante streaming e no celular com texto ampliado.

## 9. Configurações, perfil e ferramentas

Os painéis devem compartilhar cabeçalho, espaçamento, tipografia, campos e tratamento de confirmação/erro.

- Organizar por seções claras, evitando cartão dentro de cartão sem necessidade.
- Rótulos acima dos campos; textos auxiliares curtos, próximos da configuração.
- Campos com altura e largura consistentes. No Foco, preservar a correção que aplica as regras de formulário ao wrapper dos inputs.
- Corpo com rolagem interna quando necessário; título, fechamento e ação principal acessíveis em telas pequenas.
- Grade de temas e companheiros continua tendo prévias visuais. As demais configurações não precisam repetir o formato de galeria.
- Perfil pode manter o conceito de cartão de estudante com acabamento mais sóbrio.
- Foco deve ter um relógio legível, sem espaço vazio excessivo nem campos espremidos.
- Confirmações e erros visíveis, sem depender exclusivamente de mudança de cor.

## 10. Direção dos seis ambientes

| Ambiente | Preservar e refinar |
|---|---|
| Vintage | Papel creme, iluminação quente, referências de caderno e materiais de estudo. É a referência principal de acabamento. |
| Castelo | Biblioteca, mistério, dourado e personagens. Reservar a tipografia ornamental a títulos curtos. |
| Aracnídeo | Cidade, vermelho/azul, grafismos de quadrinhos e movimento nas margens. Controles continuam claros e consistentes. |
| Cyberpunk | Superfícies tecnológicas e luzes ciano. Evitar brilho em cada controle e monoespaçada em toda a leitura. |
| Café Lo-fi | Madeira, caramelo, chuva e clima de pausa. |
| Jardim / Estufa | Verde, terracota, luz filtrada e plantas. |

Não substituir todos os cenários por um gradiente azul/rosa. As referências externas orientam a composição e o acabamento; a ambientação pertence ao AjudAI.

## 11. Companheiros e movimento

- Preservar os SVGs atuais como ponto de partida e os enquadramentos de retrato/corpo/cenário.
- Companheiro reconhecível, com reações pontuais, sem competir com a explicação.
- Não redesenhar todo o catálogo antes de mostrar uma amostra em tamanhos reais da barra e da galeria.
- Manter possibilidade de ocultar, apelidos individuais e autoria histórica.
- Movimento breve e contido; respeitar pausa manual, aba em segundo plano e preferência de movimento reduzido.
- Sem efeitos sobre o texto, o editor ou áreas de toque.

## 12. Consistência e acessibilidade

- Escala inicial de espaçamento baseada em 4, 8, 12, 16, 24 e 32px.
- Ícones consistentes, aproveitando o repertório existente; evitar mistura casual de emojis e ícones nos controles.
- Bordas de baixa intensidade para separar superfícies, com foco e estados necessários suficientemente visíveis.
- Contraste de texto comum de pelo menos 4,5:1 e de elementos visuais necessários de pelo menos 3:1.
- Uso por teclado, foco visível e áreas de toque confortáveis.
- Conferir claro/escuro, texto grande/extra, 320px e 375px de largura, zoom e conversa extensa.
- Medir overflow dentro de painéis e da folha. O documento inteiro pode não ter overflow enquanto um componente está quebrado.

Os números são critérios de verificação; não equivalem a uma declaração prévia de conformidade WCAG.

## 13. Limites técnicos

A direção visual foi aplicada sem trocar a stack: Python, Chainlit 2.12.0 e DeepSeek, com o frontend restrito a `public/custom.css`, `public/custom.js` e ao componente JSX nativo do Chainlit (`EscadaDicas.jsx`). Nenhuma dependência nova foi necessária. As mudanças preservaram conta Google, perfil, preferências, histórico, isolamento por conta, Escada de dicas, Guia/Aprende, Foco, Fichário, rascunho e posição de leitura.

A aplicação seguiu uma amostra representativa (tipografia, hierarquia de botões, cabeçalho, histórico e um painel de configuração), validada em uso antes de ser estendida às demais telas e temas, com capturas de desktop e de celular a cada etapa.

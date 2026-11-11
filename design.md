# Direção visual — Passo a Passo

## 1. Finalidade e origem

Este documento registra a direção visual solicitada por Davi em 11/11/2026 para a próxima revisão da interface. Deve ser lido junto de `.clinerules`, `README.md`, `docs/REVISAO_INTERFACE.md` e `.local/PROMPT_CLAUDE_CODE.md`.

O projeto já funciona. Esta direção orienta um refinamento incremental, preservando recursos, dados e correções existentes. A criação deste arquivo não aplicou alterações ao CSS ou ao JavaScript.

**Referência principal:** capturas do Lovable fornecidas por Davi. O que interessa é a clareza, consistência e acabamento dos componentes, combinados com ambientação expressiva. A proposta é incorporar esses princípios à identidade do Passo a Passo.

## 2. O que agrada na referência

- Tipografia sem serifa limpa, com uma hierarquia evidente.
- Navegação lateral compacta, com ícones e rótulos, sem um botão contornado para cada ação.
- Superfícies contínuas, divisores discretos e poucas camadas sobrepostas.
- Campo de mensagem confortável, com ferramentas organizadas nas extremidades.
- Destaque concentrado na ação principal.
- Uso expressivo de cor na entrada, com uma área de trabalho tranquila durante a conversa.
- Poucas decisões visuais competindo ao mesmo tempo.

O Lovable também usa gradientes e cantos arredondados. A preferência de Davi não deve ser interpretada como uma proibição desses recursos. A insatisfação está no uso repetitivo, sem hierarquia, que dá à interface aparência de template genérico.

## 3. O que precisa melhorar no estado atual

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

O caderno contínuo é uma decisão já confirmada por Davi. Ele deve preencher a área de conversa até a barra de estudo, inclusive no fim da rolagem.

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
| Vintage | Papel creme, iluminação quente, referências de caderno e materiais de estudo. É a referência positiva de Davi. |
| Castelo | Biblioteca, mistério, dourado e personagens. Reservar a tipografia ornamental a títulos curtos. |
| Aracnídeo | Cidade, vermelho/azul, grafismos de quadrinhos e movimento nas margens. Controles continuam claros e consistentes. |
| Cyberpunk | Superfícies tecnológicas e luzes ciano. Evitar brilho em cada controle e monoespaçada em toda a leitura. |
| Café Lo-fi | Madeira, caramelo, chuva e clima de pausa. |
| Jardim / Estufa | Verde, terracota, luz filtrada e plantas. |

Não substituir todos os cenários por um gradiente azul/rosa. A referência do Lovable orienta a composição e o acabamento; a ambientação pertence ao Passo a Passo.

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

## 13. Limites de implementação

Preservar Python + Chainlit 2.12.0 + DeepSeek. Sem frontend React separado e sem novas dependências sem justificativa. A integração JSX nativa do Chainlit já existente permanece permitida.

Preservar conta Google, perfil, preferências, histórico, isolamento por conta, Escada de dicas, Guia/Aprende, Foco, Fichário, check-in, rascunho e posição de leitura. Não sobrescrever `.env`, reinicializar o banco ou apagar conversas. Não fazer push sem pedido de Davi.

A linguagem continua em português brasileiro. Documentação profissional, sem excesso de emojis ou tom promocional.

## 14. Sequência solicitada ao Claude Code

1. Ler contexto e código atual; apresentar diagnóstico breve, usando exemplos concretos.
2. Propor uma amostra representativa: tipografia, hierarquia dos botões, cabeçalho/histórico e um painel de configuração.
3. Implementar a amostra após o alinhamento de Davi, com mudanças localizadas. Mostrar a composição em uso, não apenas uma coleção de componentes soltos.
4. Aguardar a avaliação da amostra antes de espalhar o padrão por todas as telas e temas.
5. Aplicar o padrão aprovado em incrementos, com testes de regressão e capturas de desktop/celular.

Evitar uma reformulação completa de uma vez. Caso alguma recomendação técnica deste documento gere conflito com o comportamento real do Chainlit, explicar e propor a adaptação mantendo a intenção visual.

## 15. Sugestões de novas funcionalidades

Davi também quer sugestões de funcionalidades interessantes que fortaleçam o diferencial pedagógico. Essa frente deve ser apresentada separadamente da reformulação visual.

- Inspecionar antes para não sugerir como nova uma função já existente.
- Apresentar de 5 a 8 sugestões concretas.
- Para cada uma: problema do estudante, exemplo de uso, diferencial, esforço, dependência de IA/banco/serviço/custo e forma de avaliar utilidade.
- Recomendar as três melhores próximas entregas, com justificativa.
- Não implementar as novas funcionalidades antes de Davi escolher.

Priorizar começar a estudar, praticar, organizar assuntos, retomar raciocínio e revisar descobertas. Mais recursos não são, por si só, um ganho de produto.

## 16. Referências visuais locais

As capturas foram fornecidas diretamente por Davi. Para vê-las neste computador:

- `C:\Users\davi\Pictures\Screenshots\Captura de tela 2026-11-11 121252.png` — dashboard escuro, navegação lateral e entrada.
- `C:\Users\davi\Pictures\Screenshots\Captura de tela 2026-11-11 121240.png` — entrada clara, hierarquia de título e superfície de edição.
- `C:\Users\davi\Pictures\Screenshots\Captura de tela 2026-11-11 121202.png` — conversa escura, navegação e campo de mensagem.

Os arquivos são referências locais e não foram copiados para os assets do produto. Este documento descreve os princípios necessários para continuar mesmo se as capturas não estiverem disponíveis em outra máquina.

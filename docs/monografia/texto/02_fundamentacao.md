# 2 FUNDAMENTAÇÃO TEÓRICA

Este capítulo reúne os conceitos que sustentam as decisões do projeto. Primeiro, trata da aprendizagem como processo mediado, segundo Vygotsky, e do andaimento. Em seguida, aborda o uso de IA na educação, os modelos de linguagem e a geração aumentada por recuperação. Por fim, apresenta as técnicas de estudo incorporadas ao protótipo e os critérios de usabilidade e acessibilidade adotados.

## 2.1 Dificuldades de aprendizagem no ensino superior

Neste trabalho, a expressão "dificuldade de aprendizagem" é usada em sentido pedagógico amplo: refere-se ao estudante que, por diferentes razões, não consegue acompanhar um conteúdo no ritmo exigido pelo curso. Não se trata de diagnóstico clínico, e o assistente desenvolvido não tem essa finalidade, o que é declarado nas próprias instruções do sistema.

Tinto (1993) mostra que a decisão de abandonar o curso raramente tem uma causa única. Entre os fatores estão a integração acadêmica, ligada ao desempenho e à percepção de conseguir acompanhar as disciplinas, e a integração social com colegas e professores. O estudante que trava em um conteúdo e não encontra apoio tende a acumular lacunas que tornam os conteúdos seguintes ainda mais difíceis.

Bloom (1984) chamou de "problema dos dois sigmas" a constatação de que estudantes acompanhados por um tutor individual tiveram desempenho muito superior ao de estudantes em aulas convencionais, mas que oferecer um tutor a cada estudante é inviável em larga escala. Grande parte da pesquisa em sistemas tutores inteligentes surgiu da tentativa de aproximar esse benefício por meio da tecnologia (VANLEHN, 2011; KULIK; FLETCHER, 2016).

## 2.2 A Zona de Desenvolvimento Proximal

Vygotsky (2007) entende o desenvolvimento como um processo social, mediado pela interação com outras pessoas e por instrumentos culturais, como a linguagem. Para explicar a relação entre aprendizagem e desenvolvimento, o autor distingue dois níveis: o nível de desenvolvimento real, que corresponde ao que a pessoa já consegue fazer sozinha, e o nível de desenvolvimento potencial, que corresponde ao que ela consegue fazer com a orientação de alguém mais experiente. A distância entre esses dois níveis é o que o autor chama de Zona de Desenvolvimento Proximal (VYGOTSKY, 2007). Em outras palavras, a ZDP corresponde às funções que ainda estão em amadurecimento e que, com a ajuda de alguém mais experiente, já podem ser exercitadas.

Duas ideias tiradas desse conceito orientaram o AjudAI. A primeira é que a ajuda tende a ser mais útil quando incide sobre o que o estudante ainda não domina, mas já está perto de dominar; uma tarefa muito abaixo ou muito acima desse ponto costuma render pouco. A segunda é que o apoio tem caráter provisório: espera-se que aquilo que hoje o estudante faz com ajuda passe, com o tempo, a ser feito sozinho. Vale deixar claro que o AjudAI se inspira nessas ideias, mas não mede formalmente o nível de desenvolvimento real ou potencial de quem o utiliza.

## 2.3 Andaimento (scaffolding)

O termo andaimento foi proposto por Wood, Bruner e Ross (1976) ao estudarem como um tutor ajudava crianças a montar uma estrutura de blocos. Os autores descreveram funções desempenhadas pelo tutor: despertar o interesse pela tarefa, reduzir os graus de liberdade (simplificando o problema), manter a direção, destacar características relevantes, controlar a frustração e demonstrar soluções. O apoio é ajustado continuamente: aumenta quando o aprendiz erra e diminui quando ele acerta.

Os autores não partiram diretamente da obra de Vygotsky, mas o andaimento acabou se tornando uma das formas mais conhecidas de levar a ideia de ZDP para a prática de ensino. No AjudAI, ele inspirou três decisões de projeto, detalhadas no capítulo 4:

- a Escada de dicas, que organiza o apoio em camadas, da pista mais sutil ao exemplo parcial, abertas pelo próprio estudante;
- os níveis de apoio (menos dicas, dicas guiadas e mais apoio), que mudam a quantidade de ajuda oferecida;
- a opção de explicar primeiro quando o assunto é novo e só depois perguntar, reduzindo o apoio à medida que o estudante acerta sozinho.

A terceira decisão é uma escolha de design, e não uma regra imposta pela teoria. Uma pergunta inicial também pode servir para reconhecer o que o estudante já sabe e calibrar a ajuda. A opção por explicar antes veio da combinação entre a ideia de apoio inicial do andaimento e os retornos dos usuários, discutidos no capítulo 5.

## 2.4 Aprender ensinando

Outra estratégia incorporada ao protótipo é a de aprender ensinando. Fiorella e Mayer (2013) compararam estudantes que apenas estudaram um conteúdo, estudantes que estudaram sabendo que teriam de ensiná-lo e estudantes que de fato o explicaram a outras pessoas. Os que efetivamente ensinaram apresentaram melhor desempenho em testes posteriores, o que os autores atribuem ao esforço de organizar e explicar o conhecimento com as próprias palavras.

Essa ideia dialoga com a ZDP, pois explicar exige que o estudante mobilize o que compreendeu e perceba as lacunas que ainda tem. No AjudAI, quando o modelo avalia que o estudante está pronto, o companheiro virtual inverte os papéis: passa a agir como aprendiz, faz perguntas ingênuas e devolve uma nota com o que ficou claro e o que faltou na explicação.

## 2.5 Inteligência Artificial na educação

Luckin et al. (2016) defendem que a IA pode apoiar a educação de três maneiras principais: com sistemas que acompanham o estudante individualmente, com ferramentas que ajudam professores e com análises que tornam visível o processo de aprendizagem. Os autores destacam o potencial de personalização, mas também ressaltam que a tecnologia deve ser guiada por conhecimento pedagógico, e não o contrário.

A revisão sistemática de Zawacki-Richter et al. (2019) analisou 146 estudos sobre aplicações de IA no ensino superior e as agrupou em quatro áreas: perfis e previsão de desempenho, avaliação automatizada, sistemas adaptativos e personalização, e sistemas tutores inteligentes. Um dos achados centrais é a pouca presença de educadores e de teorias pedagógicas nesses trabalhos, o que reforça a necessidade de explicitar a fundamentação pedagógica de soluções desse tipo.

Os sistemas tutores inteligentes são a categoria mais próxima do AjudAI. VanLehn (2011) comparou a eficácia de tutores humanos e de diferentes tipos de sistemas tutores e concluiu que sistemas que acompanham os passos do raciocínio do estudante, e não apenas a resposta final, alcançam resultados próximos aos da tutoria humana. Kulik e Fletcher (2016), em meta-análise, também encontraram efeitos positivos desses sistemas sobre o desempenho dos estudantes. Esses trabalhos reforçam a decisão de organizar a interação em degraus, acompanhando o avanço do estudante passo a passo.

## 2.6 Processamento de Linguagem Natural e modelos de linguagem

O Processamento de Linguagem Natural é a área da IA que trata da compreensão e da geração de linguagem humana por computadores (RUSSELL; NORVIG, 2022). Por muito tempo, sistemas conversacionais dependeram de regras escritas manualmente ou de modelos estatísticos treinados para tarefas específicas, o que limitava a variedade de assuntos que conseguiam tratar.

A arquitetura Transformer, proposta por Vaswani et al. (2017), mudou esse cenário. Baseada em mecanismos de atenção, ela permite processar sequências longas de texto com eficiência e serviu de base para modelos pré-treinados em grandes volumes de dados. O BERT (DEVLIN et al., 2019) mostrou que um modelo pré-treinado pode ser ajustado a diversas tarefas de compreensão de linguagem. Os modelos da família GPT, por sua vez, foram treinados para prever a próxima palavra de um texto, e Brown et al. (2020) mostraram que, em escala suficiente, esses modelos realizam novas tarefas a partir de instruções e de poucos exemplos fornecidos no próprio texto de entrada.

Essa capacidade de seguir instruções é a base do AjudAI. Em vez de treinar um modelo próprio, o projeto utiliza um modelo pronto e controla seu comportamento por meio de instruções de sistema, que descrevem a postura pedagógica esperada, e de um formato de resposta que a aplicação consegue interpretar. Essa decisão também explica a mudança em relação ao projeto de pesquisa, que previa bibliotecas como NLTK e spaCy. Essas bibliotecas atendem bem a tarefas pontuais de análise de texto, mas, para o requisito de conversar sobre qualquer assunto, os autores optaram por um modelo de linguagem pronto. Não foi feita uma comparação formal entre as duas abordagens.

Os modelos de linguagem, porém, têm limitações conhecidas. A principal é a alucinação, isto é, a geração de conteúdo plausível, mas incorreto ou sem fundamento (JI et al., 2023). Em um contexto educacional esse risco pesa bastante. Por isso, as instruções do protótipo pedem que o modelo reconheça suas limitações, não invente fontes e cite os materiais do estudante quando os utilizar, o que reduz o problema, mas não o elimina.

## 2.7 Geração aumentada por recuperação

A geração aumentada por recuperação (Retrieval-Augmented Generation, RAG) foi proposta por Lewis et al. (2020) como forma de combinar um modelo de linguagem com uma base de documentos externa. Antes de gerar a resposta, o sistema busca trechos relevantes na base e os entrega ao modelo junto com a pergunta. Assim, a resposta pode se apoiar em conteúdo verificável, que não precisa estar memorizado nos parâmetros do modelo.

A busca costuma ser feita por similaridade semântica. Cada trecho de documento é convertido em um vetor numérico (embedding), e a pergunta é convertida da mesma forma; os trechos cujos vetores estão mais próximos do vetor da pergunta são considerados os mais relevantes. Bancos de dados vetoriais, como o ChromaDB, armazenam esses vetores e realizam essa busca. No AjudAI, o RAG é usado para que o estudante envie as apostilas e listas da própria faculdade, de modo que as pistas usem a mesma notação e os mesmos termos do curso, com a página de origem citada.

## 2.8 Técnicas de estudo incorporadas ao protótipo

### 2.8.1 Revisão espaçada e prática de recuperação

Ebbinghaus (1913) descreveu a curva do esquecimento: sem revisão, a retenção de um conteúdo cai rapidamente nos primeiros dias. A pesquisa posterior mostrou que distribuir as revisões no tempo produz retenção maior do que concentrá-las em uma única sessão. Cepeda et al. (2006), em meta-análise de centenas de experimentos, confirmaram esse efeito de espaçamento.

Além de espaçar, importa a forma de revisar. Roediger e Karpicke (2006) mostraram que tentar lembrar um conteúdo, a chamada prática de recuperação, produz retenção de longo prazo superior à de simplesmente reler o material. O Fichário de descobertas do AjudAI combina as duas ideias: o estudante registra o que descobriu com as próprias palavras e, em intervalos crescentes, é convidado a reconstruir essa ideia de memória, sem ver a anotação.

### 2.8.2 Flash cards e o sistema de Leitner

Os flash cards são cartões com uma pergunta na frente e a resposta no verso, uma forma simples de praticar a recuperação. Leitner (1972) propôs organizá-los em caixas: um cartão respondido corretamente avança para uma caixa revisada com menos frequência, e um cartão errado volta à primeira caixa. Assim, o estudante dedica mais tempo ao que ainda não domina. O AjudAI gera os cartões a partir da própria conversa e aplica essa lógica de caixas para definir quando cada cartão volta a ser revisado.

### 2.8.3 Gestão do tempo de estudo

A técnica Pomodoro (CIRILLO, 2018) organiza o estudo em blocos de concentração, tradicionalmente de 25 minutos, intercalados por pausas curtas. Sua utilidade, no contexto deste trabalho, está em tornar explícito o momento de parar, o que ajuda estudantes que tendem a se dispersar ou a estudar por longos períodos sem descanso. A sessão de foco do AjudAI segue esse formato, com tempos ajustáveis.

### 2.8.4 Carga cognitiva

A teoria da carga cognitiva (SWELLER, 1988) parte do princípio de que a memória de trabalho tem capacidade limitada. Quando um material apresenta muitas informações ao mesmo tempo, ou exige que o estudante busque soluções sem orientação, sobra menos capacidade para a aprendizagem propriamente dita. Essa teoria fundamenta escolhas de interface do projeto: respostas curtas, uma única pergunta por vez, dicas escondidas até que o estudante as solicite e animações que podem ser pausadas.

## 2.9 Usabilidade e acessibilidade

Nielsen (1993) define usabilidade como um atributo de qualidade que reúne facilidade de aprendizado, eficiência de uso, facilidade de memorização, baixa taxa de erros e satisfação. O autor defende avaliações frequentes e baratas ao longo do desenvolvimento, nas quais poucos usuários já revelam grande parte dos problemas de uma interface. Essa visão orientou a avaliação exploratória realizada neste trabalho. Para avaliações estruturadas, a escala System Usability Scale (SUS), proposta por Brooke (1996), oferece um questionário de dez itens amplamente utilizado, e é proposta neste trabalho como instrumento para estudos futuros (Apêndice A).

Quanto à acessibilidade, as Web Content Accessibility Guidelines (WCAG) 2.1 recomendam razão de contraste mínima de 4,5:1 para textos comuns e de 3:1 para as informações visuais necessárias à identificação de componentes de interface e de seus estados (W3C, 2018). As diretrizes tratam também de animações e movimento. Esses critérios serviram de referência para a inspeção dos ambientes visuais do AjudAI.

## 2.10 Síntese

Do que foi apresentado, ficaram algumas orientações para o projeto. A ajuda ao estudante deveria ser gradual e diminuir aos poucos, como sugerem a ZDP e o andaimento. O estudante deveria ser levado a produzir alguma coisa, seja tentando resolver, lembrando ou explicando, em vez de apenas receber respostas. O modelo de linguagem permite conversar sobre assuntos variados, mas precisa ser controlado pela aplicação e, quando possível, apoiado em fontes. A revisão espaçada, os flash cards e as pausas entram como complemento da conversa, e a interface procura não sobrecarregar a atenção de quem estuda. O capítulo 4 mostra como essas orientações viraram funcionalidades e o capítulo 5 discute até onde os dados disponíveis permitem avaliá-las.

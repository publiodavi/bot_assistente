# 6 CONSIDERAÇÕES FINAIS

Este trabalho partiu de uma pergunta: como desenvolver um assistente virtual baseado em modelo de linguagem que apoie estudantes com dificuldades de aprendizagem sem substituir o raciocínio deles por respostas prontas? A resposta construída foi o AjudAI, um assistente de estudos cuja condução se inspira na Zona de Desenvolvimento Proximal, de Vygotsky, e no andaimento.

Quanto ao desenvolvimento, o objetivo geral foi atingido: o protótipo está implementado, publicado e em funcionamento, com as funcionalidades planejadas e outras incorporadas ao longo do processo. A avaliação, porém, limitou-se ao plano técnico e exploratório. Os testes automatizados, as inspeções, os retornos de cerca de nove participantes e as revisões técnicas indicaram o funcionamento do sistema e orientaram diversas alterações, mas não mediram o efeito do assistente sobre a aprendizagem nem a usabilidade de forma estruturada.

Do ponto de vista do projeto, a principal contribuição do trabalho está na proposta de orientar um modelo de linguagem de uso geral por uma concepção pedagógica. A estrutura de resposta em duas partes permite que a aplicação, e não apenas o modelo, mantenha as dicas ocultas até que o estudante as solicite. A opção de explicar primeiro quando o assunto é novo resultou da articulação entre a fundamentação teórica e os retornos dos participantes, como escolha de projeto. Além disso, a conversa foi integrada a técnicas de estudo fundamentadas na literatura, como a revisão espaçada, a prática de recuperação e a aprendizagem por meio do ensino.

No aspecto técnico, o desenvolvimento evidenciou que um protótipo acadêmico publicado na internet precisa considerar segurança e custo desde as primeiras versões. O isolamento de dados por conta, a validação de arquivos, os limites de uso e os testes das regras críticas exigiram esforço comparável ao das funcionalidades pedagógicas.

A metodologia foi suficiente para desenvolver e validar o protótipo, mas não para avaliar seu efeito educacional. A bibliografia atendeu às necessidades da pesquisa e foi ampliada durante o trabalho, à medida que cada funcionalidade exigia fundamentação própria.

## 6.1 Limitações

Além das limitações metodológicas da seção 3.8, o protótipo tem limitações técnicas conhecidas:

- a qualidade pedagógica das respostas depende do modelo de linguagem, e avaliações como o degrau e a prontidão para ensinar variam entre respostas; na captura real apresentada na Figura 5, por exemplo, a primeira dica sugere multiplicar apenas o numerador, uma pista incompleta, já que a fração equivalente exige multiplicar numerador e denominador pelo mesmo número, o que reforça a necessidade de revisão humana das instruções e de avaliação sistemática das dicas;
- as instruções pedem ao modelo que não entregue soluções completas, mas não há garantia de que isso aconteça em todas as respostas;
- as fontes mostradas na Escada vêm dos trechos recuperados, mas as citações escritas no texto da resposta dependem do modelo e podem conter erros;
- a revisão do Fichário é reagendada assim que a pergunta de revisão é enviada, antes de o estudante responder;
- um pedido de flash cards pode resultar em menos cartões do que o solicitado, desde que haja um mínimo de quatro válidos;
- o sistema depende de uma API paga, o que exige cotas de uso e faz do custo um fator para uma adoção em larga escala;
- arquivos anexados diretamente no campo de mensagem são aceitos pela interface, mas não são lidos pelo modelo; o envio de materiais deve ser feito pelo painel Materiais;
- a política de segurança de conteúdo do navegador (CSP) está apenas em modo de relatório, e a leitura de PDFs, embora feita em processo separado, não roda em uma sandbox completa;
- a acessibilidade não foi verificada com leitores de tela nem com ampliação de 200%, e a medição de contraste não foi repetida na versão final;
- o código ainda guarda partes de versões anteriores, como uma trilha fixa de exercícios mantida por compatibilidade, e regras de estilo duplicadas que podem ser simplificadas.

## 6.2 Trabalhos futuros

Como continuidade, sugere-se:

- aplicar o questionário do Apêndice A, depois de adotar uma versão validada em português da escala SUS, a um grupo maior de estudantes, com registro dos participantes e das sessões;
- realizar um estudo com grupo de controle, com pré-teste e pós-teste, para investigar o efeito da Escada de dicas e da revisão espaçada sobre a aprendizagem e a retenção;
- definir critérios para avaliar a qualidade pedagógica das dicas e das explicações, com participação de professores, em resposta à lacuna apontada por Zawacki-Richter et al. (2019);
- gerar trilhas de estudo personalizadas a partir das dificuldades identificadas nas conversas, como previsto no projeto de pesquisa;
- corrigir as limitações técnicas listadas acima, em especial o momento do reagendamento da revisão e a leitura de anexos;
- realizar testes de acessibilidade com leitores de tela e em celulares reais;
- avaliar modelos de linguagem abertos, executados localmente, para reduzir o custo e a dependência de provedores externos.

Espera-se que o trabalho contribua para a discussão sobre o uso de Inteligência Artificial na educação. Ao longo do desenvolvimento, a questão que mais ocupou os autores não foi o que o modelo consegue responder, e sim como ele pode ajudar o estudante a chegar à resposta por conta própria.

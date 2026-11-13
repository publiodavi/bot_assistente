# 1 INTRODUÇÃO

As tecnologias digitais vêm transformando a forma como se estuda. Plataformas de cursos, repositórios de conteúdo e, mais recentemente, assistentes conversacionais baseados em Inteligência Artificial (IA) passaram a fazer parte da rotina de estudantes de todos os níveis. Esse movimento amplia o acesso à informação, mas não resolve, por si só, uma dificuldade antiga do ensino: oferecer apoio individualizado ao estudante no momento exato em que ele não consegue avançar sozinho.

No ensino superior, essa dificuldade tem consequências conhecidas. Tinto (1993) associa a permanência do estudante à sua integração acadêmica, isto é, à experiência de conseguir acompanhar as exigências do curso com o suporte da instituição. Quando o estudante acumula conteúdos que não compreendeu e não encontra a quem recorrer fora do horário de aula, o risco de reprovação e de abandono aumenta. Ritmos de aprendizagem diferentes, lacunas da formação anterior e a falta de tempo para monitorias são fatores que tornam esse apoio ainda mais necessário.

Os grandes modelos de linguagem (Large Language Models, LLM), como os da família GPT (BROWN et al., 2020), tornaram viável construir assistentes capazes de conversar sobre praticamente qualquer assunto. Kasneci et al. (2023) apontam oportunidades desses modelos na educação, como a explicação personalizada e o apoio à escrita, mas também riscos: respostas incorretas apresentadas com segurança, dependência do estudante e a entrega de soluções prontas que dispensam o esforço de pensar. Um assistente que resolve o exercício pelo estudante pode até ajudar a cumprir uma tarefa, mas não necessariamente ajuda a aprender.

É nesse ponto que a teoria de Vygotsky (2007) se torna relevante. Para o autor, a aprendizagem acontece com mais eficácia na Zona de Desenvolvimento Proximal (ZDP), o espaço entre aquilo que o estudante já faz sozinho e aquilo que consegue fazer com a ajuda de alguém mais experiente. Wood, Bruner e Ross (1976) descreveram esse auxílio como andaimento (scaffolding): um apoio temporário, ajustado à necessidade do aprendiz e retirado aos poucos, à medida que ele ganha autonomia.

Este trabalho parte dessa combinação. Propõe-se o desenvolvimento de um assistente virtual, chamado AjudAI, que utiliza um modelo de linguagem para conduzir o estudo por etapas: explica primeiro quando o assunto é novo, faz uma pergunta por vez, oferece pistas graduais que o próprio estudante decide abrir e, quando ele demonstra compreensão, convida-o a ensinar o conteúdo ao companheiro virtual.

## 1.1 Problema

Diante desse contexto, o problema que orienta a pesquisa é o seguinte: como projetar e desenvolver um assistente virtual baseado em modelo de linguagem que apoie estudantes com dificuldades de aprendizagem por meio de orientação gradual, sem substituir o raciocínio do estudante por respostas prontas?

## 1.2 Hipótese

Parte-se da hipótese de que um modelo de linguagem de uso geral pode ser conduzido, por meio de instruções pedagógicas e de uma estrutura de resposta controlada pela aplicação, a oferecer apoio em camadas coerente com o andaimento, e de que esse apoio pode ser integrado a ferramentas de estudo, como revisão espaçada e flash cards, em uma aplicação web segura e utilizável. A hipótese é examinada neste trabalho no plano técnico e da experiência de uso; a verificação de ganhos de aprendizagem exigiria um estudo controlado, fora do escopo desta pesquisa.

## 1.3 Objetivos

### 1.3.1 Objetivo geral

Desenvolver e avaliar um assistente virtual baseado em Inteligência Artificial que ofereça suporte pedagógico personalizado, por meio de interações conversacionais inspiradas na Zona de Desenvolvimento Proximal, a estudantes com dificuldades de aprendizagem.

### 1.3.2 Objetivos específicos

- levantar, na literatura, as principais dificuldades de aprendizagem no ensino superior e as abordagens de apoio ao estudante baseadas em IA;
- estudar modelos de IA e de Processamento de Linguagem Natural (PLN) aplicáveis ao contexto educacional;
- projetar a arquitetura do assistente, definindo suas funcionalidades e fluxos de interação;
- desenvolver um protótipo funcional com tecnologias acessíveis, publicado na web;
- avaliar o protótipo por meio de testes automatizados, testes manuais e uma avaliação exploratória com usuários e revisores técnicos.

## 1.4 Justificativa

A relevância social do tema está na relação entre dificuldade de aprendizagem e permanência no ensino superior (TINTO, 1993). Um assistente disponível a qualquer hora, que acompanhe o estudante no próprio ritmo, pode complementar o apoio oferecido pelos professores e pelas monitorias, sem a pretensão de substituí-los.

Do ponto de vista tecnológico, a área de IA aplicada à educação cresce rapidamente, mas a revisão sistemática de Zawacki-Richter et al. (2019) observou que grande parte dos estudos sobre o tema tem pouca fundamentação pedagógica explícita. Construir um assistente cuja lógica de condução parte de uma teoria de aprendizagem, e não apenas da capacidade técnica do modelo, é uma contribuição coerente com essa lacuna.

Por fim, o trabalho é aderente à formação em Análise e Desenvolvimento de Sistemas, pois integra engenharia de software, banco de dados, desenvolvimento web, segurança da informação e Inteligência Artificial em um mesmo produto, desenvolvido do levantamento de requisitos até a publicação.

## 1.5 Estrutura do trabalho

O capítulo 2 apresenta a fundamentação teórica; o capítulo 3, a metodologia; e o capítulo 4, o desenvolvimento do AjudAI. O capítulo 5 reúne os resultados e sua discussão. O capítulo 6 apresenta as considerações finais, as limitações e as propostas de continuidade.

# 3 METODOLOGIA

Este capítulo descreve como a pesquisa foi conduzida: o tipo de pesquisa, os dados obtidos e a forma de obtê-los, a população envolvida, o tratamento dos dados e as limitações do método. Também apresenta o processo de desenvolvimento do software e as ferramentas utilizadas.

## 3.1 Tipo de pesquisa

Quanto à natureza, trata-se de uma pesquisa aplicada, pois busca produzir conhecimento para a solução de um problema concreto: o apoio a estudantes com dificuldades de aprendizagem. Quanto aos objetivos, é uma pesquisa exploratória, recomendada quando há pouco conhecimento sistematizado sobre o problema e o objetivo é proporcionar maior familiaridade com ele (CERVO; BERVIAN; SILVA, 2007; GIL, 2007). O uso de modelos de linguagem como tutores orientados por uma teoria de aprendizagem é recente, o que justifica esse caráter exploratório.

Quanto aos procedimentos, a pesquisa combina três modalidades:

- pesquisa bibliográfica, para o levantamento dos conceitos de aprendizagem, de IA na educação e das técnicas de estudo (MARCONI; LAKATOS, 2009);
- desenvolvimento de um protótipo de software, construído de forma iterativa e incremental;
- avaliação exploratória do protótipo, com testes automatizados, testes manuais e relatos de usuários e revisores técnicos.

A abordagem dos dados é predominantemente qualitativa. Os resultados técnicos, como a quantidade de testes e as medições de contraste, são descritos de forma quantitativa, mas a avaliação com usuários consiste na análise de relatos, classificados por função e gravidade.

## 3.2 Pesquisa bibliográfica

A pesquisa bibliográfica partiu das referências indicadas no projeto de pesquisa (VYGOTSKY, 2007; LUCKIN et al., 2016; ZAWACKI-RICHTER et al., 2019; DEVLIN et al., 2019; RUSSELL; NORVIG, 2022) e foi ampliada à medida que o desenvolvimento exigia fundamentação para novas decisões. Assim, entraram estudos sobre andaimento, aprender ensinando, revisão espaçada, prática de recuperação, sistemas tutores inteligentes, geração aumentada por recuperação, usabilidade e acessibilidade. Foram consultados livros, artigos de periódicos e anais de conferências, além da documentação oficial das tecnologias empregadas, com leitura seletiva, crítica e analítica.

## 3.3 Processo de desenvolvimento

O desenvolvimento seguiu um processo iterativo e incremental (SOMMERVILLE, 2018). Cada ciclo partia de uma necessidade identificada, fosse ela um requisito inicial, um relato de usuário ou um problema encontrado em revisão. A necessidade era implementada em uma alteração pequena, verificada com testes automatizados e uso manual, registrada no controle de versão e, quando estável, publicada. O histórico do repositório Git, até o commit a26ebff, de novembro de 2026, que é a versão do software descrita neste trabalho, registra cada alteração com uma mensagem sobre sua natureza (nova funcionalidade, correção, design, documentação ou testes). Isso permite acompanhar como o protótipo evoluiu.

Durante o desenvolvimento, foram usadas ferramentas de IA de apoio à programação (Claude e Codex) para revisões de código, de interface e de segurança. Seus apontamentos foram tratados como sugestões: cada achado foi conferido manualmente e só foi incorporado após validação com testes e uso real. As decisões de projeto, a fundamentação pedagógica e a avaliação dos resultados são de responsabilidade dos autores.

## 3.4 Tecnologias e ferramentas

A escolha das tecnologias buscou atender ao objetivo de usar ferramentas acessíveis e, sempre que possível, de código aberto. O Quadro 1 resume as principais escolhas e a justificativa de cada uma. A documentação oficial do Chainlit (CHAINLIT, 2026), da API DeepSeek (DEEPSEEK, 2026) e do ChromaDB (CHROMA, 2026) foi a principal referência para o uso dessas ferramentas.

!TAB|Quadro 1 – Tecnologias utilizadas no protótipo|Elaborado pelos autores (2026).
| Componente | Tecnologia | Justificativa |
| Linguagem | Python 3.12 | Ecossistema maduro para IA e desenvolvimento web; linguagem estudada no curso. |
| Interface de conversa | Chainlit 2.12.0 | Framework de código aberto para aplicações conversacionais, com streaming, histórico e autenticação. |
| Modelo de linguagem | DeepSeek (deepseek-chat) | Custo por uso reduzido e interface compatível com a da OpenAI, o que permite trocar de provedor com pouca alteração. |
| Cliente do modelo | SDK da OpenAI para Python | Biblioteca oficial e estável, usada com o endereço da API DeepSeek. |
| Banco de dados | PostgreSQL com SQLAlchemy e asyncpg | Banco relacional robusto, com suporte a JSON e acesso assíncrono. |
| Banco vetorial | ChromaDB | Armazenamento local de embeddings para a busca nos materiais do estudante. |
| Leitura de PDF | pypdf | Extração do texto das apostilas enviadas, sem serviços externos. |
| Autenticação | Google OAuth | Login com conta já existente, sem a necessidade de armazenar senhas. |
| Frontend | CSS, JavaScript e React (componente do Chainlit) | Personalização da interface padrão do framework. |
| Implantação | Docker e Railway | Publicação da aplicação com banco gerenciado e volume persistente. |
| Versionamento | Git e GitHub | Controle de versões e histórico das alterações. |

## 3.5 Dados obtidos e forma de obtenção

Foram reunidos três tipos de dados.

O primeiro são os resultados dos testes automatizados, escritos com o módulo unittest da biblioteca padrão do Python. Eles verificam partes do sistema que podem ser testadas sem a interface gráfica, como o processamento da Escada de dicas, a validação de dados, as regras de revisão espaçada e de flash cards e os mecanismos de segurança. A execução final foi registrada em um arquivo de log, com data e versão do código.

O segundo são os registros de testes manuais e de inspeção, feitos pelos autores no ambiente local e no ambiente publicado. Entram aqui o uso do sistema com conta Google real e com o modelo de linguagem real, a conferência de layouts em diferentes larguras de tela e a medição automatizada de contraste realizada na revisão de interface de 11 de novembro de 2026.

O terceiro são os retornos da avaliação exploratória. O protótipo foi usado livremente por pessoas externas à dupla de autores, que exploraram a conversa, os flash cards, a sessão de foco, os temas e os materiais e comentaram dificuldades, estranhamentos e sugestões. A esses retornos somaram-se apontamentos de revisões técnicas de código, de segurança e de interface, feitas pelos autores com apoio das ferramentas de IA citadas na seção 3.3. Tudo foi consolidado pelos autores em um relatório de ocorrências, no qual cada item recebeu uma descrição, uma classificação de gravidade e a correção aplicada. O relatório não identifica quem fez cada comentário nem a sessão em que ele surgiu.

## 3.6 População e amostra

A avaliação exploratória contou com aproximadamente nove participantes externos aos autores, recrutados por conveniência. Dois deles usaram o protótipo presencialmente, em um computador levado pelos autores, e os demais receberam o endereço do aplicativo publicado para testá-lo remotamente. Esse número é uma estimativa feita pelos autores depois dos testes, e não uma contagem registrada no momento da coleta. Também não houve registro padronizado do perfil dos participantes, do tempo de uso ou das condições de cada sessão. A amostra serviu para orientar melhorias no protótipo e não tem pretensão de representar os estudantes do ensino superior.

## 3.7 Tratamento e análise dos dados

Os itens do relatório foram analisados de forma qualitativa e organizados por função do sistema (conversa, flash cards, foco, Escada de dicas, temas, acesso e outras) e por gravidade, em três níveis:

- alta: impede o uso do sistema ou expõe dados;
- média: prejudica a experiência ou o aprendizado;
- baixa: detalhe visual ou de texto.

Cada item corresponde a uma ocorrência de feedback, e não a um participante: uma mesma pessoa pode ter feito mais de um comentário, e um comentário pode ter sido repetido por pessoas diferentes. Para cada item, registrou-se a correção aplicada. Os apontamentos técnicos foram organizados à parte, da mesma forma. Os resultados dos testes automatizados e das medições de contraste foram descritos de forma quantitativa, com a contagem de testes executados e de pares de cores verificados.

## 3.8 Limitações da pesquisa

A pesquisa tem limitações que precisam ser levadas em conta na leitura dos resultados:

- a avaliação com usuários foi exploratória e informal, sem questionário estruturado, sem grupo de controle e com número de participantes apenas estimado; por isso, não permite medir ganho de aprendizagem nem generalizar a satisfação ou a usabilidade percebida;
- não há registro individual dos comentários, de modo que não é possível relacionar cada relato a um participante, a uma data ou a uma modalidade de uso (presencial ou remota);
- o relatório não guarda as mensagens originais dos participantes, e não é possível confirmar se as frases nele registradas são transcrições literais; por isso, os relatos são apresentados neste trabalho em discurso indireto;
- os testes ocorreram em um período curto, o que impede observar efeitos de longo prazo, como a retenção que a revisão espaçada pretende favorecer;
- as avaliações feitas pelo próprio modelo de linguagem, como o degrau atual e a indicação de que o estudante está pronto para ensinar, variam entre respostas e não equivalem a uma avaliação pedagógica formal;
- não foram feitos testes com leitores de tela nem com estudantes que tenham diagnóstico de transtornos de aprendizagem.

Para estudos futuros, foram elaborados um questionário baseado na escala SUS e em perguntas sobre a experiência pedagógica (Apêndice A) e um roteiro de teste (Apêndice B). Nenhum dos dois foi aplicado neste trabalho.

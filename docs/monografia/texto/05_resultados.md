# 5 RESULTADOS E DISCUSSÕES

Este capítulo apresenta o que foi obtido em três frentes: a validação técnica do protótipo, a avaliação exploratória com participantes externos e revisões técnicas e, por fim, uma discussão desses resultados à luz dos objetivos e da literatura.

## 5.1 Protótipo publicado

O principal resultado do trabalho é o próprio protótipo, publicado na web e acessível com conta Google verificada. As funcionalidades descritas no capítulo 4 estão implementadas na versão a26ebff do código: conversa em streaming com a Escada de dicas, modos Guia e Aprende, Fichário com Revisão do dia, flash cards com caixas de Leitner, Materiais com indicação de fontes, sessão de foco, tutorial "Como usar", página "Sobre" e personalização de ambientes e companheiros. O código-fonte acompanha este trabalho.

## 5.2 Testes automatizados

O projeto tem 49 testes automatizados, distribuídos em três arquivos (Tabela 1). Os 7 testes de banco de dados só rodam quando se indica uma instância PostgreSQL local; cada execução cria um esquema descartável, aplica as cinco migrações e o remove ao final, sem tocar nos dados reais. Na execução final, em novembro de 2026, sobre o código da versão a26ebff e com o PostgreSQL local, os 49 testes foram aprovados. O registro dessa execução foi guardado junto aos arquivos da monografia.

!TAB|Tabela 1 – Testes automatizados por arquivo|Elaborado pelos autores (2026).
| Arquivo | Nº | Principais verificações |
| test_study.py | 22 | Escada de dicas, histórico, Fichário, revisão espaçada, flash cards, avatar, materiais e regras das instruções. |
| test_security.py | 20 | Cabeçalhos, cookies, origem, limites de corpo e de upload, login, produção, PDF inválido, cotas e prazo do streaming. |
| test_security_db.py | 7 | Propriedade de avaliações e elementos, gatilhos do banco, reserva de uso e cópia de segurança. |
| Total | 49 | 42 sem dependência de banco e 7 com PostgreSQL local; todos aprovados. |

Os testes se concentram nas regras que, se falhassem, comprometeriam a proposta pedagógica ou a segurança. Um exemplo é o caso em que o marcador da Escada chega dividido entre dois trechos do streaming: se a separação falhasse, o estudante veria as dicas antes de pedi-las. A interface no navegador e os fluxos completos com o modelo de linguagem não têm testes automatizados e foram conferidos manualmente.

## 5.3 Testes manuais e inspeções

Os testes manuais foram feitos pelos autores no ambiente local e no ambiente publicado. Com uma conta Google real e o modelo DeepSeek, foram verificados:

- o login e a criação do perfil;
- a criação de conversas sobre assuntos diferentes, a renomeação e a retomada pelo histórico;
- a reinicialização do servidor mantendo o contexto correto de cada conversa;
- a edição de mensagem sem resíduos no contexto;
- a restauração das preferências visuais a partir do banco;
- a abertura sequencial de dicas, com registro no banco e recomposição da Escada após reiniciar o servidor;
- a troca de modo mantida por conversa, o convite para ensinar e a nota do companheiro.

No ambiente publicado, o login foi validado com duas contas Google distintas. Nessa verificação, as duas contas ainda não tinham cadernos, de modo que ela não avaliou o acesso cruzado a históricos preenchidos. O isolamento dos registros entre contas foi verificado separadamente, com contas fictícias em uma instância local, na qual a tentativa de acessar o histórico de outra conta foi recusada, e nos testes automatizados de autorização.

A medição de contraste foi feita na revisão de interface de 11 de novembro de 2026, sobre as 48 combinações de ambiente, aparência e cor de destaque existentes naquela versão. Foram verificados 288 pares de cores dos tokens de texto, controles e superfícies, sem falhas em relação aos limites de 4,5:1 para texto e de 3:1 para componentes (W3C, 2018). Os layouts foram conferidos em larguras de 320, 375, 1366 e 1440 pixels. A medição não foi repetida na versão final e não equivale a uma auditoria completa de acessibilidade, que exigiria, entre outras coisas, testes com leitores de tela e com ampliação de 200%.

Durante a produção das capturas de tela deste trabalho, em novembro de 2026, o mesmo pedido de explicação sobre frações equivalentes foi feito mais de uma vez ao modelo real. Em uma das execuções, a resposta veio sem o bloco da Escada e foi exibida normalmente, sem as dicas, como previsto no tratamento de respostas fora do formato. Em outra, reproduzida na Figura 5, a primeira dica estava incompleta: sugeria multiplicar apenas o numerador, caso retomado na seção 6.1. Esses episódios mostram, na prática, que o comportamento do modelo varia de uma resposta para outra.

## 5.4 Avaliação exploratória com participantes

Aproximadamente nove pessoas externas aos autores usaram o protótipo, duas presencialmente e as demais pelo endereço publicado (seção 3.6). Seus comentários foram consolidados em 19 relatos de feedback. Como dito na seção 3.7, um relato é uma ocorrência de comentário, e não um participante. A Tabela 2 distribui os relatos por função e gravidade.

!TAB|Tabela 2 – Relatos de feedback por função e gravidade|Elaborado pelos autores (2026), a partir do relatório de testes.
| Função | Alta | Média | Baixa | Total |
| Conversa | 0 | 2 | 0 | 2 |
| Flash cards | 0 | 3 | 1 | 4 |
| Foco | 0 | 1 | 1 | 2 |
| Escada de dicas | 0 | 1 | 1 | 2 |
| Companheiros | 0 | 0 | 2 | 2 |
| Uso geral, Busca e Sobre | 0 | 1 | 2 | 3 |
| Temas, Check-in e Identidade | 0 | 0 | 3 | 3 |
| Acesso | 1 | 0 | 0 | 1 |
| Total | 1 | 8 | 10 | 19 |

O Quadro 6 resume os relatos que mais influenciaram as alterações, com a correção aplicada. Os relatos aparecem em discurso indireto porque o relatório não guarda as mensagens originais e não é possível confirmar se as frases ali registradas são literais. A lista completa está no relatório de testes do projeto.

!TAB|Quadro 6 – Principais relatos de feedback e correções|Elaborado pelos autores (2026), a partir do relatório de testes.
| Função | Relato | Grav. | Correção aplicada |
| Conversa | O assistente começava fazendo perguntas, quando o participante queria aprender um assunto novo. | Média | Passou a explicar primeiro, com um exemplo, e só depois perguntar. |
| Conversa | Algumas perguntas pareciam estranhas ou mal formuladas. | Média | Instrução de uma única pergunta, direta e em linguagem simples. |
| Foco | Ao fim do tempo, aparecia só um aviso pequeno. | Média | Tela de pausa que cobre o site, com opção de cancelar. |
| Flash cards | O cartão não virava como um flash card de verdade. | Média | O cartão passou a girar ao ser clicado. |
| Flash cards | Os botões Lembrei, Quase e Não lembrei confundiam. | Média | Só Acertei e Errei, com desempenho final e revisão dos erros. |
| Escada de dicas | A lista mostrava degraus repetidos. | Média | Uma linha por degrau, com a indicação "você está aqui". |
| Uso geral | Faltava algo que ensinasse a usar o sistema. | Média | Tutorial "Como usar" em sete passos. |
| Check-in de ânimo | A função parecia não ter sentido. | Baixa | Função removida. |
| Temas | Cada tema tinha uma fonte diferente, e os nomes soavam estranhos. | Baixa | Mesmas fontes em todos os temas e só as imagens no painel. |
| Acesso | Um segundo usuário não conseguia entrar no site publicado. | Alta | Login liberado para contas Google verificadas. |

Segundo o relatório, todos os 19 relatos receberam uma correção, já publicada. Os de gravidade média se concentraram nas funções de estudo (conversa, flash cards, foco e Escada), e os de gravidade baixa, em aspectos visuais e de texto. O único relato de gravidade alta tratava do acesso ao sistema publicado: o login estava restrito a uma lista de convidados e foi aberto a contas Google verificadas, com as proteções descritas na seção 4.14.

## 5.5 Apontamentos de revisões técnicas

As revisões técnicas de código, segurança e interface, feitas pelos autores com apoio de ferramentas de IA, resultaram em oito apontamentos, apresentados no Quadro 7. Todos foram tratados antes da versão final.

!TAB|Quadro 7 – Apontamentos técnicos e correções|Elaborado pelos autores (2026), a partir do relatório de testes.
| Cód. | Apontamento | Grav. | Correção |
| T1 | Respostas acima de 120 segundos eram cortadas sem aviso e não eram salvas. | Média | Aviso ao usuário e registro do trecho parcial, fora do contexto. |
| T2 | Não havia limite diário de uso do modelo, com risco de custo. | Média | Cotas diárias por conta e teto global. |
| T3 | Avaliações e elementos de mensagem podiam ser alterados sem verificar o dono. | Alta | Verificação de propriedade na aplicação e no banco. |
| T4 | Uploads de até 500 MB, de qualquer tipo. | Alta | Limite de 25 MB, validado antes do processamento. |
| T5 | PDFs pesados podiam travar o servidor. | Média | Leitura em processo separado, com prazo e limite de memória. |
| T6 | CORS aberto, cookies sem o atributo Secure e cabeçalhos de segurança ausentes. | Média | Origens restritas, cookies seguros e HSTS. |
| T7 | O índice de materiais falhava ao iniciar no servidor Linux. | Média | Inicialização corrigida. |
| T8 | Fontes irregulares, botões sem padrão e textos espremidos no celular. | Baixa | Padronização visual. |

Os 19 relatos e os 8 apontamentos não correspondem, necessariamente, a 27 alterações distintas. O apontamento T8, de padronização visual, por exemplo, se sobrepõe a relatos de interface, como o das fontes diferentes em cada tema. O mais correto é dizer que esses itens, somados, orientaram as alterações feitas no protótipo. Os dois apontamentos de gravidade alta (T3 e T4) foram tratados antes da abertura do login ao público, e as correções de segurança ganharam testes automatizados correspondentes (Tabela 1), o que ajuda a evitar que os problemas voltem.

## 5.6 Discussão

Os resultados permitem retomar os objetivos específicos definidos na introdução.

O levantamento bibliográfico e o estudo de modelos de IA e PLN, previstos no primeiro e no segundo objetivos, orientaram decisões concretas. A ZDP e o andaimento deram origem à Escada de dicas e aos níveis de apoio. A pesquisa sobre aprender ensinando levou ao modo Aprende, e os estudos sobre revisão espaçada e prática de recuperação deram forma ao Fichário e aos flash cards. No lugar das bibliotecas tradicionais de PLN previstas no projeto de pesquisa, adotou-se um modelo de linguagem controlado por instruções, alternativa escolhida para atender ao requisito de conversa aberta neste projeto.

O terceiro e o quarto objetivos, de projetar e desenvolver o protótipo, foram cumpridos: o sistema está publicado, com contas, persistência, controles de segurança e limites de custo. Um ponto que merece destaque é que a separação entre o texto visível e as dicas é feita pela aplicação, e não apenas pedida ao modelo. Kasneci et al. (2023) apontam a entrega de respostas prontas como um dos riscos dos modelos de linguagem na educação. No AjudAI, as dicas geradas ficam escondidas até que o estudante decida abri-las, uma de cada vez, o que deixa com ele o controle sobre quanto apoio receber, de modo parecido com o descrito por Wood, Bruner e Ross (1976). Isso não impede que o texto visível, escrito pelo modelo, às vezes adiante mais do que deveria; as instruções reduzem esse risco, mas não o eliminam.

O quinto objetivo, de avaliação, foi atendido apenas em parte. Os testes automatizados e manuais mostram que as funcionalidades principais funcionam como projetado e que as regras críticas têm cobertura. A avaliação exploratória, com cerca de nove participantes, foi útil como avaliação formativa: na linha do que defende Nielsen (1993), poucos usuários apontaram problemas que os autores não tinham percebido. Os relatos mais relevantes para a proposta pedagógica foram os da conversa. Eles mostraram que, para quem chegava sem conhecer o assunto, começar com perguntas não ajudava. A opção por explicar primeiro foi a resposta escolhida. Ela é coerente com a ideia de oferecer apoio inicial e retirá-lo aos poucos, mas não decorre obrigatoriamente da teoria, já que uma pergunta inicial também pode servir para conhecer o que o estudante já sabe.

Um relato levou à remoção de uma funcionalidade, o check-in de ânimo, que parecia não fazer sentido para quem o usou. A decisão está de acordo com a teoria da carga cognitiva (SWELLER, 1988), segundo a qual elementos que não contribuem para a tarefa disputam a atenção de quem estuda.

Por outro lado, a avaliação não mediu ganho de aprendizagem nem usabilidade de forma estruturada, e não houve critérios definidos de antemão para julgar a qualidade pedagógica das respostas. Com os dados deste trabalho, não é possível afirmar que o AjudAI faz o estudante aprender mais do que outras formas de estudo. Os resultados oferecem evidências da viabilidade técnica do protótipo e subsídios exploratórios para melhorar sua interface e sua condução conversacional. A qualidade pedagógica das respostas, a usabilidade percebida e os efeitos sobre a aprendizagem ainda precisam de avaliação sistemática. Quanto à hipótese da seção 1.2, os resultados sustentam sua parte técnica, ou seja, a de que é possível estruturar o apoio em camadas e integrá-lo a ferramentas de estudo em uma aplicação web, e deixam em aberto a parte relativa à qualidade do apoio e aos seus efeitos.

# 4 DESENVOLVIMENTO

Este capítulo apresenta o AjudAI: os requisitos que orientaram o projeto, a arquitetura, o fluxo de uma mensagem, a forma como a orientação pedagógica foi traduzida em instruções para o modelo, as funcionalidades, o modelo de dados, os mecanismos de segurança e a implantação.

## 4.1 Visão geral

O AjudAI é uma aplicação web na qual o estudante conversa com um companheiro de estudos sobre qualquer assunto. Cada conversa é tratada como um caderno: o estudante informa o assunto na capa e, a partir daí, o companheiro conduz o estudo em degraus. A interface simula uma mesa de estudos, com a conversa escrita sobre uma folha e ferramentas de apoio ao redor (Figura 1).

!FIG|cap_capa.png|Figura 1 – Capa do caderno, ponto de entrada do AjudAI|Elaborado pelos autores (2026), a partir de captura de tela do protótipo.

O nome do sistema mudou ao longo do desenvolvimento. O protótipo começou como "Passo a Passo", passou a se chamar "EducAI" e, quando um usuário observou que esse nome já era usado por outro produto, foi renomeado para AjudAI.

## 4.2 Requisitos

Os requisitos foram definidos a partir dos objetivos da pesquisa e da fundamentação teórica e foram refinados ao longo das iterações, principalmente com base nos relatos dos usuários. O Quadro 2 apresenta os requisitos funcionais, e o Quadro 3, os requisitos não funcionais.

!TAB|Quadro 2 – Requisitos funcionais|Elaborado pelos autores (2026).
| Código | Requisito |
| RF01 | Permitir o login com conta Google e manter perfil, preferências e conversas por conta. |
| RF02 | Iniciar um caderno a partir de um assunto livre, com objetivo opcional (entender, destravar ou praticar). |
| RF03 | Responder em streaming, explicando primeiro quando o assunto é novo e terminando com uma única pergunta. |
| RF04 | Oferecer até três dicas graduais e um exemplo parcial por resposta, revelados um de cada vez pelo estudante. |
| RF05 | Registrar o degrau de cada conversa e quantas dicas foram usadas em cada degrau. |
| RF06 | Permitir alternar entre o modo Guia, em que o companheiro conduz, e o modo Aprende, em que o estudante ensina. |
| RF07 | Registrar uma descoberta por caderno no Fichário e agendar revisões espaçadas. |
| RF08 | Gerar flash cards a partir da conversa, de 5 a 20 cartões, com revisão por caixas de Leitner. |
| RF09 | Receber PDFs do estudante, indexá-los e citá-los como fonte nas respostas. |
| RF10 | Oferecer uma sessão de foco com tempos ajustáveis, tela de pausa e lembrete de uso prolongado. |
| RF11 | Permitir escolher ambiente visual, aparência clara ou escura, cor de destaque, tamanho de texto e companheiro. |
| RF12 | Listar, buscar, retomar, renomear e excluir cadernos anteriores. |
| RF13 | Apresentar um tutorial de uso e uma página com informações sobre o projeto. |

!TAB|Quadro 3 – Requisitos não funcionais|Elaborado pelos autores (2026).
| Código | Requisito |
| RNF01 | Interface em português brasileiro e utilizável em telas a partir de 320 pixels de largura. |
| RNF02 | Contraste mínimo de 4,5:1 para textos e 3:1 para componentes, com respeito à preferência por movimento reduzido. |
| RNF03 | Isolamento dos dados: cada conta acessa apenas os próprios cadernos, perfis, cartões e materiais. |
| RNF04 | Limites de uso por conta e globais, para controlar o custo do modelo de linguagem. |
| RNF05 | Respostas interrompidas por tempo limite devem ser sinalizadas e não podem contaminar o contexto da conversa. |
| RNF06 | Configuração por variáveis de ambiente, sem credenciais no código-fonte. |
| RNF07 | Cobertura das regras críticas por testes automatizados que não dependam de credenciais. |

A Figura 2 resume os casos de uso do estudante.

!FIG|fig_casos_uso.png|Figura 2 – Casos de uso do estudante|Elaborado pelos autores (2026).

## 4.3 Arquitetura

A aplicação segue uma arquitetura em camadas, apresentada na Figura 3. O navegador exibe a interface do Chainlit, personalizada com arquivos próprios de estilo (CSS) e de comportamento (JavaScript), além de um componente React que desenha a Escada de dicas. O servidor, escrito em Python, concentra o estado da conversa, valida todas as entradas e se comunica com três serviços: o modelo de linguagem DeepSeek, o banco PostgreSQL e o índice vetorial ChromaDB. A autenticação é delegada ao Google.

!FIG|fig_arquitetura.png|Figura 3 – Arquitetura do AjudAI|Elaborado pelos autores (2026).

O código do servidor está organizado em módulos com responsabilidades separadas, descritos no Quadro 4.

!TAB|Quadro 4 – Módulos do servidor|Elaborado pelos autores (2026).
| Módulo | Responsabilidade |
| app.py | Ciclo de vida da conversa no Chainlit: início, retomada, mensagens, ações e rotas dos materiais. |
| study_accounts.py | Login Google, controle de acesso e consultas ao banco do domínio de estudos. |
| prompts/pedagogical_prompt.py | Instruções pedagógicas: condução, formato da Escada, modos, níveis de apoio, revisão e flash cards. |
| prompts/companions.py | Personalidade, nome padrão e apelidos dos companheiros. |
| services/llm_client.py | Comunicação com a API DeepSeek, com streaming e limites de tempo. |
| services/escada.py | Separação entre o texto visível e as dicas em camadas. |
| services/conversation.py | Reconstrução do histórico e do contexto da conversa. |
| services/cards.py | Validação dos flash cards e regras das caixas de Leitner. |
| services/study_tools.py | Fichário, revisão espaçada e validação da imagem de perfil. |
| rag/indexer.py e rag/safe_extract.py | Extração de texto dos PDFs, divisão em trechos, indexação e busca. |
| security.py, security_chainlit.py, security_data.py e security_limits.py | Cabeçalhos e limites HTTP, validação das mensagens, verificação de propriedade e cotas de uso. |

A comunicação entre o navegador e o servidor usa dois canais. As mensagens da conversa seguem o canal nativo do Chainlit, baseado em WebSocket. As preferências, o perfil, o Fichário, os flash cards e as demais ferramentas usam mensagens entre a página e o servidor em um protocolo próprio, versionado e com tipos de mensagem definidos. O servidor rejeita qualquer tipo que não conheça. Os PDFs são enviados por uma rota HTTP específica, que exige login.

## 4.4 Fluxo de uma mensagem

A Figura 4 mostra o caminho de uma mensagem do estudante até a resposta.

!FIG|fig_sequencia.png|Figura 4 – Sequência de processamento de uma mensagem|Elaborado pelos autores (2026).

O processamento ocorre nas seguintes etapas:

- a camada de segurança valida a mensagem: o identificador deve ser válido, o texto pode ter no máximo 20.000 caracteres, o autor é sempre registrado como o estudante e uma nova mensagem só é aceita depois que a anterior termina;
- o servidor carrega o perfil e as preferências do estudante e verifica a cota de uso;
- as mensagens enviadas ao modelo são montadas em ordem: as instruções pedagógicas, a voz do companheiro, o modo e o nível de apoio, o nome, o objetivo e a dificuldade do estudante e o formato obrigatório da resposta; depois, o histórico do caderno; se for o caso, a instrução de revisão e os trechos dos materiais; e, por fim, a mensagem do estudante;
- a resposta chega em streaming e passa por um separador que mostra ao estudante apenas o texto visível, guardando as dicas;
- ao final, as dicas são validadas, registradas na mensagem e exibidas como a Escada de dicas, e a interface é atualizada.

Uma resposta que demora mais de 120 segundos é interrompida. O trecho já recebido é salvo com uma marcação de interrupção, o estudante é avisado e esse trecho não é reaproveitado no contexto das mensagens seguintes. Assim, uma resposta incompleta não induz o modelo a erros posteriores.

## 4.5 Orientação pedagógica nas instruções do modelo

O AjudAI não usa um modelo treinado especificamente para educação. A condução pedagógica vem de instruções de sistema, escritas pelos autores a partir das ideias do capítulo 2 e ajustadas conforme os retornos dos usuários. O Apêndice C reproduz o núcleo dessas instruções, que pedem ao modelo, entre outras coisas:

- que explique primeiro quando o estudante pede para aprender algo novo e ainda não mostrou o que sabe, com linguagem simples e um exemplo resolvido, e só então faça uma pergunta de checagem;
- que, diante de um exercício ou de uma tentativa, aponte o que estava certo e ofereça uma pista por vez, sem entregar a resolução completa;
- que termine cada resposta com uma única pergunta direta, em português simples, que possa ser respondida em uma ou duas frases;
- que diminua o apoio quando o estudante acerta sozinho e o aumente quando ele trava;
- que não faça diagnóstico clínico, não invente fatos nem fontes e reconheça suas limitações.

Essas instruções orientam o modelo, mas não garantem que ele as cumpra em todas as respostas; a seção 5.3 e o capítulo 6 trazem exemplos de desvio. A primeira e a terceira instruções nasceram, em parte, dos retornos dos usuários. Na primeira versão, o assistente sempre começava perguntando, o que atrapalhava quem queria aprender um assunto do zero, e algumas perguntas saíam mal formuladas. Explicar primeiro foi a escolha feita para esse caso, e não uma exigência da teoria, como se discute no capítulo 5.

Os três níveis de apoio, escolhidos no perfil, acrescentam instruções específicas. No nível "menos dicas", o companheiro pede logo uma tentativa; no nível "dicas guiadas", explica o que for novo e oferece uma pista por vez; no nível "mais apoio", explica com mais detalhe, divide o problema em passos menores e mostra exemplos parciais.

Os textos que vêm do estudante e são inseridos nas instruções, como a descoberta do Fichário, a conversa usada para gerar flash cards e os trechos dos materiais, são isolados entre marcadores e têm os sinais de marcação neutralizados. As instruções declaram que esses trechos são dados, e não comandos. Essa medida reduz o risco de que um texto enviado pelo estudante altere o comportamento do modelo.

## 4.6 Escada de dicas

A Escada de dicas é a funcionalidade que mais diretamente representa o andaimento. Cada resposta do modelo é composta de duas partes: o texto que o estudante lê e, depois de um marcador, um objeto JSON com o apoio em camadas. O Quadro 5 mostra o formato exigido.

!CODE|Quadro 5 – Formato de resposta exigido do modelo|Adaptado de src/prompts/pedagogical_prompt.py (2026).
Texto visível ao estudante, terminando com uma única pergunta?
@@ESCADA@@
{"tipo": "pergunta|dica|verificacao|conquista|ensino",
 "degrau": 1, "subiu_sozinho": false,
 "dicas": ["pista curta", "pista mais específica"],
 "exemplo_parcial": "",
 "pronto_para_ensinar": false}
!ENDCODE

Como a resposta chega em pedaços, o marcador pode ser dividido entre dois trechos recebidos. O separador da aplicação retém o final de cada trecho que possa ser o início do marcador, para que nem o marcador nem o JSON apareçam na tela. Ao fim da resposta, o JSON é validado: tipos desconhecidos são descartados, o degrau é limitado entre 1 e 50, as dicas são limitadas a três e os campos de texto têm tamanho máximo. Se o JSON for inválido, a resposta é exibida normalmente, sem a Escada.

Na interface (Figura 5), a Escada mostra o degrau atual e as camadas de apoio. Apenas a primeira camada pode ser aberta; as seguintes aparecem bloqueadas até que a anterior seja revelada. O servidor só aceita a abertura da camada imediatamente seguinte e registra no banco quantas foram abertas. Esse registro volta ao modelo no histórico, para que ele não repita pistas já vistas. Quando o estudante avança sem abrir nenhuma dica, o degrau recebe o selo "subiu sozinho".

!FIG|cap_conversa.png|Figura 5 – Conversa com a Escada de dicas, com a primeira dica aberta|Elaborado pelos autores (2026), a partir de captura de tela do protótipo.

A Figura 5 reproduz uma resposta real do modelo, sem edição. A primeira dica exibida (multiplicar o número de cima por 2) está incompleta, pois uma fração equivalente exige multiplicar numerador e denominador pelo mesmo número. A captura foi mantida como exemplo do comportamento observado, e essa limitação é discutida nas seções 5.3 e 6.1.

Na barra de estudo, o botão do degrau abre a escada completa da conversa, com uma linha por degrau, a quantidade de dicas usadas e a indicação "você está aqui". Essa visualização foi reorganizada depois que usuários relataram degraus repetidos na lista.

## 4.7 Modos Guia e Aprende

No modo Guia, o companheiro conduz o estudo. No modo Aprende, os papéis se invertem: o companheiro finge não dominar o assunto, pede que o estudante explique com as próprias palavras e pode apresentar um equívoco plausível para que ele corrija. Depois de cada explicação, a resposta traz uma nota com o que ficou claro e o que faltou, exibida na Escada.

O modo pode ser escolhido para toda a conversa, por um seletor na barra de estudo, ou ativado em um único turno. Quando o modelo indica que o estudante está pronto para ensinar, a Escada exibe o botão "Explique para", seguido do nome do companheiro, que ativa o modo Aprende na resposta seguinte. A escolha do modo é salva no caderno e restaurada quando a conversa é retomada.

## 4.8 Fichário e Revisão do dia

O Fichário guarda uma descoberta por caderno, escrita pelo próprio estudante, com até 1.000 caracteres. Ao salvar, o estudante pode agendar uma revisão. A primeira acontece em três dias, e as seguintes em sete, quatorze e trinta dias, em intervalos crescentes, conforme a revisão espaçada.

As revisões pendentes aparecem na capa, na seção Revisão do dia. A revisão é feita em dois turnos, para praticar a recuperação. No primeiro, o companheiro faz uma pergunta que leva o estudante a reconstruir a ideia de memória, de preferência aplicando-a a um caso novo, sem mostrar a anotação. No segundo, compara a resposta com a descoberta registrada, aponta o que foi lembrado e, se faltou algo essencial, faz uma nova pergunta. Na versão atual, a próxima data é agendada assim que o companheiro envia a pergunta do primeiro turno, antes de o estudante responder. Assim, a revisão é contada como feita mesmo que o estudante não chegue a responder, comportamento que fica registrado entre as limitações do capítulo 6.

## 4.9 Flash cards

O estudante pode gerar flash cards de qualquer caderno, escolhendo entre 5, 10, 15 ou 20 cartões (Figura 6). O modelo recebe a conversa e, se houver, a descoberta do Fichário, e cria os cartões com base no que foi estudado. Se a conversa não render cartões suficientes, ele completa a quantidade com perguntas do mesmo tema e nível, marcadas como extras. A frente de cada cartão é uma pergunta que exige lembrar ou aplicar a ideia, e o verso responde em até duas frases.

!FIG|cap_flashcards.png|Figura 6 – Revisão de flash cards|Elaborado pelos autores (2026), a partir de captura de tela do protótipo.

O cartão vira ao ser clicado, e o estudante marca "Acertei" ou "Errei". Cada cartão pertence a uma caixa de Leitner. Um acerto o promove para a caixa seguinte, com nova revisão em 7, 14 ou 30 dias, e um erro o devolve à primeira caixa, com revisão no dia seguinte. Ao final, o sistema mostra o desempenho e permite revisar apenas os cartões errados. Os baralhos com cartões vencidos também aparecem na Revisão do dia.

A resposta do modelo é validada antes de ser salva. O JSON precisa ter o formato esperado, os textos têm tamanho máximo, cartões repetidos são descartados e o baralho é cortado na quantidade pedida. Se o modelo devolver menos cartões válidos do que o pedido, o baralho ainda é aceito desde que tenha pelo menos quatro (ou a quantidade pedida, se for menor). Assim, um pedido de 20 cartões pode resultar em um baralho menor.

## 4.10 Materiais do estudante

No painel Materiais, o estudante envia PDFs de apostilas, livros ou listas de exercícios do próprio curso. O processamento foi desenhado para ser privado e seguro:

- o arquivo deve começar com a assinatura de um PDF e ter no máximo 25 MB;
- o texto é extraído em um processo separado do servidor, com prazo de 60 segundos e, em servidores Linux, limites de CPU e de memória, para reduzir o risco de um arquivo malformado travar a aplicação;
- o texto é dividido em trechos de cerca de 900 caracteres, com sobreposição de 150, e cada trecho guarda o nome do material e a página;
- os trechos são indexados no ChromaDB com o identificador da conta, e o PDF original não é armazenado.

Quando a opção "Usar meus materiais" está ativa, cada pergunta consulta os trechos da própria conta. A busca combina a similaridade semântica com a presença de termos da pergunta e descarta resultados pouco relevantes, devolvendo no máximo três trechos. As instruções pedem que o modelo cite a fonte no texto, com nome e página, e que transforme exercícios resolvidos em pistas, sem entregar a resposta. As fontes exibidas na Escada são montadas pelo servidor a partir dos trechos efetivamente recuperados, com nome e página. Já as citações que aparecem no texto da resposta são escritas pelo modelo e podem conter erros, por isso merecem conferência.

## 4.11 Sessão de foco

A sessão de foco segue a técnica Pomodoro, com 25 minutos de estudo e 5 de pausa por padrão, ambos ajustáveis. O relógio usa o horário de término, e não uma contagem de segundos, para continuar correto mesmo quando a aba fica em segundo plano. Ao fim do estudo, uma tela de pausa cobre a interface. O estudante pode cancelá-la, mas o convite à pausa fica explícito. Independentemente da sessão de foco, depois de 50 minutos de uso contínuo o sistema sugere uma pausa, que pode ser adiada por 15 minutos. Esses dois comportamentos foram incluídos a partir de relatos de usuários.

## 4.12 Personalização

O AjudAI oferece seis ambientes visuais: Caderno Vintage, Castelo da Magia, Herói Aracnídeo, Cyberpunk, Café Lo-fi e Jardim/Estufa. Cada um tem uma cena ilustrada em SVG para as aparências clara e escura (Figura 7). O estudante também pode escolher entre quatro cores de destaque, três intensidades de cenário e três tamanhos de texto, além de pausar as animações. A preferência do sistema operacional por movimento reduzido é respeitada.

!FIG|cap_temas.png|Figura 7 – Painel de ambientes visuais|Elaborado pelos autores (2026), a partir de captura de tela do protótipo.

Para preservar a legibilidade, todos os ambientes usam as mesmas famílias tipográficas: uma fonte serifada nos títulos, uma fonte sem serifa na leitura e outra na interface. Inicialmente, cada ambiente tinha fontes próprias, mas os usuários relataram estranheza, e as fontes foram unificadas. O ambiente passou a ser expresso apenas pelas cores e pela cena.

Há doze companheiros de estudo: três originais (a coruja Eva, a raposa Foxi e o robô Chappie) e nove inspirados em personagens conhecidos da ficção, como Harry, Hermione, Batman e o Homem-Aranha. Cada companheiro tem uma voz própria, descrita nas instruções do modelo, e o estudante pode dar-lhe um apelido ou ocultá-lo. As expressões do companheiro mudam conforme o momento da conversa: atento, pensando, encorajando ou comemorando. Cada resposta guarda o companheiro que a assinou, de modo que trocar de companheiro não altera a autoria das respostas anteriores. A personalização não é apresentada como fator de aprendizagem. Ela é uma hipótese de experiência do usuário, relacionada ao acolhimento e ao engajamento, que precisaria de estudo próprio.

## 4.13 Modelo de dados

O banco de dados é criado por cinco scripts de migração, aplicados em ordem a cada inicialização e escritos para poderem ser executados novamente sem apagar dados. As tabelas `users`, `threads`, `steps`, `elements` e `feedbacks` seguem o modelo de persistência do Chainlit, que representa usuários, conversas, mensagens, elementos de interface e avaliações. As tabelas com o prefixo `study_` pertencem ao domínio do AjudAI. A Figura 8 mostra o modelo entidade-relacionamento simplificado.

!FIG|fig_er.png|Figura 8 – Modelo entidade-relacionamento simplificado|Elaborado pelos autores (2026).

O perfil do estudante, incluindo preferências, apelidos, avatar e Fichário, é guardado como um documento JSON na tabela `study_profiles`. A tabela `study_card_decks` guarda o baralho de cada caderno, também em JSON. A tabela `study_materials` registra os PDFs enviados e o estado do processamento, e a tabela `study_usage` registra cada uso do modelo e de envio de arquivos para o controle de cotas. Os metadados das mensagens guardam o companheiro que respondeu, o JSON da Escada e a marca de resposta interrompida. Todas as chaves estrangeiras usam exclusão em cascata, de modo que remover uma conversa remove também suas mensagens, cartões e registros.

O uso de JSON para o perfil e os baralhos foi uma escolha de simplicidade, pois esses dados são sempre lidos e gravados inteiros, por uma única conta. Já os dados que precisam de consulta e de integridade, como a propriedade das conversas e o controle de uso, ficam em colunas próprias, com índices.

## 4.14 Segurança

Como o protótipo foi publicado na internet com login aberto a contas Google verificadas, a segurança recebeu atenção específica. As medidas estão organizadas em quatro frentes.

Acesso e isolamento. O login exige e-mail verificado pelo Google e pode ser restrito a uma lista de convidados. As consultas do domínio de estudos filtram os dados pela conta autenticada. No banco, gatilhos do PostgreSQL impedem que uma conversa mude de dono e que mensagens, elementos e avaliações sejam movidos entre conversas. Eles acrescentam uma barreira contra transferências indevidas de propriedade, complementando as verificações da aplicação, mas não substituem a autorização feita no código.

Entradas e requisições. Uma camada intermediária (middleware ASGI) limita o tamanho do corpo das requisições, verifica a origem das chamadas, restringe o CORS ao endereço da aplicação, aplica cookies seguros e adiciona cabeçalhos de segurança, como HSTS. As mensagens da conversa têm tamanho máximo, e os metadados enviados pelo navegador são descartados.

Arquivos. Os PDFs têm limite de 25 MB, são validados antes do processamento e lidos em um processo separado, que não recebe no seu ambiente as variáveis de credenciais da aplicação. Esse processo não é uma sandbox completa, pois roda com o mesmo usuário do sistema e o mesmo acesso a arquivos. A imagem de perfil é reduzida no navegador para WebP de 256 por 256 pixels e validada no servidor, com limite de 80 KB.

Custo e disponibilidade. Cada operação que consome o modelo tem um limite por minuto e uma cota diária por conta: 150 mensagens, 30 gerações de flash cards e 40 envios de arquivos. Há também um teto global diário para toda a aplicação, configurável. As reservas de uso são feitas de forma atômica no banco e liberadas em caso de falha. As respostas têm limite de tamanho e de tempo.

Boa parte desses mecanismos tem testes automatizados específicos, descritos no capítulo 5.

## 4.15 Implantação

A aplicação é empacotada em uma imagem Docker. Na inicialização, um script aplica as migrações do banco e, em seguida, o servidor do Chainlit é iniciado. O protótipo foi publicado na plataforma Railway, com um banco PostgreSQL gerenciado e um volume persistente para o índice dos materiais. As credenciais (chave do modelo, cliente OAuth do Google, segredo de sessão e endereço do banco) são fornecidas por variáveis de ambiente. Em modo de produção, a aplicação se recusa a iniciar se alguma configuração obrigatória estiver ausente ou se o modo de demonstração estiver ativo.

Em ambiente local, o sistema pode ser executado sem login e sem banco, em modo de demonstração, com as conversas mantidas apenas na memória. Isso facilita o desenvolvimento e a apresentação do protótipo.

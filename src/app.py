'''Ponto de entrada da interface conversacional Chainlit.

Responsabilidades deste módulo:
- Inicializar a aplicação Chainlit e configurar o ambiente.
- Gerenciar a sessão de cada estudante (histórico de conversa, diagnóstico
  de lacunas e trilha de aprendizagem em andamento).
- Orquestrar o fluxo: receber a mensagem do estudante, acionar o cliente
  LLM com o prompt pedagógico e o contexto RAG, e transmitir a resposta.

Fundamentação: o fluxo conversacional implementa a mediação pedagógica da
Zona de Desenvolvimento Proximal (ZDP) de Vygotsky, na qual o assistente
atua como um mediador que oferece andaimento (scaffolding) ao estudante.
'''

# TODO(app): importar chainlit e o módulo de prompt pedagógico.
# TODO(app): implementar o handler de início de conversa (on_chat_start),
#            realizando o diagnóstico inicial de lacunas de conhecimento.
# TODO(app): implementar o handler de mensagem (on_message), integrando o
#            cliente LLM, o contexto RAG e o streaming de resposta.
# TODO(app): manter o estado da sessão do estudante (diagnóstico, progresso
#            na trilha) entre mensagens.
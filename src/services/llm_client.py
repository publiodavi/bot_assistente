'''Cliente de conexão e streaming com o modelo de linguagem.

Responsabilidades deste módulo:
- Instanciar o cliente OpenAI SDK apontado para a API DeepSeek
  (base_url configurável via variáveis de ambiente).
- Enviar o prompt de sistema pedagógico (ZDP de Vygotsky) junto ao
  histórico da conversa.
- Processar respostas em streaming para exibição fluida na interface.
- Tratar erros de conexão e limites da API de forma resiliente.
'''

# TODO(llm_client): criar classe LLMClient que carrega DEEPSEEK_API_KEY,
#            DEEPSEEK_BASE_URL e DEEPSEEK_MODEL do arquivo .env.
# TODO(llm_client): implementar método de conversa assíncrona com streaming.
# TODO(llm_client): padronizar a estrutura de mensagens (system, user,
#            assistant) esperada pelo SDK.
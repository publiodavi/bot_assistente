'''Processamento de documentos acadêmicos em PDF e busca semântica vetorial.

Responsabilidades deste módulo:
- Carregar os PDFs das disciplinas do diretório data/materiais.
- Extrair e segmentar o texto em blocos adequados à indexação vetorial.
- Gerar embeddings e persistir os vetores em um banco ChromaDB local.
- Realizar busca semântica para recuperar os trechos mais relevantes ao
  contexto da conversa, fundamentando as respostas do assistente.
'''

# TODO(indexer): implementar a leitura de PDFs (pypdf) e a segmentação de
#            texto em chunks com tamanho e sobreposição adequados.
# TODO(indexer): configurar a coleção local do ChromaDB e a função de
#            embeddings.
# TODO(indexer): implementar a consulta semântica (retrieval) com top-k
#            resultados e metadados de origem.
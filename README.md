# Assistente Virtual para Auxílio a Estudantes com Dificuldade de Aprendizado no Ensino Superior

Projeto de Trabalho de Graduação (TCC) apresentado ao curso de **Análise e Desenvolvimento de Sistemas** da **Fatec Guarulhos**.

## Resumo Acadêmico

Este projeto propõe o desenvolvimento de um **assistente virtual** baseado em **Inteligência Artificial (IA)** e **Processamento de Linguagem Natural (PLN)** para apoiar estudantes do ensino superior que apresentam dificuldades de aprendizado. O assistente interage por meio de conversação em linguagem natural, realiza o **diagnóstico de lacunas de conhecimento** e propõe **trilhas de aprendizagem personalizadas**, respeitando o ritmo individual de cada estudante.

Diferentemente de assistentes convencionais que entregam respostas prontas, este protótipo adota uma abordagem pedagógica fundamentada na **Teoria da Zona de Desenvolvimento Proximal (ZDP)** de Vygotsky: o sistema atua como um mediador (par mais capaz), guiando o estudante passo a passo por meio de **andaimento (scaffolding)**, dicas graduais e perguntas instigantes, para que o próprio estudante construa o conhecimento.

## Justificativa

A evasão no ensino superior é um desafio persistente, frequentemente associado a dificuldades de acompanhamento individualizado em turmas numerosas. Um assistente virtual disponível a qualquer momento pode complementar a atuação docente, oferecendo suporte contínuo, adaptado ao nível de cada estudante e fundamentado no conteúdo programático das disciplinas — contribuindo para a permanência e o sucesso acadêmico.

A proposta dialoga com a literatura de IA na educação (Luckin et al., 2016; Zawacki-Richter et al., 2019), que destaca o potencial de sistemas inteligentes como apoio personalizado à aprendizagem.

## Arquitetura do Sistema

```
+-------------------+     +--------------------------------------+
|     Estudante     | --> | Interface Conversacional (Chainlit)  |
+-------------------+     +--------------------------------------+
                                   |
                                   v
                        +------------------------+
                        |   Camada Pedagógica    |
                        |  Prompt de Sistema ZDP |
                        +------------------------+
                                   |
                                   v
                        +------------------------+    +------------------------+
                        |    Camada de IA        |<-->|  Pipeline RAG Local    |
                        | API DeepSeek (OpenAI   |    | PDFs -> ChromaDB       |
                        | SDK, deepseek-chat)    |    | (busca semântica)      |
                        +------------------------+    +------------------------+
```

### Componentes

- **Interface Conversacional (Chainlit):** interação em tempo real com o estudante e gerenciamento da sessão (`src/app.py`).
- **Camada Pedagógica:** prompt de sistema baseado na ZDP de Vygotsky, que define a persona do assistente e as regras de andaimento (`src/prompts/pedagogical_prompt.py`).
- **Camada de IA:** conexão e streaming com o modelo de linguagem DeepSeek por meio do SDK compatível com a OpenAI (`src/services/llm_client.py`).
- **Pipeline RAG Local:** processamento de PDFs das disciplinas, indexação vetorial no ChromaDB e recuperação de trechos relevantes para fundamentar as respostas (`src/rag/indexer.py`).

### Como a ZDP de Vygotsky atua no fluxo de conversa

A Zona de Desenvolvimento Proximal define o intervalo entre o que o estudante consegue fazer sozinho e o que pode alcançar com o auxílio de um mediador. No assistente, isso se materializa da seguinte forma:

1. **Diagnóstico inicial:** o assistente faz perguntas para mapear lacunas de conhecimento (o que o estudante já domina e o que ainda não domina).
2. **Andaimento (scaffolding):** diante de uma dúvida, o assistente **não entrega a resposta pronta**; oferece dicas graduais, exemplos parciais e perguntas instigantes que elevam progressivamente o nível de exigência.
3. **Retirada gradual do suporte:** à medida que o estudante demonstra domínio, o auxílio é reduzido, promovendo autonomia.
4. **Trilha de aprendizagem:** ao final do diagnóstico, o assistente sugere uma sequência personalizada de estudos com base nas lacunas identificadas.

### Como o RAG atua no fluxo de conversa

O pipeline RAG (Retrieval-Augmented Generation) ancora o discurso do assistente no conteúdo oficial das disciplinas. Os PDFs depositados em `data/materiais/` são processados, segmentados e indexados como vetores no ChromaDB. A cada interação, os trechos semanticamente mais relevantes são recuperados e incorporados ao contexto do modelo, garantindo que as dicas e explicações estejam alinhadas ao material didático da disciplina — reduzindo alucinações e desvios de conteúdo.

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Linguagem | Python 3.11+ |
| Interface conversacional | Chainlit |
| Modelo de linguagem | DeepSeek API (`deepseek-chat`) via SDK compatível com OpenAI |
| Base vetorial local | ChromaDB |
| Extração de documentos | pypdf |
| Configuração | python-dotenv (.env) |

## Guia de Instalação e Configuração do Ambiente Local

### Pré-requisitos

- Python 3.11 ou superior.
- Chave de API da DeepSeek (obtida em https://platform.deepseek.com).

### Passo a passo

1. **Clonar o repositório:**

   ```
   git clone <url-do-repositorio>
   cd <nome-do-repositorio>
   ```

2. **Criar e ativar o ambiente virtual:**

   ```
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/macOS
   source venv/bin/activate
   ```

3. **Instalar as dependências:**

   ```
   pip install -r requirements.txt
   ```

4. **Configurar as variáveis de ambiente:**

   ```
   copy .env.example .env   # Windows
   cp .env.example .env     # Linux/macOS
   ```

   Edite o arquivo `.env` e preencha a chave de API:

   ```
   DEEPSEEK_API_KEY=sua_chave_aqui
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   DEEPSEEK_MODEL=deepseek-chat
   ```

5. **Adicionar os materiais das disciplinas:** copie os PDFs (ementas, apostilas, notas de aula) para o diretório `data/materiais/`.

6. **Executar o assistente:**

   ```
   chainlit run src/app.py
   ```

   A interface estará disponível em `http://localhost:8000`.

## Estrutura do Repositório

```
.
|-- README.md
|-- ESCOPO_E_ARQUITETURA.md
|-- .clinerules
|-- .gitignore
|-- .env.example
|-- requirements.txt
|-- .chainlit/
|   `-- config.toml               # configuração de tema e interface (versionada)
|-- src/
|   |-- app.py
|   |-- services/
|   |   `-- llm_client.py
|   |-- prompts/
|   |   `-- pedagogical_prompt.py
|   `-- rag/
|       `-- indexer.py
`-- data/
    `-- materiais/                 # PDFs da base de conhecimento
```

## Referências

- LUCKIN, R.; HOLMES, W.; GRIFFITHS, M.; FORCIER, L. B. **Intelligence Unleashed**: an argument for AI in education. Londres: Pearson, 2016.
- ZAWACKI-RICHTER, O.; MARÍN, V. I.; BOND, M.; GOUVERNEUR, F. Systematic review of research on artificial intelligence applications in higher education — where are the educators? **International Journal of Educational Technology in Higher Education**, v. 16, n. 39, 2019.
- VYGOTSKY, L. S. **A formação social da mente**. 7. ed. São Paulo: Martins Fontes, 2007.
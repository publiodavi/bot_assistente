# Monografia do TG

- `texto/*.md`: texto de cada capítulo (fonte para revisão).
- `figuras/*.mmd`: diagramas em Mermaid; `fig_*.png` renderizados e `cap_*.png` capturas reais do app local.
- `fontes/`: template da Fatec e relatório de testes com usuários.
- `entrega/`: versão final da monografia entregue (DOCX e PDF). A versão final recebeu
  ajustes manuais no Word depois da última geração pelo script, como a referência no
  topo do abstract; por isso, gerar de novo a partir de `texto/` não reproduz o arquivo exatamente.

Para gerar de novo (Windows, com Word instalado):

```powershell
python docs/monografia/gerar_monografia.py          # monta o DOCX sobre o template (python-docx)
.\docs\monografia\atualizar_word.ps1                 # sumário, listas, numeração e total de folhas
.\docs\monografia\exportar_pdf.ps1                   # PDF de conferência
.\.venv\Scripts\python.exe docs/monografia/renderizar_diagramas.py   # diagramas (Edge headless)
```

`capturas.py` refaz as capturas numa instância local com conta fictícia; usa o modelo real e o banco local.

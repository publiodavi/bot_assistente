"""Gera a monografia (DOCX) sobre o template da Fatec Guarulhos a partir de texto/*.md.

Uso: python docs/monografia/gerar_monografia.py
Depende do python-docx (ferramenta de documentação; não faz parte do requirements.txt do app).

Marcação aceita nos arquivos de texto:
  # / ## / ###            títulos de 1º, 2º e 3º nível
  > texto                 citação longa (Arial 10, recuo de 4 cm)
  - texto                 item de lista
  !FIG|arquivo|legenda|fonte
  !TAB|legenda|fonte  seguido de linhas | a | b |  (primeira linha = cabeçalho)
  !CODE|legenda|fonte ... !ENDCODE
  **negrito**, *itálico* e `código` dentro dos parágrafos
"""
import copy
import re
import struct
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).parent
TEXT = ROOT / "texto"
FIGS = ROOT / "figuras"
TEMPLATE = ROOT / "fontes" / "template.docx"
OUTPUT = ROOT / "AjudAI_Monografia.docx"
FONT = "Arial"

# Índices dos parágrafos do template (capa, folha de rosto e folha de aprovação).
KEEP_UNTIL = 83  # "Local, data" da folha de aprovação; o restante do template é substituído


# ---------------------------------------------------------------- utilidades XML

def set_run_font(run, size=None, bold=None, italic=None, name=FONT):
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.insert(0, fonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        fonts.set(qn(attr), name)
    if size:
        run.font.size = Pt(size)
    if bold is not None:
        run.font.bold = bold
    if italic is not None:
        run.font.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)


def replace_text(paragraph, text):
    runs = paragraph.runs
    runs[0].text = text
    for run in runs[1:]:
        run._element.getparent().remove(run._element)


def page_break_before(paragraph):
    paragraph.paragraph_format.page_break_before = True


def add_field(paragraph, instruction, placeholder=""):
    """Campo do Word (TOC, PAGE...), atualizado depois pelo próprio Word."""
    def fld(kind):
        run = paragraph.add_run()
        el = OxmlElement("w:fldChar")
        el.set(qn("w:fldCharType"), kind)
        run._element.append(el)
        return run
    fld("begin")
    run = paragraph.add_run()
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = f" {instruction} "
    run._element.append(instr)
    fld("separate")
    if placeholder:
        set_run_font(paragraph.add_run(placeholder), 12)
    fld("end")


def cell_borders(cell, **edges):
    tcpr = cell._element.get_or_add_tcPr()
    borders = tcpr.find(qn("w:tcBorders"))
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tcpr.append(borders)
    for edge, val in edges.items():
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), val)
        el.set(qn("w:sz"), "6")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "000000")
        borders.append(el)


def png_size(path):
    with open(path, "rb") as handle:
        head = handle.read(24)
    return struct.unpack(">II", head[16:24])


# ---------------------------------------------------------------- estilos

def paragraph_style(doc, name, size=12, bold=False, italic=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
                    line=1.5, first=0.0, left=0.0, before=0, after=0, outline=None, keep=False, caps=False):
    styles = doc.styles
    style = styles[name] if name in [s.name for s in styles] else styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
    style.base_style = None
    font = style.font
    font.name, font.size, font.bold, font.italic, font.all_caps = FONT, Pt(size), bold, italic, caps
    font.color.rgb = RGBColor(0, 0, 0)
    rpr = style.element.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.insert(0, fonts)
    for attr in list(fonts.attrib):
        del fonts.attrib[attr]
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        fonts.set(qn(attr), FONT)
    fmt = style.paragraph_format
    fmt.alignment = align
    fmt.line_spacing = line
    fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE if line == 1.5 else WD_LINE_SPACING.SINGLE
    fmt.first_line_indent = Cm(first)
    fmt.left_indent = Cm(left)
    fmt.space_before, fmt.space_after = Pt(before), Pt(after)
    fmt.keep_with_next = keep
    ppr = style.element.get_or_add_pPr()
    for old in ppr.findall(qn("w:outlineLvl")):
        ppr.remove(old)
    if outline is not None:
        lvl = OxmlElement("w:outlineLvl")
        lvl.set(qn("w:val"), str(outline))
        ppr.append(lvl)
    return style


def default_fonts(doc):
    """Padrões do documento em Arial 12, no lugar da fonte do tema (Calibri)."""
    rpr = doc.styles.element.find(qn("w:docDefaults")).find(qn("w:rPrDefault")).find(qn("w:rPr"))
    fonts = rpr.find(qn("w:rFonts"))
    for attr in list(fonts.attrib):
        del fonts.attrib[attr]
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        fonts.set(qn(attr), FONT)
    for tag in ("w:sz", "w:szCs"):
        rpr.find(qn(tag)).set(qn("w:val"), "24")
    normal = doc.styles["Normal"]
    normal.font.name, normal.font.size = FONT, Pt(12)
    # Parágrafo padrão: entrelinha 1,5 e sem espaço extra (o padrão do Word era 1,08 com 8 pt depois).
    ppr = doc.styles.element.find(qn("w:docDefaults")).find(qn("w:pPrDefault")).find(qn("w:pPr"))
    spacing = ppr.find(qn("w:spacing"))
    spacing.set(qn("w:after"), "0")
    spacing.set(qn("w:line"), "360")
    spacing.set(qn("w:lineRule"), "auto")


def setup_styles(doc):
    default_fonts(doc)
    # Template da Fatec: tamanho 13 para os títulos; o Título 2 segue a configuração do Título 1.
    paragraph_style(doc, "Heading 1", size=13, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, before=0, after=18,
                    outline=0, keep=True, caps=True)
    # NBR 14724: títulos separados do texto anterior e do seguinte por um espaço de 1,5 (cerca de 18 pt).
    paragraph_style(doc, "Heading 2", size=13, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, before=18, after=18,
                    outline=1, keep=True)
    paragraph_style(doc, "Heading 3", size=13, align=WD_ALIGN_PARAGRAPH.LEFT, before=18, after=18,
                    outline=2, keep=True)
    paragraph_style(doc, "Corpo ABNT", first=1.25)
    paragraph_style(doc, "Item ABNT", first=-0.5, left=1.75)
    paragraph_style(doc, "Citação ABNT", size=10, line=1.0, left=4.0, before=12, after=12)
    paragraph_style(doc, "Legenda ABNT", size=10, line=1.0, align=WD_ALIGN_PARAGRAPH.CENTER, before=12, after=6,
                    keep=True)
    paragraph_style(doc, "Fonte ABNT", size=10, line=1.0, align=WD_ALIGN_PARAGRAPH.CENTER, before=6, after=12)
    paragraph_style(doc, "Tabela ABNT", size=10, line=1.0, align=WD_ALIGN_PARAGRAPH.LEFT)
    paragraph_style(doc, "Referência ABNT", line=1.0, align=WD_ALIGN_PARAGRAPH.LEFT, after=12)
    paragraph_style(doc, "Título sem número", size=12, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, after=24,
                    caps=True)
    paragraph_style(doc, "Resumo ABNT", size=10, line=1.0, after=12)
    code = paragraph_style(doc, "Código ABNT", size=9, line=1.0, align=WD_ALIGN_PARAGRAPH.LEFT, left=0.5)
    code.font.name = "Courier New"
    fonts = code.element.get_or_add_rPr().find(qn("w:rFonts"))
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        fonts.set(qn(attr), "Courier New")
    for level, indent in (("toc 1", 0), ("toc 2", 0.5), ("toc 3", 1.0)):
        paragraph_style(doc, level, size=12, bold=(level == "toc 1"), align=WD_ALIGN_PARAGRAPH.LEFT,
                        line=1.5, left=indent)


# ---------------------------------------------------------------- escrita

INLINE = re.compile(r"(\*\*.+?\*\*|\*[^*]+?\*|`[^`]+?`)")


def write_inline(paragraph, text, size=None):
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**"):
            run = paragraph.add_run(part[2:-2]); set_run_font(run, size, bold=True)
        elif part.startswith("`"):
            run = paragraph.add_run(part[1:-1]); set_run_font(run, size, name="Courier New")
        elif part.startswith("*"):
            run = paragraph.add_run(part[1:-1]); set_run_font(run, size, italic=True)
        else:
            run = paragraph.add_run(part); set_run_font(run, size)


class Writer:
    def __init__(self, doc):
        self.doc = doc
        self.first_chapter = True

    def para(self, text, style="Corpo ABNT", size=None):
        p = self.doc.add_paragraph(style=style)
        write_inline(p, text, size)
        return p

    def heading(self, level, text):
        if level == 1:
            centered = not re.match(r"^\d", text)
            if self.first_chapter and not centered:
                # Seção nova: a numeração das páginas aparece a partir da Introdução.
                self.doc.add_section(WD_SECTION.NEW_PAGE)
                self.first_chapter = False
                p = self.doc.add_paragraph(style="Heading 1")
            else:
                p = self.doc.add_paragraph(style="Heading 1")
                page_break_before(p)
            if centered:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        else:
            p = self.doc.add_paragraph(style=f"Heading {level}")
        write_inline(p, text)
        return p

    def caption(self, text):
        return self.para(text, "Legenda ABNT")

    def source(self, text):
        return self.para(f"Fonte: {text}", "Fonte ABNT")

    def figure(self, name, caption, source):
        self.caption(caption)
        path = FIGS / name
        p = self.doc.add_paragraph(style="Legenda ABNT")
        p.paragraph_format.keep_with_next = True
        if path.exists():
            width, height = png_size(path)
            max_w, max_h = 15.5, 17.5
            w = max_w
            if height / width * w > max_h:
                w = max_h * width / height
            p.add_run().add_picture(str(path), width=Cm(w))
        else:
            set_run_font(p.add_run(f"[{caption.split(' –')[0]} – inserir captura: {name}]"), 10, bold=True)
        self.source(source)

    def table(self, caption, source, rows):
        self.caption(caption)
        quadro = caption.startswith("Quadro")
        cells = [[c.strip() for c in row.strip().strip("|").split("|")] for row in rows]
        table = self.doc.add_table(rows=len(cells), cols=len(cells[0]))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        # larguras proporcionais ao conteúdo, somando 16 cm
        # mínimo: a palavra mais longa da coluna cabe inteira; o resto é dividido pelo volume de texto
        char = 0.21  # cm por caractere em Arial 10, com folga
        minimum = [max(len(word) for row in cells for word in row[c].split()) * char + 0.45
                   for c in range(len(cells[0]))]
        volume = [sum(len(row[c]) for row in cells) / len(cells) for c in range(len(cells[0]))]
        widths_cm = list(minimum)
        spare = 16 - sum(widths_cm)
        if spare > 0:
            # colunas curtas (números, gravidade) ficam no mínimo; o espaço vai para as de texto longo
            grow = [max(v - m / char, 0) for v, m in zip(volume, minimum)]
            if not sum(grow):
                grow = volume  # tabela só com textos curtos: distribui pelo volume
            total_grow = sum(grow) or 1
            widths_cm = [w + spare * g / total_grow for w, g in zip(widths_cm, grow)]
        widths = [Cm(w) for w in widths_cm]
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        for row in table.rows:
            for c, cell in enumerate(row.cells):
                cell.width = widths[c]
        for r, row in enumerate(cells):
            for c, value in enumerate(row):
                cell = table.cell(r, c)
                cell.paragraphs[0].style = self.doc.styles["Tabela ABNT"]
                write_inline(cell.paragraphs[0], value, 10)
                if r == 0:
                    for run in cell.paragraphs[0].runs:
                        run.font.bold = True
                if quadro:
                    cell_borders(cell, top="single", bottom="single", left="single", right="single")
                else:
                    edges = {}
                    if r == 0:
                        edges.update(top="single", bottom="single")
                    if r == len(cells) - 1:
                        edges.update(bottom="single")
                    if 0 < c:
                        edges.update(left="single")
                    if edges:
                        cell_borders(cell, **edges)
        for r, row in enumerate(table.rows):
            trpr_row = row._tr.get_or_add_trPr()
            cant = OxmlElement("w:cantSplit")
            cant.set(qn("w:val"), "true")
            trpr_row.append(cant)
            # Quadros e tabelas de até 14 linhas ficam inteiros em uma página (passam juntos para a
            # seguinte quando não cabem), dispensando a indicação de continuação; nos maiores,
            # ao menos a linha final não fica sozinha.
            if r < len(cells) - 1 and (len(cells) <= 14 or r >= len(cells) - 2):
                for cell in row.cells:
                    for para in cell.paragraphs:
                        para.paragraph_format.keep_with_next = True
        # repete o cabeçalho ao quebrar página
        trpr = table.rows[0]._tr.get_or_add_trPr()
        header = OxmlElement("w:tblHeader")
        header.set(qn("w:val"), "true")
        trpr.append(header)
        self.source(source)

    def code(self, caption, source, lines):
        self.caption(caption)
        for line in lines:
            p = self.doc.add_paragraph(style="Código ABNT")
            p.paragraph_format.keep_together = True
            set_run_font(p.add_run(line if line else " "), 9, name="Courier New")
        self.source(source)

    def render(self, text):
        lines = text.splitlines()
        i = 0
        buffer = []

        def flush():
            if buffer:
                self.para(" ".join(buffer))
                buffer.clear()

        alinea = 0
        while i < len(lines):
            line = lines[i].rstrip()
            if not line.startswith("- "):
                alinea = 0
            if not line.strip():
                flush()
            elif line.startswith("#"):
                flush()
                level = len(line) - len(line.lstrip("#"))
                self.heading(level, line[level:].strip())
            elif line.startswith("> "):
                flush()
                self.para(line[2:], "Citação ABNT")
            elif line.startswith("- "):
                flush()
                item = line[2:]
                if not re.match(r"^\d+\.", item):
                    item = f"{'abcdefghijklmnopqrstuvwxyz'[alinea]}) {item}"
                    alinea += 1
                self.para(item, "Item ABNT")
                i += 1
                continue
            elif line.startswith("!FIG|"):
                flush()
                _, name, caption, source = line.split("|", 3)
                self.figure(name, caption, source)
            elif line.startswith("!TAB|"):
                flush()
                _, caption, source = line.split("|", 2)
                rows = []
                while i + 1 < len(lines) and lines[i + 1].startswith("|"):
                    i += 1
                    rows.append(lines[i])
                self.table(caption, source, rows)
            elif line.startswith("!CODE|"):
                flush()
                _, caption, source = line.split("|", 2)
                body = []
                while not lines[i + 1].startswith("!ENDCODE"):
                    i += 1
                    body.append(lines[i])
                i += 1
                self.code(caption, source, body)
            else:
                buffer.append(line.strip())
            i += 1
        flush()


# ---------------------------------------------------------------- pré-textuais

def parse_pretextual(text):
    meta = {"AUTOR": []}
    blocks, current = {}, None
    for line in text.splitlines():
        if line.startswith("!") and "|" in line and not line.startswith("!SIGLAS"):
            key, value = line[1:].split("|", 1)
            if key == "AUTOR":
                meta["AUTOR"].append(value)
            else:
                meta[key] = value
        elif line.startswith("!"):
            current = line[1:].strip()
            blocks[current] = []
        elif current:
            blocks[current].append(line)
    return meta, blocks


def fill_template(doc, meta):
    body = doc.element.body
    children = list(body.iterchildren())
    for el in children[KEEP_UNTIL + 1:]:
        if el.tag != qn("w:sectPr"):
            body.remove(el)
    paragraphs = doc.paragraphs
    first, second = meta["AUTOR"]
    for a, b in ((7, 8), (26, 27), (53, 54)):
        replace_text(paragraphs[a], first)
        replace_text(paragraphs[b], second)
    for index in (15, 38, 57):
        replace_text(paragraphs[index], meta["TITULO"])
    for index in (25, 52):
        replace_text(paragraphs[index], meta["ANO"])
    replace_text(paragraphs[44], f"Orientadora: {meta['ORIENTADORA']}")
    replace_text(paragraphs[66], "Orientadora: ______________________________________________________")
    replace_text(paragraphs[67], meta["ORIENTADORA"])
    replace_text(paragraphs[72], "Prof.(ª)")
    replace_text(paragraphs[73], "Instituição")
    replace_text(paragraphs[77], "Prof.(ª)")
    replace_text(paragraphs[78], "Instituição")
    replace_text(paragraphs[83], f"Guarulhos, ____/____/{meta['ANO']}")
    # NBR 14724: natureza do trabalho em espaço simples, do meio da mancha gráfica para a direita,
    # na folha de rosto e na folha de aprovação.
    # A linha da orientadora acompanha o mesmo recuo. Alinhamento à esquerda evita espaços largos
    # entre as palavras numa coluna de 8 cm.
    for index in (42, 44, 60):
        fmt = paragraphs[index].paragraph_format
        fmt.line_spacing = 1.0
        fmt.left_indent = Cm(8)
        fmt.alignment = WD_ALIGN_PARAGRAPH.LEFT
    # O template separava as páginas só com linhas em branco; quebras explícitas evitam deslocamentos.
    page_break_before(paragraphs[26])
    page_break_before(paragraphs[53])
    # Título mais longo que o do modelo: retira duas linhas em branco de cada página.
    # A folha de aprovação também perde linhas em branco para caber em uma página.
    for index in (23, 22, 50, 49, 64, 79, 80, 81, 82, 74):
        el = paragraphs[index]._element
        el.getparent().remove(el)


def pretextual(doc, writer, blocks):
    # Resumo
    p = doc.add_paragraph(style="Título sem número"); page_break_before(p); write_inline(p, "RESUMO")
    resumo = [l for l in blocks["RESUMO"] if l.strip()]
    writer.para(resumo[0], "Referência ABNT")
    for line in resumo[1:-1]:
        writer.para(line, "Resumo ABNT", 10)
    writer.para(resumo[-1], "Resumo ABNT", 10)
    # Abstract
    p = doc.add_paragraph(style="Título sem número"); page_break_before(p); write_inline(p, "ABSTRACT")
    abstract = [l for l in blocks["ABSTRACT"] if l.strip()]
    for line in abstract:
        writer.para(line, "Resumo ABNT", 10)
    # Listas na ordem do template: abreviaturas, figuras, quadros e tabelas
    p = doc.add_paragraph(style="Título sem número"); page_break_before(p); write_inline(p, "LISTA DE ABREVIATURAS E SIGLAS")
    siglas = sorted((l.split("|", 1) for l in blocks["SIGLAS"] if "|" in l), key=lambda x: x[0].casefold())
    table = doc.add_table(rows=len(siglas), cols=2)
    for r, (sigla, meaning) in enumerate(siglas):
        for c, value in enumerate((sigla, meaning)):
            cell = table.cell(r, c)
            cell.paragraphs[0].style = doc.styles["Tabela ABNT"]
            cell.paragraphs[0].paragraph_format.line_spacing = 1.5
            write_inline(cell.paragraphs[0], value, 12)
            cell.width = Cm(3 if c == 0 else 13)
    for title, styles in (("LISTA DE FIGURAS", "Legenda Figura,1"), ("LISTA DE QUADROS E TABELAS", "Legenda Tabela,1")):
        p = doc.add_paragraph(style="Título sem número"); page_break_before(p); write_inline(p, title)
        add_field(doc.add_paragraph(style="Corpo ABNT"), f'TOC \\h \\z \\t "{styles}"',
                  "Atualize o campo (F9) para gerar a lista.")
    # Sumário
    p = doc.add_paragraph(style="Título sem número"); page_break_before(p); write_inline(p, "SUMÁRIO")
    add_field(doc.add_paragraph(style="Corpo ABNT"), 'TOC \\o "1-3" \\h \\z \\u',
              "Atualize o campo (F9) para gerar o sumário.")


def caption_styles(doc):
    """Legendas de figura e de tabela/quadro em estilos próprios, usados pelas listas."""
    for name in ("Legenda Figura", "Legenda Tabela"):
        paragraph_style(doc, name, size=10, line=1.0, align=WD_ALIGN_PARAGRAPH.CENTER, before=12, after=6,
                        keep=True)


def retag_captions(doc):
    for p in doc.paragraphs:
        if p.style.name == "Legenda ABNT" and p.text:
            if p.text.startswith("Figura"):
                p.style = doc.styles["Legenda Figura"]
            elif p.text.startswith(("Tabela", "Quadro")):
                p.style = doc.styles["Legenda Tabela"]


def page_numbers(doc):
    textual = doc.sections[-1]
    textual.header.is_linked_to_previous = False
    p = textual.header.paragraphs[0] if textual.header.paragraphs else textual.header.add_paragraph()
    for run in list(p.runs):
        run._element.getparent().remove(run._element)
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_field(p, "PAGE")
    for run in p.runs:
        set_run_font(run, 10)
    first = doc.sections[0]
    for part in (first.header, first.footer):
        for para in part.paragraphs:
            for run in list(para.runs):
                run._element.getparent().remove(run._element)
    # margens ABNT: 3 cm superior/esquerda, 2 cm inferior/direita
    for section in doc.sections:
        section.top_margin = section.left_margin = Cm(3)
        section.bottom_margin = section.right_margin = Cm(2)
        section.header_distance = Cm(2)


def main():
    doc = Document(str(TEMPLATE))
    setup_styles(doc)
    caption_styles(doc)
    meta, blocks = parse_pretextual((TEXT / "00_pretextuais.md").read_text(encoding="utf-8"))
    fill_template(doc, meta)
    writer = Writer(doc)
    pretextual(doc, writer, blocks)
    for path in sorted(TEXT.glob("*.md")):
        if path.name.startswith("00_"):
            continue
        text = path.read_text(encoding="utf-8")
        if path.name.startswith("07_"):
            lines = [l for l in text.splitlines() if l.strip()]
            writer.heading(1, lines[0].lstrip("# ").strip())
            for line in lines[1:]:
                writer.para(line, "Referência ABNT")
        else:
            writer.render(text)
    retag_captions(doc)
    page_numbers(doc)
    doc.core_properties.title = meta["TITULO"]
    doc.core_properties.author = "; ".join(meta["AUTOR"])
    doc.core_properties.comments = ""
    doc.save(str(OUTPUT))
    print("gerado:", OUTPUT)


if __name__ == "__main__":
    main()

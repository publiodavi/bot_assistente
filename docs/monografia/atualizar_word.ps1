# Atualiza sumário, listas e numeração da monografia no Word e exporta um PDF de conferência.
$ErrorActionPreference = 'Stop'
$docx = Join-Path $PSScriptRoot 'AjudAI_Monografia.docx'
$pdf = Join-Path $PSScriptRoot 'AjudAI_Monografia.pdf'
$final = Join-Path $PSScriptRoot 'AjudAI_Monografia_final.docx'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    Write-Output 'abrindo'
    $doc = $word.Documents.Open($docx, $false, $false, $false)
    Write-Output 'aberto'
    $doc.Fields.Update() | Out-Null
    Write-Output 'campos'
    # Estilos internos do Word (sumário, listas e Normal) em Arial 12, sem a fonte do tema.
    foreach ($id in -1, -20, -21, -22, -36) {
        $style = $doc.Styles.Item($id)
        $style.Font.Name = 'Arial'
        $style.Font.Size = 12
        if ($id -ne -1) {
            # sumário e listas: entrelinha 1,5, sem espaço extra entre as entradas
            $style.ParagraphFormat.SpaceBefore = 0
            $style.ParagraphFormat.SpaceAfter = 0
            $style.ParagraphFormat.LineSpacingRule = 1
        }
    }
    $doc.Fields.Update() | Out-Null
    Write-Output 'estilos'
    Write-Output "tocs: $($doc.TablesOfContents.Count)"
    $doc.Repaginate()
    Write-Output 'repaginado'

    # Numeração: contada desde a folha de rosto (a capa não conta), exibida a partir da Introdução.
    $section = $doc.Sections.Item(2)
    $introPage = $section.Range.Characters.Item(1).Information(3)
    $numbers = $section.Headers.Item(1).PageNumbers
    $numbers.RestartNumberingAtSection = $true
    $numbers.StartingNumber = $introPage - 1
    Write-Output "numeracao a partir de $introPage"
    $doc.Repaginate()
    $doc.Fields.Update() | Out-Null
    Write-Output 'campos 2'
    # O Word grava a fonte do tema (Calibri) direto nas entradas do sumário e das listas.
    foreach ($toc in $doc.TablesOfContents) {
        $toc.Range.Font.Name = 'Arial'
        $toc.Range.Font.Size = 12
    }
    # NBR 6027: no sumário, os títulos repetem o destaque usado no texto (1º e 2º níveis em negrito).
    $toc1 = $doc.Styles.Item(-20).NameLocal
    $toc2 = $doc.Styles.Item(-21).NameLocal
    foreach ($toc in $doc.TablesOfContents) {
        if (-not $toc.UseHeadingStyles) { continue }
        foreach ($para in $toc.Range.Paragraphs) {
            $name = $para.Style.NameLocal
            $para.Range.Font.Bold = [int]($name -eq $toc1 -or $name -eq $toc2)
        }
    }
    Write-Output 'sumario em Arial'

    # Total de folhas na referência do resumo.
    Write-Output 'repaginado 2'
    $pages = $doc.ComputeStatistics(2)
    Write-Output "paginas $pages"
    $find = $doc.Content.Find
    $find.Execute('{PAGINAS}', $false, $false, $false, $false, $false, $true, 1, $false, [string]$pages, 2) | Out-Null

    Write-Output 'substituido'
    $doc.SaveAs2([string]$final, 16)
    Write-Output 'salvo'
    $doc.Close()
    Write-Output "Páginas: $pages; Introdução na página física $introPage"
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}








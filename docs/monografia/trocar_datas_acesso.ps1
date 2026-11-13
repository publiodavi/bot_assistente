# Atualiza as datas de acesso das referências e generaliza as datas do texto direto num DOCX já revisado à mão (preserva as edições)
# e exporta o PDF correspondente.
param([string]$Docx, [string]$Pdf)
$ErrorActionPreference = 'Stop'
$trocas = [ordered]@{
    'docs.chainlit.io. Acesso em: 13 nov. 2026.'        = 'docs.chainlit.io. Acesso em: 23 out. 2026.'
    'docs.trychroma.com. Acesso em: 13 nov. 2026.'      = 'docs.trychroma.com. Acesso em: 5 nov. 2026.'
    'api-docs.deepseek.com. Acesso em: 13 nov. 2026.'   = 'api-docs.deepseek.com. Acesso em: 16 out. 2026.'
    '1810.04805. Acesso em: 19 mar. 2026.'              = '1810.04805. Acesso em: 14 out. 2026.'
    'WCAG21/. Acesso em: 13 nov. 2026.'                 = 'WCAG21/. Acesso em: 10 nov. 2026.'
    '0171-0. Acesso em: 21 mar. 2026.'                  = '0171-0. Acesso em: 21 out. 2026.'
    'até o commit a26ebff, de 13 de novembro de 2026, que é' = 'até o commit a26ebff, de novembro de 2026, que é'
    'Na execução de 13 de novembro de 2026, sobre' = 'Na execução final, em novembro de 2026, sobre'
    'deste trabalho, em 13 de novembro de 2026, o mesmo' = 'deste trabalho, em novembro de 2026, o mesmo'
}
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($Docx, $false, $false, $false)
    foreach ($par in $trocas.GetEnumerator()) {
        $find = $doc.Content.Find
        $ok = $find.Execute($par.Key, $true, $false, $false, $false, $false, $true, 0, $false, $par.Value, 1)
        Write-Output ("{0} -> {1}" -f $par.Key, $ok)
    }
    # Sem Fields.Update: as datas não mudam a paginação, e reconstruir o sumário apagaria a formatação dele.
    $doc.Save()
    $doc.SaveAs2([string]$Pdf, 17)
    $doc.Close(0)
}
finally {
    $word.Quit()
}

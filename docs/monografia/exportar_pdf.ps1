# Exporta a versão final da monografia para PDF (conferência visual).
$ErrorActionPreference = 'Stop'
$docx = Join-Path $PSScriptRoot 'AjudAI_Monografia_final.docx'
$pdf = Join-Path $PSScriptRoot 'AjudAI_Monografia.pdf'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx, $false, $true, $false)
    Write-Output 'aberto'
    $doc.SaveAs2([string]$pdf, 17)
    Write-Output 'pdf'
    $doc.Close(0)
}
finally {
    $word.Quit()
}

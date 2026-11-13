# Inicia o AjudAI localmente no Windows (porta 8103).
# Usa o PostgreSQL local de .local/, quando existir, e aplica as migrações antes de abrir o app.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$python = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (!(Test-Path -LiteralPath $python)) {
    throw 'Crie o ambiente virtual e instale requirements.txt antes de iniciar.'
}

# PostgreSQL local opcional (não é instalado nem configurado por este script).
$pgControl = Join-Path $PSScriptRoot '.local/postgresql/pgsql/bin/pg_ctl.exe'
$pgData = Join-Path $PSScriptRoot '.local/pgdata'
if ((Test-Path -LiteralPath $pgControl) -and (Test-Path -LiteralPath (Join-Path $pgData 'PG_VERSION'))) {
    & $pgControl -D $pgData status | Out-Null
    if ($LASTEXITCODE -ne 0) {
        $pgLog = Join-Path $PSScriptRoot '.local/postgres.log'
        & $pgControl -D $pgData -l $pgLog -o '-h 127.0.0.1 -p 55432' -w start
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível iniciar o PostgreSQL local.' }
    }
}

# Migrações: podem rodar a cada início sem apagar dados.
& $python scripts/migrate.py
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível aplicar as migrações do banco.' }

# Servidor do Chainlit.
& $python -m chainlit run src/app.py --host 127.0.0.1 --port 8103
exit $LASTEXITCODE

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$python = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (!(Test-Path -LiteralPath $python)) {
    throw 'Crie o ambiente virtual e instale requirements.txt antes de iniciar.'
}

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

& $python scripts/migrate.py
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível aplicar as migrações do banco.' }

& $python -m chainlit run src/app.py --host 127.0.0.1 --port 8103
exit $LASTEXITCODE

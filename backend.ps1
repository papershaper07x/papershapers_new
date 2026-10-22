param(
  [ValidateSet("setup", "run", "test", "health", "migrate")]
  [string]$Command = "run"
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$VenvPython = Join-Path $PSScriptRoot "backend\.venv\Scripts\python.exe"
$Python = if (Test-Path -LiteralPath $VenvPython) { $VenvPython } else { "python" }

function Invoke-Python {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  & $Python @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Python command failed with exit code $LASTEXITCODE." }
}

switch ($Command) {
  "setup" {
    if (-not (Test-Path -LiteralPath $VenvPython)) { & python -m venv backend\.venv }
    $Python = $VenvPython
    Invoke-Python -m pip install --upgrade pip
    Invoke-Python -m pip install -r backend\requirements.txt
    if (-not (Test-Path -LiteralPath "backend\.env")) { Copy-Item -LiteralPath "backend\.env.example" -Destination "backend\.env" }
    Write-Output "Backend setup complete. Edit backend\.env to select providers; never commit that file."
  }
  "run" { Invoke-Python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload --no-access-log }
  "test" { Invoke-Python -m unittest discover -s backend\tests -v }
  "migrate" { Invoke-Python -m backend.scripts.migrate_database }
  "health" { Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" | ConvertTo-Json -Depth 8 }
}

param(
  [ValidateSet("setup", "dev", "build", "test", "lint", "check")]
  [string]$Command = "dev"
)

$ErrorActionPreference = "Stop"
$RequiredNodeMajor = 22

function Invoke-Npm {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  & npm @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is not installed. Install Node.js 22.13 or newer, then run this command again."
}

$NodeVersion = (& node --version).TrimStart("v")
$NodeMajor = [int]($NodeVersion.Split(".")[0])
if ($NodeMajor -lt $RequiredNodeMajor) {
  throw "Node.js $NodeVersion is too old. Install Node.js 22.13 or newer."
}

Set-Location -LiteralPath $PSScriptRoot

switch ($Command) {
  "setup" { Invoke-Npm install }
  "dev" {
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "node_modules"))) {
      Invoke-Npm install
    }
    Invoke-Npm run dev
  }
  "build" { Invoke-Npm run build }
  "test" { Invoke-Npm test }
  "lint" { Invoke-Npm run lint }
  "check" { Invoke-Npm run check }
}

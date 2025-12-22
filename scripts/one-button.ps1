param(
  [string]$Message
)

$ErrorActionPreference = "Stop"

function Run-Git($args) {
  & git @args
  if ($LASTEXITCODE -ne 0) {
    throw "git $args failed with exit code $LASTEXITCODE"
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is not available in PATH"
}

$status = & git status --porcelain
if (-not $status) {
  Write-Host "No changes to commit."
  exit 0
}

if (-not $Message) {
  $Message = Read-Host "Commit message"
}

if (-not $Message) {
  $Message = "Update"
}

Run-Git @("add", "-A")
Run-Git @("commit", "-m", $Message)

Write-Host "Pushing to origin..."
Run-Git @("push", "origin")

Write-Host "Pushing to gitlab..."
Run-Git @("push", "gitlab")

Write-Host "Done."

param(
    [Parameter(Mandatory=$false)]
    [string]$Secret,

    [Parameter(Mandatory=$false)]
    [string]$TargetFile = ".env"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$targetPath = Join-Path $repoRoot $TargetFile

if (-not $Secret) {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $Secret = [Convert]::ToBase64String($bytes) -replace '[+/=]', { switch ($_ ) { '/' { '_' }; '+' { '-'} Default { '' } } }
}

if (-not (Test-Path $targetPath)) {
    New-Item -ItemType File -Path $targetPath -Force | Out-Null
}

$lines = if (Test-Path $targetPath) { Get-Content $targetPath } else { @() }
$updated = $false

for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^\s*JWT_SECRET\s*=') {
        $lines[$i] = "JWT_SECRET=$Secret"
        $updated = $true
        break
    }
}

if (-not $updated) {
    $lines += "JWT_SECRET=$Secret"
}

$lines | Set-Content $targetPath -Force

if ($IsWindows) {
    attrib +H $targetPath | Out-Null
} else {
    if (Get-Command chmod -ErrorAction SilentlyContinue) {
        chmod 600 $targetPath | Out-Null
    }
}

Write-Output "JWT_SECRET saved to $targetPath"

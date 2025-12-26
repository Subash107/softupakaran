param(
  [ValidateSet("upload", "backup", "watch", "deploy", "all")]
  [string]$Action = "all",
  [string]$UploadFile,
  [string]$UploadUrl,
  [string]$UploadAdminToken,
  [string]$UploadBearerToken,
  [string]$UploadField = "image",
  [string[]]$UploadForm,
  [string[]]$UploadHeader,
  [string]$WatchDirs = "services/frontend,services/backend",
  [string]$WatchCmd,
  [int]$WatchDebounce = 400,
  [string]$DeploySource,
  [string]$DeployTarget,
  [switch]$DeployClean,
  [string]$DeployPre,
  [string]$DeployPost,
  [switch]$BackupGzip,
  [string]$BackupDbPath,
  [string]$BackupOutDir,
  [string]$BackupPrefix = "softupakaran"
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Run-NodeScript {
  param(
    [string]$Script,
    [string[]]$Arguments
  )
  $node = "node"
  $scriptPath = Join-Path $scriptRoot $Script
  if (-not (Test-Path $scriptPath)) {
    Write-Error "Missing script: $scriptPath"
    exit 1
  }
  & $node $scriptPath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Script $Script failed with exit code $LASTEXITCODE"
  }
}

function Run-Upload {
  if (-not $UploadFile) {
    throw "UploadFile is required for upload mode."
  }
  $args = @("--file", $UploadFile)
  if ($UploadUrl) { $args += "--url"; $args += $UploadUrl }
  if ($UploadAdminToken) { $args += "--admin-token"; $args += $UploadAdminToken }
  if ($UploadBearerToken) { $args += "--bearer-token"; $args += $UploadBearerToken }
  if ($UploadField) { $args += "--field"; $args += $UploadField }
  foreach ($entry in $UploadForm) { $args += "--form"; $args += $entry }
  foreach ($entry in $UploadHeader) { $args += "--header"; $args += $entry }
  Run-NodeScript "upload-file.js" $args
}

function Run-Backup {
  $args = @()
  if ($BackupDbPath) { $args += "--db-path"; $args += $BackupDbPath }
  if ($BackupOutDir) { $args += "--out-dir"; $args += $BackupOutDir }
  if ($BackupGzip.IsPresent) { $args += "--gzip" }
  if ($BackupPrefix) { $args += "--prefix"; $args += $BackupPrefix }
  Run-NodeScript "backup-db.js" $args
}

function Run-Deploy {
  $args = @()
  if ($DeploySource) { $args += "--source"; $args += $DeploySource }
  if ($DeployTarget) { $args += "--target"; $args += $DeployTarget }
  if ($DeployClean.IsPresent) { $args += "--clean" }
  if ($DeployPre) { $args += "--pre"; $args += $DeployPre }
  if ($DeployPost) { $args += "--post"; $args += $DeployPost }
  Run-NodeScript "deploy-website.js" $args
}

function Run-Watch {
  $args = @("--dirs", $WatchDirs)
  if ($WatchCmd) { $args += "--cmd"; $args += $WatchCmd }
  if ($WatchDebounce) { $args += "--debounce"; $args += $WatchDebounce.ToString() }
  Run-NodeScript "watch-folders.js" $args
}

try {
  switch ($Action) {
    "upload" {
      Run-Upload
      break
    }
    "backup" {
      Run-Backup
      break
    }
    "deploy" {
      Run-Deploy
      break
    }
    "watch" {
      Run-Watch
      break
    }
    "all" {
      Run-Backup
      Run-Deploy
      break
    }
  }
} catch {
  Write-Error $_.Exception.Message
  exit 1
}

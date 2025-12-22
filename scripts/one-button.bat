@echo off
setlocal

rem Move to repo root (parent of this script)
cd /d "%~dp0.."

where git >nul 2>nul
if errorlevel 1 (
  echo git is not available in PATH
  exit /b 1
)

rem Optional: bring up local Docker stack if Docker is installed
where docker >nul 2>nul
if errorlevel 0 (
  docker info >nul 2>nul
  if errorlevel 1 (
    echo Docker found but not running. Skipping docker compose.
  ) else (
    echo Starting Docker Compose...
    docker compose up -d
  )
) else (
  echo Docker not found. Skipping docker compose.
)

git status --porcelain >nul
if errorlevel 1 (
  echo git status failed
  exit /b 1
)

for /f %%A in ('git status --porcelain') do set HASCHANGES=1
if not defined HASCHANGES (
  echo No changes to commit.
  exit /b 0
)

echo.
echo --- Changed files ---
git status -sb
echo.
git diff --stat
echo.
set /p CONTINUE=Continue to commit and push? (y/N): 
if /i not "%CONTINUE%"=="y" (
  echo Aborted.
  exit /b 0
)

set /p MSG=Commit message: 
if "%MSG%"=="" set MSG=Update

git add -A
git commit -m "%MSG%"
if errorlevel 1 (
  echo Commit failed
  exit /b 1
)

echo Pushing to origin...
git push origin
if errorlevel 1 exit /b 1

echo Pushing to gitlab...
git push gitlab
if errorlevel 1 exit /b 1

rem Trigger Render deploy hook from scripts\deploy.env (if present)
for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0deploy.env") do (
  if /i "%%A"=="RENDER_DEPLOY_HOOK" set "RENDER_DEPLOY_HOOK=%%B"
)

if defined RENDER_DEPLOY_HOOK (
  echo Triggering Render deploy...
  curl -s -X POST "%RENDER_DEPLOY_HOOK%" >nul
  if errorlevel 1 (
    echo Render deploy hook failed.
    exit /b 1
  )
) else (
  echo RENDER_DEPLOY_HOOK not set in scripts\deploy.env. Skipping Render deploy.
)

echo Done.
endlocal

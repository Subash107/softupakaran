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
  echo Starting Docker Compose...
  docker compose up -d
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

echo Done.
endlocal

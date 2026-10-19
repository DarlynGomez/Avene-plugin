@echo off
rem Starts the role server on this computer only.
cd /d "%~dp0"
if not exist .env (
  echo There is no .env here. Copy .env.example to .env and fill in the values.
  exit /b 1
)
if not exist .venv (
  python -m venv .venv || exit /b 1
  .venv\Scripts\pip install --quiet -r requirements.txt || exit /b 1
)
.venv\Scripts\python -m roles_server

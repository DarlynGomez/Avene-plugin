#!/bin/sh
# Starts the role server on this computer only. Run from anywhere.
cd "$(dirname "$0")" || exit 1
if [ ! -f .env ]; then
  echo "There is no .env here. Copy .env.example to .env and fill in the values." >&2
  exit 1
fi
if [ ! -d .venv ]; then
  python3 -m venv .venv || exit 1
  .venv/bin/pip install --quiet -r requirements.txt || exit 1
fi
exec .venv/bin/python -m roles_server

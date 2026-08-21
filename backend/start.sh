#!/usr/bin/env bash
# Run FastAPI from the repository root so `backend.app` imports work.
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

VENV_DIR="backend/.venv"

if [ ! -f "$VENV_DIR/bin/uvicorn" ]; then
  echo "Setting up backend virtualenv at $VENV_DIR ..."
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --upgrade pip -q
  "$VENV_DIR/bin/pip" install -r requirements.txt -q
fi

echo "Starting backend from: $PROJECT_ROOT"
exec "$VENV_DIR/bin/python" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

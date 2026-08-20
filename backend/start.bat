@echo off
cd /d "%~dp0backend\backend"
echo Starting backend from: %CD%
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

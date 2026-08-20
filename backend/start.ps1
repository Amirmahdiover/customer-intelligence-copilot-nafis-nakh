# Run FastAPI backend from the correct directory
$BackendRoot = Join-Path $PSScriptRoot "backend\backend"
Set-Location $BackendRoot

Write-Host "Starting backend from: $BackendRoot" -ForegroundColor Cyan
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

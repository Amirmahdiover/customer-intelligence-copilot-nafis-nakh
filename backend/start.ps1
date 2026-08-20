# Run FastAPI backend from the backend directory
$BackendRoot = $PSScriptRoot
Set-Location $BackendRoot

Write-Host "Starting backend from: $BackendRoot" -ForegroundColor Cyan
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

Write-Host "Starting BizHealth Local Server..." -ForegroundColor Cyan

# 1. 스크립트가 있는 폴더로 이동 (경로 문제 해결)
Set-Location $PSScriptRoot
Set-Location backend

# 2. 가상환경 확인 (Optional - skipped for now as user seems to have env)

# 3. 브라우저 자동 실행 (잠시 대기 후 실행)
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://127.0.0.1:8000"
} | Out-Null

# 4. FastAPI 서버 실행 (Auto Reload 활성화)
Write-Host "Server running at http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
Set-Location backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

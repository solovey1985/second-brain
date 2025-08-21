
# Double-click to stop server
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "Documentation server stopped."
Pause

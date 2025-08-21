param(
    [ValidateSet("start", "stop")]
    [string]$Action
)

$nodeProcessName = "node"
$serverDir = "E:\brain\second-brain"

if ($Action -eq "start") {
    Write-Host "Starting documentation server..."
    Push-Location $serverDir
    Start-Process "npm" -ArgumentList "start" -NoNewWindow
    Pop-Location
    Write-Host "Server started. Visit http://localhost:3000"
}
elif ($Action -eq "stop") {
    Write-Host "Stopping documentation server..."
    Get-Process -Name $nodeProcessName -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Server stopped."
}
else {
    Write-Host "Usage: .\manage-docs-server.ps1 -Action start|stop"
}

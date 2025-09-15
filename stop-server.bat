@echo off
echo Stopping documentation server...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel%==0 (
    echo Documentation server stopped.
) else (
    echo No running server found or already stopped.
)
echo Press any key to close this window...
pause >nul

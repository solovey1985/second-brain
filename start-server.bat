@echo off
cd /d "%~dp0"
echo Starting documentation server...
start "Documentation Server" cmd /k "npm start"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
echo Documentation server started in a new window.
echo Chrome/default browser opened at http://localhost:3000.
echo Press any key to close this window...
pause >nul

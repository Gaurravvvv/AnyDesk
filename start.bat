@echo off
title AnyDesk - Remote Desktop
color 0A

echo ========================================
echo    AnyDesk Remote Desktop - Launcher
echo ========================================
echo.

:: Kill any existing processes on our ports
echo [1/4] Clearing ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo       Ports 3001, 5173 cleared.
echo.



:: Start the signaling server
echo [2/4] Starting signaling server on port 3001...
cd /d "%~dp0anydesk-server"
start "AnyDesk-Server" cmd /k "title AnyDesk Server && npm run dev"
ping 127.0.0.1 -n 3 > nul
echo       Server starting...
echo.

:: Start the viewer web app
echo [3/4] Starting viewer on port 5173...
cd /d "%~dp0anydesk-viewer"
start "AnyDesk-Viewer" cmd /k "title AnyDesk Viewer && npm run dev"
ping 127.0.0.1 -n 3 > nul
echo       Viewer starting...
echo.

:: Start the electron host agent
echo [4/4] Starting host agent...
cd /d "%~dp0anydesk-host"
start "AnyDesk-Host" cmd /k "title AnyDesk Host Agent && npm run dev"
echo       Host agent starting...
echo.

echo ========================================
echo    All services launched!
echo.
echo    Server:  http://localhost:3001
echo    Viewer:  http://localhost:5173
echo    Host:    System Tray Icon
echo.
echo    [Remote Access]
echo    To connect from another laptop on the same Wi-Fi:
echo    1. Find your IP Address below:
ipconfig | findstr IPv4
echo    2. On the other laptop, open: http://YOUR_IP_ADDRESS:5173
echo ========================================
echo.
echo Press any key to exit this launcher...
pause >nul

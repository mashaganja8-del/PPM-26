@echo off
REM MASHA Piano - Start Local Server
REM Double-click this file to start the server

cls
cd /d "%~dp0"

echo ==========================================
echo MASHA Piano - Local Server Launcher
echo ==========================================
echo.
echo Starting PowerShell HTTP Server...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "server.ps1"

if errorlevel 1 (
    echo.
    echo Error starting server. Press any key to exit.
    pause >nul
)

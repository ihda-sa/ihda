@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Ihda - Publish Admin Panel
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\publish-admin.ps1"
if errorlevel 1 (
  echo.
  echo   Something went wrong. Take a screenshot and send it.
  echo.
  pause
)
exit /b

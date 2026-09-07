@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   تشغيل الموقع محليًا على: http://localhost:8765
echo   لوحة الإنشاء:            http://localhost:8765/admin/
echo   (أغلق هذه النافذة لإيقاف الخادم)
echo.
start "" http://localhost:8765/
python -m http.server 8765 --bind 127.0.0.1

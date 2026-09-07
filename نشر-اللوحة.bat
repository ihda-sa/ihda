@echo off
chcp 65001 >nul
cd /d "%~dp0"
title نشر لوحة الإنشاء
echo.
echo   ============================================
echo     بناء لوحة الإنشاء بكلمة سر ونشرها
echo   ============================================
echo.
echo   ستُطلب منك كلمة السر مرتين، ولن تظهر أثناء الكتابة.
echo   من يعرف هذي الكلمة يقدر يفتح اللوحة. اخترها قوية واحفظها.
echo.

node tools\build-admin.mjs
if errorlevel 1 goto :fail

echo   جارٍ النشر على الإنترنت...
git add -f admin/index.html
git commit -q -m "تحديث لوحة الإنشاء المقفلة"
if errorlevel 1 echo   (لا يوجد تغيير جديد، نكمل النشر)
git push -q origin main
if errorlevel 1 goto :fail

echo.
echo   ============================================
echo     تم النشر بنجاح
echo   ============================================
echo.
echo   الرابط:  https://gift.wesal-shop.com/admin/
echo   انتظر دقيقة تقريبًا ثم افتحه.
echo.
echo   أرسل لأخوك الرابط وكلمة السر في رسالتين منفصلتين.
echo.
pause
exit /b 0

:fail
echo.
echo   ============================================
echo     صار خطأ ولم يُنشر شيء
echo   ============================================
echo.
echo   صوّر الشاشة وأرسلها.
echo.
pause
exit /b 1

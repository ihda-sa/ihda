# نشر لوحة الإنشاء — يطلب كلمة السر بإدخال مخفي ثم يبني وينشر
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location -Path (Split-Path -Parent $PSScriptRoot)

Write-Host ""
Write-Host "  ============================================"
Write-Host "     بناء لوحة الإنشاء بكلمة سر ونشرها"
Write-Host "  ============================================"
Write-Host ""
Write-Host "  ستُطلب كلمة السر مرتين ولن تظهر أثناء الكتابة."
Write-Host "  من يعرفها يقدر يفتح اللوحة. اخترها قوية واحفظها."
Write-Host ""

$s1 = Read-Host -AsSecureString "  كلمة السر"
$s2 = Read-Host -AsSecureString "  أعد كتابتها"
$p1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s1))
$p2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s2))

if ($p1 -ne $p2) {
  Write-Host ""
  Write-Host "  ✗ الكلمتان غير متطابقتين. أعد المحاولة." -ForegroundColor Red
  Write-Host ""
  Read-Host "  اضغط Enter للإغلاق" | Out-Null
  exit 1
}
if ($p1.Length -lt 6) {
  Write-Host ""
  Write-Host "  ✗ كلمة السر قصيرة. استخدم ٦ خانات فأكثر." -ForegroundColor Red
  Write-Host ""
  Read-Host "  اضغط Enter للإغلاق" | Out-Null
  exit 1
}

Write-Host ""
Write-Host "  جارٍ بناء النسخة المشفّرة..."
$env:IHDA_PW = $p1
node tools/build-admin.mjs
$buildCode = $LASTEXITCODE
$env:IHDA_PW = $null
$p1 = $null; $p2 = $null
[System.GC]::Collect()

if ($buildCode -ne 0) {
  Write-Host ""
  Write-Host "  ✗ فشل البناء ولم يُنشر شيء." -ForegroundColor Red
  Write-Host ""
  Read-Host "  اضغط Enter للإغلاق" | Out-Null
  exit 1
}

Write-Host "  جارٍ النشر على الإنترنت..."
git add -f admin/index.html
git commit -q -m "تحديث لوحة الإنشاء المقفلة"
git push -q origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "  ✗ فشل النشر. صوّر الشاشة وأرسلها." -ForegroundColor Red
  Write-Host ""
  Read-Host "  اضغط Enter للإغلاق" | Out-Null
  exit 1
}

Write-Host ""
Write-Host "  ============================================"
Write-Host "     تم النشر بنجاح" -ForegroundColor Green
Write-Host "  ============================================"
Write-Host ""
Write-Host "  الرابط:  https://gift.wesal-shop.com/admin/"
Write-Host "  انتظر دقيقة تقريبًا ثم افتحه."
Write-Host ""
Write-Host "  أرسل لأخوك الرابط وكلمة السر في رسالتين منفصلتين."
Write-Host ""
Read-Host "  اضغط Enter للإغلاق" | Out-Null

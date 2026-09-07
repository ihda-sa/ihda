# نشر لوحة الإنشاء — نافذة رسومية لكلمة السر (نافذة الأوامر لا تعرض العربي)
$ErrorActionPreference = 'Stop'
Set-Location -Path (Split-Path -Parent $PSScriptRoot)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$RTL = [System.Windows.Forms.MessageBoxOptions]::RtlReading -bor [System.Windows.Forms.MessageBoxOptions]::RightAlign
function Show-Msg($text, $title, $icon) {
  [System.Windows.Forms.MessageBox]::Show($text, $title, 'OK', $icon, 'Button1', $RTL) | Out-Null
}

# ---------- نافذة كلمة السر ----------
$form = New-Object System.Windows.Forms.Form
$form.Text = 'لوحة الإنشاء — كلمة السر'
$form.ClientSize = New-Object System.Drawing.Size(440, 250)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.RightToLeft = 'Yes'
$form.RightToLeftLayout = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$form.TopMost = $true

$lbl = New-Object System.Windows.Forms.Label
$lbl.Text = "اختر كلمة سر للوحة الإنشاء.`nمن يعرفها يقدر يفتح اللوحة، فاخترها قوية واحفظها."
$lbl.SetBounds(20, 18, 400, 44)
$form.Controls.Add($lbl)

$l1 = New-Object System.Windows.Forms.Label
$l1.Text = 'كلمة السر'
$l1.SetBounds(20, 74, 400, 20)
$form.Controls.Add($l1)

$t1 = New-Object System.Windows.Forms.TextBox
$t1.UseSystemPasswordChar = $true
$t1.SetBounds(20, 96, 400, 26)
$form.Controls.Add($t1)

$l2 = New-Object System.Windows.Forms.Label
$l2.Text = 'أعد كتابتها'
$l2.SetBounds(20, 130, 400, 20)
$form.Controls.Add($l2)

$t2 = New-Object System.Windows.Forms.TextBox
$t2.UseSystemPasswordChar = $true
$t2.SetBounds(20, 152, 400, 26)
$form.Controls.Add($t2)

$ok = New-Object System.Windows.Forms.Button
$ok.Text = 'ابنِ وانشر'
$ok.SetBounds(20, 196, 130, 34)
$ok.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.Controls.Add($ok)
$form.AcceptButton = $ok

$cancel = New-Object System.Windows.Forms.Button
$cancel.Text = 'إلغاء'
$cancel.SetBounds(160, 196, 100, 34)
$cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.Controls.Add($cancel)
$form.CancelButton = $cancel

$form.Add_Shown({ $t1.Focus() })
$result = $form.ShowDialog()
$p1 = $t1.Text
$p2 = $t2.Text
$form.Dispose()

if ($result -ne [System.Windows.Forms.DialogResult]::OK) { exit 0 }
if ($p1 -ne $p2) { Show-Msg 'الكلمتان غير متطابقتين. شغّل الملف من جديد.' 'خطأ' 'Error'; exit 1 }
if ($p1.Length -lt 6) { Show-Msg 'كلمة السر قصيرة. استخدم ٦ خانات فأكثر.' 'خطأ' 'Error'; exit 1 }

# ---------- البناء ----------
Write-Host "Building encrypted admin panel..."
$env:IHDA_PW = $p1
node tools/build-admin.mjs
$code = $LASTEXITCODE
$env:IHDA_PW = $null
$p1 = $null; $p2 = $null
[System.GC]::Collect()

if ($code -ne 0) { Show-Msg 'فشل بناء اللوحة ولم يُنشر شيء. صوّر نافذة الأوامر وأرسلها.' 'خطأ' 'Error'; exit 1 }

# ---------- النشر ----------
Write-Host "Publishing..."
git add -f admin/index.html
git commit -q -m "تحديث لوحة الإنشاء المقفلة"
git push -q origin main
if ($LASTEXITCODE -ne 0) { Show-Msg 'فشل النشر على الإنترنت. صوّر نافذة الأوامر وأرسلها.' 'خطأ' 'Error'; exit 1 }

Show-Msg "تم النشر بنجاح.`n`nالرابط:`nhttps://gift.wesal-shop.com/admin/`n`nانتظر دقيقة تقريبًا ثم افتحه.`nأرسل الرابط وكلمة السر في رسالتين منفصلتين." 'تم' 'Information'
Write-Host "Done. https://gift.wesal-shop.com/admin/"

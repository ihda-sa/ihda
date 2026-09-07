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

# ---------- مفتاح النشر التلقائي ----------
$store = Join-Path $env:APPDATA 'ihda'
if (-not (Test-Path $store)) { New-Item -ItemType Directory -Path $store -Force | Out-Null }
$tokenFile = Join-Path $store 'gh-token'

# ترحيل المفتاح القديم من داخل المجلد إن وُجد
$legacy = Join-Path (Get-Location) '.gh-token'
if ((Test-Path $legacy) -and (-not (Test-Path $tokenFile))) {
  Move-Item -Path $legacy -Destination $tokenFile -Force
}

if (-not (Test-Path $tokenFile)) {
  $ask = [System.Windows.Forms.MessageBox]::Show(
    "تنبيه: ما فيه مفتاح نشر محفوظ.`n`nإذا كمّلت بدونه، زر «انشر الإهداء» داخل اللوحة لن يعمل ولازم ترفع كل إهداء يدويًا.`n`nتبي تدخل المفتاح الآن؟",
    'النشر التلقائي غير مفعّل', 'YesNo', 'Warning', 'Button1', $RTL)

  if ($ask -eq [System.Windows.Forms.DialogResult]::Yes) {
    Show-Msg "افتح هذي الصفحة في المتصفح:`n`ngithub.com/settings/personal-access-tokens/new`n`n1) الاسم: ihda-publish`n2) Expiration: اختر No expiration`n3) Repository access: Only select repositories ثم اختر ihda`n4) Permissions ثم Repository permissions ثم Contents: اجعلها Read and write`n5) اضغط Generate token وانسخ المفتاح`n`nبعدها الصقه في النافذة الجاية." 'خطوات إنشاء المفتاح' 'Information'
    Start-Process 'https://github.com/settings/personal-access-tokens/new'

    $tf = New-Object System.Windows.Forms.Form
    $tf.Text = 'مفتاح النشر'
    $tf.ClientSize = New-Object System.Drawing.Size(460, 170)
    $tf.StartPosition = 'CenterScreen'
    $tf.FormBorderStyle = 'FixedDialog'
    $tf.MaximizeBox = $false; $tf.MinimizeBox = $false
    $tf.RightToLeft = 'Yes'; $tf.RightToLeftLayout = $true
    $tf.Font = New-Object System.Drawing.Font('Segoe UI', 10)
    $tf.TopMost = $true

    $tl = New-Object System.Windows.Forms.Label
    $tl.Text = 'الصق المفتاح هنا (يبدأ بـ github_pat_):'
    $tl.SetBounds(20, 18, 420, 22)
    $tf.Controls.Add($tl)

    $tt = New-Object System.Windows.Forms.TextBox
    $tt.SetBounds(20, 46, 420, 26)
    $tt.RightToLeft = 'No'
    $tf.Controls.Add($tt)

    $tn = New-Object System.Windows.Forms.Label
    $tn.Text = 'يُحفظ على جهازك فقط ولا يُرفع للمستودع.'
    $tn.SetBounds(20, 78, 420, 22)
    $tn.ForeColor = [System.Drawing.Color]::Gray
    $tf.Controls.Add($tn)

    $tok = New-Object System.Windows.Forms.Button
    $tok.Text = 'حفظ'; $tok.SetBounds(20, 112, 110, 32)
    $tok.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $tf.Controls.Add($tok); $tf.AcceptButton = $tok

    $tsk = New-Object System.Windows.Forms.Button
    $tsk.Text = 'تخطّي'; $tsk.SetBounds(140, 112, 110, 32)
    $tsk.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $tf.Controls.Add($tsk); $tf.CancelButton = $tsk

    $tf.Add_Shown({ $tt.Focus() })
    $tres = $tf.ShowDialog()
    $tokVal = $tt.Text.Trim()
    $tf.Dispose()

    if ($tres -eq [System.Windows.Forms.DialogResult]::OK -and $tokVal.Length -gt 20) {
      Set-Content -Path $tokenFile -Value $tokVal -Encoding ascii -NoNewline
      Show-Msg 'تم حفظ المفتاح خارج مجلد المشروع، فما يتأثر بأي تعديل على الملفات.' 'تم' 'Information'
    }
  }
}

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

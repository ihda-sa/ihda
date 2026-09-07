/* =========================================================
   بناء لوحة الإنشاء المقفلة
   ---------------------------------------------------------
   يجمع ملفات اللوحة (markup + css + js) في حزمة واحدة،
   يشفّرها بكلمة سر تختارها أنت، ويكتب admin/index.html
   الذي لا يحتوي إلا على صفحة دخول ونص مشفّر.
   الكود المصدري لا يُرفع للإنترنت إطلاقًا.

   التشغيل:  node tools/build-admin.mjs
   ========================================================= */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import readline from 'node:readline';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const ITER = 250000;

/* ---------- كلمة السر بإدخال مخفي ---------- */
function askPassword(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (ch) => {
      const s = String(ch);
      if (s === '\n' || s === '\r' || s === '') process.stdin.removeListener('data', onData);
      else readline.moveCursor(process.stdout, -1000, 0), readline.clearLine(process.stdout, 1), process.stdout.write(prompt + '*'.repeat(rl.line.length));
    };
    process.stdout.write(prompt);
    process.stdin.on('data', onData);
    rl.question('', (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

/* ---------- التشفير ---------- */
const b64 = (buf) => Buffer.from(buf).toString('base64');

async function encrypt(obj, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
  );
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

/* ---------- البناء ---------- */
const run = async () => {
  const argPw = process.argv[2];
  const pw = argPw || await askPassword('اكتب كلمة سر اللوحة (لن تظهر): ');
  if (!pw || pw.length < 6) {
    console.error('\n✗ كلمة السر قصيرة. استخدم ٦ خانات فأكثر.');
    process.exit(1);
  }
  if (!argPw) {
    const again = await askPassword('أعد كتابتها للتأكيد: ');
    if (again !== pw) { console.error('\n✗ الكلمتان غير متطابقتين.'); process.exit(1); }
  }

  const bundle = {
    html: read('admin/panel.html'),
    css: read('css/admin.css'),
    crypto: read('js/crypto.js'),
    qr: read('js/qr-card.js'),
    admin: read('js/admin.js'),
  };
  const kb = Math.round(Object.values(bundle).join('').length / 1024);

  const payload = await encrypt(bundle, pw);
  const shell = read('tools/admin-shell.html').replace('"__PAYLOAD__"', JSON.stringify(payload));
  writeFileSync(join(ROOT, 'admin/index.html'), shell, 'utf8');

  console.log(`\n✓ تم بناء اللوحة المقفلة`);
  console.log(`  المحتوى المشفّر: ${kb} كيلوبايت`);
  console.log(`  الملف: admin/index.html`);
  console.log(`\n  الرابط بعد النشر: https://gift.wesal-shop.com/admin/`);
  console.log(`  لا يفتحها إلا من يعرف كلمة السر. احفظها — لا يمكن استرجاعها.\n`);
};

run().catch((e) => { console.error('✗ فشل البناء:', e.message); process.exit(1); });

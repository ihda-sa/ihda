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

/* ---------- كلمة السر بإدخال مخفي ----------
   قراءة حرفًا حرفًا من الطرفية مباشرة. لا نستخدم readline هنا لأن
   خلط readline مع مستمع data يسبب تعارضًا وإغلاقًا مفاجئًا على ويندوز. */
function askPassword(prompt) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;

    // لو لم تكن طرفية تفاعلية (تشغيل آلي أو أنبوب) نقرأ سطرًا عاديًا
    if (!stdin.isTTY) {
      process.stdout.write(prompt);
      let buf = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (d) => { buf += d; if (buf.includes('\n')) { stdin.pause(); resolve(buf.split('\n')[0].trim()); } });
      stdin.on('end', () => resolve(buf.trim()));
      return;
    }

    process.stdout.write(prompt);
    let pw = '';
    try { stdin.setRawMode(true); } catch (e) { return reject(new Error('تعذّر تشغيل الإدخال المخفي: ' + e.message)); }
    stdin.resume();
    stdin.setEncoding('utf8');

    const done = (value) => {
      stdin.removeListener('data', onData);
      try { stdin.setRawMode(false); } catch {}
      stdin.pause();
      process.stdout.write('\n');
      resolve(value);
    };

    function onData(chunk) {
      // اللصق يصل دفعة واحدة، فنعالج كل حرف على حدة
      for (const ch of String(chunk)) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') { done(pw); return; }
        if (ch === '\u0003') {                       // Ctrl+C
          try { stdin.setRawMode(false); } catch {}
          process.stdout.write('\n');
          process.exit(1);
        }
        if (ch === '\u0008' || ch === '\u007f') {   // Backspace
          if (pw.length) { pw = pw.slice(0, -1); process.stdout.write('\b \b'); }
          continue;
        }
        if (ch >= ' ') { pw += ch; process.stdout.write('*'); }
      }
    }

    stdin.on('data', onData);
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
  const argPw = process.env.IHDA_PW || process.argv[2];
  const pw = argPw || await askPassword('اكتب كلمة سر اللوحة (لن تظهر أثناء الكتابة): ');
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

run().catch((e) => {
  console.error('\n✗ فشل البناء:', e && e.stack ? e.stack : e);
  process.exit(1);
});

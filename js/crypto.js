/* =========================================================
   التشفير — AES-GCM 256 بت
   ---------------------------------------------------------
   الفكرة: محتوى كل إهداء يُخزَّن مشفّرًا بالكامل على الخادم.
   المفتاح لا يُحفظ في أي ملف ولا في أي سجل؛ يعيش فقط بعد
   علامة # في رابط المستلم، والمتصفحات لا ترسل ما بعد #
   إلى الخادم إطلاقًا. فمن يتصفح المستودع أو سجلات الاستضافة
   لا يرى إلا نصًا مشفّرًا لا معنى له.
   ========================================================= */

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ---------- base64 آمن للملفات الكبيرة ---------- */
/* التقسيم إلى قطع ضروري: تمرير مصفوفة ضخمة دفعة واحدة يفجّر مكدّس الاستدعاء */
function bytesToB64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < arr.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
function b64ToBytes(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/* صيغة صالحة داخل الروابط */
const toUrlSafe = (s) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromUrlSafe = (s) => s.replace(/-/g, '+').replace(/_/g, '/');

/* ---------- المفتاح ---------- */

/** مفتاح عشوائي 256 بت بصيغة صالحة للرابط */
export function newKey() {
  return toUrlSafe(bytesToB64(crypto.getRandomValues(new Uint8Array(32))));
}

async function importKey(keyStr) {
  const raw = b64ToBytes(fromUrlSafe(String(keyStr || '').trim()));
  if (raw.length !== 32) throw new Error('bad-key');
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** معرّف عشوائي لا يحمل أي معلومة عن الزبون */
export function newId(len = 12) {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789'; // بلا حروف/أرقام متشابهة
  const r = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(r, (b) => abc[b % abc.length]).join('');
}

/* ---------- الختم والفتح بمفتاح الرابط ---------- */

/** يشفّر الكائن كاملًا ويعيد المغلّف الذي يُرفع للمستودع */
export async function sealJSON(obj, keyStr) {
  const key = await importKey(keyStr);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { enc: 2, iv: bytesToB64(iv), ct: bytesToB64(ct) };
}

/** يفك المغلّف؛ يرمي خطأ إذا كان المفتاح غير صحيح أو الملف معدَّلًا */
export async function openJSON(payload, keyStr) {
  const key = await importKey(keyStr);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(payload.iv) }, key, b64ToBytes(payload.ct),
  );
  return JSON.parse(dec.decode(pt));
}

/* ---------- التشفير بكلمة سر (كرت الرقم السري) ---------- */

const ITER = 200000;

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(String(password).normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

export async function encryptJSON(obj, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { v: 1, salt: bytesToB64(salt), iv: bytesToB64(iv), ct: bytesToB64(ct) };
}

export async function decryptJSON(payload, password) {
  const key = await deriveKey(password, b64ToBytes(payload.salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(payload.iv) }, key, b64ToBytes(payload.ct));
  return JSON.parse(dec.decode(pt));
}

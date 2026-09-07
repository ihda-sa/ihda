/* لوحة إنشاء الإهداءات — تبني ملف JSON لكل زبون (بدون سيرفر) */
import { encryptJSON, sealJSON, newKey, newId } from './crypto.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const TYPES = [
  ['love', 'تحبني؟ 💗', 'سؤال، زر «لا» يهرب، ثم هدايا (صور/أغنية/رسالة/فيديو).'],
  ['daily', 'رسالة كل يوم 💌', 'رسالة لكل يوم من الشهر، لا تنفتح قبل يومها.'],
  ['secret', 'إهداء برقم سري 🔒', 'محتوى مشفّر لا يفتحه إلا من يعرف كلمة السر.'],
  ['arrow', 'سهم الحب 🏹', 'سهم يفرقع بالون القلب، تهنئة وردية، ثم شجرة تزهر بشكل قلب.'],
  ['namesong', 'أغنية باسمك 🎤', 'حفلة متحركة وأغنية عيد ميلاد يُنطق فيها اسم المستلم.'],
  ['gifts', 'هدايا مباشرة 🎁', 'مركز الهدايا بدون سؤال.'],
  ['letter', 'رسالة واحدة ✉️', 'رسالة مكتوبة تظهر بحركة الكتابة.'],
];
const THEMES = { pink: '#e2568a', lilac: '#8a5ee0', sky: '#3f7fd9', mint: '#2e9d6a', cream: '#c98a2e' };

const blankDay = () => ({ title: '', text: '', image: '', link: '' });
const state = {
  type: 'love', id: '', key: '', recipient: '', sender: '', gender: 'f', theme: 'pink', pattern: 'hearts', sticker: '', stickerYes: '', hubTitle: '',
  ask: { question: '', yes: '', no: '', hubTitle: '', steps: '' },
  items: [
    { type: 'photos', label: 'هدية 1', title: 'لحظات محفوظة', photos: [{ src: '', caption: '' }, { src: '', caption: '' }, { src: '', caption: '' }] },
    { type: 'song', label: 'هدية 2', title: 'أغنية تذكّرني فيك', youtube: '', audio: '', name: '', artist: '', note: '' },
    { type: 'letter', label: 'هدية 3', to: '', body: '', from: '', ps: '' },
  ],
  letter: { to: '', body: '', from: '' },
  namesong: { spoken: '', sign: '', title: '', start: '', done: '', nameAudio: '' },
  arrow: { introCaption: '', hint: '', pinkCaption: '', headline: '', pinkSub: '', finalCaption: '', finalHeadline: '', finalSub: '', message: '', audio: '' },
  daily: { title: '', intro: '', mode: 'monthDay', month: '', startDate: '', days: Array.from({ length: 31 }, blankDay) },
  secret: { password: '', numeric: 'true', hint: '', inner: 'love', title: '', intro: '' },
};

/* ---------- مسارات ---------- */
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => (a[k] ??= {}), o); t[last] = v; };

/* ---------- عناصر ---------- */
function h(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(kids)) if (c != null && c !== false) n.append(c instanceof Node ? c : String(c));
  return n;
}
function field(label, path, { type = 'input', placeholder = '', ltr = false, rows = 3, small = '' } = {}) {
  const id = 'p-' + path.replace(/\./g, '-');
  const input = type === 'textarea'
    ? h('textarea', { id, name: path, rows, placeholder })
    : h('input', { id, name: path, placeholder, dir: ltr ? 'ltr' : null, type: 'text' });
  input.value = getPath(state, path) ?? '';
  return h('div', { class: 'field' }, [h('label', { for: id, text: label }), input, small ? h('small', { text: small }) : null]);
}

/* ---------- رفع الصور (تُضغط وتُحفظ داخل JSON كـ data URL) ---------- */
function readFile(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
async function compressImage(file, { maxSide = 1200, quality = 0.82 } = {}) {
  // GIF متحرك أو PNG شفاف صغير: يُحفظ كما هو
  if (file.type === 'image/gif' || (file.type === 'image/png' && file.size < 400 * 1024)) return readFile(file);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
    return c.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', quality);
  } finally { URL.revokeObjectURL(url); }
}
const kb = (dataUrl) => Math.round((dataUrl.length * 3) / 4 / 1024);
function imageField(label, path, { maxSide = 1200, small = '', accept = 'image/*' } = {}) {
  const wrap = h('div', { class: 'field' });
  const render = () => {
    const v = getPath(state, path) || '';
    const isData = v.startsWith('data:');
    wrap.innerHTML = '';
    wrap.append(h('label', { text: label }));
    const thumb = v ? h('img', { class: 'upload__thumb', src: v, alt: '' }) : h('div', { class: 'upload__thumb upload__thumb--empty', text: '🖼' });
    const file = h('input', { type: 'file', accept, hidden: true });
    const btn = h('button', { type: 'button', class: 'btn btn--soft btn--sm upload__btn', text: v ? 'تغيير' : 'رفع صورة', onclick: () => file.click() });
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      if (f.size > 8 * 1024 * 1024) { alert('الملف أكبر من 8 ميجابايت. صغّره أولًا.'); return; }
      btn.textContent = 'جارٍ الضغط…'; btn.disabled = true;
      try { setPath(state, path, await compressImage(f, { maxSide })); } catch { alert('تعذّر قراءة الصورة.'); }
      render(); schedule();
    });
    const meta = h('span', { class: 'upload__meta', text: isData ? `✓ صورة مرفوعة (${kb(v)} KB)` : (v ? v : 'لا توجد صورة') });
    const row = h('div', { class: 'upload' }, [thumb, btn, meta, file]);
    if (v) row.append(h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'حذف الصورة', text: '✕', onclick: () => { setPath(state, path, ''); render(); schedule(); } }));
    wrap.append(row);
    if (!isData) {
      const urlInp = h('input', { class: 'upload__url-input', name: path, dir: 'ltr', placeholder: 'https://… أو gifts/media/…' });
      urlInp.value = v;
      if (v) wrap.append(urlInp);
      else {
        urlInp.hidden = true;
        const urlBtn = h('button', { type: 'button', class: 'upload__url', text: 'أو اكتب رابط صورة' });
        urlBtn.addEventListener('click', () => { urlInp.hidden = false; urlInp.focus(); urlBtn.remove(); });
        wrap.append(urlBtn, urlInp);
      }
    }
    if (small) wrap.append(h('small', { text: small }));
  };
  render();
  return wrap;
}

/* ---------- تسجيل صوت الاسم (يُحفظ WAV داخل JSON ليشتغل على كل الأجهزة) ---------- */
function encodeWav(buffer) {
  const rate = 22050, ch = buffer.getChannelData(0);
  const ratio = buffer.sampleRate / rate, len = Math.floor(ch.length / ratio);
  const out = new DataView(new ArrayBuffer(44 + len * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + len * 2, true); str(8, 'WAVE'); str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, len * 2, true);
  // تطبيع مستوى الصوت
  let peak = 0; for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
  const gain = peak > 0 ? Math.min(4, 0.95 / peak) : 1;
  for (let i = 0; i < len; i++) { const v = Math.max(-1, Math.min(1, ch[Math.floor(i * ratio)] * gain)); out.setInt16(44 + i * 2, v * 32767, true); }
  const bytes = new Uint8Array(out.buffer); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return 'data:audio/wav;base64,' + btoa(bin);
}
async function blobToWav(blob) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ac.decodeAudioData(await blob.arrayBuffer());
  // قصّ الصمت من البداية والنهاية
  const d = buf.getChannelData(0); let a = 0, z = d.length - 1; const th = 0.02;
  while (a < z && Math.abs(d[a]) < th) a++; while (z > a && Math.abs(d[z]) < th) z--;
  a = Math.max(0, a - buf.sampleRate * 0.05); z = Math.min(d.length, z + buf.sampleRate * 0.15);
  const trimmed = ac.createBuffer(1, Math.max(1, z - a), buf.sampleRate); trimmed.getChannelData(0).set(d.subarray(a, z));
  ac.close?.();
  return encodeWav(trimmed);
}
function audioField(label, path) {
  const wrap = h('div', { class: 'field' });
  let rec = null, chunks = [], timer = null;
  const render = () => {
    const v = getPath(state, path) || '';
    wrap.innerHTML = '';
    wrap.append(h('label', { text: label }));
    const row = h('div', { class: 'upload' });
    const recBtn = h('button', { type: 'button', class: 'btn btn--sm upload__btn', text: '🎙️ سجّل نطق الاسم' });
    const file = h('input', { type: 'file', accept: 'audio/*', hidden: true });
    const upBtn = h('button', { type: 'button', class: 'btn btn--soft btn--sm upload__btn', text: 'رفع ملف صوتي', onclick: () => file.click() });
    const meta = h('span', { class: 'upload__meta', text: v ? `✓ صوت محفوظ (${kb(v)} KB)` : 'بدون تسجيل: يُنطق تلقائيًا بصوت جهاز المستلم' });
    row.append(recBtn, upBtn, meta, file);
    if (v) {
      row.append(h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'تشغيل', text: '▶', onclick: () => new Audio(v).play() }));
      row.append(h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'حذف', text: '✕', onclick: () => { setPath(state, path, ''); render(); schedule(); } }));
    }
    recBtn.addEventListener('click', async () => {
      if (rec) { rec.stop(); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec = new MediaRecorder(stream); chunks = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop()); clearTimeout(timer);
          recBtn.textContent = 'جارٍ الحفظ…'; recBtn.disabled = true;
          try { setPath(state, path, await blobToWav(new Blob(chunks, { type: rec.mimeType }))); } catch { alert('تعذّر معالجة التسجيل. جرّب مرة ثانية.'); }
          rec = null; render(); schedule();
        };
        rec.start(); recBtn.textContent = '⏹ أوقف (تسجيل…)'; recBtn.classList.add('is-rec'); meta.textContent = 'قل الاسم بحماس: «يا سارة!»';
        timer = setTimeout(() => rec && rec.stop(), 4000); // حد 4 ثوانٍ
      } catch { alert('ما قدرنا نوصل للمايك. اسمح للمتصفح باستخدامه أو ارفع ملفًا صوتيًا.'); }
    });
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      if (f.size > 3 * 1024 * 1024) { alert('الملف أكبر من 3 ميجابايت.'); return; }
      try { setPath(state, path, await blobToWav(f)); } catch { setPath(state, path, await readFile(f)); }
      render(); schedule();
    });
    wrap.append(row, h('small', { text: 'التسجيل يُقصّ ويُضبط مستواه تلقائيًا ويُحفظ داخل ملف الإهداء. الأفضل: صوت واضح وحماسي بدون ضجيج.' }));
  };
  render();
  return wrap;
}

/* ---------- ربط الحقول بالحالة ---------- */
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t.name) return;
  setPath(state, t.name, t.value);
  schedule();
});
function hydrate(root = document) {
  for (const inp of $$('[name]', root)) {
    const v = getPath(state, inp.name);
    if (v !== undefined && v !== null && !(v instanceof Object) && !String(v).startsWith('data:')) inp.value = String(v);
  }
}

function renderNameAudio() {
  const box = $('#nameAudioField'); if (!box) return; box.innerHTML = '';
  box.append(audioField('نطق الاسم (اختياري لكن مُوصى به)', 'namesong.nameAudio'));
}
function renderSticker() {
  const box = $('#stickerField'); box.innerHTML = '';
  box.append(
    imageField('صورة الشخصية (اختياري)', 'sticker', { maxSide: 480, accept: 'image/png,image/gif,image/webp,image/jpeg', small: 'ارفع ملصق (PNG شفاف أو GIF متحرك). اتركه فاضيًا لاستخدام القطة الافتراضية.' }),
    imageField('صورة بعد «نعم» (لكرت تحبني؟)', 'stickerYes', { maxSide: 480, accept: 'image/png,image/gif,image/webp,image/jpeg', small: 'اتركها فاضية لتظهر القطة المتحركة الافتراضية (assets/yes-cat.gif).' }),
  );
}

/* ---------- نوع الكرت ---------- */
function renderTypes() {
  const box = $('#typePicker');
  box.innerHTML = '';
  for (const [key, name, desc] of TYPES) {
    box.append(h('button', { type: 'button', class: `type-card${state.type === key ? ' is-on' : ''}`, onclick: () => { state.type = key; renderTypes(); applyVisibility(); schedule(); } }, [h('strong', { text: name }), h('span', { text: desc })]));
  }
}
function effectiveType() { return state.type === 'secret' ? state.secret.inner : state.type; }
function applyVisibility() {
  const eff = effectiveType();
  for (const p of $$('[data-for]')) {
    const wants = p.dataset.for.split(' ');
    const isSecretPanel = wants.includes('secret');
    p.hidden = isSecretPanel ? state.type !== 'secret' : !wants.includes(eff);
  }
  let n = 3;
  for (const p of $$('.panel[data-for]')) { const sp = p.querySelector('[data-n]'); if (sp && !p.hidden) sp.textContent = ['٣.', '٤.', '٥.'][n++ - 3] || ''; }
  for (const f of $$('[data-mode]')) f.hidden = f.dataset.mode !== state.daily.mode;
}
$('#d-mode').addEventListener('change', applyVisibility);

/* ---------- الثيمات ---------- */
function renderSwatches() {
  const box = $('#swatches'); box.innerHTML = '';
  for (const [k, c] of Object.entries(THEMES)) {
    box.append(h('button', { type: 'button', class: `swatch${state.theme === k ? ' is-on' : ''}`, style: `background:${c}`, 'aria-label': k, title: k, onclick: () => { state.theme = k; renderSwatches(); schedule(); } }));
  }
}

/* ---------- الهدايا ---------- */
const ITEM_NAMES = { photos: 'صور', song: 'أغنية', letter: 'رسالة', video: 'فيديو' };
function newItem(type) {
  const base = { type, label: `هدية ${state.items.length + 1}` };
  if (type === 'photos') return { ...base, title: 'لحظات محفوظة', photos: [{ src: '', caption: '' }, { src: '', caption: '' }] };
  if (type === 'song') return { ...base, title: 'أغنية تذكّرني فيك', youtube: '', audio: '', name: '', artist: '', note: '' };
  if (type === 'letter') return { ...base, to: '', body: '', from: '', ps: '' };
  return { ...base, title: 'فيديو لك', youtube: '', src: '', portrait: '', note: '' };
}
function renderItems() {
  const box = $('#items'); box.innerHTML = '';
  if (!state.items.length) box.append(h('p', { class: 'empty', text: 'ما في هدايا. أضف واحدة من الأزرار تحت.' }));
  state.items.forEach((it, i) => {
    const p = `items.${i}`;
    const tools = h('div', { class: 'item__tools' }, [
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'تحريك للأعلى', text: '↑', onclick: () => { if (i) { [state.items[i - 1], state.items[i]] = [state.items[i], state.items[i - 1]]; renderItems(); schedule(); } } }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'تحريك للأسفل', text: '↓', onclick: () => { if (i < state.items.length - 1) { [state.items[i + 1], state.items[i]] = [state.items[i], state.items[i + 1]]; renderItems(); schedule(); } } }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'حذف', text: '✕', onclick: () => { state.items.splice(i, 1); renderItems(); schedule(); } }),
    ]);
    const card = h('div', { class: 'item' }, [h('div', { class: 'item__head' }, [h('strong', { text: `${ITEM_NAMES[it.type]} · ${it.label || ''}` }), tools])]);
    const g = h('div', { class: 'grid-2' });
    g.append(field('اسم الصندوق', `${p}.label`, { placeholder: `هدية ${i + 1}` }));
    if (it.type === 'photos') {
      g.append(field('عنوان الشاشة', `${p}.title`, { placeholder: 'لحظات محفوظة' }));
      const sub = h('div', { class: 'sub grid-span' });
      it.photos.forEach((ph, j) => {
        sub.append(h('div', { class: 'row' }, [
          imageField(`الصورة ${j + 1}`, `${p}.photos.${j}.src`, { maxSide: 1000 }),
          field('تعليق', `${p}.photos.${j}.caption`, { placeholder: 'أول رحلة لنا' }),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'حذف الصورة', text: '✕', onclick: () => { it.photos.splice(j, 1); renderItems(); schedule(); } }),
        ]));
      });
      sub.append(h('button', { type: 'button', class: 'btn btn--soft btn--sm', text: '+ صورة', onclick: () => { if (it.photos.length < 8) { it.photos.push({ src: '', caption: '' }); renderItems(); } } }));
      g.append(sub);
    } else if (it.type === 'song') {
      g.append(field('عنوان الشاشة', `${p}.title`, { placeholder: 'أغنية تذكّرني فيك' }));
      g.append(field('رابط يوتيوب', `${p}.youtube`, { ltr: true, placeholder: 'https://youtu.be/…' }));
      g.append(field('أو رابط ملف صوتي mp3', `${p}.audio`, { ltr: true, placeholder: 'gifts/media/name/song.mp3' }));
      g.append(field('اسم الأغنية (لملف الصوت)', `${p}.name`), field('الفنان', `${p}.artist`));
      g.append(h('div', { class: 'grid-span' }, field('كلمة تحتها', `${p}.note`, { placeholder: 'كل مرة أسمعها أتذكرك' })));
    } else if (it.type === 'letter') {
      g.append(field('إلى', `${p}.to`, { placeholder: 'إلى سارة،' }), field('التوقيع', `${p}.from`, { placeholder: '— دايمًا لك' }));
      g.append(h('div', { class: 'grid-span' }, field('نص الرسالة', `${p}.body`, { type: 'textarea', rows: 6 })));
    } else {
      g.append(field('عنوان الشاشة', `${p}.title`, { placeholder: 'فيديو لك' }));
      g.append(field('رابط يوتيوب', `${p}.youtube`, { ltr: true }), field('أو رابط ملف mp4', `${p}.src`, { ltr: true }));
      const sel = h('select', { name: `${p}.portrait` }, [h('option', { value: '', text: 'أفقي 16:9' }), h('option', { value: 'true', text: 'عمودي 9:16' })]);
      sel.value = it.portrait || '';
      g.append(h('div', { class: 'field' }, [h('label', { text: 'اتجاه الفيديو' }), sel]));
      g.append(h('div', { class: 'grid-span' }, field('كلمة تحته', `${p}.note`)));
    }
    card.append(g);
    box.append(card);
  });
}
$$('[data-add]').forEach((b) => b.addEventListener('click', () => { state.items.push(newItem(b.dataset.add)); renderItems(); schedule(); }));

/* ---------- الأيام ---------- */
function renderDays() {
  const box = $('#days'); box.innerHTML = '';
  state.daily.days.forEach((d, i) => {
    const p = `daily.days.${i}`;
    box.append(h('div', { class: 'item day-row' }, [
      h('div', { class: 'day-row__n', text: String(i + 1) }),
      h('div', { class: 'grid-2' }, [
        field('عنوان (اختياري)', `${p}.title`, { placeholder: `اليوم ${i + 1}` }),
        imageField('صورة (اختياري)', `${p}.image`, { maxSide: 1000 }),
        h('div', { class: 'grid-span' }, field('نص الرسالة', `${p}.text`, { type: 'textarea', rows: 2 })),
      ]),
    ]));
  });
}
$('#d-count').addEventListener('input', (e) => {
  const n = Math.min(31, Math.max(1, Number(e.target.value) || 1));
  const days = state.daily.days;
  while (days.length < n) days.push(blankDay());
  days.length = n;
  renderDays(); schedule();
});

/* ---------- المعرّف ---------- */
function freshIdentity() {
  state.id = newId();
  state.key = newKey();
  $('#f-id').value = state.id;
}
$('#genId').addEventListener('click', () => {
  if (state.saved && !confirm('هذا ينشئ إهداءً جديدًا بمفتاح جديد. الرابط الحالي لن يعود صالحًا لهذا المحتوى. متأكد؟')) return;
  state.saved = false;
  freshIdentity();
  schedule();
});

/* ---------- بناء JSON ---------- */
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && !v.length)));
function buildItems() {
  return state.items.map((it) => {
    const c = clean(it);
    if (it.type === 'photos') c.photos = it.photos.filter((p) => p.src).map(clean);
    if (it.type === 'video') c.portrait = it.portrait === 'true' ? true : undefined;
    return clean(c);
  });
}
async function buildGift(type = state.type) {
  const g = clean({ type, theme: state.theme, pattern: state.pattern, recipient: state.recipient, sender: state.sender, gender: state.gender, sticker: state.sticker, stickerYes: state.stickerYes });
  if (type === 'love') {
    const ask = clean({ ...state.ask, steps: state.ask.steps.split('\n').map((s) => s.trim()).filter(Boolean) });
    if (Object.keys(ask).length) g.ask = ask;
    g.items = buildItems();
  } else if (type === 'gifts') {
    if (state.hubTitle) g.hubTitle = state.hubTitle;
    g.items = buildItems();
  } else if (type === 'namesong') {
    const n = clean(state.namesong);
    if (Object.keys(n).length) g.namesong = n;
    const items = buildItems();
    if (items.length) g.items = items;
  } else if (type === 'arrow') {
    const a = clean(state.arrow);
    if (Object.keys(a).length) g.arrow = a;
    const items = buildItems();
    if (items.length) g.items = items;
  } else if (type === 'letter') {
    g.letter = clean(state.letter);
  } else if (type === 'daily') {
    const d = clean({ title: state.daily.title, intro: state.daily.intro, mode: state.daily.mode });
    if (state.daily.mode === 'month') { d.mode = 'monthDay'; d.month = state.daily.month; }
    if (state.daily.mode === 'sequential') d.startDate = state.daily.startDate;
    d.days = state.daily.days.map(clean);
    g.daily = clean(d);
  } else if (type === 'secret') {
    const inner = await buildGift(state.secret.inner);
    delete inner.theme; delete inner.pattern; delete inner.sticker; delete inner.recipient; delete inner.sender;
    g.secret = clean({ numeric: state.secret.numeric === 'true' ? undefined : false, hint: state.secret.hint, title: state.secret.title, intro: state.secret.intro });
    g.payload = state.secret.password ? await encryptJSON(inner, state.secret.password) : null;
  }
  return g;
}
function validate(g) {
  const errs = [];
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(state.id) || !state.key) errs.push('اضغط «معرّف جديد» لتوليد معرّف ومفتاح.');
  if (state.type === 'secret' && !state.secret.password) errs.push('كلمة السر مطلوبة للإهداء الخاص.');
  const eff = effectiveType();
  if ((eff === 'love' || eff === 'gifts') && !state.items.length) errs.push('أضف هدية واحدة على الأقل.');
  if (eff === 'daily' && !state.daily.days.some((d) => d.text)) errs.push('اكتب نص رسالة واحدة على الأقل.');
  if (eff === 'daily' && state.daily.mode === 'month' && !state.daily.month) errs.push('اختر الشهر.');
  if (eff === 'daily' && state.daily.mode === 'sequential' && !state.daily.startDate) errs.push('اختر تاريخ البداية.');
  if (eff === 'letter' && !state.letter.body) errs.push('نص الرسالة فاضي.');
  return errs;
}

/* ---------- الإخراج ---------- */
let timer, lastJSON = '';
function schedule() { clearTimeout(timer); timer = setTimeout(updateOutput, 250); }
function baseUrl() {
  const v = $('#baseUrl').value.trim();
  const d = location.href.replace(/admin\/?(index\.html)?(\?.*)?$/, '');
  return (v || d).replace(/\/?$/, '/');
}
function finalLink() { return `${baseUrl()}?g=${state.id || '…'}#k=${state.key || '…'}`; }
let qr;
function renderQR(link) {
  const box = $('#qr');
  if (!window.QRCode) { box.innerHTML = '<small>رمز QR غير متاح بدون إنترنت.</small>'; return; }
  box.innerHTML = '';
  if (!state.id) return;
  qr = new QRCode(box, { text: link, width: 168, height: 168, colorDark: '#4a2233', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
}
async function updateOutput() {
  const g = await buildGift();
  const errs = validate(g);
  $('#errors').textContent = errs.join('\n');
  // ما يُرفع للمستودع هو المغلّف المشفّر فقط
  lastJSON = state.key ? JSON.stringify(await sealJSON(g, state.key), null, 2) : '';
  $('#json').value = lastJSON;
  const mb = lastJSON.length / 1024 / 1024;
  const sz = $('#size'); sz.textContent = `حجم الملف: ${mb < 1 ? Math.round(mb * 1024) + ' KB' : mb.toFixed(1) + ' MB'}`; sz.classList.toggle('is-warn', mb > 6);
  if (mb > 6) sz.textContent += ' — كبير؛ قلّل عدد الصور أو حجمها.';
  const link = finalLink();
  $('#finalLink').textContent = link;
  renderQR(link);
  $('#download').disabled = errs.length > 0;
}
$('#baseUrl').addEventListener('input', () => { try { localStorage.setItem('ihda:base', $('#baseUrl').value); } catch {} schedule(); });
$('#copyLink').addEventListener('click', async () => { try { await navigator.clipboard.writeText(finalLink()); $('#copyLink').textContent = 'تم ✓'; setTimeout(() => ($('#copyLink').textContent = 'نسخ'), 1500); } catch { prompt('انسخ الرابط:', finalLink()); } });
function download(text, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#download').addEventListener('click', () => {
  if (!lastJSON) return;
  download(lastJSON, `${state.id}.json`);
  state.saved = true;
  addToRegistry();
});

/* ---------- سجل الروابط (محلي فقط، لا يُرفع) ---------- */
const REG_KEY = 'ihda:registry';
const loadReg = () => { try { return JSON.parse(localStorage.getItem(REG_KEY) || '[]'); } catch { return []; } };
const saveReg = (r) => { try { localStorage.setItem(REG_KEY, JSON.stringify(r.slice(0, 500))); } catch {} };
function addToRegistry() {
  const reg = loadReg().filter((x) => x.id !== state.id);
  reg.unshift({ id: state.id, link: finalLink(), recipient: state.recipient || '', type: state.type, at: new Date().toISOString() });
  saveReg(reg); renderReg();
}
function renderReg() {
  const reg = loadReg();
  $('#regCount').textContent = String(reg.length);
  const box = $('#regList'); box.innerHTML = '';
  if (!reg.length) { box.append(h('p', { class: 'reg__note', text: 'ما فيه روابط محفوظة بعد. تظهر هنا عند تنزيل أي ملف.' })); return; }
  for (const r of reg) {
    box.append(h('div', { class: 'reg__item' }, [
      h('b', { text: `${r.recipient || 'بلا اسم'} · ${r.type}` }),
      h('small', { text: new Date(r.at).toLocaleString('ar-SA-u-ca-gregory-nu-latn') }),
      h('code', { text: r.link }),
      h('div', { class: 'row wrap' }, [
        h('button', { type: 'button', class: 'btn btn--soft btn--sm', text: 'نسخ', onclick: async () => { try { await navigator.clipboard.writeText(r.link); } catch { prompt('انسخ الرابط:', r.link); } } }),
        h('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: 'فتح', onclick: () => window.open(r.link, '_blank', 'noopener') }),
      ]),
    ]));
  }
}
$('#regExport').addEventListener('click', () => {
  const reg = loadReg();
  if (!reg.length) return alert('السجل فاضي.');
  const txt = reg.map((r) => `${new Date(r.at).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn')}\t${r.recipient || '-'}\t${r.type}\t${r.link}`).join('\n');
  download(`التاريخ\tالمستلم\tالنوع\tالرابط\n${txt}`, 'سجل-روابط-الاهداءات.tsv', 'text/tab-separated-values;charset=utf-8');
});
$('#regClear').addEventListener('click', () => {
  if (!confirm('مسح السجل من هذا المتصفح؟ الروابط نفسها تبقى شغّالة، لكن لن تقدر تسترجعها من هنا.')) return;
  saveReg([]); renderReg();
});
$('#preview').addEventListener('click', async () => {
  const g = await buildGift();
  g.id = state.id || 'preview';
  try { localStorage.setItem('ihda:preview', JSON.stringify(g)); } catch {}
  window.open('../?g=preview', '_blank', 'noopener');
});

/* ---------- استيراد ---------- */
$('#importFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const g = JSON.parse(await f.text());
    if (g.enc === 2) { alert('هذا الملف مشفّر ولا يمكن فتحه هنا. لتعديل إهداء، ابنِه من جديد وأرسل رابطًا جديدًا.'); return; }
    if (g.type === 'secret') { alert('الإهداء الخاص مشفّر ولا يمكن استيراده للتعديل. ابنِه من جديد.'); return; }
    state.type = g.type || 'love';
    Object.assign(state, { recipient: g.recipient || '', sender: g.sender || '', gender: g.gender || 'f', theme: g.theme || 'pink', pattern: g.pattern || 'hearts', sticker: g.sticker || '', stickerYes: g.stickerYes || '', hubTitle: g.hubTitle || '' });
    if (g.ask && typeof g.ask === 'object') state.ask = { question: '', yes: '', no: '', hubTitle: '', ...g.ask, steps: (g.ask.steps || []).join('\n') };
    if (g.items) state.items = g.items.map((it) => ({ ...newItem(it.type), ...it, portrait: it.portrait ? 'true' : '', photos: (it.photos || []).map((p) => ({ src: '', caption: '', ...p })) }));
    if (g.letter) state.letter = { to: '', body: '', from: '', ...g.letter };
    if (g.arrow) state.arrow = { ...state.arrow, ...g.arrow };
    if (g.namesong) state.namesong = { ...state.namesong, ...g.namesong };
    if (g.daily) { state.daily = { title: '', intro: '', mode: g.daily.month ? 'month' : (g.daily.mode || 'monthDay'), month: g.daily.month || '', startDate: g.daily.startDate || '', days: (g.daily.days || []).map((d) => ({ ...blankDay(), ...d })) }; $('#d-count').value = state.daily.days.length; }
    renderAll();
  } catch { alert('الملف غير صالح.'); }
  e.target.value = '';
});

/* ---------- تشغيل ---------- */
function renderAll() { renderTypes(); renderSwatches(); renderSticker(); renderNameAudio(); renderItems(); renderDays(); hydrate(); applyVisibility(); schedule(); }
try { $('#baseUrl').value = localStorage.getItem('ihda:base') || ''; } catch {}
freshIdentity();
renderReg();
renderAll();

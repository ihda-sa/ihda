/* أدوات الواجهة المشتركة: بناء العناصر، الشخصية، الأيقونات، الشاشات، التنبيهات */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) node.style.setProperty(prop, val); else node.style[prop] = val;
      }
    }
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- الشخصية (قطة) ---------- */
const CAT = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g fill="#fff" stroke="var(--ink)" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M48 78 L38 28 L82 58 Z"/>
    <path d="M152 78 L162 28 L118 58 Z"/>
    <ellipse cx="100" cy="112" rx="72" ry="62"/>
  </g>
  <path d="M50 66 L45 42 L68 58 Z M150 66 L155 42 L132 58 Z" fill="var(--brand-soft)"/>
  <circle cx="62" cy="128" r="9" fill="var(--brand-soft)"/>
  <circle cx="138" cy="128" r="9" fill="var(--brand-soft)"/>
  <g fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <!-- shy -->
    <g class="m m-shy">
      <path d="M68 108 q10 -10 20 0"/><path d="M112 108 q10 -10 20 0"/>
      <path d="M92 124 q4 6 8 0 q4 6 8 0"/>
      <ellipse cx="66" cy="150" rx="14" ry="10" fill="#fff"/><ellipse cx="134" cy="150" rx="14" ry="10" fill="#fff"/>
    </g>
    <!-- happy -->
    <g class="m m-happy">
      <circle cx="78" cy="108" r="6" fill="var(--ink)"/><circle cx="122" cy="108" r="6" fill="var(--ink)"/>
      <circle cx="80" cy="106" r="2" fill="#fff" stroke="none"/><circle cx="124" cy="106" r="2" fill="#fff" stroke="none"/>
      <path d="M84 126 q16 14 32 0"/>
    </g>
    <!-- sad -->
    <g class="m m-sad">
      <path d="M70 104 q8 6 16 4"/><path d="M130 104 q-8 6 -16 4"/>
      <circle cx="78" cy="112" r="4" fill="var(--ink)"/><circle cx="122" cy="112" r="4" fill="var(--ink)"/>
      <path d="M90 132 q10 -8 20 0"/>
      <path d="M134 118 q6 10 0 16 q-6 -6 0 -16" fill="#a9d4f5" stroke="#6fb3e8" stroke-width="3"/>
    </g>
    <!-- angry -->
    <g class="m m-angry">
      <path d="M66 96 l22 8"/><path d="M134 96 l-22 8"/>
      <circle cx="80" cy="112" r="4" fill="var(--ink)"/><circle cx="120" cy="112" r="4" fill="var(--ink)"/>
      <path d="M90 132 h20"/>
      <path d="M152 78 l10 -12 M158 90 l14 -6 M148 66 l4 -14" stroke="var(--brand)"/>
    </g>
    <!-- love -->
    <g class="m m-love">
      <path d="M78 116 l-9 -9 a5.5 5.5 0 0 1 9 -7 a5.5 5.5 0 0 1 9 7 z" fill="var(--brand)" stroke="var(--brand)"/>
      <path d="M122 116 l-9 -9 a5.5 5.5 0 0 1 9 -7 a5.5 5.5 0 0 1 9 7 z" fill="var(--brand)" stroke="var(--brand)"/>
      <path d="M84 126 q16 14 32 0"/>
      <path d="M160 52 l-11 -11 a7 7 0 0 1 11 -9 a7 7 0 0 1 11 9 z" fill="var(--brand)" stroke="var(--brand)"/>
    </g>
    <!-- think -->
    <g class="m m-think">
      <path d="M70 108 h16"/><circle cx="122" cy="108" r="5" fill="var(--ink)"/>
      <path d="M92 130 q8 -4 16 0"/>
      <circle cx="158" cy="60" r="3" fill="var(--ink)" stroke="none"/><circle cx="168" cy="50" r="4" fill="var(--ink)" stroke="none"/><circle cx="180" cy="38" r="5" fill="var(--ink)" stroke="none"/>
    </g>
    <!-- wink -->
    <g class="m m-wink">
      <path d="M68 108 q10 -8 20 0"/><circle cx="122" cy="108" r="6" fill="var(--ink)"/>
      <path d="M84 126 q16 14 32 0"/>
      <path d="M96 130 q4 10 10 0" fill="var(--brand)" stroke="var(--brand)"/>
    </g>
  </g>
</svg>`;

export function sticker(mood = 'shy', { small = false, bob = true, src = null } = {}) {
  const wrap = el('div', {
    class: `sticker${small ? ' sticker--sm' : ''}${bob ? ' sticker--bob' : ''}${src ? ' sticker--img' : ''}`,
    'data-mood': mood,
    role: 'img',
    'aria-label': 'ملصق',
  });
  if (src) wrap.append(el('img', { src, alt: '' }));
  else wrap.innerHTML = CAT;
  return wrap;
}
export function setMood(stk, mood) {
  stk.dataset.mood = mood;
  stk.classList.remove('is-shake');
  void stk.offsetWidth;
  stk.classList.add('is-shake');
}

/* ---------- أيقونات ---------- */
export const icons = {
  gift: `<svg viewBox="0 0 64 64" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
    <rect x="10" y="28" width="44" height="28" rx="4" fill="var(--brand-soft)"/>
    <g class="giftbox__lid"><rect x="6" y="18" width="52" height="12" rx="3" fill="var(--brand)"/>
    <path d="M32 18 c-6 -10 -14 -12 -14 -6 c0 5 8 6 14 6 c6 0 14 -1 14 -6 c0 -6 -8 -4 -14 6z" fill="var(--brand)"/></g>
    <path d="M32 30 v26" stroke="var(--brand)" stroke-width="5"/>
  </svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`,
  photos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-5-5-9 8"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-4.6-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.4-9 9-9 9z"/></svg>`,
};

/* ---------- الشاشات ---------- */
export function screen(extraClass = '', children = []) {
  return el('section', { class: `screen ${extraClass}`.trim() }, children);
}
export function show(target) {
  const root = target.parentElement;
  for (const s of root.querySelectorAll(':scope > .screen')) s.classList.toggle('is-active', s === target);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  root.dispatchEvent(new CustomEvent('screenchange', { detail: target }));
}
export function backButton(label, onclick) {
  return el('div', { class: 'backrow' }, el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick }, [
    el('span', { html: icons.back, 'aria-hidden': 'true' }), label,
  ]));
}

/* ---------- تنبيه صغير ---------- */
let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 2600);
}

/* ---------- قلوب متطايرة ---------- */
export function hearts(count = 26) {
  const box = document.getElementById('hearts');
  if (!box) return;
  const glyphs = ['💗', '💕', '💖', '✨', '🩷'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.textContent = glyphs[i % glyphs.length];
    s.style.setProperty('--sz', `${16 + Math.random() * 22}px`);
    s.style.setProperty('--dur', `${2.2 + Math.random() * 1.6}s`);
    s.style.setProperty('--dx', `${(Math.random() - .5) * 160}px`);
    s.style.setProperty('--rot', `${(Math.random() - .5) * 240}deg`);
    s.style.insetInlineStart = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * .8}s`;
    box.append(s);
    setTimeout(() => s.remove(), 4500);
  }
}

/* ---------- خلفية منقوشة ---------- */
export function pattern(kind) {
  const svg = document.getElementById('bgPattern');
  if (!svg) return;
  if (!kind || kind === 'none') { svg.classList.remove('is-on'); svg.innerHTML = ''; return; }
  const heart = `<path d="M20 34 l-13 -13 a7.5 7.5 0 0 1 13 -9 a7.5 7.5 0 0 1 13 9 z" fill="var(--brand-soft)"/>`;
  const spark = `<path d="M20 8 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" fill="var(--brand-soft)"/>`;
  const dot = `<circle cx="20" cy="20" r="5" fill="var(--brand-soft)"/>`;
  const shape = { hearts: heart, sparkles: spark, dots: dot }[kind] || heart;
  svg.innerHTML = `<defs><pattern id="pat" width="80" height="80" patternUnits="userSpaceOnUse">
    <g transform="translate(6 6) rotate(-14 20 20)">${shape}</g>
    <g transform="translate(44 40) rotate(12 20 20) scale(.7)">${shape}</g>
  </pattern></defs><rect width="100%" height="100%" fill="url(#pat)"/>`;
  svg.classList.add('is-on');
}

/* ---------- يوتيوب ---------- */
export function youtubeId(url = '') {
  const m = String(url).match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : (/^[\w-]{11}$/.test(url) ? url : null);
}

/* ---------- تنسيق ---------- */
export const fmtDate = (d) => new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long' }).format(d);

/* كرت «سهم الحب» — بالون قلب، قوس يطلق سهمًا، انفجار وردي مع النص، وميض ذهبي،
   ثم شجرة تنمو وتزهر بشكل قلب وتتساقط أوراقها. (مطابق لتسلسل الفيديو المرجعي) */
import { el, pattern, show } from '../ui.js';
import { renderHub } from './hub.js';

const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Great+Vibes&family=Aref+Ruqaa:wght@400;700&display=swap';
const DEFAULTS = {
  f: { hint: 'اضغطي لإطلاق السهم', introCaption: 'شيء صغير… لك', pinkCaption: 'تمنّي أمنية', headline: 'كل عام وأنتِ بخير', pinkSub: 'ورسالة من القلب', finalCaption: 'عام جديد…', finalHeadline: 'كل عام وأنتِ بخير', finalSub: 'يزهر بوجودك ✿', doneLabel: 'افتحي هداياك' },
  m: { hint: 'اضغط لإطلاق السهم', introCaption: 'شيء صغير… لك', pinkCaption: 'تمنّى أمنية', headline: 'كل عام وأنت بخير', pinkSub: 'ورسالة من القلب', finalCaption: 'عام جديد…', finalHeadline: 'كل عام وأنت بخير', finalSub: 'يزهر بوجودك ✿', doneLabel: 'افتح هداياك' },
};

const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const easeIn = (t) => Math.pow(Math.min(1, Math.max(0, t)), 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.95);
  ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.9, cy - s * 1.25, cx, cy - s * 0.55);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.25, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.95);
  ctx.closePath();
}
const inHeart = (x, y) => { const a = x * x + y * y - 1; return a * a * a - x * x * y * y * y <= 0; };

export function renderArrow(gift, root) {
  pattern('none');
  if (!document.getElementById('arrowFonts')) document.head.append(el('link', { id: 'arrowFonts', rel: 'stylesheet', href: FONTS }));
  const t = { ...DEFAULTS[gift.gender === 'm' ? 'm' : 'f'], ...(gift.arrow || {}) };
  const items = gift.items || [];

  /* ---------- DOM ---------- */
  const canvas = el('canvas', { class: 'arrow-canvas', 'aria-hidden': 'true' });
  const intro = el('p', { class: 'arrow-intro', text: t.introCaption });
  const hint = el('button', { class: 'arrow-hint', type: 'button', text: t.hint });
  const swoosh = el('div', { class: 'arrow-swoosh', html: `<svg viewBox="0 0 300 40" aria-hidden="true"><path pathLength="1" d="M8 30 C 90 8, 200 6, 292 22 M120 34 C 180 26, 230 26, 262 30" fill="none" stroke-width="3" stroke-linecap="round"/></svg>` });
  const pink = el('div', { class: 'arrow-pink', 'aria-live': 'polite' }, [
    el('div', { class: 'arrow-pink__inner' }, [
      el('p', { class: 'arrow-pink__cap', text: t.pinkCaption }),
      el('h1', { class: 'arrow-pink__head', text: t.headline }),
      swoosh,
      el('p', { class: 'arrow-pink__sub', text: t.pinkSub }),
    ]),
    el('div', { class: 'arrow-burst' }),
  ]);
  const doneBtn = items.length ? el('button', { class: 'btn arrow-done', type: 'button', text: t.doneLabel }) : null;
  const finale = el('div', { class: 'arrow-final' }, [
    el('p', { class: 'arrow-final__cap', text: t.finalCaption }),
    el('h2', { class: 'arrow-final__head', text: t.finalHeadline }),
    el('p', { class: 'arrow-final__sub', text: t.finalSub }),
    t.message ? el('p', { class: 'arrow-final__msg', text: t.message }) : null,
    doneBtn,
  ]);
  const stage = el('div', { class: 'arrow-stage', 'data-phase': 'idle' }, [canvas, intro, hint, pink, finale]);
  root.append(stage);

  let hub = null;
  if (items.length) {
    hub = renderHub(gift, root, { title: gift.hubTitle || t.hubTitle || 'هداياك 🎁', mood: 'love', onBack: () => { stage.hidden = false; running = true; loop(); } });
    doneBtn.addEventListener('click', () => { stage.hidden = true; running = false; show(hub); });
  }

  /* ---------- الحالة ---------- */
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, running = true, raf = 0;
  const now = () => performance.now();
  const S = { phase: 'idle', t0: now(), shotAt: 0, popAt: 0, treeAt: 0, particles: [], petals: [], tree: null, flowers: null, fired: false };
  let audio = null;
  if (t.audio) { audio = new Audio(t.audio); audio.loop = true; audio.preload = 'auto'; audio.volume = 0.9; }

  const geo = () => {
    const m = Math.min(W, H);
    return {
      heart: { x: W * 0.5, y: H * (W > H ? 0.30 : 0.26), s: m * (W > H ? 0.075 : 0.11) },
      bow: { x: W * (W > H ? 0.12 : 0.16), y: H * (W > H ? 0.82 : 0.86), s: m * (W > H ? 0.11 : 0.15) },
      canopy: { x: W * 0.5, y: H * (W > H ? 0.40 : 0.36), r: m * (W > H ? 0.30 : 0.40) },
      trunk: { x: W * 0.5, y0: H * 0.99, y1: H * (W > H ? 0.40 : 0.36) + m * (W > H ? 0.30 : 0.40) * 0.45 },
    };
  };

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.tree = null; S.flowers = null; // تُبنى من جديد بمقاسات الشاشة
  }

  /* ---------- الرسم: المشهد الأول ---------- */
  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fcf6ec'); g.addColorStop(1, '#f1e0cb');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(255,255,255,.35)'); v.addColorStop(1, 'rgba(120,80,60,.10)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function drawBalloon(x, y, s, alpha = 1, scale = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale);
    // الخيط
    ctx.strokeStyle = 'rgba(110,60,50,.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, s * 0.95); ctx.bezierCurveTo(s * 0.3, s * 1.6, -s * 0.3, s * 2.2, s * 0.1, s * 3.0); ctx.stroke();
    // الظل
    ctx.shadowColor = 'rgba(200,40,90,.35)'; ctx.shadowBlur = s * 0.6; ctx.shadowOffsetY = s * 0.25;
    const g = ctx.createRadialGradient(-s * 0.35, -s * 0.55, s * 0.05, 0, 0, s * 1.5);
    g.addColorStop(0, '#ff8fb5'); g.addColorStop(0.45, '#ec3d76'); g.addColorStop(1, '#b3123f');
    heartPath(ctx, 0, 0, s); ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    // لمعة
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(-s * 0.5, -s * 0.5, s * 0.22, s * 0.36, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.85, s * 0.08, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    // العقدة
    ctx.fillStyle = '#b3123f'; ctx.beginPath(); ctx.moveTo(-s * 0.08, s * 0.9); ctx.lineTo(s * 0.08, s * 0.9); ctx.lineTo(0, s * 1.05); ctx.fill();
    ctx.restore();
  }
  function drawArrow(x, y, ang, len) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = '#4a2a20'; ctx.lineWidth = Math.max(1.5, len * 0.03); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-len * 0.5, 0); ctx.lineTo(len * 0.42, 0); ctx.stroke();
    // الريش
    ctx.fillStyle = '#d94f70';
    ctx.beginPath(); ctx.moveTo(-len * 0.5, 0); ctx.lineTo(-len * 0.62, -len * 0.09); ctx.lineTo(-len * 0.38, 0); ctx.lineTo(-len * 0.62, len * 0.09); ctx.closePath(); ctx.fill();
    // الرأس قلب
    ctx.rotate(Math.PI / 2); heartPath(ctx, 0, -len * 0.5, len * 0.07); ctx.fillStyle = '#e2183f'; ctx.fill();
    ctx.restore();
  }
  function drawBow(b, aim, loaded, pull = 0) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(aim);
    const s = b.s;
    // القوس
    ctx.strokeStyle = '#5a3524'; ctx.lineWidth = s * 0.075; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.9); ctx.quadraticCurveTo(s * 0.55, 0, -s * 0.05, s * 0.9); ctx.stroke();
    ctx.strokeStyle = '#8a6a55'; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.9); ctx.quadraticCurveTo(s * 0.5, 0, -s * 0.05, s * 0.9); ctx.stroke();
    // الوتر
    ctx.strokeStyle = 'rgba(60,40,30,.8)'; ctx.lineWidth = 1.2;
    const px = -s * 0.05 - pull * s * 0.35;
    ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.9); ctx.lineTo(px, 0); ctx.lineTo(-s * 0.05, s * 0.9); ctx.stroke();
    ctx.restore();
    if (loaded) drawArrow(b.x + Math.cos(aim) * (s * 0.25 - pull * s * 0.35), b.y + Math.sin(aim) * (s * 0.25 - pull * s * 0.35), aim, s * 1.5);
  }
  function drawParticles(dt) {
    for (const p of S.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; p.rot += p.vr * dt;
      if (p.life <= 0) continue;
      ctx.save(); ctx.globalAlpha = clamp01(p.life / 0.5); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      if (p.heart) { heartPath(ctx, 0, 0, p.r); ctx.fill(); } else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    S.particles = S.particles.filter((p) => p.life > 0);
  }
  function pop(h) {
    const R = rng(7);
    const cols = ['#ff5c8d', '#e2183f', '#ffb3c6', '#ffd54f', '#ffffff', '#c2185b'];
    for (let i = 0; i < 70; i++) {
      const a = R() * Math.PI * 2, sp = h.s * (2 + R() * 6);
      S.particles.push({ x: h.x + (R() - .5) * h.s, y: h.y + (R() - .5) * h.s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - h.s * 2, r: h.s * (0.05 + R() * 0.12), c: cols[i % cols.length], life: 0.7 + R() * 0.6, rot: R() * 6, vr: (R() - .5) * 8, heart: R() > .5 });
    }
  }

  /* ---------- الرسم: الشجرة ---------- */
  function buildTree() {
    const R = rng(21);
    const g = geo(); const c = g.canopy;
    const segs = [];
    const inside = (x, y) => inHeart((x - c.x) / (c.r * 0.92), -((y - c.y) / (c.r * 0.86)) + 0.05);
    const add = (x, y, ang, len, w, depth, t0) => {
      if (depth > 0) { // قصّر الفرع حتى يبقى داخل القلب
        let k = 1;
        while (k > 0.35 && !inside(x + Math.cos(ang) * len * k, y + Math.sin(ang) * len * k)) k -= 0.08;
        if (k <= 0.35) return;
        len *= k;
      }
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      const dur = depth === 0 ? 0.5 : 0.22;
      segs.push({ x1: x, y1: y, x2, y2, w, t0, t1: t0 + dur, depth });
      if (depth >= 5) return;
      const n = depth === 0 ? 3 : (R() > 0.5 ? 3 : 2);
      const spread = depth === 0 ? 1.5 : 1.1;
      for (let i = 0; i < n; i++) {
        let na = ang + (i / (n - 1) - 0.5) * spread + (R() - .5) * 0.3;
        na = Math.max(-Math.PI * 0.97, Math.min(-Math.PI * 0.03, na)); // دائمًا للأعلى
        add(x2, y2, na, len * (0.58 + R() * 0.16), Math.max(1, w * 0.58), depth + 1, t0 + dur * (0.9 + R() * 0.15));
      }
    };
    add(g.trunk.x, g.trunk.y0, -Math.PI / 2, g.trunk.y0 - g.trunk.y1, Math.max(6, c.r * 0.075), 0, 0);
    S.tree = segs;
    // الأزهار داخل شكل القلب (تغطي الفروع)
    const F = [], cols = ['#e91e63', '#f06292', '#ff8fb5', '#ffb3c6', '#ffd54f', '#ef5350', '#fff0f4', '#f48fb1', '#e57373', '#ffe082', '#d81b60'];
    let tries = 0;
    while (F.length < 760 && tries++ < 40000) {
      const px = (R() * 2 - 1) * 1.3, py = (R() * 2 - 1) * 1.3;
      if (!inHeart(px, -py + 0.05)) continue;
      const dist = Math.hypot(px, py);
      F.push({ x: c.x + px * c.r * 0.8, y: c.y + py * c.r * 0.74, r: c.r * (0.02 + R() * 0.03), c: cols[Math.floor(R() * cols.length)], d: 0.05 + dist * 0.5 + R() * 0.5, ph: R() * 6 });
    }
    S.flowers = F;
  }
  function drawTree(tt) {
    for (const s of S.tree) {
      const k = clamp01((tt - s.t0) / (s.t1 - s.t0));
      if (k <= 0) continue;
      const e = easeOut(k);
      ctx.strokeStyle = '#4a2a1f'; ctx.lineWidth = s.w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x1 + (s.x2 - s.x1) * e, s.y1 + (s.y2 - s.y1) * e); ctx.stroke();
    }
  }
  function drawFlowers(bt, time) {
    for (const f of S.flowers) {
      const k = clamp01((bt - f.d) / 0.5);
      if (k <= 0) continue;
      const sc = easeOut(k) * (1 + Math.sin(time * 1.6 + f.ph) * 0.04);
      ctx.fillStyle = f.c;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * sc, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(120,20,50,.18)';
      ctx.beginPath(); ctx.arc(f.x + f.r * 0.2, f.y + f.r * 0.2, f.r * sc * 0.35, 0, Math.PI * 2); ctx.fill();
    }
  }
  function spawnPetal(R) {
    if (!S.flowers?.length) return;
    const f = S.flowers[Math.floor(R() * S.flowers.length)];
    S.petals.push({ x: f.x, y: f.y, vy: 22 + R() * 30, sw: 10 + R() * 22, ph: R() * 6, r: f.r * 0.8, c: f.c, rot: R() * 6, vr: (R() - .5) * 3, life: 0 });
  }
  const petalR = rng(99);
  function drawPetals(dt, time) {
    for (const p of S.petals) {
      p.life += dt; p.y += p.vy * dt; p.x += Math.sin(time * 1.4 + p.ph) * p.sw * dt; p.rot += p.vr * dt;
      ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 3) * (p.y > H - 40 ? clamp01((H - p.y) / 40) : 1);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    S.petals = S.petals.filter((p) => p.y < H + 10);
  }

  /* ---------- الحلقة ---------- */
  let last = now();
  function loop() {
    if (!running) return;
    const tNow = now(); const dt = Math.min(0.05, (tNow - last) / 1000); last = tNow;
    const time = (tNow - S.t0) / 1000;
    const g = geo();
    drawBg();

    if (S.phase === 'idle' || S.phase === 'shoot' || S.phase === 'pop') {
      const bob = Math.sin(time * 1.3) * g.heart.s * 0.12;
      const hx = g.heart.x + Math.sin(time * 0.7) * g.heart.s * 0.15, hy = g.heart.y + bob;
      const aim = Math.atan2(hy - g.bow.y, hx - g.bow.x);
      if (S.phase === 'idle') {
        drawBalloon(hx, hy, g.heart.s);
        drawBow(g.bow, aim, true, 0.4 + Math.sin(time * 2) * 0.05);
      } else if (S.phase === 'shoot') {
        const k = clamp01((tNow - S.shotAt) / 480);
        drawBalloon(hx, hy, g.heart.s);
        drawBow(g.bow, aim, false, 0);
        const sx = g.bow.x, sy = g.bow.y;
        const ax = sx + (hx - sx) * easeIn(k) ** 0.8, ay = sy + (hy - sy) * easeIn(k) ** 0.8 - Math.sin(k * Math.PI) * g.heart.s * 0.8;
        drawArrow(ax, ay, Math.atan2(hy - ay, hx - ax), g.bow.s * 1.5);
        if (k >= 1) { S.phase = 'pop'; S.popAt = tNow; pop({ x: hx, y: hy, s: g.heart.s }); stage.dataset.phase = 'pop'; schedulePink(hx, hy); }
      } else {
        const k = clamp01((tNow - S.popAt) / 280);
        if (k < 1) drawBalloon(hx, hy, g.heart.s, 1 - k, 1 + k * 0.7);
        drawBow(g.bow, aim, false, 0);
        drawParticles(dt);
      }
    } else if (S.phase === 'tree') {
      if (!S.tree) buildTree();
      const tt = (tNow - S.treeAt) / 1000;
      drawTree(tt * 0.9);
      const bt = tt - 1.3;
      if (bt > 0) drawFlowers(bt, time);
      if (bt > 0.8 && S.petals.length < 46 && petalR() < 0.12) spawnPetal(petalR);
      drawPetals(dt, time);
      if (bt > 1.1 && !finale.classList.contains('is-in')) finale.classList.add('is-in');
    }
    raf = requestAnimationFrame(loop);
  }

  /* ---------- التسلسل ---------- */
  function fire() {
    if (S.fired) return; S.fired = true;
    S.phase = 'shoot'; S.shotAt = now(); stage.dataset.phase = 'shoot';
    hint.classList.add('is-hide'); intro.classList.add('is-hide');
    if (audio) audio.play().catch(() => {});
    if (REDUCED) { skipToEnd(); }
  }
  function schedulePink(x, y) {
    pink.style.setProperty('--cx', `${x}px`); pink.style.setProperty('--cy', `${y}px`);
    setTimeout(() => pink.classList.add('is-in'), 250);
    setTimeout(() => pink.classList.add('is-text'), 900);
    setTimeout(() => pink.classList.add('is-burst'), 3200);
    setTimeout(() => { S.phase = 'tree'; S.treeAt = now(); stage.dataset.phase = 'tree'; }, 3700);
    setTimeout(() => pink.classList.add('is-out'), 3750);
    setTimeout(() => { pink.hidden = true; }, 4700);
  }
  function skipToEnd() {
    pink.hidden = true; hint.classList.add('is-hide'); intro.classList.add('is-hide');
    S.phase = 'tree'; S.treeAt = now() - 6000; stage.dataset.phase = 'tree'; finale.classList.add('is-in');
  }

  hint.addEventListener('click', fire);
  stage.addEventListener('pointerdown', (e) => { if (S.phase === 'idle' && e.target !== hint) fire(); });
  if (!audio) setTimeout(() => { if (S.phase === 'idle') fire(); }, 4500); // بدون صوت: ينطلق تلقائيًا
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (!stage.hidden) { running = true; last = now(); loop(); } });

  resize();
  loop();
}

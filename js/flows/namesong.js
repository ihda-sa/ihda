/* كرت «أغنية باسمك» — حفلة متحركة، موسيقى تُصنع في المتصفح (Web Audio) بلحن عيد الميلاد،
   والاسم يُنطق في مكانه من الأغنية (تسجيل صاحب الإهداء / ملف صوتي / نطق تلقائي عربي) */
import { el, show, pattern } from '../ui.js';
import { renderHub } from './hub.js';

const DEFAULTS = {
  f: { title: 'أغنية باسمك 🎤', start: 'شغّلي الأغنية 🎶', sign: 'يلا نحتفل بـ', lines: ['عيد ميلاد سعيد', 'عيد ميلاد سعيد', 'عيد ميلاد سعيد يا…', 'كل عام وأنتِ بخير 🎉'], done: 'كل سنة وأنتِ طيبة يا {name} 💖', replay: 'مرة ثانية 🔁', gifts: 'افتحي هداياك 🎁' },
  m: { title: 'أغنية باسمك 🎤', start: 'شغّل الأغنية 🎶', sign: 'يلا نحتفل بـ', lines: ['عيد ميلاد سعيد', 'عيد ميلاد سعيد', 'عيد ميلاد سعيد يا…', 'كل عام وأنت بخير 🎉'], done: 'كل سنة وأنت طيب يا {name} 💖', replay: 'مرة ثانية 🔁', gifts: 'افتح هداياك 🎁' },
};

/* ---------- الموسيقى ---------- */
const BPM = 156, BEAT = 60 / BPM, BAR = BEAT * 3;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// لحن عيد الميلاد (3/4) — [النبضة من بداية المقطع, النوتة MIDI, الطول بالنبضات]
const MELODY = [
  [2, 67, .5], [2.5, 67, .5], [3, 69, 1], [4, 67, 1], [5, 72, 1], [6, 71, 2],
  [8, 67, .5], [8.5, 67, .5], [9, 69, 1], [10, 67, 1], [11, 74, 1], [12, 72, 2],
  [14, 67, .5], [14.5, 67, .5], [15, 79, 1], [16, 76, 1], [17, 72, 1],
  // نبضات 18–23: مكان الاسم (تتوقف النغمة، الإيقاع يستمر)
  [23, 77, .5], [23.5, 77, .5], [24, 76, 1], [25, 72, 1], [26, 74, 1], [27, 72, 2.5],
];
const VERSE_BEATS = 30;      // طول المقطع بالنبضات
const NAME_AT = 18, NAME_LEN = 5; // نبضة بداية الاسم وطوله
const CHORDS = { 0: [60, 64, 67], 3: [60, 64, 67], 6: [55, 59, 62], 9: [55, 59, 62], 12: [60, 64, 67], 15: [60, 64, 67], 18: [53, 57, 60], 21: [53, 57, 60], 24: [53, 57, 60], 27: [60, 64, 67] };
const LINES_AT = [[2, 7], [8, 13], [14, 22], [23, 30]]; // بداية/نهاية كل سطر كلمات بالنبضات

function makeEngine() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  const music = ctx.createGain(); music.gain.value = 1; // يُخفَّض أثناء الاسم
  music.connect(comp); comp.connect(master); master.connect(ctx.destination);
  const noiseBuf = (() => { const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();

  const lead = (t, midi, len, semis = 0) => {
    const f = mtof(midi + semis);
    const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2.001;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(900, t + len * BEAT);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.015); g.gain.setValueAtTime(0.22, t + len * BEAT - 0.06); g.gain.linearRampToValueAtTime(0, t + len * BEAT);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(music);
    o1.start(t); o2.start(t); o1.stop(t + len * BEAT + .05); o2.stop(t + len * BEAT + .05);
  };
  const bass = (t, midi, len, semis = 0) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi - 12 + semis);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + len * BEAT);
    o.connect(lp); lp.connect(g); g.connect(music); o.start(t); o.stop(t + len * BEAT + .05);
  };
  const chord = (t, notes, len, semis = 0) => {
    for (const n of notes) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(n + semis);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.05); g.gain.setValueAtTime(0.06, t + len * BEAT - 0.1); g.gain.linearRampToValueAtTime(0, t + len * BEAT);
      o.connect(g); g.connect(music); o.start(t); o.stop(t + len * BEAT + .05);
    }
  };
  const kick = (t) => {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .12);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + .22);
    o.connect(g); g.connect(music); o.start(t); o.stop(t + .25);
  };
  const noise = (t, dur, hp, vol) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(music); s.start(t); s.stop(t + dur + .02);
  };
  const clap = (t) => { noise(t, .12, 1200, .5); noise(t + .02, .1, 1500, .35); };
  const hat = (t) => noise(t, .04, 7000, .18);
  const cheer = (t) => { for (let i = 0; i < 12; i++) noise(t + i * .07, .5, 800 + i * 200, .12); };

  return { ctx, music, master, lead, bass, chord, kick, clap, hat, cheer };
}

/** يجدول المقطوعة كاملة ويعيد الجدول الزمني للأحداث البصرية */
function schedule(E, t0, verses = 2) {
  const events = [];
  let t = t0;
  // مقدمة: بارَان إيقاع
  for (let b = 0; b < 6; b++) { const bt = t + b * BEAT; if (b % 3 === 0) E.kick(bt); else E.clap(bt); E.hat(bt); E.hat(bt + BEAT / 2); events.push({ t: bt, type: 'beat', strong: b % 3 === 0 }); }
  t += 2 * BAR;
  for (let v = 0; v < verses; v++) {
    const semis = v === 0 ? 0 : 2;
    const vt = t;
    E.cheer(vt - 0.05);
    for (let b = 0; b < VERSE_BEATS; b++) {
      const bt = vt + b * BEAT;
      if (b % 3 === 0) E.kick(bt); else E.clap(bt);
      E.hat(bt); E.hat(bt + BEAT / 2);
      events.push({ t: bt, type: 'beat', strong: b % 3 === 0 });
      if (CHORDS[b]) { E.chord(bt, CHORDS[b], 3, semis); E.bass(bt, CHORDS[b][0], 1.5, semis); E.bass(bt + 1.5 * BEAT, CHORDS[b][0] + 7, 1.5, semis); }
    }
    for (const [b, m, len] of MELODY) E.lead(vt + b * BEAT, m, len, semis);
    LINES_AT.forEach(([a, z], i) => events.push({ t: vt + a * BEAT, end: vt + z * BEAT, type: 'line', i }));
    events.push({ t: vt + NAME_AT * BEAT, end: vt + (NAME_AT + NAME_LEN) * BEAT, type: 'name' });
    events.push({ t: vt + 27 * BEAT, type: 'burst' });
    t += VERSE_BEATS * BEAT;
  }
  // خاتمة
  E.chord(t, [60, 64, 67, 72], 4); E.bass(t, 60, 4); E.kick(t); E.cheer(t);
  events.push({ t, type: 'burst' }, { t: t + 2.2, type: 'end' });
  return { events, end: t + 2.4 };
}

/* ---------- نطق الاسم ---------- */
async function loadNameBuffer(ctx, url) {
  try { const r = await fetch(url); const ab = await r.arrayBuffer(); return await ctx.decodeAudioData(ab); } catch { return null; }
}
function pickArabicVoice() {
  const vs = speechSynthesis.getVoices();
  const ar = vs.filter((v) => /^ar/i.test(v.lang));
  return ar.find((v) => /sa|SA/.test(v.lang)) || ar.find((v) => /google|premium|enhanced/i.test(v.name)) || ar[0] || null;
}

export function renderNamesong(gift, root) {
  pattern('none');
  const t = { ...DEFAULTS[gift.gender === 'm' ? 'm' : 'f'], ...(gift.namesong || {}) };
  const name = gift.recipient || '';
  const spoken = t.spoken || name;
  const items = gift.items || [];
  const lines = t.lines.map((l) => l.replace('{name}', name));

  /* ---------- DOM ---------- */
  const canvas = el('canvas', { class: 'ns-canvas', 'aria-hidden': 'true' });
  const sign = el('div', { class: 'ns-sign' }, [el('small', { text: t.sign }), el('strong', { text: name })]);
  const caption = el('p', { class: 'ns-caption', 'aria-live': 'polite' });
  const startBtn = el('button', { class: 'ns-start', type: 'button' }, [el('span', { class: 'ns-start__icon', html: '▶' }), el('span', { text: t.start })]);
  const startWrap = el('div', { class: 'ns-overlay' }, [el('h1', { class: 'ns-title', text: t.title }), name ? el('p', { class: 'ns-for', text: `لـ ${name}` }) : null, startBtn, el('p', { class: 'ns-hint', text: 'ارفع الصوت 🔊' })]);
  const doneBtns = el('div', { class: 'ns-done__row' });
  const done = el('div', { class: 'ns-overlay ns-overlay--done', hidden: true }, [
    el('h2', { class: 'ns-title', text: t.done.replace('{name}', name) }),
    gift.sender ? el('p', { class: 'ns-for', text: `من: ${gift.sender}` }) : null,
    doneBtns,
  ]);
  const stage = el('div', { class: 'ns-stage', 'data-theme-party': '' }, [canvas, sign, caption, startWrap, done]);
  root.append(stage);

  let hub = null;
  if (items.length) {
    hub = renderHub(gift, root, { title: gift.hubTitle || 'هداياك 🎁', mood: 'happy', onBack: () => { stage.hidden = false; running = true; loop(); } });
    doneBtns.append(el('button', { class: 'btn', type: 'button', text: t.gifts, onclick: () => { stop(); stage.hidden = true; show(hub); } }));
  }
  doneBtns.append(el('button', { class: 'btn btn--ghost', type: 'button', text: t.replay, onclick: () => play() }));

  /* ---------- الكانفس ---------- */
  const ctx2 = canvas.getContext('2d');
  let W = 0, H = 0, running = true, raf = 0;
  const resize = () => { const d = Math.min(2, devicePixelRatio || 1); W = stage.clientWidth; H = stage.clientHeight; canvas.width = W * d; canvas.height = H * d; ctx2.setTransform(d, 0, 0, d, 0, 0); };
  window.addEventListener('resize', resize); resize();

  const R = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  const balloons = Array.from({ length: 9 }, (_, i) => ({ x: R(), y: R(), sp: .02 + R() * .03, c: ['#ff6b9d', '#ffd166', '#6ee7b7', '#7dd3fc', '#c4b5fd'][i % 5], ph: R() * 6 }));
  const confetti = [];
  const chars = [
    { x: .22, cone: '#e0a15e', scoop: '#ff8fb5', top: '#fff0f4', hat: '#7dd3fc', ph: 0 },
    { x: .5, cone: '#d98f4a', scoop: '#8b5cf6', top: '#c4b5fd', hat: '#ffd166', ph: .5, big: true },
    { x: .78, cone: '#e0a15e', scoop: '#6ee7b7', top: '#ffffff', hat: '#ff6b9d', ph: 1 },
  ];
  let beatPhase = 0, lastBeat = 0, strongBeat = false, nameOn = false, timeline = null, startAt = 0;
  let E = null, nameBuf = null, nameSource = null;

  function burst(n = 120) {
    for (let i = 0; i < n; i++) confetti.push({ x: W * (0.2 + R() * 0.6), y: H * 0.35, vx: (R() - .5) * 420, vy: -300 - R() * 380, r: 3 + R() * 5, c: ['#ff6b9d', '#ffd166', '#6ee7b7', '#7dd3fc', '#c4b5fd', '#fff'][i % 6], rot: R() * 6, vr: (R() - .5) * 10, life: 2.2 + R() });
  }
  function drawChar(c, time, energy) {
    const s = Math.min(W, H) * (c.big ? 0.19 : 0.15);
    const bounce = Math.abs(Math.sin((beatPhase + c.ph) * Math.PI)) * s * 0.18 * energy;
    const sq = 1 + Math.sin((beatPhase + c.ph) * Math.PI * 2) * 0.06 * energy;
    const x = W * c.x, base = H * 0.78;
    ctx2.save(); ctx2.translate(x, base - bounce); ctx2.scale(1 / sq, sq);
    // الظل
    ctx2.fillStyle = 'rgba(0,0,0,.18)'; ctx2.beginPath(); ctx2.ellipse(0, bounce + 4, s * 0.45, s * 0.1, 0, 0, Math.PI * 2); ctx2.fill();
    // المخروط
    ctx2.fillStyle = c.cone; ctx2.beginPath(); ctx2.moveTo(-s * 0.42, -s * 0.9); ctx2.lineTo(s * 0.42, -s * 0.9); ctx2.lineTo(0, 0); ctx2.closePath(); ctx2.fill();
    ctx2.strokeStyle = 'rgba(120,70,20,.35)'; ctx2.lineWidth = 2;
    for (let i = 1; i < 4; i++) { ctx2.beginPath(); ctx2.moveTo(-s * 0.42 + i * s * 0.21, -s * 0.9); ctx2.lineTo(0 - (i - 2) * s * 0.02, 0); ctx2.stroke(); }
    // الذراعان
    const arm = Math.sin(time * 9 + c.ph) * 0.6 * energy;
    ctx2.strokeStyle = '#4a2a1f'; ctx2.lineWidth = Math.max(3, s * 0.05); ctx2.lineCap = 'round';
    ctx2.beginPath(); ctx2.moveTo(-s * 0.3, -s * 0.75); ctx2.lineTo(-s * 0.62, -s * (1.1 + arm * 0.35)); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(s * 0.3, -s * 0.75); ctx2.lineTo(s * 0.62, -s * (1.1 - arm * 0.35)); ctx2.stroke();
    // الكرات
    const scoop = (y, r, col) => { ctx2.fillStyle = col; ctx2.beginPath(); ctx2.arc(0, y, r, 0, Math.PI * 2); ctx2.fill(); ctx2.fillStyle = 'rgba(255,255,255,.35)'; ctx2.beginPath(); ctx2.arc(-r * 0.35, y - r * 0.35, r * 0.28, 0, Math.PI * 2); ctx2.fill(); };
    scoop(-s * 1.15, s * 0.5, c.scoop); scoop(-s * 1.75, s * 0.4, c.top);
    // الوجه
    ctx2.fillStyle = '#2b1a14'; ctx2.beginPath(); ctx2.arc(-s * 0.17, -s * 1.2, s * 0.05, 0, Math.PI * 2); ctx2.arc(s * 0.17, -s * 1.2, s * 0.05, 0, Math.PI * 2); ctx2.fill();
    ctx2.strokeStyle = '#2b1a14'; ctx2.lineWidth = Math.max(2, s * 0.035); ctx2.beginPath(); ctx2.arc(0, -s * 1.08, s * 0.14, 0.15 * Math.PI, 0.85 * Math.PI); ctx2.stroke();
    ctx2.fillStyle = 'rgba(255,120,150,.45)'; ctx2.beginPath(); ctx2.arc(-s * 0.3, -s * 1.05, s * 0.07, 0, Math.PI * 2); ctx2.arc(s * 0.3, -s * 1.05, s * 0.07, 0, Math.PI * 2); ctx2.fill();
    // القبعة
    ctx2.fillStyle = c.hat; ctx2.beginPath(); ctx2.moveTo(-s * 0.22, -s * 2.05); ctx2.lineTo(s * 0.22, -s * 2.05); ctx2.lineTo(0, -s * 2.6); ctx2.closePath(); ctx2.fill();
    ctx2.fillStyle = '#fff'; ctx2.beginPath(); ctx2.arc(0, -s * 2.6, s * 0.07, 0, Math.PI * 2); ctx2.fill();
    ctx2.restore();
  }
  function draw(time, dt) {
    const energy = timeline ? 1 : 0.35;
    // الخلفية
    const g = ctx2.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b1442'); g.addColorStop(0.6, '#3b1f5e'); g.addColorStop(1, '#6d2a63');
    ctx2.fillStyle = g; ctx2.fillRect(0, 0, W, H);
    // أضواء الديسكو
    for (let i = 0; i < 4; i++) {
      const a = time * (0.6 + i * 0.15) + i * 1.7, x = W * 0.5 + Math.cos(a) * W * 0.45;
      const lg = ctx2.createLinearGradient(W * 0.5, 0, x, H); lg.addColorStop(0, ['rgba(255,107,157,.28)', 'rgba(255,209,102,.24)', 'rgba(110,231,183,.22)', 'rgba(125,211,252,.24)'][i]); lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx2.fillStyle = lg; ctx2.beginPath(); ctx2.moveTo(W * 0.5 - 30, -10); ctx2.lineTo(W * 0.5 + 30, -10); ctx2.lineTo(x + W * 0.12, H); ctx2.lineTo(x - W * 0.12, H); ctx2.closePath(); ctx2.fill();
    }
    // نبضة على الإيقاع
    if (strongBeat && time - lastBeat < 0.12) { ctx2.fillStyle = `rgba(255,255,255,${0.14 * (1 - (time - lastBeat) / 0.12)})`; ctx2.fillRect(0, 0, W, H); }
    // البالونات
    for (const b of balloons) {
      const by = ((b.y - time * b.sp) % 1 + 1) % 1, y = H * (1.1 - by * 1.2), x = W * b.x + Math.sin(time + b.ph) * 14, r = Math.min(W, H) * 0.035;
      ctx2.strokeStyle = 'rgba(255,255,255,.35)'; ctx2.lineWidth = 1; ctx2.beginPath(); ctx2.moveTo(x, y + r); ctx2.quadraticCurveTo(x + 6, y + r * 2.2, x - 4, y + r * 3.4); ctx2.stroke();
      ctx2.fillStyle = b.c; ctx2.beginPath(); ctx2.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2); ctx2.fill();
      ctx2.fillStyle = 'rgba(255,255,255,.4)'; ctx2.beginPath(); ctx2.ellipse(x - r * 0.3, y - r * 0.35, r * 0.2, r * 0.3, -0.5, 0, Math.PI * 2); ctx2.fill();
    }
    // المسرح
    const fl = ctx2.createLinearGradient(0, H * 0.78, 0, H); fl.addColorStop(0, '#2a1a3f'); fl.addColorStop(1, '#120b22');
    ctx2.fillStyle = fl; ctx2.fillRect(0, H * 0.78, W, H * 0.22);
    ctx2.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 12; i++) ctx2.fillRect((i / 12) * W, H * 0.78, W / 24, H * 0.22);
    // الشخصيات
    for (const c of chars) drawChar(c, time, energy);
    // القصاصات
    for (const p of confetti) {
      p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt; p.vx *= 0.995;
      ctx2.save(); ctx2.globalAlpha = Math.min(1, p.life); ctx2.translate(p.x, p.y); ctx2.rotate(p.rot); ctx2.fillStyle = p.c; ctx2.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); ctx2.restore();
    }
    for (let i = confetti.length - 1; i >= 0; i--) if (confetti[i].life <= 0 || confetti[i].y > H + 20) confetti.splice(i, 1);
  }

  /* ---------- الحلقة والجدول ---------- */
  let last = performance.now(), evIndex = 0, currentLine = null;
  function loop() {
    if (!running) return;
    const nowMs = performance.now(); const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
    const time = nowMs / 1000;
    if (timeline && E) {
      const at = E.ctx.currentTime;
      beatPhase = ((at - startAt) / BEAT) % 1;
      while (timeline && evIndex < timeline.events.length && timeline.events[evIndex].t <= at + 0.02) {
        const ev = timeline.events[evIndex++];
        if (ev.type === 'beat') { lastBeat = time; strongBeat = ev.strong; if (ev.strong) burst(3); }
        else if (ev.type === 'line') { currentLine = ev; caption.textContent = lines[ev.i]; caption.classList.remove('is-in'); void caption.offsetWidth; caption.classList.add('is-in'); }
        else if (ev.type === 'name') { sayName(ev); }
        else if (ev.type === 'burst') burst(160);
        else if (ev.type === 'end') finish();
      }
      if (timeline && currentLine) caption.style.setProperty('--p', `${Math.min(1, Math.max(0, (at - currentLine.t) / (currentLine.end - currentLine.t))) * 100}%`);
    } else beatPhase = (time * 1.2) % 1;
    draw(time, dt);
    raf = requestAnimationFrame(loop);
  }

  function sayName(ev) {
    nameOn = true;
    sign.classList.add('is-name'); setTimeout(() => sign.classList.remove('is-name'), (ev.end - ev.t) * 1000);
    burst(60);
    // إخفاض الموسيقى
    const g = E.music.gain; g.cancelScheduledValues(ev.t); g.setValueAtTime(g.value, ev.t); g.linearRampToValueAtTime(0.35, ev.t + 0.08); g.setValueAtTime(0.35, ev.end - 0.15); g.linearRampToValueAtTime(1, ev.end);
    if (nameBuf) {
      const s = E.ctx.createBufferSource(); s.buffer = nameBuf; const vg = E.ctx.createGain(); vg.gain.value = 1.4; s.connect(vg); vg.connect(E.master); s.start(ev.t + 0.05);
    } else if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(spoken); u.lang = 'ar-SA'; u.rate = 0.92; u.pitch = 1.1; u.volume = 1;
      const v = pickArabicVoice(); if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    }
  }

  async function play() {
    done.hidden = true; startWrap.hidden = true; confetti.length = 0;
    if (!E) E = makeEngine();
    if (E.ctx.state === 'suspended') await E.ctx.resume();
    if (t.nameAudio && !nameBuf) nameBuf = await loadNameBuffer(E.ctx, t.nameAudio);
    if (!nameBuf && 'speechSynthesis' in window) { speechSynthesis.getVoices(); }
    startAt = E.ctx.currentTime + 0.15;
    timeline = schedule(E, startAt, 2); evIndex = 0; currentLine = null;
    caption.textContent = ''; sign.classList.add('is-in');
  }
  function finish() { timeline = null; currentLine = null; caption.textContent = ''; done.hidden = false; }
  function stop() { running = false; cancelAnimationFrame(raf); try { E?.ctx.suspend(); } catch {} if ('speechSynthesis' in window) speechSynthesis.cancel(); }

  startBtn.addEventListener('click', play);
  stage.__debug = () => ({ audio: E?.ctx.state, at: E?.ctx.currentTime, startAt, evIndex, events: timeline?.events.length, running });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); E?.ctx.suspend(); } else if (!stage.hidden) { running = true; last = performance.now(); E?.ctx.resume(); loop(); } });
  loop();
}

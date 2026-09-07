/* مركز الهدايا + شاشات كل هدية (صور، أغنية، رسالة، فيديو) */
import { el, sticker, icons, screen, show, backButton, pattern, youtubeId, esc } from '../ui.js';

const POS = [
  ['-78px', '-92px', '-8deg'], ['82px', '-72px', '7deg'], ['-72px', '58px', '5deg'],
  ['84px', '80px', '-6deg'], ['0px', '-8px', '2deg'], ['4px', '118px', '-3deg'],
  ['-90px', '-10px', '-12deg'], ['92px', '6px', '11deg'],
];

export function renderHub(gift, root, { title, mood = 'love', src, onBack = null } = {}) {
  const items = gift.items || [];
  const hub = screen('screen--hub');
  hub.append(
    sticker(mood, { src: src ?? gift.sticker }),
    el('h1', { class: 'screen__title', text: title || gift.hubTitle || 'اختار هديتك 🎁' }),
  );
  if (gift.hubSub) hub.append(el('p', { class: 'screen__sub', text: gift.hubSub }));

  const grid = el('div', { class: 'hub' });
  const screens = items.map((item, i) => buildItemScreen(item, i, gift, () => { pattern(gift.pattern); show(hub); }));
  items.forEach((item, i) => {
    const box = el('button', { class: 'giftbox', type: 'button', html: icons.gift });
    box.append(el('span', { text: item.label || `هدية ${i + 1}` }));
    box.addEventListener('click', () => {
      box.classList.add('is-opened');
      screens[i].onEnter?.();
      show(screens[i]);
    });
    grid.append(box);
  });
  hub.append(grid);
  if (onBack) hub.append(backButton('رجوع', onBack));
  root.append(hub, ...screens);
  return hub;
}

export function buildItemScreen(item, i, gift, back) {
  const kind = item.type;
  const s = screen(`screen--${kind}`);
  const backLabel = 'رجوع للهدايا';

  if (kind === 'photos') {
    s.append(el('h2', { class: 'screen__title', text: item.title || 'لحظات محفوظة' }));
    const wrap = el('div', { class: 'polaroids' });
    const photos = (item.photos || []).slice(0, 8);
    photos.forEach((p, idx) => {
      const [x, y, rot] = POS[idx % POS.length];
      const fig = el('figure', { class: 'polaroid', style: { '--x': x, '--y': y, '--rot': rot, zIndex: idx + 1, margin: 0 }, tabindex: 0, role: 'button', 'aria-label': p.caption || `صورة ${idx + 1}` });
      fig.append(el('img', { src: p.src, alt: p.caption || '', loading: 'lazy' }), el('figcaption', { text: p.caption || '' }));
      const open = () => openLightbox(p);
      fig.addEventListener('click', open);
      fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      wrap.append(fig);
    });
    if (!photos.length) wrap.append(el('p', { class: 'screen__hint', text: 'ما في صور مضافة بعد.' }));
    s.append(wrap, el('p', { class: 'screen__hint', text: 'اضغط على أي صورة لتكبيرها' }), backButton(backLabel, back));
    s.onEnter = () => { wrap.classList.remove('is-spread'); setTimeout(() => wrap.classList.add('is-spread'), 350); };
  }

  else if (kind === 'song') {
    s.append(el('h2', { class: 'screen__title', text: item.title || 'أغنية تذكّرني فيك' }));
    const vinyl = el('div', { class: 'vinyl', 'aria-hidden': 'true' });
    const media = el('div', { class: 'player__media' });
    const yt = youtubeId(item.youtube || '');
    let audio = null;
    if (yt) {
      media.append(el('iframe', {
        src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&playsinline=1`,
        title: item.name || 'أغنية', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture', allowfullscreen: true, loading: 'lazy',
      }));
      s.onEnter = () => vinyl.classList.add('is-playing');
    } else if (item.audio) {
      audio = new Audio(item.audio);
      audio.preload = 'metadata';
      const play = el('button', { class: 'player__play', type: 'button', html: icons.play, 'aria-label': 'تشغيل' });
      const fill = el('span');
      const bar = el('div', { class: 'player__bar' }, fill);
      const meta = el('div', { class: 'player__meta' }, [el('strong', { text: item.name || 'أغنيتنا' }), item.artist ? el('small', { text: item.artist }) : null]);
      play.addEventListener('click', () => { audio.paused ? audio.play() : audio.pause(); });
      audio.addEventListener('play', () => { play.innerHTML = icons.pause; play.setAttribute('aria-label', 'إيقاف'); vinyl.classList.add('is-playing'); });
      audio.addEventListener('pause', () => { play.innerHTML = icons.play; play.setAttribute('aria-label', 'تشغيل'); vinyl.classList.remove('is-playing'); });
      audio.addEventListener('timeupdate', () => { if (audio.duration) fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`; });
      audio.addEventListener('error', () => { meta.append(el('small', { text: 'تعذّر تحميل الملف الصوتي', style: { display: 'block', color: '#b3123f' } })); });
      bar.addEventListener('click', (e) => { const r = bar.getBoundingClientRect(); const ratio = 1 - (e.clientX - r.left) / r.width; if (audio.duration) audio.currentTime = ratio * audio.duration; });
      media.append(el('div', { class: 'player__audio' }, [play, el('div', { style: { flex: 1, display: 'grid', gap: '6px' } }, [meta, bar])]));
    } else {
      media.append(el('p', { class: 'screen__hint', style: { padding: '16px' }, text: 'ما في أغنية مضافة.' }));
    }
    s.append(el('div', { class: 'player' }, [vinyl, media]));
    if (item.note) s.append(el('p', { class: 'screen__sub', text: item.note }));
    s.append(backButton(backLabel, () => { audio?.pause(); vinyl.classList.remove('is-playing'); back(); }));
  }

  else if (kind === 'letter') {
    const body = el('div', { class: 'letter__body', 'aria-live': 'polite' });
    const paper = el('article', { class: 'letter' }, [
      el('p', { class: 'letter__to', text: item.to || (gift.recipient ? `إلى ${gift.recipient}،` : 'إليك،') }),
      body,
      item.from || gift.sender ? el('p', { class: 'letter__from', text: item.from || `— ${gift.sender}` }) : null,
    ]);
    s.append(el('div', { class: 'letter-wrap' }, paper));
    if (item.ps) s.append(el('p', { class: 'screen__hint', text: item.ps }));
    s.append(backButton(backLabel, back));
    let timer;
    s.onEnter = () => {
      pattern(item.pattern || gift.pattern || 'hearts');
      clearInterval(timer);
      const text = item.body || '';
      if (item.typewriter === false) { body.textContent = text; return; }
      body.textContent = '';
      const cur = el('span', { class: 'cursor', 'aria-hidden': 'true' });
      body.append(cur);
      const total = Math.min(7000, Math.max(1200, text.length * 28));
      const step = Math.max(1, Math.round(text.length / (total / 30)));
      let i = 0;
      timer = setInterval(() => {
        i = Math.min(text.length, i + step);
        body.textContent = text.slice(0, i);
        if (i >= text.length) clearInterval(timer); else body.append(cur);
      }, 30);
      paper.addEventListener('click', () => { clearInterval(timer); body.textContent = text; }, { once: true });
    };
  }

  else if (kind === 'video') {
    s.append(el('h2', { class: 'screen__title', text: item.title || 'فيديو لك' }));
    const card = el('div', { class: `video-card${item.portrait ? ' video-card--portrait' : ''}` });
    const yt = youtubeId(item.youtube || '');
    if (yt) card.append(el('iframe', { src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&playsinline=1`, title: item.title || 'فيديو', allow: 'autoplay; encrypted-media; picture-in-picture', allowfullscreen: true, loading: 'lazy' }));
    else if (item.src) card.append(el('video', { src: item.src, controls: true, playsinline: true, preload: 'metadata' }));
    else card.append(el('p', { class: 'screen__hint', style: { padding: '16px' }, text: 'ما في فيديو مضاف.' }));
    s.append(card);
    if (item.note) s.append(el('p', { class: 'screen__sub', text: item.note }));
    s.append(backButton(backLabel, () => { card.querySelector('video')?.pause(); back(); }));
  }

  else {
    s.append(el('h2', { class: 'screen__title', text: item.title || 'هدية' }), el('p', { class: 'screen__sub', text: item.body || '' }), backButton(backLabel, back));
  }
  return s;
}

/* ---------- تكبير الصورة ---------- */
let lb;
function openLightbox(p) {
  if (!lb) {
    lb = el('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true' });
    lb.addEventListener('click', () => lb.classList.remove('is-open'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.classList.remove('is-open'); });
    document.body.append(lb);
  }
  lb.innerHTML = `<figure><img src="${esc(p.src)}" alt="${esc(p.caption || '')}"><figcaption>${esc(p.caption || '')}</figcaption></figure>`;
  lb.classList.add('is-open');
}

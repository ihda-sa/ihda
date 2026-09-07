/* كرت «رسالة كل يوم» — كل رسالة مرتبطة بيوم من الشهر ولا تنفتح قبله */
import { el, sticker, icons, screen, show, toast, pattern, fmtDate } from '../ui.js';

const DAY = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** تاريخ فتح الرسالة رقم n (يبدأ من 1) */
function unlockDate(cfg, n, today) {
  if (cfg.mode === 'sequential' && cfg.startDate) {
    const [y, m, d] = cfg.startDate.split('-').map(Number);
    return new Date(y, m - 1, d + (n - 1));
  }
  if (cfg.month) { // شهر محدد: 2026-09 → اليوم n من ذاك الشهر
    const [y, m] = cfg.month.split('-').map(Number);
    return new Date(y, m - 1, n);
  }
  // الوضع الافتراضي: يوم n من الشهر الحالي (في شهر 30 يومًا تنفتح رسالة 31 مع آخر يوم)
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return new Date(today.getFullYear(), today.getMonth(), Math.min(n, last));
}

export function renderDaily(gift, root) {
  pattern(gift.pattern);
  const cfg = gift.daily || {};
  const days = cfg.days || [];
  const readKey = `ihda:read:${gift.id || 'x'}`;
  let read = new Set();
  try { read = new Set(JSON.parse(localStorage.getItem(readKey) || '[]')); } catch {}

  /* --- الغلاف --- */
  const cover = screen('screen--cover');
  const openBtn = el('button', { class: 'btn', type: 'button', text: cfg.openLabel || 'افتح الرسائل 💌' });
  cover.append(
    sticker('love', { src: gift.sticker }),
    el('div', { class: 'envelope' }, [
      el('h1', { class: 'screen__title', text: cfg.title || 'رسالة كل يوم 💌' }),
      gift.recipient ? el('p', { class: 'screen__sub', text: `لـ ${gift.recipient}` }) : null,
      el('p', { class: 'screen__hint', text: cfg.intro || 'كل يوم تنفتح لك رسالة جديدة. رسالة اليوم جاهزة… والباقي ينتظر يومه.' }),
      openBtn,
      gift.sender ? el('p', { class: 'envelope__from', text: `من: ${gift.sender}` }) : null,
    ]),
  );

  /* --- الشبكة --- */
  const grid = el('div', { class: 'days', role: 'list' });
  const countdown = el('div', { class: 'countdown' });
  const board = screen('screen--days', [
    el('h2', { class: 'screen__title', text: cfg.title || 'رسالة كل يوم 💌' }),
    el('div', { class: 'days-legend', html: `<span><i style="background:var(--brand)"></i>اليوم</span><span><i style="background:var(--surface);box-shadow:var(--shadow-sm)"></i>مفتوحة</span><span><i style="background:var(--surface-2);border:1px solid var(--line)"></i>مقفلة</span>` }),
    grid, countdown,
  ]);

  /* --- النافذة --- */
  const modalCard = el('div', { class: 'modal__card', role: 'dialog', 'aria-modal': 'true' });
  const modal = el('div', { class: 'modal' }, modalCard);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('is-open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('is-open'); });
  document.body.append(modal);

  function openDay(n, msg) {
    modalCard.replaceChildren(el('div', {}, [
      el('button', { class: 'modal__close', type: 'button', html: icons.close, 'aria-label': 'إغلاق', onclick: () => modal.classList.remove('is-open') }),
      el('p', { class: 'modal__day', text: `رسالة يوم ${n}` }),
      el('h3', { class: 'modal__title', text: msg.title || `اليوم ${n}` }),
      el('p', { class: 'modal__body', text: msg.text || '' }),
      msg.image ? el('img', { class: 'modal__img', src: msg.image, alt: msg.title || '', loading: 'lazy' }) : null,
      msg.link ? el('a', { class: 'modal__link', href: msg.link, target: '_blank', rel: 'noopener noreferrer', text: msg.linkLabel || 'افتح الرابط ↗' }) : null,
    ]));
    modal.classList.add('is-open');
    read.add(n);
    try { localStorage.setItem(readKey, JSON.stringify([...read])); } catch {}
    render();
  }

  let tick;
  function render() {
    const today = startOfDay(new Date());
    grid.innerHTML = '';
    let nextUnlock = null;
    days.forEach((msg, idx) => {
      const n = idx + 1;
      const when = unlockDate(cfg, n, today);
      const open = today >= when;
      const isToday = today.getTime() === when.getTime();
      if (!open && (!nextUnlock || when < nextUnlock)) nextUnlock = when;
      const cell = el('button', {
        class: `day${open ? '' : ' day--locked'}${isToday ? ' day--today' : ''}${read.has(n) ? ' day--read' : ''}`,
        type: 'button', role: 'listitem',
        'aria-label': open ? `رسالة يوم ${n}` : `رسالة يوم ${n} مقفلة، تنفتح ${fmtDate(when)}`,
      }, [String(n), open ? null : el('span', { html: icons.lock })]);
      cell.addEventListener('click', () => {
        if (open) { openDay(n, msg); return; }
        cell.classList.remove('is-shake'); void cell.offsetWidth; cell.classList.add('is-shake');
        const left = Math.ceil((when - today) / DAY);
        toast(left === 1 ? `هذي الرسالة تنفتح غدًا ${fmtDate(when)} 🔒` : `هذي الرسالة تنفتح يوم ${fmtDate(when)} · باقي ${left} يوم 🔒`);
      });
      grid.append(cell);
    });
    if (!days.length) grid.append(el('p', { class: 'screen__hint', text: 'ما في رسائل مضافة بعد.' }));

    clearInterval(tick);
    if (nextUnlock) {
      const update = () => {
        const ms = nextUnlock - new Date();
        const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
        const dd = Math.floor(h / 24);
        countdown.innerHTML = dd >= 1
          ? `الرسالة التالية بعد <strong>${dd}</strong> يوم و <strong>${h % 24}</strong> ساعة`
          : `الرسالة التالية بعد <strong>${h}</strong> ساعة و <strong>${m}</strong> دقيقة`;
        if (ms <= 0) render();
      };
      update();
      tick = setInterval(update, 30000);
    } else {
      countdown.textContent = days.length ? 'كل الرسائل انفتحت 🎉 ارجع لها وقت ما تشتاق.' : '';
    }
  }

  openBtn.addEventListener('click', () => { render(); show(board); });
  root.append(cover, board);
  show(cover);
}

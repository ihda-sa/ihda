/* كرت «تحبني؟» — السؤال، زر «لا» اللي يصغر ويهرب، ثم مركز الهدايا */
import { el, sticker, setMood, screen, show, hearts, pattern } from '../ui.js';
import { renderHub } from './hub.js';

const DEFAULTS = {
  f: {
    question: 'تحبيني؟ 💗',
    yes: 'نعم 💕',
    no: 'لا',
    hubTitle: 'كنت أعرف إنك بتقولين نعم 💕',
    steps: ['استني… متأكدة؟ 🥺', 'لا لا، هذا مو صح…', 'جرّبي مرة ثانية 😤', 'خلاص كوني جدّية شوي…', 'الحين صرتي تلعبين…', 'طيب… آخر فرصة'],
  },
  m: {
    question: 'تحبني؟ 💗',
    yes: 'نعم 💕',
    no: 'لا',
    hubTitle: 'كنت أعرف إنك بتقول نعم 💕',
    steps: ['استنى… متأكد؟ 🥺', 'لا لا، هذا مو صح…', 'جرّب مرة ثانية 😤', 'خلاص كن جدّي شوي…', 'الحين صرت تلعب…', 'طيب… آخر فرصة'],
  },
};
const MOODS = ['think', 'sad', 'angry', 'think', 'angry', 'sad'];

export function renderLove(gift, root) {
  pattern(gift.pattern);
  const t = { ...DEFAULTS[gift.gender === 'm' ? 'm' : 'f'], ...(gift.ask || {}) };
  const steps = t.steps;

  // بعد «نعم» تظهر القطة المتحركة (assets/yes-cat.gif) إلا إذا حُدِّدت صورة أخرى للإهداء
  const hub = renderHub(gift, root, { title: t.hubTitle, mood: 'love', src: gift.stickerYes || 'assets/yes-cat.gif' });

  if (gift.ask === false) { show(hub); return; }

  const stk = sticker('shy', { src: gift.sticker });
  const q = el('h1', { class: 'ask__q', text: t.question });
  const yes = el('button', { class: 'btn btn--yes', type: 'button', text: t.yes });
  const no = el('button', { class: 'btn btn--no', type: 'button', text: t.no });
  const row = el('div', { class: 'ask__row' }, [yes, no]);
  const ask = screen('screen--ask', [stk, q, row, gift.recipient ? el('p', { class: 'screen__hint', text: `إهداء لـ ${gift.recipient}` }) : null]);

  let step = 0;
  no.addEventListener('click', () => {
    step++;
    const i = Math.min(step, steps.length) - 1;
    q.textContent = steps[i];
    setMood(stk, MOODS[i % MOODS.length]);
    yes.style.setProperty('--yes-scale', String(1 + step * 0.32));
    no.style.setProperty('--no-scale', String(Math.max(0.35, 1 - step * 0.14)));
    if (step >= steps.length) {
      no.classList.add('is-gone');
      no.setAttribute('aria-hidden', 'true');
      no.tabIndex = -1;
    }
  });

  yes.addEventListener('click', () => {
    hearts();
    setMood(stk, 'love');
    yes.disabled = true;
    setTimeout(() => show(hub), 650);
  });

  root.prepend(ask);
  show(ask);
}

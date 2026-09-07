/* كرت الإهداء الخاص — لا يُفتح إلا بكلمة السر، والمحتوى مشفّر فعليًا */
import { el, sticker, setMood, icons, screen, show, hearts, pattern } from '../ui.js';
import { decryptJSON } from '../crypto.js';

export function renderSecret(gift, root, renderInner) {
  pattern(gift.pattern);
  const cfg = gift.secret || {};
  const numeric = cfg.numeric !== false;

  const stk = sticker('think', { src: gift.sticker });
  const input = el('input', {
    class: 'lock__input', id: 'pw', type: numeric ? 'tel' : 'text', inputmode: numeric ? 'numeric' : 'text',
    autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', dir: 'auto',
    placeholder: numeric ? '• • • •' : '',
    'aria-describedby': 'pwErr',
  });
  const err = el('p', { class: 'lock__err', id: 'pwErr', role: 'alert' });
  const btn = el('button', { class: 'btn', type: 'submit', text: cfg.button || 'افتح الإهداء' });
  const form = el('form', { class: 'lock', novalidate: true }, [
    el('label', { for: 'pw', text: cfg.label || (numeric ? 'أدخل الرقم السري' : 'أدخل كلمة السر') }),
    input, err, btn,
    cfg.hint ? el('p', { class: 'lock__hint', text: `تلميح: ${cfg.hint}` }) : null,
  ]);

  const lock = screen('screen--lock', [
    stk,
    el('h1', { class: 'screen__title', html: `${icons.lock.replace('<svg', '<svg style="display:inline-block;width:26px;height:26px;vertical-align:-4px;margin-inline-end:8px"')}${cfg.title || 'هذا الإهداء خاص'}` }),
    el('p', { class: 'screen__sub', text: cfg.intro || (gift.recipient ? `مقفل لـ ${gift.recipient} فقط. تعرفين كلمة السر؟` : 'ما يفتحه إلا اللي يعرف كلمة السر.') }),
    form,
  ]);

  let attempts = 0;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = input.value.trim();
    if (!pw) { err.textContent = 'اكتب كلمة السر أول.'; return; }
    btn.disabled = true; btn.textContent = 'نفتح…';
    try {
      const inner = await decryptJSON(gift.payload, pw);
      err.textContent = '';
      setMood(stk, 'love');
      hearts(18);
      setTimeout(() => {
        lock.remove();
        renderInner({ ...inner, id: gift.id, recipient: inner.recipient ?? gift.recipient, sender: inner.sender ?? gift.sender, sticker: inner.sticker ?? gift.sticker, theme: inner.theme ?? gift.theme });
      }, 500);
    } catch {
      attempts++;
      form.classList.remove('is-error'); void form.offsetWidth; form.classList.add('is-error');
      setMood(stk, attempts >= 3 ? 'angry' : 'sad');
      err.textContent = attempts >= 3 ? 'مو صح… فكّر في التلميح 🤔' : 'كلمة السر غلط، جرّب مرة ثانية.';
      input.select();
      btn.disabled = false; btn.textContent = cfg.button || 'افتح الإهداء';
    }
  });

  root.append(lock);
  show(lock);
  setTimeout(() => input.focus(), 400);
}

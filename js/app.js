/* نقطة الدخول: يقرأ معرّف الإهداء من الرابط، يحمّل ملفه، ويشغّل الكرت المناسب */
import { el, icons, sticker, show, pattern } from './ui.js';
import { renderLove } from './flows/love.js';
import { renderHub, buildItemScreen } from './flows/hub.js';
import { renderDaily } from './flows/daily.js';
import { renderSecret } from './flows/secret.js';
import { renderArrow } from './flows/arrow.js';
import { renderNamesong } from './flows/namesong.js';
import { openJSON } from './crypto.js';

const app = document.getElementById('app');
const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function getId() {
  const q = new URLSearchParams(location.search).get('g');
  return q ? q.trim() : null;
}

/** مفتاح فك التشفير يعيش بعد # في الرابط، والمتصفح لا يرسله للخادم أبدًا */
function getKey() {
  const h = location.hash.replace(/^#/, '');
  if (!h) return null;
  const k = new URLSearchParams(h).get('k');
  return k ? k.trim() : null;
}

function applyTheme(gift) {
  if (gift.theme) document.documentElement.dataset.theme = gift.theme;
  const c = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (c) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c);
  document.title = gift.title || (gift.recipient ? `إهداء لـ ${gift.recipient} 🎁` : 'لك إهداء خاص 🎁');
}

/** يوزّع الإهداء على الكرت المناسب حسب نوعه */
export function renderGift(gift, root) {
  applyTheme(gift);
  root.innerHTML = '';
  switch (gift.type) {
    case 'love': return renderLove(gift, root);
    case 'daily': return renderDaily(gift, root);
    case 'arrow': return renderArrow(gift, root);
    case 'namesong': return renderNamesong(gift, root);
    case 'secret': return renderSecret(gift, root, (inner) => renderGift(inner, root));
    case 'letter': {
      pattern(gift.pattern || 'hearts');
      const item = { type: 'letter', ...(gift.letter || {}) };
      const s = buildItemScreen(item, 0, gift, () => {});
      s.querySelector('.backrow')?.remove();
      root.append(s); s.onEnter?.(); show(s);
      return;
    }
    case 'gifts':
    default: {
      const hub = renderHub(gift, root, { title: gift.hubTitle || 'لك هدايا 🎁', mood: 'happy' });
      show(hub);
    }
  }
}

function renderState(title, body, extra = null) {
  app.innerHTML = '';
  app.append(el('div', { class: 'state' }, [
    sticker('sad'),
    el('h1', { class: 'state__title', text: title }),
    el('p', { class: 'screen__sub', text: body }),
    extra,
  ]));
}

function renderLanding() {
  document.title = 'إهداء — إهداءات رقمية تفاعلية';
  app.innerHTML = '';
  const card = (href, icon, h, p, cta) => el('a', { class: 'card', href }, [
    el('span', { class: 'card__icon', html: icon }), el('h3', { text: h }), el('p', { text: p }), el('span', { class: 'card__cta', text: cta }),
  ]);
  app.append(el('div', { class: 'landing' }, [
    el('h1', { class: 'landing__title', html: 'هدية ما تُنسى…<br>برابط <em>خاص</em> لشخص واحد' }),
    el('p', { class: 'landing__lead', text: 'إهداءات رقمية تفاعلية تُصنع لكل زبون على حدة، برابط دائم لا يختفي. جرّب النماذج الثلاثة:' }),
    el('div', { class: 'cards' }, [
      card('?g=demo-love', icons.heart, 'تحبني؟', 'سؤال لطيف وزر «لا» يهرب، ثم ثلاث هدايا: صور، أغنية، ورسالة.', 'شاهد النموذج ←'),
      card('?g=demo-daily', icons.calendar, 'رسالة كل يوم', 'رسالة لكل يوم من الشهر. رسالة اليوم تنفتح، والباقي مقفل ليومه.', 'شاهد النموذج ←'),
      card('?g=demo-secret', icons.lock, 'إهداء برقم سري', 'محتوى مشفّر لا يفتحه إلا من يعرف الرقم السري. (النموذج: 1234)', 'شاهد النموذج ←'),
      card('?g=demo-arrow', icons.gift, 'سهم الحب', 'سهم يفرقع بالون القلب، تهنئة وردية بوميض ذهبي، ثم شجرة تزهر بشكل قلب.', 'شاهد النموذج ←'),
      card('?g=demo-namesong', icons.play, 'أغنية باسمك', 'حفلة متحركة وأغنية عيد ميلاد يُنطق فيها اسم المستلم بوضوح.', 'شاهد النموذج ←'),
    ]),
    el('ol', { class: 'landing__steps' }, [
      el('li', { text: 'تختار نوع الكرت وترسل الصور والكلام.' }),
      el('li', { text: 'نجهّز لك رابطًا خاصًا ورمز QR يخصّك وحدك.' }),
      el('li', { text: 'ترسله لمن تحب… ويظل الرابط شغّالًا دائمًا.' }),
    ]),
  ]));
}

/** ملصق افتراضي لكل الإهداءات: يُحدَّد في index.html عبر <meta name="default-sticker" content="assets/sticker.gif"> */
const defaultSticker = () => document.querySelector('meta[name="default-sticker"]')?.content?.trim() || null;

async function boot() {
  const id = getId();
  if (!id) return renderLanding();

  let gift;
  try {
    if (id === 'preview') {
      const raw = localStorage.getItem('ihda:preview');
      if (!raw) throw new Error('no-preview');
      gift = JSON.parse(raw);
    } else {
      if (!ID_RE.test(id)) throw new Error('bad-id');
      const res = await fetch(`gifts/${encodeURIComponent(id)}.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      gift = await res.json();
    }
  } catch (e) {
    return renderState(
      'ما وجدنا هذا الإهداء',
      'تأكد من الرابط كما وصلك بالضبط. إذا كان الرابط صحيحًا فربما لم يُنشر بعد.',
      el('p', { class: 'screen__hint', html: `المعرّف: <code class="id">${id.replace(/[<>&"']/g, '')}</code>` }),
    );
  }

  // الإهداءات الحقيقية مشفّرة بالكامل: لا تُقرأ إلا بمفتاح موجود في الرابط نفسه
  if (gift && gift.enc === 2) {
    const key = getKey();
    if (!key) {
      return renderState(
        'الرابط ناقص',
        'هذا الإهداء مقفل، والجزء الذي يفتحه محذوف من الرابط. انسخ الرابط كاملًا كما وصلك — لا تقطع منه شيئًا.',
        el('p', { class: 'screen__hint', text: 'الرابط الكامل ينتهي بعلامة # وبعدها حروف وأرقام.' }),
      );
    }
    try {
      gift = await openJSON(gift, key);
    } catch {
      return renderState(
        'تعذّر فتح الإهداء',
        'مفتاح الرابط غير صحيح أو ناقص. اطلب الرابط مرة ثانية ممن أرسله لك.',
      );
    }
  }
  gift.id = id;
  if (!gift.sticker) gift.sticker = defaultSticker();
  renderGift(gift, app);
}

boot();

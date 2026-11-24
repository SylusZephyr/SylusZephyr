// Translation layer.
// Screens are written in English; English text is the key (the gettext approach), with every
// number replaced by "#" so "12 min" and "40 min" share one entry. After each render the visible
// text, placeholders and labels are swapped for the active language. Anything without an entry
// stays in English, so a missing translation never breaks a screen.
// Catalogs live in js/locales/<code>.js. See docs/TRANSLATING.md.

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'zh', name: 'Chinese (Simplified)', native: '简体中文' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
];
const RTL = ['ur', 'ar', 'fa', 'he'];

function pickLocale() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('revive.v1') || 'null')?.settings?.locale; } catch (e) {}
  if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  for (const tag of navigator.languages || [navigator.language]) {
    const base = String(tag || '').toLowerCase().split('-')[0];
    if (LANGUAGES.some((l) => l.code === base)) return base;
  }
  return 'en';
}

export const locale = pickLocale();
export const supported = LANGUAGES.map((l) => l.code);
export const dir = RTL.includes(locale) ? 'rtl' : 'ltr';

let catalog = null;
export async function loadCatalog() {
  if (locale === 'en') return;
  try { catalog = (await import(`./locales/${locale}.js`)).default; } catch (e) { catalog = null; }
}

const NUM = /\d+(?:[.,]\d+)?/g;
// Translate one piece of English text. Numbers are carried over in order, or by position
// with {1}, {2}… when a language needs them in a different order.
export function tr(text) {
  if (!catalog || !text) return text;
  const nums = text.match(NUM) || [];
  const key = text.replace(NUM, '#');
  const hit = catalog[key];
  if (hit == null) return text;
  let i = 0;
  return hit.replace(/\{(\d)\}|#/g, (m, n) => (n ? nums[+n - 1] ?? '' : nums[i++] ?? ''));
}

// Legacy key-based lookups used by a few screens.
const en = {
  'tab.today': 'Today', 'tab.cook': 'Cook', 'tab.train': 'Train', 'tab.track': 'Track', 'tab.me': 'Me',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.back': 'Back', 'common.continue': 'Continue',
  'common.ok': 'OK', 'common.undo': 'Undo', 'common.search': 'Search', 'common.close': 'Close', 'common.done': 'Done',
  'onboard.start': 'Let’s start',
  'greet.night': 'Still up', 'greet.morning': 'Good morning', 'greet.afternoon': 'Good afternoon', 'greet.evening': 'Good evening', 'greet.late': 'Late night',
  'feed.caughtUp': 'You’re all caught up. New cards tomorrow.',
  'error.screen': 'This screen hit a problem', 'error.safe': 'Your data is safe. Go back to Today or reload the app.',
  'search.placeholder': 'Recipes, foods, tips, screens…', 'search.empty': 'Nothing found.',
  'units.kcal': 'kcal', 'units.min': 'min',
};
export function t(key, vars) {
  let s = en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  return tr(s);
}

// Walk a subtree and translate text nodes and user-facing attributes in place.
const SKIP = 'script, style, svg, textarea, [data-no-tr], .chart';
const ATTRS = ['placeholder', 'aria-label', 'title'];
export function translateTree(root) {
  if (!catalog || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const raw = n.nodeValue; if (!raw || !/[A-Za-z]/.test(raw)) continue;
    if (n.parentElement?.closest(SKIP)) continue;
    const trimmed = raw.replace(/\s+/g, ' ').trim(); const out = tr(trimmed);
    if (out !== trimmed) n.nodeValue = raw.match(/^\s*/)[0] + out + raw.match(/\s*$/)[0];
  }
  root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach((el) => {
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v && /[A-Za-z]/.test(v)) { const o = tr(v.trim()); if (o !== v.trim()) el.setAttribute(a, o); } }
  });
}

const nf = new Intl.NumberFormat(locale === 'ur' ? 'en' : locale);
export const num = (n) => nf.format(n);
export const date = (d, opts) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale === 'zh' ? 'zh-CN' : 'ur-PK', opts).format(d);
export function setLocale(code) {
  try { const st = JSON.parse(localStorage.getItem('revive.v1') || '{}'); st.settings = { ...(st.settings || {}), locale: code }; localStorage.setItem('revive.v1', JSON.stringify(st)); } catch (e) {}
}

// Translation layer. Add a language by copying `en` into a new object (e.g. `ur`, `zh`)
// and translating the values; anything missing falls back to English. See docs/TRANSLATING.md.

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

const MESSAGES = { en };

function pickLocale() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('revive.v1') || 'null')?.settings?.locale; } catch (e) {}
  const wanted = [saved, ...(navigator.languages || [navigator.language])].filter(Boolean);
  for (const tag of wanted) { const base = tag.toLowerCase().split('-')[0]; if (MESSAGES[base]) return base; }
  return 'en';
}

export const locale = pickLocale();
export const supported = Object.keys(MESSAGES);
const dict = MESSAGES[locale] || en;

// t('feed.caughtUp') or t('greet.morning') — `{name}` placeholders are filled from vars.
export function t(key, vars) {
  let s = dict[key] ?? en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  return s;
}

const nf = new Intl.NumberFormat(locale);
export const num = (n) => nf.format(n);
export const date = (d, opts) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, opts).format(d);
export const dir = ['ar', 'ur', 'fa', 'he'].includes(locale) ? 'rtl' : 'ltr';

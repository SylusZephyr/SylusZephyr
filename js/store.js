// Local-only persistence. Nothing ever leaves the device.
const KEY = 'revive.v1';

export const pad = (n) => String(n).padStart(2, '0');

// A "day" rolls over at 4 AM so a 2 AM bedtime still counts as the previous day.
export const DAY_ROLLOVER_HOUR = 4;

export function dayKey(d = new Date()) {
  const x = new Date(d);
  if (x.getHours() < DAY_ROLLOVER_HOUR) x.setDate(x.getDate() - 1);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
export function keyToDate(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(k, n) { const d = keyToDate(k); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function weekKey(k = dayKey()) {
  // ISO-ish week starting Monday
  const d = keyToDate(k); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function hm(date = new Date()) { return `${pad(date.getHours())}:${pad(date.getMinutes())}`; }
export function minutesOf(hhmm) { if (!hhmm) return null; const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
export function fmtMin(mins) { mins = ((mins % 1440) + 1440) % 1440; return `${pad(Math.floor(mins / 60))}:${pad(Math.round(mins % 60))}`; }
export function prettyTime(hhmm) {
  if (!hhmm) return '—';
  let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return `${h}:${pad(m)}${ap}`;
}
export function prettyDate(k, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const lang = (typeof document !== 'undefined' && document.documentElement.lang) || 'en';
  return keyToDate(k).toLocaleDateString(lang === 'en' ? 'en-GB' : lang, opts);
}

export const SCHEMA_VERSION = 2;
export const loadIssues = [];   // surfaced to the UI after boot (e.g. recovered from corrupt data)

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function defaults() {
  return {
    version: SCHEMA_VERSION,
    createdAt: Date.now(),
    onboarded: false,
    profile: {
      name: '',
      age: 22, heightCm: 180, startKg: 62, goalKgMin: 66, goalKgMax: 68,
      currency: '¥', budget: 'moderate', weeklyBudget: 300,
      equipment: ['airfryer', 'delivery'],
      wakeAnchor: '10:00',       // fixed wake time to lock in first
      sleepNeedMin: 510,          // 8.5h in bed
      currentBedtime: '03:30',    // starting point for gradual shift
      bedShiftStartedOn: null,
      caffeineCutoff: '14:00',
      weighDay: 0,                // 0=Sunday
      waterGoalMl: 2000,
    },
    medical: {
      clearance: 'brief',         // brief | cleared | notCleared
      redFlagsAck: false,
      visits: [],                 // {id, date, who, notes}
      labs: [],                   // {id, date, name, value, unit, ref}
      questions: null,            // seeded on first load
      exerciseCleared: false,
    },
    days: {},                     // dayKey -> day object
    checkins: {},                 // weekKey -> {erection:{answers,score}, mood:{answers,score}, energy:{fatigue,cold,score}}
    weights: [],                  // {date, kg}
    pantry: [],                   // ingredient ids
    favorites: [],                // recipe ids
    cooked: {},                   // recipeId -> count
    savedTips: [], likedTips: [],
    storiesSeen: {},              // storyId -> dayKey
    game: {
      xp: 0, coins: 0, freezes: 1, badges: {}, lootOpened: {}, bestStreak: 0,
      lastLevel: 1, titles: [], equippedTitle: null, personalBests: {},
    },
    pf: { week: 1, sessions: [] }, // pelvic floor
    walks: [],
    lock: { enabled: false, pinHash: null, credId: null, faceId: false },
    settings: { winddown: true, sounds: true, haptics: true },
  };
}

let state = null;
const listeners = new Set();

export function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { loadIssues.push('storage-unavailable'); }
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if ((parsed.version || 1) < SCHEMA_VERSION) {
        try { localStorage.setItem(KEY + '.backup', raw); } catch (e) {}
      }
      state = deepMerge(defaults(), migrate(parsed));
    } catch (e) {
      // Never throw away unreadable data: park it so it can be recovered later.
      try { localStorage.setItem(`${KEY}.corrupt.${Date.now()}`, raw); } catch (err) {}
      loadIssues.push('recovered-corrupt');
    }
  }
  if (!state) state = defaults();
  state.version = SCHEMA_VERSION;
  return state;
}

// Step-by-step upgrades of saved data. Each step takes the previous shape and returns the next.
const MIGRATIONS = {
  // 1 → 2: guarantee list fields exist, drop malformed day entries, clean non-finite numbers.
  1: (s) => {
    for (const k of ['shopping', 'sxLog', 'walks', 'weights', 'favorites', 'pantry', 'savedTips', 'likedTips']) if (!Array.isArray(s[k])) s[k] = [];
    s.pf = s.pf || {}; if (!Array.isArray(s.pf.sessions)) s.pf.sessions = []; if (!Array.isArray(s.pf.control)) s.pf.control = [];
    const days = {};
    for (const [k, d] of Object.entries(s.days || {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !d || typeof d !== 'object') continue;
      d.meals = Array.isArray(d.meals) ? d.meals.filter((m) => m && typeof m === 'object') : [];
      d.meals.forEach((m) => { m.kcal = Number.isFinite(+m.kcal) ? +m.kcal : 0; m.protein = Number.isFinite(+m.protein) ? +m.protein : 0; });
      d.coffee = Array.isArray(d.coffee) ? d.coffee : [];
      d.waterMl = Number.isFinite(+d.waterMl) ? Math.max(0, +d.waterMl) : 0;
      d.checks = d.checks && typeof d.checks === 'object' ? d.checks : {};
      d.sleep = d.sleep && typeof d.sleep === 'object' ? d.sleep : { bed: null, wake: null };
      days[k] = d;
    }
    s.days = days;
    s.weights = s.weights.filter((w) => w && Number.isFinite(+w.kg) && /^\d{4}-\d{2}-\d{2}$/.test(w.date)).map((w) => ({ date: w.date, kg: +w.kg }));
    if (s.game) for (const k of ['xp', 'coins', 'freezes', 'bestStreak']) s.game[k] = Number.isFinite(+s.game[k]) ? Math.max(0, +s.game[k]) : 0;
    s.version = 2;
    return s;
  },
};
export function migrate(s) {
  let v = s.version || 1;
  while (v < SCHEMA_VERSION && MIGRATIONS[v]) { s = MIGRATIONS[v](s); v = s.version; }
  return s;
}

function deepMerge(base, over) {
  if (Array.isArray(base) || Array.isArray(over)) return over ?? base;
  if (typeof base !== 'object' || base === null) return over ?? base;
  const out = { ...base };
  for (const k of Object.keys(over || {})) {
    out[k] = (k in base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]))
      ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}

let saveTimer = null;
let persistHook = null;
export function setPersistHook(fn) { persistHook = fn; }
let quotaWarned = false;
function write() {
  let json = JSON.stringify(state);
  try { localStorage.setItem(KEY, json); }
  catch (e) {
    // Storage full: trim bulky per-day details older than a year, then retry once.
    compact(365);
    json = JSON.stringify(state);
    try { localStorage.setItem(KEY, json); }
    catch (err) { if (!quotaWarned) { quotaWarned = true; window.dispatchEvent(new CustomEvent('revive:storage-full')); } }
  }
  if (persistHook) persistHook(json);
}

// Removes rebuildable detail (read-tip lists, XP logs, quest lists) from days older than `keepDays`.
export function compact(keepDays) {
  const cutoff = addDays(dayKey(), -keepDays);
  for (const [k, d] of Object.entries(state.days)) {
    if (k >= cutoff) continue;
    delete d.readTips; delete d.xpLog; delete d.quests;
  }
}
export function save() { if (state) state.editedAt = Date.now(); clearTimeout(saveTimer); saveTimer = setTimeout(write, 60); }
export function saveNow() { if (state) state.editedAt = Date.now(); clearTimeout(saveTimer); write(); }
// Swap in a merged copy (from cloud sync) without marking it as a local edit.
export function replace(next) {
  const keep = { lock: state.lock, closedDays: state.closedDays, remindersSyncedFor: state.remindersSyncedFor, nativeReminders: state.nativeReminders };
  state = deepMerge(defaults(), { ...next, ...keep });
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  listeners.forEach((l) => l(state));
}

export function get() { return state; }
export function update(fn) { fn(state); save(); listeners.forEach((l) => l(state)); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function day(k = dayKey()) {
  if (!state.days[k]) {
    state.days[k] = {
      checks: {}, meals: [], waterMl: 0, coffee: [], sleep: { bed: null, wake: null },
      energy: null, mood: null, appetite: null, notes: '', quests: null, xpToday: 0, sex: null,
    };
  }
  return state.days[k];
}

export function exportJSON() { return JSON.stringify(state, null, 2); }
export function importJSON(text) {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object' || !obj.profile) throw new Error('Not a Revive file');
  state = deepMerge(defaults(), obj); saveNow(); listeners.forEach((l) => l(state));
}
export function resetAll() { localStorage.removeItem(KEY); state = defaults(); saveNow(); }

// Ask Safari to keep our storage (reduces eviction risk).
export async function requestPersist() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) {}
  return false;
}

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
  return keyToDate(k).toLocaleDateString('en-GB', opts);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function defaults() {
  return {
    version: 1,
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
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = deepMerge(defaults(), JSON.parse(raw));
  } catch (e) { console.warn('load failed', e); }
  if (!state) state = defaults();
  return state;
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
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
  }, 60);
}
export function saveNow() { clearTimeout(saveTimer); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

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

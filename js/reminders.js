// Which notifications the phone should hold, worked out in one place so the scheduler
// and the "next reminder" line on Today can never disagree.
import * as S from './store.js';
import * as Prayer from './prayer.js';
import { reminderList } from './ics.js';

// Fixed daily times, scheduled as repeating alarms. Everything else is one-off and
// re-planned each day, so a reminder for something already done can be dropped.
export const REPEATING = ['wake', 'winddown', 'bed'];
const ROUTE = { breakfast: 'cook', lunch: 'cook', dinner: 'cook', snack: 'cook', prep: 'cook/r/overnight_oats', kegel1: 'train', kegel2: 'train', bed: 'today', winddown: 'today' };
// While fasting, daytime meal, water and coffee reminders would be wrong; the fasting alerts replace them.
const FAST_OFF = ['breakfast', 'lunch', 'snack', 'dinner', 'water1', 'water2', 'coffee'];

function doneAlready(id, d, st) {
  if (['breakfast', 'lunch', 'dinner'].includes(id)) return !!d.checks[id];
  if (id === 'snack') return (d.meals || []).some((m) => m.slot === 'snack');
  if (id === 'water1') return (d.waterMl || 0) >= st.profile.waterGoalMl * 0.4;
  if (id === 'water2') return (d.waterMl || 0) >= st.profile.waterGoalMl * 0.8;
  if (id === 'kegel1') return (d.pf || 0) >= 1;
  if (id === 'kegel2') return (d.pf || 0) >= 2;
  return false;
}

// The moment a clock time falls on, for a given app day (times before the rollover hour belong to the next morning).
function onDay(k, hhmm) {
  const at = S.keyToDate(k); const m = S.minutesOf(hhmm);
  at.setMinutes(m + (m < S.DAY_ROLLOVER_HOUR * 60 ? 1440 : 0));
  return at;
}

/** @typedef {(s: string) => string} Tr */
const same = /** @type {Tr} */ ((x) => x);

// Notifications are shown by the OS, outside the translated screen, so their text is
// translated here. Titles like "Fajr · 05:12" are translated piece by piece.
/** @param {{title: string, body?: string, desc?: string, dish?: string}} x @param {Tr} tr */
export function localize(x, tr) {
  const body = x.body ?? x.desc ?? '';
  return {
    title: x.title.split(' · ').map(tr).join(' · '),
    body: x.dish ? `${tr('Planned for today:')} ${tr(x.dish)}` : tr(body),
  };
}

/** @param {Date} [now] @param {number} [days] @param {Tr} [tr] */
export function plan(now = new Date(), days = 3, tr = same) {
  const st = S.get(); const prefs = st.reminderPrefs || {};
  const fastingNow = Prayer.fasting(now);
  const list = reminderList().map((r) => ({ ...r, route: ROUTE[r.id] || 'today', on: (prefs[r.id] ?? r.on) && !(fastingNow && FAST_OFF.includes(r.id)) }));
  const repeating = list.filter((r) => REPEATING.includes(r.id));
  const today = S.dayKey(now); const timed = [];
  for (let i = 0; i < days; i++) {
    const k = S.addDays(today, i); const d = st.days[k] || { checks: {}, meals: [] };
    for (const r of list) {
      if (!r.on || REPEATING.includes(r.id) || (i === 0 && doneAlready(r.id, d, st))) continue;
      timed.push({ id: r.id, at: onDay(k, r.time), title: r.title, ...(i === 0 || !r.dish ? { body: r.desc, dish: r.dish } : { body: r.alt }), route: r.route });
    }
  }
  const L = (x) => ({ ...x, ...localize(x, tr) });
  return {
    repeating: repeating.map((r) => { const l = localize(r, tr); return { ...r, title: l.title, desc: l.body }; }),
    timed: [...timed, ...Prayer.upcomingAlerts(days, now)].map(L),
  };
}

// The next notification this phone will show, or null when there is none.
/** @param {Date} [now] @returns {{at: Date, title: string, route: string} | null} */
export function next(now = new Date()) {
  const { repeating, timed } = plan(now, 2);
  const t = now.getTime();
  const cands = timed.filter((x) => x.at.getTime() > t);
  for (const r of repeating) {
    if (!r.on) continue;
    const at = new Date(now); const m = S.minutesOf(r.time); at.setHours(0, 0, 0, 0); at.setMinutes(m);
    if (at.getTime() <= t) at.setDate(at.getDate() + 1);
    cands.push({ id: r.id, at, title: r.title, body: r.desc, route: r.route });
  }
  cands.sort((a, b) => a.at.getTime() - b.at.getTime());
  return cands[0] || null;
}

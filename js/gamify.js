// XP, levels, streaks, streak freezes and milestones.
import * as S from './store.js';
import * as UI from './ui.js';
import { tr } from './i18n.js';

export const ESSENTIALS = [
  { id: 'breakfast', e: '', label: 'Eat breakfast', xp: 20 },
  { id: 'lunch', e: '', label: 'Eat lunch', xp: 20 },
  { id: 'dinner', e: '', label: 'Eat dinner', xp: 20 },
  { id: 'fluids', e: '', label: 'Drink fluids regularly (1.5 L+)', xp: 15 },
  { id: 'sleep', e: '', label: 'Follow your sleep plan', xp: 20 },
  { id: 'outdoors', e: '', label: 'A little time outdoors', xp: 10 },
  { id: 'caffeine', e: '', label: 'No coffee after cutoff', xp: 10 },
];
export const STREAK_THRESHOLD = 5;

// One title per level band. They describe where the recovery is, not a rank.
export const TITLES = ['Starting out', 'Finding a rhythm', 'Building the base', 'Steady', 'Strong routine', 'Rebuilt', 'Thriving', 'Unshakeable', 'Revived', 'Example to others'];
export const TITLE_NOTE = ['Every day you open this counts.', 'Meals and wake time are starting to repeat.', 'The basics happen most days now.', 'Good days outnumber bad ones.', 'The routine runs without much thought.', 'Energy, appetite and sleep are back in your hands.', 'You are adding, not just repairing.', 'A bad week no longer breaks the habit.', 'This is your normal now.', 'Long-term consistency. Keep it simple.'];

export function levelFromXp(xp) { let L = 1; while (xp >= threshold(L + 1)) L++; return L; }
export function threshold(L) { return 50 * L * L - 50 * L; } // L1=0, L2=100, L3=300, L4=600...
export function levelInfo(xp = S.get().game.xp) {
  const L = levelFromXp(xp); const lo = threshold(L); const hi = threshold(L + 1);
  return { level: L, into: xp - lo, need: hi - lo, pct: (xp - lo) / (hi - lo), title: TITLES[Math.min(TITLES.length - 1, Math.floor((L - 1) / 2))] };
}

// Award XP once per (day, key). Returns amount awarded (0 if already awarded).
export function award(key, amount, ev, { once = true, k = S.dayKey(), silent = false } = {}) {
  const st = S.get(); const d = S.day(k);
  d.xpLog = d.xpLog || {};
  if (once && d.xpLog[key]) return 0;
  const amt = Math.round(amount);
  const before = levelInfo(st.game.xp).level;
  st.game.xp += amt;
  d.xpLog[key] = amt; d.xpToday = (d.xpToday || 0) + amt;
  S.save();
  if (!silent) UI.haptic(10);
  const after = levelInfo(st.game.xp).level;
  if (after > before) {
    st.game.lastLevel = after; S.save();
    const info = levelInfo();
    setTimeout(() => UI.toast(`Level ${after} · ${info.title}`), 400);
    st.game.freezes = Math.min(3, st.game.freezes + 1);
  }
  checkBadges();
  return amt;
}
export function revoke(key, k = S.dayKey()) {
  const st = S.get(); const d = S.day(k);
  if (d.xpLog && d.xpLog[key]) { st.game.xp = Math.max(0, st.game.xp - d.xpLog[key]); d.xpToday -= d.xpLog[key]; delete d.xpLog[key]; S.save(); }
}

export function essentialsDone(k = S.dayKey()) {
  const d = S.get().days[k]; if (!d) return 0;
  return ESSENTIALS.filter((e) => d.checks[e.id]).length;
}

export function setEssential(id, on, ev, k = S.dayKey()) {
  const d = S.day(k);
  const was = !!d.checks[id];
  if (was === on) return;
  d.checks[id] = on;
  const e = ESSENTIALS.find((x) => x.id === id);
  if (on) award(`ess_${id}`, e.xp, ev, { k }); else revoke(`ess_${id}`, k);
  const n = essentialsDone(k);
  if (on && n === STREAK_THRESHOLD) { setTimeout(() => UI.toast('Streak secured for today'), 300); award('streak_day', 30, null, { k, silent: true }); }
  if (on && n === ESSENTIALS.length) { award('perfect_day', 50, null, { k, silent: true }); setTimeout(() => UI.toast('All seven done today'), 700); }
  S.save();
}

// ---------- Streak ----------
export function streak() {
  const st = S.get(); st.game.frozen = st.game.frozen || {};
  const today = S.dayKey();
  let count = 0; let k = today;
  // today counts if already secured; otherwise start from yesterday without breaking
  if (essentialsDone(today) >= STREAK_THRESHOLD) count++;
  k = S.addDays(today, -1);
  const created = S.dayKey(new Date(st.createdAt));
  for (let i = 0; i < 1000; i++) {
    if (k < created) break;
    if (essentialsDone(k) >= STREAK_THRESHOLD) count++;
    else if (st.game.frozen[k]) { /* frozen day keeps streak alive but doesn't add */ }
    else break;
    k = S.addDays(k, -1);
  }
  return count;
}
// Auto-apply a freeze for yesterday if it was missed and we have one.
export function applyFreezeIfNeeded() {
  const st = S.get(); st.game.frozen = st.game.frozen || {};
  const y = S.addDays(S.dayKey(), -1);
  const created = S.dayKey(new Date(st.createdAt));
  if (y < created) return null;
  const dby = S.addDays(y, -1);
  const hadStreak = essentialsDone(dby) >= STREAK_THRESHOLD || st.game.frozen[dby];
  if (essentialsDone(y) < STREAK_THRESHOLD && !st.game.frozen[y] && hadStreak && st.game.freezes > 0 && !st.game.freezeChecked?.[y]) {
    st.game.freezes--; st.game.frozen[y] = true; st.game.freezeChecked = { ...(st.game.freezeChecked || {}), [y]: true }; S.save();
    return y;
  }
  st.game.freezeChecked = { ...(st.game.freezeChecked || {}), [y]: true }; S.save();
  return null;
}
export function updateBestStreak() { const st = S.get(); const s = streak(); if (s > st.game.bestStreak) { st.game.bestStreak = s; S.save(); } return s; }

// ---------- Badges ----------
export const BADGES = [
  { id: 'first_check', e: '', n: 'First step', d: 'Tick your first essential', c: (st) => Object.values(st.days).some((d) => Object.values(d.checks || {}).some(Boolean)) },
  { id: 'streak3', e: '', n: '3-day streak', d: '3 days of 5+ essentials', c: (st) => st.game.bestStreak >= 3 },
  { id: 'streak7', e: '', n: 'Week warrior', d: '7-day streak', c: (st) => st.game.bestStreak >= 7 },
  { id: 'streak14', e: '', n: 'Fortnight', d: '14-day streak', c: (st) => st.game.bestStreak >= 14 },
  { id: 'streak30', e: '', n: 'Unstoppable', d: '30-day streak', c: (st) => st.game.bestStreak >= 30 },
  { id: 'perfect', e: '', n: 'Flawless', d: 'All 7 essentials in a day', c: (st) => Object.values(st.days).some((d) => d.xpLog?.perfect_day) },
  { id: 'chef1', e: '', n: 'Chef', d: 'Cook a recipe in Cook mode', c: (st) => Object.values(st.cooked).reduce((a, b) => a + b, 0) >= 1 },
  { id: 'chef10', e: '', n: 'Head chef', d: 'Cook 10 times', c: (st) => Object.values(st.cooked).reduce((a, b) => a + b, 0) >= 10 },
  { id: 'chef_variety', e: '', n: 'Explorer', d: 'Cook 5 different recipes', c: (st) => Object.keys(st.cooked).length >= 5 },
  { id: 'hydro', e: '', n: 'Hydrated', d: 'Drink 2 L in a day', c: (st) => Object.values(st.days).some((d) => d.waterMl >= 2000) },
  { id: 'hydro7', e: '', n: 'Ocean', d: '2 L on 7 different days', c: (st) => Object.values(st.days).filter((d) => d.waterMl >= 2000).length >= 7 },
  { id: 'pf1', e: '', n: 'Core starter', d: 'First pelvic-floor session', c: (st) => st.pf.sessions.length >= 1 },
  { id: 'pf20', e: '', n: 'Iron core', d: '20 pelvic-floor sessions', c: (st) => st.pf.sessions.length >= 20 },
  { id: 'pf60', e: '', n: 'Control master', d: '60 pelvic-floor sessions', c: (st) => st.pf.sessions.length >= 60 },
  { id: 'checkin', e: '', n: 'Self-aware', d: 'Complete a weekly check-in', c: (st) => Object.keys(st.checkins).length >= 1 },
  { id: 'checkin4', e: '', n: 'Data driven', d: 'Check-ins in 4 different weeks', c: (st) => Object.keys(st.checkins).length >= 4 },
  { id: 'weigh', e: '', n: 'On the scale', d: 'First weigh-in', c: (st) => st.weights.length >= 1 },
  { id: 'gain1', e: '', n: '+1 kg', d: 'Gain 1 kg from start', c: (st) => st.weights.length && Math.max(...st.weights.map((w) => w.kg)) >= st.profile.startKg + 1 },
  { id: 'gain4', e: '', n: 'Goal zone', d: 'Reach your goal weight', c: (st) => st.weights.some((w) => w.kg >= st.profile.goalKgMin) },
  { id: 'doctor', e: '', n: 'Proactive', d: 'Log a doctor visit', c: (st) => st.medical.visits.length >= 1 },
  { id: 'lab', e: '', n: 'Know your numbers', d: 'Log a lab result', c: (st) => st.medical.labs.length >= 1 },
  { id: 'challenge1', e: '', n: 'Challenge done', d: 'Finish a weekly challenge', c: (st) => Object.values(st.game.challenges || {}).some((c) => c.done) },
  { id: 'challenge4', e: '', n: 'Four for four', d: 'Finish 4 weekly challenges', c: (st) => Object.values(st.game.challenges || {}).filter((c) => c.done).length >= 4 },
  { id: 'early', e: '', n: 'Early bird', d: 'Asleep before 1 am', c: (st) => Object.values(st.days).some((d) => { const b = S.minutesOf(d.sleep?.bed); return b != null && (b >= 20 * 60 || b <= 60); }) },
  { id: 'level5', e: '', n: 'Level 5', d: 'Reach level 5', c: (st) => levelFromXp(st.game.xp) >= 5 },
  { id: 'level10', e: '', n: 'Level 10', d: 'Reach level 10', c: (st) => levelFromXp(st.game.xp) >= 10 },
];
export function checkBadges() {
  const st = S.get(); const fresh = [];
  for (const b of BADGES) {
    if (!st.game.badges[b.id] && safe(() => b.c(st))) { st.game.badges[b.id] = Date.now(); fresh.push(b); }
  }
  if (!fresh.length) return;
  S.save();
  if (fresh.length === 1) setTimeout(() => UI.toast(`${tr('Milestone')}: ${tr(fresh[0].n)}`), 500);
  else if (fresh.length > 1) setTimeout(() => UI.toast(`${fresh.length} milestones reached`), 500);
}
function safe(fn) { try { return fn(); } catch (e) { return false; } }

// ---------- vs last week ----------
export function weekCompare() {
  const st = S.get(); const today = S.dayKey();
  const sum = (from, n) => { let xp = 0, ess = 0, days = 0; for (let i = 0; i < n; i++) { const k = S.addDays(from, -i); const d = st.days[k]; if (d) { xp += d.xpToday || 0; ess += essentialsDone(k); days++; } } return { xp, ess }; };
  const wd = (S.keyToDate(today).getDay() + 6) % 7; // days since Monday
  const thisW = sum(today, wd + 1);
  const lastW = sum(S.addDays(today, -7), wd + 1); // same point last week
  return { thisW, lastW };
}

// ---------- Daily open bonus (variable reward) ----------
export function dailyOpen() {
  const k = S.dayKey(); const d = S.day(k); d.xpLog = d.xpLog || {};
  if (d.xpLog.daily_open) return;
  const roll = Math.random(); const amt = roll < 0.05 ? 50 : roll < 0.25 ? 20 : 10;
  award('daily_open', amt, null, { k, silent: true });

}

// ---------- Weekly review (first open of a new week) ----------
export function weeklyReviewData(wk) {
  const st = S.get(); const days = Array.from({ length: 7 }, (_, i) => S.addDays(wk, i));
  const logged = days.filter((k) => st.days[k]);
  const ess = days.reduce((s, k) => s + essentialsDone(k), 0);
  const secured = days.filter((k) => essentialsDone(k) >= STREAK_THRESHOLD).length;
  const meals = days.reduce((s, k) => s + new Set((st.days[k]?.meals || []).filter((m) => m.slot !== 'snack').map((m) => m.slot)).size, 0);
  const pf = st.pf.sessions.filter((x) => days.includes(x.date)).length;
  const xp = days.reduce((s, k) => s + (st.days[k]?.xpToday || 0), 0);
  const water = days.filter((k) => (st.days[k]?.waterMl || 0) >= 1500).length;
  const pct = ess / 49;
  const grade = pct >= 0.85 ? 'S' : pct >= 0.7 ? 'A' : pct >= 0.5 ? 'B' : pct >= 0.3 ? 'C' : 'D';
  return { logged: logged.length, ess, secured, meals, pf, xp, water, grade };
}
export async function maybeWeeklyReview() {
  const st = S.get(); const thisWk = S.weekKey(); const lastWk = S.addDays(thisWk, -7);
  if (st.game.reviewed === thisWk) return;
  st.game.reviewed = thisWk; S.save();
  const r = weeklyReviewData(lastWk);
  if (r.logged < 2) return;
  await UI.celebrate({
    rarity: 'Last week', title: `${r.secured} of 7 days on track`,
    body: `<div class="review-grid"><div><b>${r.meals}</b><span>main meals</span></div><div><b>${r.water}</b><span>days 1.5 L+</span></div><div><b>${r.pf}</b><span>pelvic-floor sessions</span></div></div>`,
    btn: 'Start this week',
  });
}

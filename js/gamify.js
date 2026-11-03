// XP, levels, streaks, quests, loot chests, badges.
import * as S from './store.js';
import * as UI from './ui.js';
import { TIPS } from './data/content.js';

export const ESSENTIALS = [
  { id: 'breakfast', e: '🍳', label: 'Eat breakfast', xp: 20 },
  { id: 'lunch', e: '🌯', label: 'Eat lunch', xp: 20 },
  { id: 'dinner', e: '🍛', label: 'Eat dinner', xp: 20 },
  { id: 'fluids', e: '💧', label: 'Drink fluids regularly (1.5 L+)', xp: 15 },
  { id: 'sleep', e: '🌙', label: 'Follow your sleep plan', xp: 20 },
  { id: 'outdoors', e: '🌞', label: 'A little time outdoors', xp: 10 },
  { id: 'caffeine', e: '☕', label: 'No coffee after cutoff', xp: 10 },
];
export const STREAK_THRESHOLD = 5;

export const TITLES = ['Rookie', 'Starter', 'Grinder', 'Consistent', 'Rebuilder', 'Machine', 'Iron Will', 'Phoenix', 'Unbreakable', 'Legend'];

export function levelFromXp(xp) { let L = 1; while (xp >= threshold(L + 1)) L++; return L; }
export function threshold(L) { return 50 * L * L - 50 * L; } // L1=0, L2=100, L3=300, L4=600...
export function levelInfo(xp = S.get().game.xp) {
  const L = levelFromXp(xp); const lo = threshold(L); const hi = threshold(L + 1);
  return { level: L, into: xp - lo, need: hi - lo, pct: (xp - lo) / (hi - lo), title: TITLES[Math.min(TITLES.length - 1, Math.floor((L - 1) / 2))] };
}

let comboCount = 0; let comboTimer = null;
export function combo() { return comboCount; }

// Award XP once per (day, key). Returns amount awarded (0 if already awarded).
export function award(key, amount, ev, { once = true, k = S.dayKey(), silent = false } = {}) {
  const st = S.get(); const d = S.day(k);
  d.xpLog = d.xpLog || {};
  if (once && d.xpLog[key]) return 0;
  comboCount++; clearTimeout(comboTimer); comboTimer = setTimeout(() => { comboCount = 0; }, 90_000);
  const mult = comboCount >= 5 ? 2 : comboCount >= 3 ? 1.5 : 1;
  const amt = Math.round(amount * mult);
  const before = levelInfo(st.game.xp).level;
  st.game.xp += amt; st.game.coins += Math.max(1, Math.round(amt / 10));
  d.xpLog[key] = amt; d.xpToday = (d.xpToday || 0) + amt;
  S.save();
  if (!silent) {
    const x = ev?.clientX ?? (ev?.target?.getBoundingClientRect?.().left + 30);
    const y = ev?.clientY ?? ev?.target?.getBoundingClientRect?.().top;
    UI.xpPop(amt, x, y); UI.ding('xp'); UI.haptic(15);
    if (mult > 1) UI.toast(`${mult}× COMBO! Keep going`, '🔥');
  }
  const after = levelInfo(st.game.xp).level;
  if (after > before) {
    st.game.lastLevel = after; S.save();
    const info = levelInfo();
    setTimeout(() => UI.celebrate({ big: '🆙', title: `Level ${after}!`, body: `You are now a <b>${info.title}</b>. +1 streak freeze`, rarity: 'LEVEL UP' }), 400);
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
  if (on && n === STREAK_THRESHOLD) { setTimeout(() => { UI.toast('Streak secured for today! 🔥', '✅'); UI.confetti(60); }, 300); award('streak_day', 30, null, { k, silent: true }); }
  if (on && n === ESSENTIALS.length) { award('perfect_day', 50, null, { k, silent: true }); setTimeout(() => UI.celebrate({ big: '💯', title: 'Perfect day', body: 'All 7 essentials. +50 bonus XP.', rarity: 'FLAWLESS' }), 700); }
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

// ---------- Daily quests ----------
function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }

export const QUEST_POOL = [
  { id: 'q_water2', e: '💧', t: 'Hydro hero: drink 2 L today', xp: 40, check: (d) => d.waterMl >= 2000 },
  { id: 'q_kegel', e: '💪', t: 'Complete 1 pelvic-floor session', xp: 35, check: (d) => (d.pf || 0) >= 1 },
  { id: 'q_kegel2', e: '💪', t: 'Complete 2 pelvic-floor sessions', xp: 50, check: (d) => (d.pf || 0) >= 2 },
  { id: 'q_cook', e: '👨‍🍳', t: 'Cook any recipe in Cook mode', xp: 45, check: (d) => (d.cookedCount || 0) >= 1 },
  { id: 'q_shake', e: '🥤', t: 'Have a shake or extra snack', xp: 30, check: (d) => d.meals.some((m) => m.slot === 'snack') },
  { id: 'q_brekkie', e: '⏱️', t: 'Breakfast within 2 h of waking', xp: 35, check: (d) => { if (!d.sleep.wake) return false; const b = d.meals.find((m) => m.slot === 'breakfast'); if (!b) return false; const diff = (S.minutesOf(b.time) - S.minutesOf(d.sleep.wake) + 1440) % 1440; return diff <= 120; } },
  { id: 'q_coffee1', e: '☕', t: 'Max 1 coffee today', xp: 30, check: (d, endOfDay) => endOfDay && d.coffee.length <= 1 },
  { id: 'q_nocoffee_pm', e: '🌗', t: 'Zero coffee after 2 pm', xp: 30, check: (d, endOfDay) => endOfDay && !d.coffee.some((c) => S.minutesOf(c) >= 14 * 60) },
  { id: 'q_walk', e: '🚶', t: 'Take a gentle 10-min walk', xp: 35, check: (d) => (d.walkMin || 0) >= 10 },
  { id: 'q_breath', e: '🌬️', t: 'Do a 2-min breathing session', xp: 25, check: (d) => (d.breath || 0) >= 1 },
  { id: 'q_mood', e: '🙂', t: 'Log energy & mood', xp: 20, check: (d) => d.energy != null && d.mood != null },
  { id: 'q_3meals', e: '🍽️', t: 'Log 3 meals', xp: 40, check: (d) => new Set(d.meals.map((m) => m.slot)).size >= 3 },
  { id: 'q_protein', e: '🥚', t: 'Hit 90 g protein', xp: 40, check: (d) => d.meals.reduce((s, m) => s + (m.protein || 0), 0) >= 90 },
  { id: 'q_kcal', e: '🔥', t: 'Eat 2,300+ kcal', xp: 45, check: (d) => d.meals.reduce((s, m) => s + (m.kcal || 0), 0) >= 2300 },
  { id: 'q_read', e: '📚', t: 'Read 3 cards in your feed', xp: 15, check: (d) => (d.tipsRead || 0) >= 3 },
  { id: 'q_wake', e: '⏰', t: 'Wake within 30 min of your anchor', xp: 40, check: (d) => { if (!d.sleep.wake) return false; const a = S.minutesOf(S.get().profile.wakeAnchor); const w = S.minutesOf(d.sleep.wake); const diff = Math.abs(((w - a + 720) % 1440) - 720); return diff <= 30; } },
];

export function todaysQuests(k = S.dayKey()) {
  const d = S.day(k);
  if (!d.quests) {
    const rnd = seeded(k); const pool = [...QUEST_POOL];
    const picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0].id);
    d.quests = picks.map((id) => ({ id, done: false })); S.save();
  }
  return d.quests.map((q) => ({ ...QUEST_POOL.find((p) => p.id === q.id), done: q.done }));
}
export function evaluateQuests(k = S.dayKey(), endOfDay = false) {
  const d = S.day(k); todaysQuests(k);
  let any = false;
  d.quests.forEach((q) => {
    const def = QUEST_POOL.find((p) => p.id === q.id);
    if (!q.done && def && def.check(d, endOfDay || k !== S.dayKey())) {
      q.done = true; any = true;
      award(`quest_${q.id}`, def.xp, null, { k });
      UI.toast(`Quest complete: ${def.t}`, def.e);
    }
  });
  if (any && d.quests.every((q) => q.done)) {
    award('all_quests', 60, null, { k, silent: true });
    setTimeout(() => UI.celebrate({ big: '🏆', title: 'All quests cleared!', body: '+60 bonus XP and +30 coins', rarity: 'QUEST MASTER' }), 900);
    S.get().game.coins += 30;
  }
  S.save();
}

// ---------- Loot chest ----------
const LOOT_TABLE = [
  { p: 0.58, rarity: 'COMMON', color: '#8b93a8', xp: 20, coins: 10, e: '🎁' },
  { p: 0.27, rarity: 'RARE', color: '#5aa9ff', xp: 50, coins: 25, e: '💎' },
  { p: 0.12, rarity: 'EPIC', color: '#a78bfa', xp: 100, coins: 50, freeze: 1, e: '🔮' },
  { p: 0.03, rarity: 'LEGENDARY', color: '#ffb547', xp: 250, coins: 120, freeze: 1, e: '👑' },
];
export function lootState(k = S.dayKey()) {
  const st = S.get(); const opened = st.game.lootOpened[k];
  const n = essentialsDone(k);
  return { opened: !!opened, result: opened, unlocked: n >= 3, need: Math.max(0, 3 - n) };
}
export async function openLoot(k = S.dayKey()) {
  const st = S.get(); const ls = lootState(k);
  if (ls.opened || !ls.unlocked) return;
  let r = Math.random(); let pick = LOOT_TABLE[0];
  for (const row of LOOT_TABLE) { if (r < row.p) { pick = row; break; } r -= row.p; }
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
  st.game.lootOpened[k] = { rarity: pick.rarity, xp: pick.xp, coins: pick.coins, tip: tip.id };
  st.game.coins += pick.coins; if (pick.freeze) st.game.freezes = Math.min(3, st.game.freezes + pick.freeze);
  S.save();
  UI.ding('loot');
  await UI.celebrate({ big: pick.e, rarity: pick.rarity, color: pick.color, title: `+${pick.xp} XP · +${pick.coins} coins`,
    body: `${pick.freeze ? '❄️ +1 streak freeze<br>' : ''}<br><b>${tip.e} ${UI.esc(tip.title)}</b><br><span class="small">${UI.esc(tip.body)}</span>` });
  award('loot', pick.xp, null, { k, silent: true });
}

// ---------- Badges ----------
export const BADGES = [
  { id: 'first_check', e: '✅', n: 'First step', d: 'Tick your first essential', c: (st) => Object.values(st.days).some((d) => Object.values(d.checks || {}).some(Boolean)) },
  { id: 'streak3', e: '🔥', n: '3-day streak', d: '3 days of 5+ essentials', c: (st) => st.game.bestStreak >= 3 },
  { id: 'streak7', e: '🌋', n: 'Week warrior', d: '7-day streak', c: (st) => st.game.bestStreak >= 7 },
  { id: 'streak14', e: '⚡', n: 'Fortnight', d: '14-day streak', c: (st) => st.game.bestStreak >= 14 },
  { id: 'streak30', e: '👑', n: 'Unstoppable', d: '30-day streak', c: (st) => st.game.bestStreak >= 30 },
  { id: 'perfect', e: '💯', n: 'Flawless', d: 'All 7 essentials in a day', c: (st) => Object.values(st.days).some((d) => d.xpLog?.perfect_day) },
  { id: 'chef1', e: '👨‍🍳', n: 'Chef', d: 'Cook a recipe in Cook mode', c: (st) => Object.values(st.cooked).reduce((a, b) => a + b, 0) >= 1 },
  { id: 'chef10', e: '🧑‍🍳', n: 'Head chef', d: 'Cook 10 times', c: (st) => Object.values(st.cooked).reduce((a, b) => a + b, 0) >= 10 },
  { id: 'chef_variety', e: '🌍', n: 'Explorer', d: 'Cook 5 different recipes', c: (st) => Object.keys(st.cooked).length >= 5 },
  { id: 'hydro', e: '💧', n: 'Hydrated', d: 'Drink 2 L in a day', c: (st) => Object.values(st.days).some((d) => d.waterMl >= 2000) },
  { id: 'hydro7', e: '🌊', n: 'Ocean', d: '2 L on 7 different days', c: (st) => Object.values(st.days).filter((d) => d.waterMl >= 2000).length >= 7 },
  { id: 'pf1', e: '💪', n: 'Core starter', d: 'First pelvic-floor session', c: (st) => st.pf.sessions.length >= 1 },
  { id: 'pf20', e: '🏋️', n: 'Iron core', d: '20 pelvic-floor sessions', c: (st) => st.pf.sessions.length >= 20 },
  { id: 'pf60', e: '🦾', n: 'Control master', d: '60 pelvic-floor sessions', c: (st) => st.pf.sessions.length >= 60 },
  { id: 'checkin', e: '📋', n: 'Self-aware', d: 'Complete a weekly check-in', c: (st) => Object.keys(st.checkins).length >= 1 },
  { id: 'checkin4', e: '📊', n: 'Data driven', d: 'Check-ins in 4 different weeks', c: (st) => Object.keys(st.checkins).length >= 4 },
  { id: 'weigh', e: '⚖️', n: 'On the scale', d: 'First weigh-in', c: (st) => st.weights.length >= 1 },
  { id: 'gain1', e: '📈', n: '+1 kg', d: 'Gain 1 kg from start', c: (st) => st.weights.length && Math.max(...st.weights.map((w) => w.kg)) >= st.profile.startKg + 1 },
  { id: 'gain4', e: '🏔️', n: 'Goal zone', d: 'Reach 66 kg', c: (st) => st.weights.some((w) => w.kg >= st.profile.goalKgMin) },
  { id: 'doctor', e: '🩺', n: 'Proactive', d: 'Log a doctor visit', c: (st) => st.medical.visits.length >= 1 },
  { id: 'lab', e: '🧪', n: 'Know your numbers', d: 'Log a lab result', c: (st) => st.medical.labs.length >= 1 },
  { id: 'loot5', e: '🎁', n: 'Treasure hunter', d: 'Open 5 chests', c: (st) => Object.keys(st.game.lootOpened).length >= 5 },
  { id: 'legend', e: '🌟', n: 'Lucky', d: 'Find a legendary chest', c: (st) => Object.values(st.game.lootOpened).some((l) => l.rarity === 'LEGENDARY') },
  { id: 'early', e: '🌅', n: 'Early bird', d: 'Asleep before 1 am', c: (st) => Object.values(st.days).some((d) => { const b = S.minutesOf(d.sleep?.bed); return b != null && (b >= 20 * 60 || b <= 60); }) },
  { id: 'level5', e: '🎖️', n: 'Level 5', d: 'Reach level 5', c: (st) => levelFromXp(st.game.xp) >= 5 },
  { id: 'level10', e: '🏅', n: 'Level 10', d: 'Reach level 10', c: (st) => levelFromXp(st.game.xp) >= 10 },
];
export function checkBadges() {
  const st = S.get();
  for (const b of BADGES) {
    if (!st.game.badges[b.id] && safe(() => b.c(st))) {
      st.game.badges[b.id] = Date.now(); S.save();
      setTimeout(() => UI.toast(`Badge unlocked: ${b.n}`, b.e), 500);
    }
  }
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

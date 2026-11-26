// Weekly challenge, milestone moments and the monthly recap.
// Rewards are earned by real behaviour over days, never by tapping more.
import * as S from './store.js';
import * as UI from './ui.js';
import * as G from './gamify.js';
import * as P from './plan.js';

const days = (wk) => Array.from({ length: 7 }, (_, i) => S.addDays(wk, i));
const dayOf = (k) => S.get().days[k];
const countDays = (wk, f) => days(wk).filter((k) => dayOf(k) && f(dayOf(k), k)).length;

// Each challenge measures something already logged. `goal` is in days or sessions.
export const CHALLENGES = [
  { id: 'breakfast5', t: 'Breakfast on 5 days', why: 'A morning meal is the single biggest lever for steady weight gain.', goal: 5, unit: 'days', m: (wk) => countDays(wk, (d) => d.checks.breakfast) },
  { id: 'water5', t: '1.5 L of fluids on 5 days', why: 'Low fluids feel like tiredness and cold hands.', goal: 5, unit: 'days', m: (wk) => countDays(wk, (d) => (d.waterMl || 0) >= 1500) },
  { id: 'pf12', t: '12 pelvic-floor sessions', why: 'Control improves with frequency more than intensity.', goal: 12, unit: 'sessions', m: (wk) => S.get().pf.sessions.filter((x) => x.date >= wk && x.date <= S.addDays(wk, 6)).length },
  { id: 'anchor5', t: 'Wake within 30 min of your anchor, 5 days', why: 'A fixed wake time is what pulls a random schedule into shape.', goal: 5, unit: 'days', m: (wk) => { const a = S.minutesOf(S.get().profile.wakeAnchor); return countDays(wk, (d) => { const w = S.minutesOf(d.sleep?.wake); return w != null && Math.abs(((w - a + 720 + 1440) % 1440) - 720) <= 30; }); } },
  { id: 'three5', t: 'Three meals on 5 days', why: 'Regular meals matter more than big ones.', goal: 5, unit: 'days', m: (wk) => countDays(wk, (d) => d.checks.breakfast && d.checks.lunch && d.checks.dinner) },
  { id: 'cook3', t: 'Cook 3 recipes in Cook mode', why: 'Cooking once makes the next time easier.', goal: 3, unit: 'times', m: (wk) => days(wk).reduce((a, k) => a + (dayOf(k)?.cookedCount || 0), 0) },
  { id: 'coffee6', t: 'No coffee after cutoff, 6 days', why: 'Afternoon caffeine is often why bedtime slips.', goal: 6, unit: 'days', m: (wk) => countDays(wk, (d, k) => k <= S.dayKey() && (d.checks.caffeine || !(d.coffee || []).some((c) => P.isAfterCutoff(c)))) },
  { id: 'kcal4', t: 'Hit your calorie target on 4 days', why: 'Gaining needs a small surplus most days, not perfection.', goal: 4, unit: 'days', m: (wk) => { const tg = P.nutritionTargets().kcal; return countDays(wk, (d) => (d.meals || []).reduce((a, x) => a + (x.kcal || 0), 0) >= tg * 0.95); } },
];

// The week's challenge is chosen once and remembered, avoiding last week's.
export function thisWeek(wk = S.weekKey()) {
  const st = S.get(); st.game.challenges = st.game.challenges || {};
  let rec = st.game.challenges[wk];
  if (!rec) {
    const prev = st.game.challenges[S.addDays(wk, -7)]?.id;
    let h = 0; for (const c of wk) h = (h * 31 + c.charCodeAt(0)) | 0;
    const pool = CHALLENGES.filter((c) => c.id !== prev);
    rec = st.game.challenges[wk] = { id: pool[Math.abs(h) % pool.length].id, done: false };
    S.save();
  }
  const def = CHALLENGES.find((c) => c.id === rec.id) || CHALLENGES[0];
  const value = Math.min(def.goal, def.m(wk));
  const dayIdx = Math.min(6, S.daysBetween(wk, S.dayKey()));
  return { ...def, wk, value, pct: value / def.goal, done: rec.done, daysLeft: 6 - dayIdx };
}

export function evaluate() {
  const ch = thisWeek(); const st = S.get();
  if (!ch.done && ch.value >= ch.goal) {
    st.game.challenges[ch.wk].done = true; st.game.challenges[ch.wk].at = Date.now();
    G.award(`challenge_${ch.wk}`, 150, null, { silent: true });
    st.game.freezes = Math.min(3, (st.game.freezes || 0) + 1); S.save();
    queueMoment({ id: `challenge_${ch.wk}`, kicker: 'Weekly challenge', big: `${ch.goal}/${ch.goal}`, title: ch.t, body: 'Done. +150 XP and a streak freeze.' });
  }
}

// ---------- milestone moments ----------
const MOMENTS = [
  { id: 'streak7', when: (st) => G.streak() >= 7, big: '7', title: 'A full week', body: 'Seven days in a row on track. The first week is the hardest one.' },
  { id: 'streak30', when: (st) => G.streak() >= 30, big: '30', title: 'Thirty days', body: 'A month of steady days. This is a routine now, not an effort.' },
  { id: 'streak100', when: (st) => G.streak() >= 100, big: '100', title: 'One hundred days', body: 'Few people keep anything going this long. You did.' },
  { id: 'goalkg', when: (st) => st.weights.some((w) => w.kg >= st.profile.goalKgMin), big: () => `${S.get().profile.goalKgMin} kg`, title: 'Goal weight reached', body: 'Hold it for a few weeks. Keep the meals that got you here.' },
  { id: 'gain2', when: (st) => st.weights.length && Math.max(...st.weights.map((w) => w.kg)) >= st.profile.startKg + 2, big: '+2 kg', title: 'Two kilos up', body: 'Real, measured progress from where you started.' },
  { id: 'pf50', when: (st) => st.pf.sessions.length >= 50, big: '50', title: 'Fifty sessions', body: 'Pelvic-floor strength builds quietly. This is when most people notice it.' },
];
const queue = [];
function queueMoment(m) { queue.push(m); if (queue.length === 1) setTimeout(flush, 600); }
async function flush() {
  while (queue.length) {
    const m = queue[0];
    if (!document.querySelector('.moment, .lock')) await showMoment(m);
    queue.shift();
  }
}
export function checkMoments() {
  const st = S.get(); st.game.moments = st.game.moments || {};
  const hits = [];
  for (const m of MOMENTS) {
    if (st.game.moments[m.id]) continue;
    let hit = false; try { hit = m.when(st); } catch (e) {}
    if (hit) { st.game.moments[m.id] = Date.now(); hits.push(m); }
  }
  if (!hits.length) return;
  S.save();
  // Catching up on several streak milestones at once: celebrate only the biggest.
  const streakHits = hits.filter((m) => m.id.startsWith('streak'));
  hits.filter((m) => !m.id.startsWith('streak') || m === streakHits.at(-1))
    .forEach((m) => queueMoment({ id: m.id, kicker: 'Milestone', big: typeof m.big === 'function' ? m.big() : m.big, title: m.title, body: m.body }));
}

function showMoment(m) {
  return new Promise((resolve) => {
    UI.haptic(30);
    UI.fullscreen(`<div class="moment" role="dialog" aria-modal="true" aria-label="${UI.esc(m.title)}">
      <div class="m-inner"><div class="m-kicker">${UI.esc(m.kicker)}</div>
      <div class="m-big">${UI.esc(m.big)}</div><h2>${UI.esc(m.title)}</h2><p>${UI.esc(m.body)}</p></div>
      <button class="btn primary block" data-close>Continue</button></div>`, {
      onMount: (w, close) => { const b = w.querySelector('[data-close]'); b.focus(/** @type {FocusOptions} */ ({ preventScroll: true })); b.onclick = () => { w.querySelector('.moment').classList.add('out'); setTimeout(() => { close(); resolve(); }, 220); }; },
    });
  });
}

// ---------- monthly recap ----------
export function monthData(ym) {
  const st = S.get(); const [y, m] = ym.split('-').map(Number);
  const n = new Date(y, m, 0).getDate();
  const keys = Array.from({ length: n }, (_, i) => `${ym}-${S.pad(i + 1)}`);
  const logged = keys.filter((k) => st.days[k]);
  const onTrack = keys.filter((k) => G.essentialsDone(k) >= G.STREAK_THRESHOLD).length;
  const meals = keys.reduce((a, k) => a + new Set((st.days[k]?.meals || []).filter((x) => x.slot !== 'snack').map((x) => x.slot)).size, 0);
  const nights = keys.map((k) => st.days[k]?.sleep).filter((sl) => sl?.bed && sl?.wake).map((sl) => P.sleepDurationMin(sl.bed, sl.wake));
  const avgSleep = nights.length ? nights.reduce((a, b) => a + b, 0) / nights.length : null;
  const ws = st.weights.filter((w) => w.date.startsWith(ym)).sort((a, b) => a.date.localeCompare(b.date));
  const before = st.weights.filter((w) => w.date < `${ym}-01`).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const startKg = before?.kg ?? ws[0]?.kg; const endKg = ws.at(-1)?.kg;
  const pf = st.pf.sessions.filter((x) => x.date.startsWith(ym)).length;
  const water = keys.filter((k) => (st.days[k]?.waterMl || 0) >= 1500).length;
  let best = 0, run = 0; for (const k of keys) { if (G.essentialsDone(k) >= G.STREAK_THRESHOLD) { run++; best = Math.max(best, run); } else run = 0; }
  return { ym, days: n, logged: logged.length, onTrack, meals, avgSleep, startKg, endKg, pf, water, best,
    label: new Date(y, m - 1, 1).toLocaleDateString(S.uiLocale(), { month: 'long', year: 'numeric' }) };
}

export function recapHtml(r) {
  const kg = r.startKg != null && r.endKg != null ? r.endKg - r.startKg : null;
  const cell = (v, l) => `<div class="macro"><b>${v}</b><span>${l}</span></div>`;
  return `<div class="recap">
    <div class="m-kicker">Monthly recap</div><h2>${UI.esc(r.label)}</h2>
    <div class="recap-hero"><div class="score-big">${r.onTrack}</div><div class="muted">days on track of ${r.days}</div></div>
    <div class="grid3 mt12">${cell(r.best, 'best run')}${cell(r.meals, 'main meals')}${cell(r.avgSleep != null ? `${Math.floor(r.avgSleep / 60)}h${S.pad(Math.round(r.avgSleep % 60))}` : '—', 'avg sleep')}</div>
    <div class="grid3 mt8">${cell(kg != null ? `${kg >= 0 ? '+' : ''}${kg.toFixed(1)}` : '—', 'kg change')}${cell(r.pf, 'PF sessions')}${cell(r.water, 'days 1.5 L+')}</div>
  </div>`;
}

export function maybeMonthlyRecap() {
  const st = S.get(); const now = S.keyToDate(S.dayKey());
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ym = `${prev.getFullYear()}-${S.pad(prev.getMonth() + 1)}`;
  if (st.game.recapSeen === ym) return;
  st.game.recapSeen = ym; S.save();
  const r = monthData(ym); if (r.logged < 5) return;
  setTimeout(() => openRecap(ym), 1200);
}
export function openRecap(ym) {
  UI.openSheet(recapHtml(monthData(ym)) + '<button class="btn primary block mt16" data-x>Close</button>', { onMount: (sh, close) => sh.querySelector('[data-x]').onclick = close });
}
export function lastMonthKey() { const now = S.keyToDate(S.dayKey()); const p = new Date(now.getFullYear(), now.getMonth() - 1, 1); return `${p.getFullYear()}-${S.pad(p.getMonth() + 1)}`; }

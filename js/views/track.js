import * as S from '../store.js';
import * as UI from '../ui.js';
import * as G from '../gamify.js';
import * as P from '../plan.js';
import * as C from '../charts.js';
import * as Sh from './shared.js';
import { CHECKINS } from '../data/content.js';

let tab = 'overview';
const TABS = [['overview', 'Overview'], ['food', 'Food'], ['sleep', 'Sleep'], ['body', 'Body'], ['checkins', 'Check-ins']];

export function render() {
  return `<div class="topbar"><div><div class="sub">Your progress</div><h1>Track</h1></div></div>
  <div class="seg mb12">${TABS.map(([id, l]) => `<button class="${tab === id ? 'on' : ''}" data-tab="${id}">${l}</button>`).join('')}</div>
  ${({ overview, food, sleep, body, checkins })[tab]()}`;
}

function lastNDays(n) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(S.addDays(S.dayKey(), -i)); return out; }

function overview() {
  const st = S.get(); const wk = P.programWeek();
  const prog = P.PROGRAM[Math.min(3, wk - 1)];
  const avg7 = lastNDays(7).reduce((s, k) => s + G.essentialsDone(k), 0) / 7;
  return `
  <div class="card"><div class="stats">
    <div class="stat"><b>${G.streak()}<small> ${G.streak() === 1 ? 'day' : 'days'}</small></b><span>Streak</span></div>
    <div class="stat"><b>${st.game.bestStreak}<small> ${st.game.bestStreak === 1 ? 'day' : 'days'}</small></b><span>Best</span></div>
    <div class="stat"><b>${avg7.toFixed(1)}<small> / 7</small></b><span>Daily average</span></div>
  </div></div>
  <div class="card"><div class="kicker">4-week plan · week ${Math.min(wk, 4)}${wk > 4 ? ' (maintenance)' : ''}</div><h3>${UI.esc(prog.t)}</h3>
    <ul class="goals">${prog.goals.map((g) => `<li>${UI.esc(g)}</li>`).join('')}</ul></div>
  ${yearCard()}
  ${insightsCard()}
  ${journalCard()}
  <div class="card"><div class="kicker">Essentials per day · 14 days</div>${C.barChart(lastNDays(14).map((k) => ({ y: G.essentialsDone(k), label: S.prettyDate(k, { day: 'numeric' }), color: G.essentialsDone(k) >= G.STREAK_THRESHOLD ? '#4ade80' : '#3a3d45' })), { h: 120, max: 7, goal: G.STREAK_THRESHOLD })}</div>`;
}

// Half a year of consistency, one square per day (columns are weeks).
function yearCard() {
  const st = S.get(); const today = S.dayKey(); const weeks = 26;
  const start = S.addDays(S.weekKey(today), -7 * (weeks - 1));
  const cells = []; let active = 0, perfect = 0, secured = 0, counted = 0;
  const created = S.dayKey(new Date(st.createdAt || Date.now()));
  for (let i = 0; i < weeks * 7; i++) {
    const k = S.addDays(start, i);
    if (k > today) { cells.push('<i class="future"></i>'); continue; }
    const n = G.essentialsDone(k);
    if (k >= created) { counted++; if (n) active++; if (n >= 5) secured++; if (n >= 7) perfect++; }
    cells.push(`<i class="${n >= 7 ? 'l4' : n >= 5 ? 'l3' : n >= 3 ? 'l2' : n >= 1 ? 'l1' : ''} ${k === today ? 'today' : ''}" title="${S.prettyDate(k)}: ${n}/7"></i>`);
  }
  const months = []; let lastM = -1;
  for (let w = 0; w < weeks; w++) { const d = S.keyToDate(S.addDays(start, w * 7)); if (d.getMonth() !== lastM) { months.push({ w, l: d.toLocaleDateString(S.uiLocale(), { month: 'short' }) }); lastM = d.getMonth(); } }
  return `<div class="card"><div class="row between"><div class="kicker">6 months of showing up</div><span class="small muted">${secured} streak days</span></div>
    <div class="yheat-months" aria-hidden="true">${months.map((m) => `<span class="tiny muted" style="grid-column:${m.w + 1}">${m.l}</span>`).join('')}</div>
    <div class="yheat" role="img" aria-label="${secured} days with 5 or more essentials in the last 6 months">${cells.join('')}</div>
    <div class="row between mt8"><span class="tiny muted">${counted ? Math.round(active / counted * 100) : 0}% of days active · ${perfect} perfect</span>
    <span class="yheat-legend tiny muted">less <i style="background:var(--surface3)"></i><i style="background:rgba(52,211,153,.25)"></i><i style="background:rgba(52,211,153,.45)"></i><i style="background:rgba(52,211,153,.7)"></i><i style="background:#34d399"></i> more</span></div></div>`;
}

// Least-squares trend over the last 6 weeks of weigh-ins → kg/week and goal date.
export function weightTrend(ws = S.get().weights, goal = S.get().profile.goalKgMin) {
  const sorted = [...ws].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;
  const lastDate = S.keyToDate(sorted.at(-1).date);
  const recent = sorted.filter((w) => (lastDate.getTime() - S.keyToDate(w.date).getTime()) / 864e5 <= 42);
  const pts = (recent.length >= 2 ? recent : sorted.slice(-2)).map((w) => ({ x: (S.keyToDate(w.date).getTime() - lastDate.getTime()) / 864e5, y: w.kg }));
  const n = pts.length; const mx = pts.reduce((a, p) => a + p.x, 0) / n; const my = pts.reduce((a, p) => a + p.y, 0) / n;
  const sxx = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  if (!sxx) return null;
  const slope = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / sxx; // kg per day
  const now = my + slope * (0 - mx);
  const perWeek = slope * 7;
  let eta = null;
  if (now >= goal) eta = 'reached';
  else if (slope > 0.002) { const days = Math.ceil((goal - now) / slope); if (days < 730) { const d = new Date(lastDate); d.setDate(d.getDate() + days); eta = d; } }
  return { perWeek, smoothed: now, eta, points: n };
}

// Personal insights: compare average energy/mood on days with vs without a habit.
export function insights() {
  const st = S.get(); const out = [];
  // Recent behaviour is what matters, and it keeps this fast with years of history.
  const since = S.addDays(S.dayKey(), -90);
  const days = Object.keys(st.days).filter((k) => k >= since && k <= S.dayKey() && st.days[k].energy != null);
  if (days.length < 5) return { need: 5 - days.length, list: [] };
  const avg = (arr, f) => arr.length ? arr.reduce((a, k) => a + f(st.days[k]), 0) / arr.length : null;
  const tests = [
    { t: 'slept 7h+', f: (d) => { const m = P.sleepDurationMin(d.sleep?.bed, d.sleep?.wake); return m != null && m >= 420; } },
    { t: 'ate 3 main meals', f: (d) => new Set(d.meals.filter((m) => m.slot !== 'snack').map((m) => m.slot)).size >= 3 },
    { t: 'drank 1.5 L+', f: (d) => d.waterMl >= 1500 },
    { t: 'ate breakfast', f: (d) => d.checks.breakfast },
    { t: 'had no coffee after cutoff', f: (d) => !d.coffee.some((c) => P.isAfterCutoff(c)) },
    { t: 'did pelvic-floor training', f: (d) => (d.pf || 0) > 0 },
    { t: 'went outdoors', f: (d) => d.checks.outdoors },
  ];
  for (const m of [{ key: 'energy', label: 'energy' }, { key: 'mood', label: 'mood' }]) {
    for (const tt of tests) {
      const yes = days.filter((k) => tt.f(st.days[k]) && st.days[k][m.key] != null); const no = days.filter((k) => !tt.f(st.days[k]) && st.days[k][m.key] != null);
      if (yes.length < 2 || no.length < 2) continue;
      const a = avg(yes, (d) => d[m.key] + 1), b = avg(no, (d) => d[m.key] + 1);
      const diff = a - b;
      if (Math.abs(diff) >= 0.5) out.push({ t: tt.t, metric: m.label, a, b, diff, n: yes.length + no.length });
    }
  }
  out.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  return { need: 0, list: out.slice(0, 4) };
}
function journalCard() {
  const st = S.get();
  const notes = Object.entries(st.days).filter(([, d]) => d.notes).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5);
  return `<div class="card"><div class="row between"><div class="kicker">Journal</div><button class="btn sm" data-journal>${S.day().notes ? 'Edit today' : '+ Write'}</button></div>
    ${notes.length ? notes.map(([k, d]) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="tiny muted">${S.prettyDate(k)} ${d.mood != null ? ['', '', '', '', ''][d.mood] : ''}</div><div class="small" style="white-space:pre-wrap;margin-top:4px">${UI.esc(d.notes)}</div></div>`).join('')
      : '<p class="muted small mt8">A line a day about what helped or got in the way. Patterns become obvious after a week.</p>'}</div>`;
}

function insightsCard() {
  const r = insights();
  return `<div class="card cool glow"><div class="kicker">Your patterns</div>
    ${r.need ? `<p class="muted small">Log energy & mood on ${r.need} more day${r.need === 1 ? '' : 's'} to unlock personal insights — what actually makes <i>you</i> feel better.</p>`
      : r.list.length ? r.list.map((x) => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="fs-lg">${x.diff > 0 ? '' : ''}</span><div class="grow small">On days you <b>${x.t}</b>, your ${x.metric} averages <b>${x.a.toFixed(1)}</b>/5 vs ${x.b.toFixed(1)}/5</div></div>`).join('') + '<p class="tiny faint mt8">Patterns, not proof — but your own data is the best motivator.</p>'
      : '<p class="muted small">No clear patterns yet. Keep logging — they usually appear after 1–2 weeks.</p>'}</div>`;
}

function food() {
  const st = S.get(); const tg = P.nutritionTargets(); const days = lastNDays(7);
  const kc = days.map((k) => ({ y: P.dayTotals(k).kcal, label: S.prettyDate(k, { weekday: 'narrow' }) }));
  const pr = days.map((k) => ({ y: P.dayTotals(k).protein, label: S.prettyDate(k, { weekday: 'narrow' }), color: '#34d399' }));
  const mealsPerDay = days.map((k) => new Set((st.days[k]?.meals || []).filter((m) => m.slot !== 'snack').map((m) => m.slot)).size);
  const today = S.day();
  return `
  <div class="card"><div class="row between"><div class="kicker">Calories · 7 days</div><span class="small muted">target ${tg.kcal}</span></div>${C.barChart(kc, { goal: tg.kcal, color: '#60a5fa' })}
    <p class="tiny muted">Target = estimated needs (${tg.tdee}) + ~300 kcal for slow gain. Build up gradually — no need to force it.</p></div>
  <div class="card"><div class="row between"><div class="kicker">Protein · 7 days</div><span class="small muted">target ${tg.protein} g</span></div>${C.barChart(pr, { goal: tg.protein, color: '#4ade80' })}</div>
  <div class="card"><div class="kicker">Main meals per day</div><div class="row" style="justify-content:space-around">${days.map((k, i) => `<div class="tc"><div class="meal-dots" role="img" aria-label="${mealsPerDay[i]} of 3 main meals">${[0, 1, 2].map((j) => `<i class="${j < mealsPerDay[i] ? 'on' : ''}"></i>`).join('')}</div><div class="tiny muted">${S.prettyDate(k, { weekday: 'narrow' })}</div></div>`).join('')}</div></div>
  <div class="section-title">Today’s meals <button class="link" data-logmeal>+ Log</button></div>
  <div class="card">${today.meals.length ? today.meals.map((m) => `<div class="list-item"><div class="li-ico">${UI.ICON.meal}</div><div class="grow"><b>${UI.esc(m.name)}</b><div class="muted small">${S.prettyTime(m.time)} · ${m.kcal} kcal · ${m.protein} g</div></div><button class="icon-btn" data-delmeal="${m.id}" aria-label="Delete">${UI.ICON.trash}</button></div>`).join('') : '<div class="empty"><span class="e"></span>No meals logged yet</div>'}</div>`;
}

function sleep() {
  const st = S.get(); const t = P.sleepTargets(); const days = lastNDays(14);
  const nights = days.map((k) => ({ k, ...(st.days[k]?.sleep || {}) })).filter((n) => n.bed && n.wake).map((n) => ({ bed: S.minutesOf(n.bed), wake: S.minutesOf(n.wake), label: S.prettyDate(n.k, { day: 'numeric' }), dur: P.sleepDurationMin(n.bed, n.wake), w: S.minutesOf(n.wake) }));
  const avgDur = nights.length ? nights.reduce((s, n) => s + n.dur, 0) / nights.length : 0;
  const anchor = S.minutesOf(st.profile.wakeAnchor);
  const devs = nights.map((n) => Math.abs(((n.w - anchor + 720 + 1440) % 1440) - 720));
  const avgDev = devs.length ? devs.reduce((a, b) => a + b, 0) / devs.length : null;
  const onAnchor = devs.filter((d) => d <= 30).length;
  return `
  <div class="card glow"><div class="kicker">Your plan</div>
    <div class="stats mt12"><div class="stat"><b>${S.prettyTime(t.wake)}</b><span>Wake anchor</span></div><div class="stat"><b>${S.prettyTime(t.bed)}</b><span>Bed tonight</span></div><div class="stat"><b>${S.prettyTime(t.ideal)}</b><span>Ideal bedtime</span></div></div>
    <p class="small muted mt12">${t.reached ? 'You’ve reached your ideal bedtime — hold it steady.' : `Bedtime moves 15 min earlier every 3 days · ~${t.daysLeft} days to go.`} Wind-down starts ${S.prettyTime(t.windDown)}.</p>
    <button class="btn sm mt12" data-sleepset>Adjust plan</button></div>
  <div class="card"><div class="kicker">Last 14 nights</div>${C.sleepChart(nights, { target: { bed: S.minutesOf(t.bed), wake: S.minutesOf(t.wake) } })}
    <div class="stats mt16"><div class="stat"><b>${nights.length ? `${Math.floor(avgDur / 60)}<small>h</small> ${Math.round(avgDur % 60)}<small>m</small>` : '—'}</b><span>Average sleep</span></div>
    <div class="stat"><b>${avgDev != null ? `±${Math.round(avgDev)}<small> min</small>` : '—'}</b><span>Wake drift</span></div>
    <div class="stat"><b>${onAnchor}<small> / ${nights.length}</small></b><span>On anchor</span></div></div></div>
  ${t.reached && onAnchor >= 5 && S.minutesOf(st.profile.wakeAnchor) > 7 * 60 ? `<div class="card cool glow"><div class="kicker">Level up your sleep </div><h3>Ready for the next step?</h3><p class="muted small">You hit your bedtime and woke on-anchor ${onAnchor} times recently. Move everything 30 min earlier — wake ${S.prettyTime(S.fmtMin(S.minutesOf(st.profile.wakeAnchor) - 30))}.</p><button class="btn cool block mt12" data-earlier>Shift 30 min earlier</button></div>` : ''}
  <button class="btn block" data-logsleep>Log last night</button>
  <div class="notice mt12">Wake drift = how far your wake-up time is from your anchor, on average. Get it under ±30 min first — that’s what fixes a random schedule.</div>`;
}

function body() {
  const st = S.get(); const ws = [...st.weights].sort((a, b) => a.date.localeCompare(b.date));
  const pts = ws.map((w) => ({ y: w.kg, label: S.prettyDate(w.date, { day: 'numeric', month: 'short' }) }));
  const first = ws[0]; const last = ws.at(-1);
  const weeks = first && last ? Math.max(1, S.daysBetween(first.date, last.date) / 7) : 1;
  const rate = first && last && ws.length > 1 ? (last.kg - first.kg) / weeks : null;
  const toGoal = last ? Math.max(0, st.profile.goalKgMin - last.kg) : null;
  const bmi = last ? last.kg / ((st.profile.heightCm / 100) ** 2) : null;
  return `
  <div class="card"><div class="stats"><div class="stat"><b>${last ? last.kg.toFixed(1) : '—'}<small> kg</small></b><span>Now</span></div><div class="stat"><b>${bmi ? bmi.toFixed(1) : '—'}</b><span>BMI</span></div><div class="stat"><b>${toGoal != null ? toGoal.toFixed(1) : '—'}<small> kg</small></b><span>To ${st.profile.goalKgMin} kg</span></div></div></div>
  <div class="card"><div class="kicker">Weight · goal zone ${st.profile.goalKgMin}–${st.profile.goalKgMax} kg</div>${C.lineChart(pts, { band: [st.profile.goalKgMin, st.profile.goalKgMax], unit: '' })}
    ${etaLine()}
    <p class="small mt8" style="color:${rate == null ? 'var(--muted)' : rate > 0.4 ? 'var(--amber)' : rate >= 0.05 ? 'var(--green)' : 'var(--muted)'}">${rate == null ? 'Weigh in weekly to see your trend.' : `<span>${rate >= 0 ? '+' : '−'}${Math.abs(rate).toFixed(2)} kg/week</span> · <span>${rate > 0.4 ? 'faster than planned — fine, but no need to push' : rate >= 0.05 ? 'right on track (0.1–0.25 target)' : 'flat — add a daily shake'}</span>`}</p></div>
  <button class="btn primary block" data-weigh>Weigh in</button>
  <div class="card mt12"><div class="kicker">History</div>${ws.length ? [...ws].reverse().map((w) => `<div class="list-item"><div class="grow"><b>${w.kg.toFixed(1)} kg</b><div class="muted small">${S.prettyDate(w.date)}</div></div><button class="icon-btn" data-delw="${w.date}">${UI.ICON.trash}</button></div>`).join('') : '<div class="empty">No weigh-ins</div>'}</div>`;
}

function etaLine() {
  const tr = weightTrend(); const goal = S.get().profile.goalKgMin;
  if (!tr) return '';
  if (tr.eta === 'reached') return `<p class="small mt8" style="color:var(--green);font-weight:700">Trend is in your goal zone. Now hold it.</p>`;
  if (!tr.eta) return `<p class="small mt8 muted">Trend ${tr.perWeek >= 0 ? '+' : ''}${tr.perWeek.toFixed(2)} kg/week — not climbing yet, so no goal date. One extra shake a day (≈+300 kcal) usually starts it moving.</p>`;
  const eta = /** @type {Date} */ (tr.eta);
  return `<p class="small mt8"><span>At ${tr.perWeek.toFixed(2)} kg/week you reach ${goal} kg by</span> <b>${eta.toLocaleDateString(S.uiLocale(), { day: 'numeric', month: 'long', year: eta.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}</b></p>`;
}

function sxCard() {
  const log = (S.get().sxLog || []).filter((x) => x.date >= S.addDays(S.dayKey(), -28));
  const n = log.length; const pct = (f) => n ? Math.round(log.filter(f).length / n * 100) : 0;
  return `<div class="card"><div class="row between"><div><div class="kicker">Private log · 28 days</div><div class="tiny muted">${n} entries</div></div><button class="btn sm primary" data-sx>+ Log</button></div>
    ${n ? `<div class="grid3 mt12"><div class="macro"><b>${pct((x) => x.firm >= 3)}%</b><span>firm enough</span></div><div class="macro"><b>${pct((x) => x.kept === 2)}%</b><span>kept it</span></div><div class="macro"><b>${pct((x) => x.semen === 2)}%</b><span>dry</span></div></div>
    <div class="grid2 mt8"><div class="macro"><b>${pct((x) => x.time <= 1)}%</b><span>under 2 min</span></div><div class="macro"><b>${pct((x) => x.anxious)}%</b><span>felt pressure</span></div></div>` : '<p class="muted small mt8">Optional. Log after any sexual activity — it shows your doctor patterns (e.g. solo vs partner, dry orgasms) that questionnaires miss.</p>'}</div>`;
}

function checkins() {
  const st = S.get(); const weeks = Object.keys(st.checkins).sort();
  const series = (type, f) => weeks.filter((w) => st.checkins[w][type]).map((w) => ({ y: f(st.checkins[w][type].score), label: S.prettyDate(w, { day: 'numeric', month: 'short' }) }));
  const wk = S.weekKey(); const cur = st.checkins[wk] || {};
  const block = (type, label, f, opts, desc) => `<div class="card"><div class="row between"><div><div class="kicker">${CHECKINS[type].e} ${label}</div><div class="tiny muted">${desc}</div></div><button class="btn sm ${cur[type] ? '' : 'primary'}" data-ci="${type}">${cur[type] ? 'Redo' : 'Do now'}</button></div>${C.lineChart(series(type, f), opts)}</div>`;
  return `
  <p class="muted small mb12">One set per week. Higher = better for erection & energy; lower = better for mood.</p>
  ${block('erection', 'Erection & confidence', (s) => s.pct, { min: 0, max: 100, color: '#ff6b6b', unit: '%' }, 'Score out of 100')}
  ${block('mood', 'Mood & worry (PHQ-4)', (s) => s.total, { min: 0, max: 12, color: '#a78bfa' }, '0–2 normal · 3–5 mild · 6–8 moderate · 9–12 severe')}
  ${block('energy', 'Energy & cold', (s) => s.pct, { min: 0, max: 100, color: '#5aa9ff', unit: '%' }, 'Score out of 100')}
  ${sxCard()}
  <a class="btn block" href="#me/summary">Doctor summary</a>`;
}

function sleepSettings(rerender) {
  const p = S.get().profile;
  UI.openSheet(`<h2>Sleep plan</h2>
    <div class="field"><label>Wake anchor (every day)</label><input type="time" id="ss-wake" value="${p.wakeAnchor}"></div>
    <div class="field"><label>Current usual bedtime (starting point)</label><input type="time" id="ss-bed" value="${p.currentBedtime}"></div>
    <div class="field"><label>Time in bed needed</label><select id="ss-need">${[450, 480, 510, 540].map((m) => `<option value="${m}" ${p.sleepNeedMin === m ? 'selected' : ''}>${m / 60} h</option>`).join('')}</select></div>
    <div class="field"><label>Coffee cutoff</label><input type="time" id="ss-cut" value="${p.caffeineCutoff}"></div>
    <label class="row mt12 gap10"><input type="checkbox" id="ss-restart" class="sz22"><span>Restart gradual shift from today</span></label>
    <button class="btn primary block mt16" id="ss-save">Save</button>`, {
    onMount: (sh, close) => sh.querySelector('#ss-save').onclick = () => {
      p.wakeAnchor = sh.querySelector('#ss-wake').value || p.wakeAnchor; p.currentBedtime = sh.querySelector('#ss-bed').value || p.currentBedtime;
      p.sleepNeedMin = +sh.querySelector('#ss-need').value; p.caffeineCutoff = sh.querySelector('#ss-cut').value || p.caffeineCutoff;
      if (sh.querySelector('#ss-restart').checked) p.bedShiftStartedOn = S.dayKey();
      S.save(); close(); UI.toast('Sleep plan updated — re-import reminders in Me', ''); rerender();
    },
  });
}

export function bind(root, _, { rerender }) {
  const st = S.get();
  root.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { tab = b.dataset.tab; rerender(); });
  root.querySelector('[data-logmeal]')?.addEventListener('click', () => Sh.mealSheet(rerender));
  root.querySelectorAll('[data-delmeal]').forEach((b) => b.onclick = () => {
    const d = S.day(); const idx = d.meals.findIndex((m) => m.id === b.dataset.delmeal); if (idx < 0) return;
    const [removed] = d.meals.splice(idx, 1); d.removedMeals = [...(d.removedMeals || []), removed.id]; S.save(); rerender();
    UI.undoToast(`Removed ${removed.name}`, () => { d.meals.splice(idx, 0, removed); d.removedMeals = (d.removedMeals || []).filter((x) => x !== removed.id); S.save(); rerender(); });
  });
  root.querySelector('[data-sleepset]')?.addEventListener('click', () => sleepSettings(rerender));
  root.querySelector('[data-earlier]')?.addEventListener('click', (ev) => {
    const p = st.profile; const t = P.sleepTargets();
    p.wakeAnchor = S.fmtMin(S.minutesOf(p.wakeAnchor) - 30); p.currentBedtime = t.bed; p.bedShiftStartedOn = S.dayKey();
    S.save(); G.award('sleep_level_' + p.wakeAnchor, 60, ev); UI.toast('New anchor set — update your Calendar reminders', ''); rerender();
  });
  root.querySelector('[data-logsleep]')?.addEventListener('click', () => Sh.sleepSheet(rerender));
  root.querySelector('[data-weigh]')?.addEventListener('click', () => Sh.weighSheet(rerender));
  root.querySelectorAll('[data-delw]').forEach((b) => b.onclick = () => {
    const removed = st.weights.find((w) => w.date === b.dataset.delw); if (!removed) return;
    st.weights = st.weights.filter((w) => w !== removed); S.save(); rerender();
    UI.undoToast(`Removed ${removed.kg.toFixed(1)} kg`, () => { st.weights.push(removed); st.weights.sort((a, b) => a.date.localeCompare(b.date)); S.save(); rerender(); });
  });
  root.querySelectorAll('[data-ci]').forEach((b) => b.onclick = () => Sh.checkinSheet(b.dataset.ci, rerender));
  root.querySelector('[data-journal]')?.addEventListener('click', () => Sh.energySheet(rerender));
  root.querySelector('[data-sx]')?.addEventListener('click', () => Sh.sxSheet(rerender));
}

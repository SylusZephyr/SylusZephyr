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
  const st = S.get(); const days = lastNDays(35); const wk = P.programWeek();
  const prog = P.PROGRAM[Math.min(3, wk - 1)];
  const firstWd = (S.keyToDate(days[0]).getDay() + 6) % 7;
  const avg7 = lastNDays(7).reduce((s, k) => s + G.essentialsDone(k), 0) / 7;
  return `
  <div class="grid3">
    <div class="macro"><b>🔥 ${G.streak()}</b><span>streak</span></div>
    <div class="macro"><b>${st.game.bestStreak}</b><span>best</span></div>
    <div class="macro"><b>${avg7.toFixed(1)}</b><span>avg /7 this wk</span></div>
  </div>
  <div class="card mt12"><div class="kicker">Last 5 weeks · essentials per day</div>
    <div class="heat mt8">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span class="tiny muted" style="text-align:center">${x}</span>`).join('')}
    ${Array.from({ length: firstWd }, () => '<i style="background:transparent"></i>').join('')}
    ${days.map((k) => { const n = G.essentialsDone(k); const fr = st.game.frozen?.[k]; return `<i class="${n >= 7 ? 'l4' : n >= 5 ? 'l3' : n >= 3 ? 'l2' : n >= 1 ? 'l1' : ''} ${k === S.dayKey() ? 'today' : ''}" style="${fr ? 'background:rgba(90,169,255,.35)' : ''}" title="${k}: ${n}/7"></i>`; }).join('')}</div>
    <div class="legend"><span><i style="background:var(--surface2)"></i>0</span><span><i style="background:rgba(52,211,153,.45)"></i>3–4</span><span><i style="background:rgba(52,211,153,.7)"></i>5–6 (streak)</span><span><i style="background:var(--green)"></i>7</span><span><i style="background:rgba(90,169,255,.35)"></i>freeze</span></div>
  </div>
  <div class="card cool glow"><div class="kicker">4-week plan · week ${Math.min(wk, 4)}${wk > 4 ? ' (maintenance)' : ''}</div><h3>${UI.esc(prog.t)}</h3>
    ${prog.goals.map((g) => `<div class="small" style="padding:4px 0">• ${UI.esc(g)}</div>`).join('')}</div>
  ${insightsCard()}
  ${journalCard()}
  <div class="card"><div class="kicker">Daily XP · 14 days</div>${C.barChart(lastNDays(14).map((k) => ({ y: st.days[k]?.xpToday || 0, label: S.prettyDate(k, { day: 'numeric' }), color: k === S.dayKey() ? '#ffb547' : '#5aa9ff' })), { h: 120 })}</div>`;
}

// Personal insights: compare average energy/mood on days with vs without a habit.
export function insights() {
  const st = S.get(); const out = [];
  const days = Object.keys(st.days).filter((k) => st.days[k].energy != null && k < S.dayKey() || (k === S.dayKey() && st.days[k].energy != null));
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
  return `<div class="card"><div class="row between"><div class="kicker">📓 Journal</div><button class="btn sm" data-journal>${S.day().notes ? 'Edit today' : '+ Write'}</button></div>
    ${notes.length ? notes.map(([k, d]) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="tiny muted">${S.prettyDate(k)} ${d.mood != null ? ['😞', '😕', '😐', '🙂', '😄'][d.mood] : ''}</div><div class="small" style="white-space:pre-wrap;margin-top:4px">${UI.esc(d.notes)}</div></div>`).join('')
      : '<p class="muted small mt8">A line a day about what helped or got in the way. Patterns become obvious after a week.</p>'}</div>`;
}

function insightsCard() {
  const r = insights();
  return `<div class="card cool glow"><div class="kicker">🔍 Your patterns</div>
    ${r.need ? `<p class="muted small">Log energy & mood on ${r.need} more day${r.need === 1 ? '' : 's'} to unlock personal insights — what actually makes <i>you</i> feel better.</p>`
      : r.list.length ? r.list.map((x) => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span style="font-size:20px">${x.diff > 0 ? '📈' : '📉'}</span><div class="grow small">On days you <b>${x.t}</b>, your ${x.metric} averages <b>${x.a.toFixed(1)}</b>/5 vs ${x.b.toFixed(1)}/5</div></div>`).join('') + '<p class="tiny faint mt8">Patterns, not proof — but your own data is the best motivator.</p>'
      : '<p class="muted small">No clear patterns yet. Keep logging — they usually appear after 1–2 weeks.</p>'}</div>`;
}

function food() {
  const st = S.get(); const tg = P.nutritionTargets(); const days = lastNDays(7);
  const kc = days.map((k) => ({ y: P.dayTotals(k).kcal, label: S.prettyDate(k, { weekday: 'narrow' }) }));
  const pr = days.map((k) => ({ y: P.dayTotals(k).protein, label: S.prettyDate(k, { weekday: 'narrow' }), color: '#34d399' }));
  const mealsPerDay = days.map((k) => new Set((st.days[k]?.meals || []).filter((m) => m.slot !== 'snack').map((m) => m.slot)).size);
  const today = S.day();
  return `
  <div class="card"><div class="row between"><div class="kicker">Calories · 7 days</div><span class="small muted">target ${tg.kcal}</span></div>${C.barChart(kc, { goal: tg.kcal, color: '#ffb547' })}
    <p class="tiny muted">Target = estimated needs (${tg.tdee}) + ~300 kcal for slow gain. Build up gradually — no need to force it.</p></div>
  <div class="card"><div class="row between"><div class="kicker">Protein · 7 days</div><span class="small muted">target ${tg.protein} g</span></div>${C.barChart(pr, { goal: tg.protein })}</div>
  <div class="card"><div class="kicker">Main meals per day</div><div class="row" style="justify-content:space-around">${days.map((k, i) => `<div style="text-align:center"><div style="font-size:20px">${['😶', '🙂', '😋', '🔥'][mealsPerDay[i]]}</div><div class="tiny muted">${S.prettyDate(k, { weekday: 'narrow' })}</div></div>`).join('')}</div></div>
  <div class="section-title">Today’s meals <button class="link" data-logmeal>+ Log</button></div>
  <div class="card">${today.meals.length ? today.meals.map((m) => `<div class="list-item"><div class="li-ico">${P.SLOT_EMOJI[m.slot] || '🍽️'}</div><div class="grow"><b>${UI.esc(m.name)}</b><div class="muted small">${S.prettyTime(m.time)} · ${m.kcal} kcal · ${m.protein} g</div></div><button class="icon-btn" data-delmeal="${m.id}" aria-label="Delete">${UI.ICON.trash}</button></div>`).join('') : '<div class="empty"><span class="e">🍽️</span>No meals logged yet</div>'}</div>`;
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
    <div class="grid3 mt8"><div class="macro"><b>${S.prettyTime(t.wake)}</b><span>wake anchor</span></div><div class="macro"><b>${S.prettyTime(t.bed)}</b><span>bed tonight</span></div><div class="macro"><b>${S.prettyTime(t.ideal)}</b><span>ideal bed</span></div></div>
    <p class="small muted mt12">${t.reached ? 'You’ve reached your ideal bedtime — hold it steady.' : `Bedtime moves 15 min earlier every 3 days · ~${t.daysLeft} days to go.`} Wind-down starts ${S.prettyTime(t.windDown)}.</p>
    <button class="btn sm mt12" data-sleepset>Adjust plan</button></div>
  <div class="card"><div class="kicker">Last 14 nights</div>${C.sleepChart(nights.slice(-10), { target: { bed: S.minutesOf(t.bed), wake: S.minutesOf(t.wake) } })}
    <div class="grid3 mt12"><div class="macro"><b>${nights.length ? `${Math.floor(avgDur / 60)}h${Math.round(avgDur % 60)}` : '—'}</b><span>avg sleep</span></div>
    <div class="macro"><b>${avgDev != null ? `±${Math.round(avgDev)}m` : '—'}</b><span>wake drift</span></div>
    <div class="macro"><b>${onAnchor}/${nights.length}</b><span>on anchor</span></div></div></div>
  ${t.reached && onAnchor >= 5 && S.minutesOf(st.profile.wakeAnchor) > 7 * 60 ? `<div class="card cool glow"><div class="kicker">Level up your sleep 🌅</div><h3>Ready for the next step?</h3><p class="muted small">You hit your bedtime and woke on-anchor ${onAnchor} times recently. Move everything 30 min earlier — wake ${S.prettyTime(S.fmtMin(S.minutesOf(st.profile.wakeAnchor) - 30))}.</p><button class="btn cool block mt12" data-earlier>Shift 30 min earlier</button></div>` : ''}
  <button class="btn block" data-logsleep>🌙 Log last night</button>
  <div class="notice mt12">Wake drift = how far your wake-up time is from your anchor, on average. Get it under ±30 min first — that’s what fixes a random schedule.</div>`;
}

function body() {
  const st = S.get(); const ws = [...st.weights].sort((a, b) => a.date.localeCompare(b.date));
  const pts = ws.map((w) => ({ y: w.kg, label: S.prettyDate(w.date, { day: 'numeric', month: 'short' }) }));
  const first = ws[0]; const last = ws.at(-1);
  const weeks = first && last ? Math.max(1, (S.keyToDate(last.date) - S.keyToDate(first.date)) / (7 * 86400000)) : 1;
  const rate = first && last && ws.length > 1 ? (last.kg - first.kg) / weeks : null;
  const toGoal = last ? Math.max(0, st.profile.goalKgMin - last.kg) : null;
  const bmi = last ? last.kg / ((st.profile.heightCm / 100) ** 2) : null;
  return `
  <div class="grid3"><div class="macro"><b>${last ? last.kg.toFixed(1) : '—'}</b><span>kg now</span></div><div class="macro"><b>${bmi ? bmi.toFixed(1) : '—'}</b><span>BMI</span></div><div class="macro"><b>${toGoal != null ? toGoal.toFixed(1) : '—'}</b><span>kg to 66</span></div></div>
  <div class="card mt12"><div class="kicker">Weight · goal zone 66–68 kg</div>${C.lineChart(pts, { band: [st.profile.goalKgMin, st.profile.goalKgMax], unit: '' })}
    <p class="small mt8" style="color:${rate == null ? 'var(--muted)' : rate > 0.4 ? 'var(--amber)' : rate >= 0.05 ? 'var(--green)' : 'var(--muted)'}">${rate == null ? 'Weigh in weekly to see your trend.' : `${rate >= 0 ? '+' : ''}${rate.toFixed(2)} kg/week · ${rate > 0.4 ? 'faster than planned — fine, but no need to push' : rate >= 0.05 ? 'right on track (0.1–0.25 target)' : 'flat — add a daily shake'}`}</p></div>
  <button class="btn primary block" data-weigh>⚖️ Weigh in</button>
  <div class="card mt12"><div class="kicker">History</div>${ws.length ? [...ws].reverse().map((w) => `<div class="list-item"><div class="grow"><b>${w.kg.toFixed(1)} kg</b><div class="muted small">${S.prettyDate(w.date)}</div></div><button class="icon-btn" data-delw="${w.date}">${UI.ICON.trash}</button></div>`).join('') : '<div class="empty">No weigh-ins</div>'}</div>`;
}

function sxCard() {
  const log = (S.get().sxLog || []).filter((x) => x.date >= S.addDays(S.dayKey(), -28));
  const n = log.length; const pct = (f) => n ? Math.round(log.filter(f).length / n * 100) : 0;
  return `<div class="card"><div class="row between"><div><div class="kicker">🔒 Private log · 28 days</div><div class="tiny muted">${n} entries</div></div><button class="btn sm primary" data-sx>+ Log</button></div>
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
  <a class="btn block" href="#me/summary">🖨️ Doctor summary</a>`;
}

function sleepSettings(rerender) {
  const p = S.get().profile;
  UI.openSheet(`<h2>Sleep plan</h2>
    <div class="field"><label>Wake anchor (every day)</label><input type="time" id="ss-wake" value="${p.wakeAnchor}"></div>
    <div class="field"><label>Current usual bedtime (starting point)</label><input type="time" id="ss-bed" value="${p.currentBedtime}"></div>
    <div class="field"><label>Time in bed needed</label><select id="ss-need">${[450, 480, 510, 540].map((m) => `<option value="${m}" ${p.sleepNeedMin === m ? 'selected' : ''}>${m / 60} h</option>`).join('')}</select></div>
    <div class="field"><label>Coffee cutoff</label><input type="time" id="ss-cut" value="${p.caffeineCutoff}"></div>
    <label class="row mt12" style="gap:10px"><input type="checkbox" id="ss-restart" style="width:22px;height:22px"><span>Restart gradual shift from today</span></label>
    <button class="btn primary block mt16" id="ss-save">Save</button>`, {
    onMount: (sh, close) => sh.querySelector('#ss-save').onclick = () => {
      p.wakeAnchor = sh.querySelector('#ss-wake').value || p.wakeAnchor; p.currentBedtime = sh.querySelector('#ss-bed').value || p.currentBedtime;
      p.sleepNeedMin = +sh.querySelector('#ss-need').value; p.caffeineCutoff = sh.querySelector('#ss-cut').value || p.caffeineCutoff;
      if (sh.querySelector('#ss-restart').checked) p.bedShiftStartedOn = S.dayKey();
      S.save(); close(); UI.toast('Sleep plan updated — re-import reminders in Me', '🌙'); rerender();
    },
  });
}

export function bind(root, _, { rerender }) {
  const st = S.get();
  root.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { tab = b.dataset.tab; rerender(); });
  root.querySelector('[data-logmeal]')?.addEventListener('click', () => Sh.mealSheet(rerender));
  root.querySelectorAll('[data-delmeal]').forEach((b) => b.onclick = () => {
    const d = S.day(); const idx = d.meals.findIndex((m) => m.id === b.dataset.delmeal); if (idx < 0) return;
    const [removed] = d.meals.splice(idx, 1); S.save(); rerender();
    UI.undoToast(`Removed ${removed.name}`, () => { d.meals.splice(idx, 0, removed); S.save(); rerender(); });
  });
  root.querySelector('[data-sleepset]')?.addEventListener('click', () => sleepSettings(rerender));
  root.querySelector('[data-earlier]')?.addEventListener('click', (ev) => {
    const p = st.profile; const t = P.sleepTargets();
    p.wakeAnchor = S.fmtMin(S.minutesOf(p.wakeAnchor) - 30); p.currentBedtime = t.bed; p.bedShiftStartedOn = S.dayKey();
    S.save(); G.award('sleep_level_' + p.wakeAnchor, 60, ev); UI.toast('New anchor set — update your Calendar reminders', '🌅'); rerender();
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

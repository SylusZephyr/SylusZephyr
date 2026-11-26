import * as S from '../store.js';
import * as UI from '../ui.js';
import * as G from '../gamify.js';
import * as P from '../plan.js';
import * as Sh from './shared.js';
import { suggest, planToday, art } from './cook.js';
import * as Search from './search.js';
import * as Caf from '../caffeine.js';
import * as Pr from '../prayer.js';
import * as Progress from '../progress.js';
import * as Cloud from '../cloud.js';

const I = UI.ICON;
const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes();
// Minutes since the 4 AM day boundary, so late-night items sort after evening ones.
const dm = (min) => ((min - S.DAY_ROLLOVER_HOUR * 60) + 1440) % 1440;

const FAST_ESS = { breakfast: 'Suhoor before dawn', lunch: 'Late meal', dinner: 'Iftar', caffeine: 'No coffee in the 6 h before bed' };
const ESS_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', fluids: 'Fluids, 1.5 L or more', sleep: 'Sleep plan', outdoors: 'Time outdoors', caffeine: 'No coffee after cutoff' };
function essLabel(e) { return (Pr.fasting() && FAST_ESS[e.id]) || ESS_LABEL[e.id] || e.label; }

function greeting() {
  const h = new Date().getHours(); const n = S.get().profile.name;
  const g = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Late night';
  return n ? `<span>${g}</span>, ${UI.esc(n.split(' ')[0])}` : g;
}

// Three rings, Apple-Fitness style: essentials, calories, water.
function rings(vals) {
  const R = [58, 44, 30], W = 11, C = 66;
  return `<div class="rings" role="img" aria-label="${vals.map((v) => `${v.label} ${Math.round(v.pct * 100)}%`).join(', ')}"><svg viewBox="0 0 132 132">
    ${vals.map((v, i) => { const c = 2 * Math.PI * R[i]; const off = c * (1 - Math.max(0, Math.min(1, v.pct)));
      return `<circle class="track" cx="${C}" cy="${C}" r="${R[i]}" stroke-width="${W}"/><circle cx="${C}" cy="${C}" r="${R[i]}" stroke-width="${W}" stroke="${v.color}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>`; }).join('')}
  </svg></div>`;
}

// What matters next, in time order. Replaces scattered nudges and banners.
export function upNext(now = new Date()) {
  const st = S.get(); const d = S.day(); const m = nowMin(now); const items = [];
  const mt = P.mealTimes(); const t = P.sleepTargets(); const fasting = Pr.fasting(now);
  const add = (o) => items.push(o);
  const wake = S.minutesOf(st.profile.wakeAnchor);
  if (!d.sleep.wake && dm(m) < dm(wake) + 300) add({ id: 'sleep', at: wake, icon: I.moon, t: 'Log last night', s: 'Bed and wake time', act: 'sleep', now: true });
  for (const slot of ['breakfast', 'lunch', 'dinner']) {
    if (d.checks[slot]) continue;
    const at = S.minutesOf(mt[slot]); const late = dm(m) - dm(at);
    if (late > 180) continue; // missed — don't nag hours later
    add({ id: slot, at, icon: I.meal, t: P.SLOT_LABEL[slot], s: late >= 0 ? 'Due now — tap to log' : planToday(slot) ? UI.esc(planToday(slot).name) : 'Tap to log', act: 'meal:' + slot, now: late >= 0 });
  }
  if (!fasting) {
    const cut = S.minutesOf(st.profile.caffeineCutoff);
    if (dm(cut) > dm(m)) add({ id: 'cutoff', at: cut, icon: I.cup, t: 'Coffee cutoff', s: 'Water or decaf after this', act: 'none' });
  }
  const cfg = Pr.settings();
  if (cfg.enabled) { const nx = Pr.next(now); add({ id: 'prayer', at: nx.min % 1440, icon: I.crescent, t: nx.label, s: `in ${Pr.countdown(nx.inMin)}`, act: 'prayer', soon: nx.inMin <= 20 }); }
  if (fasting) { const f = Pr.fastWindow(now); if (f.state === 'fasting') add({ id: 'iftar', at: f.iftar, icon: I.crescent, t: 'Iftar', s: `in ${Pr.countdown(f.toIftar)}`, act: 'none' }); }
  add({ id: 'winddown', at: S.minutesOf(t.windDown), icon: I.moon, t: 'Wind down', s: 'Lights low, screens away', act: 'breath' });
  add({ id: 'bed', at: S.minutesOf(t.bed), icon: I.bed, t: 'Bedtime', s: t.reached ? 'Target reached — hold it' : `Moving 15 min earlier every 3 days`, act: 'none' });
  const upcoming = items.filter((x) => x.now || dm(x.at) >= dm(m) - 5).sort((a, b) => (b.now - a.now) || dm(a.at) - dm(b.at));
  const extra = [];
  if ((d.pf || 0) < 3 && dm(m) > dm(wake) + 120) extra.push({ id: 'pf', icon: I.pulse, t: 'Pelvic-floor session', s: `${d.pf || 0} of 3 today · 2 min`, act: 'train', anytime: true });
  // Data lives on this phone unless sync is on: ask for a backup file about once a month.
  const ageDays = (Date.now() - (st.createdAt || Date.now())) / 864e5; const sinceBackup = (Date.now() - (st.lastExportAt || 0)) / 864e5;
  if (!Cloud.status.user && ageDays > 14 && sinceBackup > 30) extra.push({ id: 'backup', icon: I.share, t: 'Back up your progress', s: 'Save a file in case this phone is lost', act: 'backup', anytime: true });
  if (d.energy == null && dm(m) > dm(wake) + 240) extra.push({ id: 'energy', icon: I.mood, t: 'How do you feel?', s: 'Energy and mood, 10 seconds', act: 'energy', anytime: true });
  return [...upcoming.slice(0, 3), ...extra].slice(0, 5);
}

function weekDue() {
  const st = S.get(); const wk = S.weekKey(); const ci = st.checkins[wk] || {};
  const due = ['erection', 'mood', 'energy'].filter((x) => !ci[x]);
  if (!st.weights.some((w) => S.weekKey(w.date) === wk)) due.unshift('weigh');
  return due;
}

function cafCard(k) {
  const d = S.get().days[k]; const sum = Caf.summary(k);
  if (!d?.coffee?.length && sum.now < 10) return '';
  const tone = sum.safeAtBed ? 'var(--green)' : 'var(--coral)';
  return `<div class="card mt12 caf-card">
    <div class="row between"><div class="kicker">Caffeine</div><span class="pill ${sum.overLimit ? 'coral' : ''}">${sum.total} mg today</span></div>
    <div class="grid2 mt8"><div class="macro"><b>≈${sum.now} mg</b><span>right now</span></div>
      <div class="macro"><b style="color:${tone}">≈${sum.atBed} mg</b><span>at bed (${S.prettyTime(sum.bedClock)})</span></div></div>
    ${Caf.curveSvg(k)}
    <p class="small muted mt8">${sum.safeAtBed
      ? (sum.ifOneMore >= Caf.SLEEP_SAFE_MG ? `Another cup now would leave ≈${sum.ifOneMore} mg at your ${S.prettyTime(sum.bedClock)} bedtime — enough to delay sleep.` : `You have room: one more cup still clears before ${S.prettyTime(sum.bedClock)}.`)
      : `Still ≈${sum.atBed} mg at bedtime. Expect it to take longer to fall asleep${sum.clearClock ? `; it drops below ${Caf.SLEEP_SAFE_MG} mg around ${S.prettyTime(sum.clearClock)}` : ''}. Dim lights and skip screens to help.`}
      ${sum.overLimit ? ` Over ${Caf.DAILY_LIMIT_MG} mg today — that can raise heart rate and anxiety.` : ''}</p>
    
  </div>`;
}

function drinkSheet(onDone, onRemove) {
  const d = S.day();
  UI.openSheet(`<h2>Log a drink</h2><p class="muted small mt8">Your usual cup is ${Caf.cupMg()} mg. Change it in Settings.</p>
    <div class="mt12">${Caf.DRINKS.map((x) => `<button class="list-item" data-mg="${x.mg}"><div class="grow"><b>${x.label}</b></div><span class="muted small">${x.mg} mg</span></button>`).join('')}</div>
    ${d.coffee.length ? `<button class="btn block mt12" data-rm>Remove last (${S.prettyTime(d.coffee.at(-1))})</button>` : ''}`, {
    onMount: (sh, close) => {
      sh.querySelectorAll('[data-mg]').forEach((b) => b.onclick = () => { close(); onDone(+b.dataset.mg); });
      sh.querySelector('[data-rm]')?.addEventListener('click', () => { close(); onRemove(); });
    },
  });
}

function challengeCard() {
  const c = Progress.thisWeek();
  return `<section class="card challenge ${c.done ? 'done' : ''}">
    <div class="row between"><div class="kicker m0">This week’s challenge</div><span class="small muted">${c.done ? 'Complete' : c.daysLeft ? `${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'} left` : 'Last day'}</span></div>
    <h3 class="mt8">${UI.esc(c.t)}</h3>
    <div class="segbar mt12" role="img" aria-label="${c.value} of ${c.goal}">${Array.from({ length: c.goal }, (_, i) => `<i class="${i < c.value ? 'on' : ''}"></i>`).join('')}</div>
    <div class="row between mt8 small"><span class="muted">${c.done ? 'Earned 150 XP and a streak freeze' : UI.esc(c.why)}</span><b style="white-space:nowrap;margin-left:12px">${c.value} / ${c.goal}</b></div>
  </section>`;
}

function prayerCard() {
  const cfg = Pr.settings(); const now = new Date();
  const fast = Pr.fasting(now) ? Pr.fastWindow(now) : null;
  if (!cfg.enabled && !fast) return '';
  const nx = Pr.next(now); const list = Pr.todayList(now);
  return `<div class="card prayer-card">
    ${fast ? `<div class="row between"><div class="kicker">${Pr.isRamadanDate(now) ? `Ramadan${Pr.hijri(now) ? `, day ${Pr.hijri(now).day}` : ''}` : 'Fasting'}</div><span class="small muted">${Pr.countdown(fast.lengthMin)} fast</span></div>
      <h3>${fast.state === 'fasting' ? `Iftar in ${Pr.countdown(fast.toIftar)}` : fast.state === 'suhoor' ? `Suhoor ends in ${Pr.countdown(fast.toSuhoorEnd)}` : 'Fast complete'}</h3>
      <div class="lvlbar mt8 fastbar"><i style="width:${Math.round(fast.pct * 100)}%"></i></div>
      <div class="row between tiny mt8 muted"><span>Suhoor ${S.prettyTime(fast.suhoorClock)}</span><span>Iftar ${S.prettyTime(fast.iftarClock)}</span></div>` : ''}
    ${cfg.enabled ? `<div class="row between ${fast ? 'mt12' : ''}"><div class="kicker">${UI.esc(cfg.cityName.split(' ')[0])}</div><span class="small"><span>${nx.label}</span> <span>in ${Pr.countdown(nx.inMin)}</span></span></div>
    <div class="prayer-row mt8">${list.map((p) => `<div class="pr ${p.id === nx.id && !nx.tomorrow ? 'next' : ''} ${p.id === 'sunrise' ? 'faint' : ''}"><span>${p.label}</span><b>${p.clock ? S.prettyTime(p.clock).replace(/(am|pm)$/, '<small>$1</small>') : '—'}</b></div>`).join('')}</div>` : ''}
  </div>`;
}

export function render(_, { night }) {
  const st = S.get(); const k = S.dayKey(); const d = S.day(k);
  const streak = G.streak(); const n = G.essentialsDone(k);
  const tg = P.nutritionTargets(); const tot = P.dayTotals(k);
  const slot = P.currentSlot(); const planned = planToday(slot);
  let sug = suggest({ slot })[0];
  if (planned) sug = suggest({ slot }).find((x) => x.r.id === planned.id) || sug;
  const goalMl = st.profile.waterGoalMl; const due = weekDue();
  const sleepMin = d.sleep.wake ? P.sleepDurationMin(d.sleep.bed, d.sleep.wake) : null;
  const next = upNext();
  const ringVals = [
    { label: 'Essentials', pct: n / 7, color: 'var(--ring-1)' },
    { label: 'Calories', pct: tot.kcal / tg.kcal, color: 'var(--ring-2)' },
    { label: 'Water', pct: d.waterMl / goalMl, color: 'var(--ring-3)' },
  ];
  const a = sug ? art(sug.r) : null;

  return `
  <header class="t-head">
    <div class="t-top">
      <div class="date">${S.prettyDate(k, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <div class="actions">
        ${streak ? `<span class="streak-chip" title="Streak: days with 5 or more essentials">${I.flame}<span data-count="${streak}">${streak}</span></span>` : ''}
        <button class="icon-btn" data-search aria-label="Search">${I.search}</button>
      </div>
    </div>
    <h1>${greeting()}</h1>
  </header>
  <div class="t-grid"><div class="t-col">
  <section class="card">
    <div class="summary">
      ${rings(ringVals)}
      <div class="legend-v">
        <div class="lg"><i class="dot" style="background:var(--ring-1)"></i><span class="k">Essentials</span><span class="v">${n}<small> / 7</small></span></div>
        <div class="lg"><i class="dot" style="background:var(--ring-2)"></i><span class="k">Calories</span><span class="v">${tot.kcal.toLocaleString('en')}<small> / ${tg.kcal.toLocaleString('en')}</small></span></div>
        <div class="lg"><i class="dot" style="background:var(--ring-3)"></i><span class="k">Water</span><span class="v">${(d.waterMl / 1000).toFixed(1)}<small> / ${(goalMl / 1000).toFixed(1)} L</small></span></div>
      </div>
    </div>
    <div class="summary-foot"><span>Protein <b>${tot.protein}</b> / ${tg.protein} g</span><span>${n >= G.STREAK_THRESHOLD ? '<b>Day secured</b>' : `<b>${G.STREAK_THRESHOLD - n}</b> more to keep the streak`}</span></div>
  </section>

  <div class="quick">
    <button class="qk" data-logmeal aria-label="Log a meal">${I.meal}<b>${d.meals.length}</b><span>Meals</span></button>
    <button class="qk" data-water="250" aria-label="Add 250 ml water">${I.drop}<b>${(d.waterMl / 1000).toFixed(2).replace(/0$/, '')} L</b><span>+250 ml</span></button>
    <button class="qk" data-drinks aria-label="Log coffee or tea">${I.cup}<b>${d.coffee.length}</b><span>Coffee</span></button>
    <button class="qk" data-sleep aria-label="Log sleep">${I.moon}<b>${sleepMin != null ? `${Math.floor(sleepMin / 60)}h ${sleepMin % 60}m` : '—'}</b><span>Sleep</span></button>
  </div>

  ${night ? `<section class="card">
    <div class="kicker">Wind-down</div><h3>Bed at ${S.prettyTime(P.sleepTargets().bed)}</h3>
    <p class="small muted mt8">Two minutes of slow breathing, then put the phone away.</p>
    <div class="grid2 mt12"><button class="btn primary" data-breath>Breathe 2 min</button><a class="btn" href="#cook/r/${Pr.fasting() ? 'suhoor_oats_dates' : 'overnight_oats'}">Prep tomorrow</a></div>
  </section>` : ''}

  <section class="card">
    <div class="kicker mb8">Up next</div>
    <div class="next-list">${next.map((x) => `<button class="nx ${x.now || x.soon ? 'now' : ''}" data-act="${x.act}"><span class="ico">${x.icon}</span><span class="grow"><div class="t">${x.t}</div><div class="s">${x.s}</div></span><span class="when">${x.anytime ? 'Today' : x.now ? 'Now' : S.prettyTime(S.fmtMin(x.at))}</span></button>`).join('') || '<p class="small muted">Nothing else scheduled today.</p>'}</div>
  </section>
  </div><div class="t-col">
  ${challengeCard()}
  ${prayerCard()}
  ${cafCard(k)}

  ${sug ? `<div class="section-title">Eat next <a class="link" href="#cook">All recipes</a></div>
  <a class="rwide" href="#cook/r/${sug.r.id}"><div class="thumb ${a.cls}" style="${a.style}">${a.emoji}</div>
    <div class="grow"><div class="ellipsis fw6">${UI.esc(sug.r.name)}</div><div class="muted small">${sug.r.mins} min · ${sug.r.kcal} kcal · ${sug.r.protein} g protein</div>
    <div class="small" style="color:${sug.have === sug.total ? 'var(--green)' : 'var(--muted)'}">${sug.have === sug.total ? 'You have everything' : `You have ${sug.have} of ${sug.total}`}</div></div></a>` : ''}

  <div class="section-title">Essentials</div>
  <section class="card ess-list">
    ${G.ESSENTIALS.map((e) => `<button class="check ${d.checks[e.id] ? 'done' : ''} w100 ts" data-ess="${e.id}">
      <span class="box">${I.check}</span><span class="label">${essLabel(e)}</span></button>`).join('')}
  </section>

  ${due.length ? `<button class="card" style="display:flex;width:100%;text-align:left;align-items:center;gap:12px" data-weekly>
    <span class="nx"><span class="ico">${I.list}</span></span><span class="grow"><div class="fw6">Weekly check-in</div><div class="small muted">${due.length} of ${3 + (due.includes('weigh') ? 1 : 0)} left</div></span><span class="chev">${I.chev}</span></button>` : ''}
  </div></div>
  `;
}

function weeklySheet(rerender) {
  const due = weekDue();
  UI.openSheet(`<h2>Weekly check-in</h2><p class="muted small mt8">A few questions, once a week. Your doctor summary uses these.</p>
    <div class="mt12">${due.map((x) => `<button class="list-item" data-w="${x}"><div class="grow"><b>${{ weigh: 'Weigh-in', erection: 'Erection & confidence', mood: 'Mood & worry', energy: 'Energy & cold' }[x]}</b></div><span class="chev">${I.chev}</span></button>`).join('')}</div>`, {
    onMount: (sh, close) => sh.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => { close(); const w = b.dataset.w; if (w === 'weigh') Sh.weighSheet(rerender); else Sh.checkinSheet(w, rerender); }),
  });
}

export function bind(root, _, { rerender }) {
  const k = S.dayKey(); const d = S.day(k);
  root.querySelector('[data-search]')?.addEventListener('click', () => Search.open());
  root.querySelectorAll('[data-ess]').forEach((b) => b.addEventListener('click', (ev) => {
    const id = b.dataset.ess; const on = !d.checks[id]; G.setEssential(id, on, ev); G.updateBestStreak();
    b.classList.toggle('done', on); setTimeout(rerender, 250);
  }));
  root.querySelector('[data-water]')?.addEventListener('click', (ev) => {
    d.waterMl += 250; S.save(); G.award(`water_${d.waterMl}`, 3, ev, { silent: true }); UI.haptic(8);
    if (d.waterMl >= 1500 && !d.checks.fluids) G.setEssential('fluids', true, ev);
    rerender();
    UI.undoToast(`Water ${(d.waterMl / 1000).toFixed(2).replace(/0$/, '')} L`, () => { d.waterMl = Math.max(0, d.waterMl - 250); if (d.waterMl < 1500 && d.checks.fluids) G.setEssential('fluids', false); S.save(); rerender(); }, 4000);
  });
  const addCoffee = (mg) => {
    d.coffee.push(mg == null || mg === Caf.cupMg() ? S.hm() : `${S.hm()}@${mg}`);
    if (P.isAfterCutoff(S.hm()) && mg !== 5 && d.checks.caffeine) G.setEssential('caffeine', false);
    UI.haptic(8); S.save(); rerender();
    UI.undoToast(P.isAfterCutoff(S.hm()) && mg !== 5 ? 'Logged — past your cutoff' : 'Logged', () => { d.coffee.pop(); S.save(); rerender(); }, 4000);
  };
  root.querySelector('[data-drinks]')?.addEventListener('click', () => drinkSheet(addCoffee, () => { d.coffee.pop(); S.save(); rerender(); }));
  root.querySelector('[data-logmeal]')?.addEventListener('click', () => Sh.mealSheet(rerender));
  root.querySelector('[data-sleep]')?.addEventListener('click', () => Sh.sleepSheet(rerender));
  root.querySelector('[data-breath]')?.addEventListener('click', () => Sh.breathing({ onDone: rerender }));
  root.querySelector('[data-weekly]')?.addEventListener('click', () => weeklySheet(rerender));
  root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'sleep') Sh.sleepSheet(rerender);
    else if (a.startsWith('meal:')) Sh.mealSheet(rerender, { slot: a.split(':')[1] });
    else if (a === 'train') location.hash = 'train';
    else if (a === 'energy') Sh.energySheet(rerender);
    else if (a === 'breath') Sh.breathing({ onDone: rerender });
    else if (a === 'prayer') location.hash = 'me/prayer';
    else if (a === 'backup') location.hash = 'me/settings';
  }));
}

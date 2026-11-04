import * as S from '../store.js';
import * as UI from '../ui.js';
import * as G from '../gamify.js';
import * as P from '../plan.js';
import * as Sh from './shared.js';
import { TIPS, STORIES } from '../data/content.js';
import { RECIPES, RECIPE } from '../data/recipes.js';
import { suggest, planToday } from './cook.js';

function greeting() {
  const h = new Date().getHours(); const n = S.get().profile.name;
  const g = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Late night';
  return n ? `${g}, ${UI.esc(n)}` : g;
}

function shuffledTips(k) {
  // Daily shuffled feed with saved/liked ones mixed later.
  let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) | 0;
  const arr = [...TIPS];
  for (let i = arr.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) | 0; const j = Math.abs(h) % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function todayStory() {
  const st = S.get(); const d = S.day(); const t = P.sleepTargets(); const n = G.essentialsDone();
  const s = P.currentSlot(); const rec = suggest({ slot: s })[0]?.r;
  return [
    { e: '🔥', bg: ['#7c2d12', '#000'], title: `Day ${G.streak()} streak`, body: `${n}/7 essentials done. Hit 5 to secure today.` },
    { e: '⏰', bg: ['#1e1b4b', '#000'], title: `Wake ${S.prettyTime(t.wake)} · Bed ${S.prettyTime(t.bed)}`, body: t.reached ? 'You’ve reached your target bedtime. Hold it steady.' : `Bedtime moves 15 min earlier every 3 days. About ${t.daysLeft} days to your ideal ${S.prettyTime(t.ideal)}.` },
    rec ? { e: rec.emoji, bg: rec.bg, title: `Try: ${rec.name}`, body: `${rec.mins} min · ${rec.kcal} kcal · ${rec.protein} g protein. ${rec.desc}`, cta: { label: 'Open recipe', href: `#cook/r/${rec.id}` } } : null,
    { e: '☕', bg: ['#422006', '#000'], title: `Coffee cutoff ${S.prettyTime(st.profile.caffeineCutoff)}`, body: d.coffee.length ? `${d.coffee.length} coffee${d.coffee.length > 1 ? 's' : ''} so far today.` : 'No coffee logged yet today.' },
  ].filter(Boolean);
}

// Context-aware nudges (replace push notifications when the app is open).
function installHint() {
  if (window.Capacitor?.isNativePlatform?.()) return false;
  const ua = navigator.userAgent || '';
  const standalone = window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
  return /iPhone|iPad|iPod/.test(ua) && !standalone;
}

export function nudges(now = new Date()) {
  const st = S.get(); const d = S.day(); const out = [];
  const m = now.getHours() * 60 + now.getMinutes();
  const wake = S.minutesOf(st.profile.wakeAnchor);
  const since = (m - wake + 1440) % 1440;
  const mt = P.mealTimes();
  if (!d.sleep.wake && since < 300) out.push({ e: '🌙', t: 'Log last night’s sleep', s: 'Takes 5 seconds. Builds your sleep chart.', act: 'sleep', cls: 'blue' });
  for (const slot of ['dinner', 'lunch', 'breakfast']) {
    const due = (S.minutesOf(mt[slot]) - wake + 1440) % 1440;
    if (since >= due && !d.checks[slot]) { out.push({ e: P.SLOT_EMOJI[slot], t: `${P.SLOT_LABEL[slot]} time — eaten yet?`, s: since - due > 90 ? 'Hungry-but-not-eating is the pattern we’re breaking. Even a shake counts.' : 'Tap to log it, or open Cook for a 10-min idea.', act: 'meal' }); break; }
  }
  const awake = 960; const expected = Math.min(1, since / awake) * st.profile.waterGoalMl;
  if (since > 120 && since < awake && d.waterMl < expected - 500) out.push({ e: '💧', t: 'Water check', s: `You’re at ${(d.waterMl / 1000).toFixed(1)} L — aim for ${(expected / 1000).toFixed(1)} L by now.`, act: 'water', cls: 'blue' });
  const cut = S.minutesOf(st.profile.caffeineCutoff);
  if (m >= cut - 45 && m < cut) out.push({ e: '☕', t: 'Last call for coffee', s: `Cutoff at ${S.prettyTime(st.profile.caffeineCutoff)}. After that, water or decaf.`, act: 'none' });
  if (!(d.pf > 0) && since > 360 && since < awake) out.push({ e: '💪', t: 'Pelvic-floor session', s: 'About 2 minutes. Lie down, tap Start.', act: 'train' });
  return out.slice(0, 2);
}

export function render(_, { night }) {
  const st = S.get(); const k = S.dayKey(); const d = S.day(k);
  const lv = G.levelInfo(); const streak = G.streak(); const n = G.essentialsDone(k);
  const quests = G.todaysQuests(k); const loot = G.lootState(k);
  const tg = P.nutritionTargets(); const tot = P.dayTotals(k); const t = P.sleepTargets();
  const slot = P.currentSlot(); let sug = suggest({ slot }).slice(0, 3);
  const planned = planToday(slot);
  if (planned) sug = [suggest({ slot }).find((x) => x.r.id === planned.id), ...sug.filter((x) => x.r.id !== planned.id)].filter(Boolean).slice(0, 3);
  const cmp = G.weekCompare();
  const wk = S.weekKey(); const ci = st.checkins[wk] || {};
  const ciMissing = ['erection', 'mood', 'energy'].filter((x) => !ci[x]);
  const weighDone = st.weights.some((w) => S.weekKey(w.date) === wk);
  const lateCoffee = P.isAfterCutoff(S.hm());
  const glasses = Math.round(d.waterMl / 250); const goalGl = Math.round(st.profile.waterGoalMl / 250);
  const seen = st.storiesSeen || {};

  return `
  <div class="topbar">
    <div class="grow"><div class="sub">${S.prettyDate(k, { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1 style="font-size:26px">${greeting()}</h1></div>
    <div class="hud">
      <div class="stat" title="Streak"><span class="ico ${streak ? 'flame' : ''}">🔥</span>${streak}</div>
      <div class="stat" title="Coins"><span class="ico">🪙</span>${st.game.coins}</div>
    </div>
  </div>
  <button class="card tight" data-go="me" style="width:100%;text-align:left">
    <div class="row between small"><b>Lv ${lv.level} · ${lv.title}</b><span class="muted">${lv.into}/${lv.need} XP</span></div>
    <div class="lvlbar mt8"><i style="width:${Math.round(lv.pct * 100)}%"></i></div>
    <div class="row between tiny muted mt8"><span>❄️ ${st.game.freezes} freeze${st.game.freezes === 1 ? '' : 's'}</span><span>Today +${d.xpToday || 0} XP</span><span>Best 🔥 ${st.game.bestStreak}</span></div>
  </button>

  ${window.__canInstall ? `<a class="nudge blue" href="#me/install"><span class="n-e">🖥️</span><div class="grow"><b>Install Revive on this PC</b><span>Own window, Start menu icon, works offline.</span></div></a>` : ''}
  ${installHint() ? `<a class="nudge blue" href="#me/install"><span class="n-e">📲</span><div class="grow"><b>Install Revive on your Home Screen</b><span>Safari → Share → Add to Home Screen. Works offline and keeps your data in one place.</span></div></a>` : ''}
  ${night ? '' : nudges().map((n) => `<button class="nudge ${n.cls || ''}" data-nudge="${n.act}"><span class="n-e">${n.e}</span><div class="grow"><b>${n.t}</b><span>${n.s}</span></div><span class="pill amber">+XP</span></button>`).join('')}

  <div class="stories">${STORIES.map((s) => `<button class="story ${seen[s.id] === k ? 'seen' : ''}" data-story="${s.id}"><div class="ring"><div class="inner">${s.e}</div></div><span>${s.label}</span></button>`).join('')}</div>

  ${night ? `<div class="card winddown-banner">
      <div class="kicker" style="color:#c4b5fd">Wind-down mode 🌙</div>
      <h3>Bedtime target ${S.prettyTime(t.bed)}</h3>
      <p class="muted small">The feed is asleep until morning. Do the 2-minute breathing, prep tomorrow’s breakfast, then put the phone down.</p>
      <div class="grid3 mt12">
        <div class="macro"><b>${n}/7</b><span>essentials</span></div>
        <div class="macro"><b>${tot.kcal}</b><span>kcal</span></div>
        <div class="macro"><b>${(d.waterMl / 1000).toFixed(1)}L</b><span>water</span></div></div>
      <p class="small mt12">${n >= 5 ? '🔥 Streak secured. Great day — rest now.' : n >= 3 ? `So close: ${5 - n} more essential${5 - n === 1 ? '' : 's'} would have secured it. Tomorrow.` : 'Tough day? That’s OK. Tomorrow: just breakfast within 2 hours of waking.'}</p>
      <p class="small muted">Tomorrow: wake ${S.prettyTime(t.wake)} · ${planToday('breakfast') ? `breakfast: ${planToday('breakfast').emoji} ${UI.esc(planToday('breakfast').name)}` : 'breakfast within 2 h'}</p>
      <div class="grid2 mt12"><button class="btn cool" data-breath>🌬️ Breathe 2 min</button><button class="btn" data-go="cook/r/overnight_oats">🥣 Prep oats</button></div>
    </div>` : ''}

  <div class="card glow">
    ${G.combo() >= 3 ? `<div class="combo">🔥 COMBO ×${G.combo()}</div>` : ''}
    <div class="row" style="gap:16px">
      ${UI.ring(n / 7, 104, 11, n >= G.STREAK_THRESHOLD ? 'url(#gradGreen)' : 'url(#gradWarm)', `${n}/7`, n >= 5 ? 'secured' : `${5 - n} to streak`)}
      <div class="grow"><div class="kicker">Today’s essentials</div><h3>${n >= 7 ? 'Flawless day 💯' : n >= 5 ? 'Streak secured 🔥' : 'Tick 5 to keep the streak'}</h3>
        <p class="muted small">5 out of 7 is a full win. Don’t chase perfect.</p></div>
    </div>
    <div class="mt12">${G.ESSENTIALS.map((e) => `<button class="check ${d.checks[e.id] ? 'done' : ''}" data-ess="${e.id}" style="width:100%;text-align:left">
      <span class="box">${UI.ICON.check}</span><span class="emoji">${e.e}</span><span class="label">${e.label}${e.id === 'caffeine' ? ` <span class="muted small">(${S.prettyTime(st.profile.caffeineCutoff)})</span>` : ''}</span><span class="xp">+${e.xp}</span></button>`).join('')}</div>
  </div>

  <div class="card loot ${loot.unlocked ? '' : 'locked'}">
    ${loot.opened ? `<div class="chest" style="animation:none">${{ COMMON: '🎁', RARE: '💎', EPIC: '🔮', LEGENDARY: '👑' }[loot.result.rarity]}</div><h3 class="mt8">Today’s chest: ${loot.result.rarity}</h3><p class="muted small">New chest tomorrow. Come back!</p>`
      : `<div class="chest">🎁</div><h3 class="mt8">${loot.unlocked ? 'Mystery chest unlocked!' : 'Daily mystery chest'}</h3>
         <p class="muted small">${loot.unlocked ? 'Tap to open. Could be legendary…' : `Tick ${loot.need} more essential${loot.need === 1 ? '' : 's'} to unlock`}</p>
         ${loot.unlocked ? '<button class="btn primary mt12" data-loot>Open chest</button>' : ''}`}
  </div>

  <div class="card">
    <div class="row between"><div><div class="kicker">Daily quests</div><h3>${quests.filter((q) => q.done).length}/3 complete</h3></div><span class="pill amber">resets 4 am</span></div>
    ${quests.map((q) => `<div class="quest ${q.done ? 'done' : ''}"><div class="q-ico">${q.done ? '✅' : q.e}</div><div class="grow small" style="font-weight:600">${UI.esc(q.t)}</div><div class="reward">+${q.xp}</div></div>`).join('')}
  </div>

  <div class="section-title">Eat next <a class="link" href="#cook">Cookbook</a></div>
  <div class="card">
    <div class="row between"><div><div class="kicker">${P.SLOT_EMOJI[slot]} ${P.SLOT_LABEL[slot]} suggestion</div>
      <div class="small muted">${tot.kcal} / ${tg.kcal} kcal · ${tot.protein} / ${tg.protein} g protein</div></div>
      <button class="btn sm primary" data-logmeal>+ Log</button></div>
    <div class="lvlbar mt8"><i style="width:${Math.min(100, Math.round(tot.kcal / tg.kcal * 100))}%;background:var(--grad-green)"></i></div>
    <div class="mt12">${sug.map(({ r, have, total }) => `<a class="rwide" href="#cook/r/${r.id}"><div class="thumb" style="${UI.grad(r.bg)}">${r.emoji}</div>
      <div class="grow"><div style="font-weight:700" class="ellipsis">${planned && planned.id === r.id ? '📅 ' : ''}${UI.esc(r.name)}</div><div class="muted small">${r.mins} min · ${r.kcal} kcal · ¥${r.cost}</div>
      <div class="match" style="color:${have === total ? 'var(--green)' : 'var(--amber)'}">${have === total ? 'You have everything ✓' : `Have ${have}/${total} ingredients`}</div></div></a>`).join('')}</div>
    <a class="btn block sm" href="#cook/delivery">😮‍💨 Too tired? Halal delivery ideas</a>
  </div>

  <div class="grid2">
    <div class="card" style="margin:0">
      <div class="kicker">💧 Water</div>
      <div class="counter"><div class="val">${(d.waterMl / 1000).toFixed(2).replace(/0$/, '')}<span class="unit"> L</span></div></div>
      <div class="water-glasses">${Array.from({ length: goalGl }, (_, i) => `<i class="${i < glasses ? 'full' : ''}"></i>`).join('')}</div>
      <div class="row mt12"><button class="btn sm grow" data-water="-250">−</button><button class="btn sm cool grow" data-water="250">+250</button></div>
    </div>
    <div class="card" style="margin:0">
      <div class="kicker">☕ Coffee</div>
      <div class="counter"><div class="val">${d.coffee.length}<span class="unit"> cups</span></div></div>
      <div class="small ${lateCoffee ? '' : 'muted'} mt8" style="${lateCoffee ? 'color:var(--coral)' : ''};min-height:36px">${lateCoffee ? `Past cutoff — coffee now will push sleep later` : `Cutoff ${S.prettyTime(st.profile.caffeineCutoff)}${d.coffee.length ? ` · last ${S.prettyTime(d.coffee.at(-1))}` : ''}`}</div>
      <div class="row mt12"><button class="btn sm grow" data-coffee="-1">−</button><button class="btn sm grow" data-coffee="1">+1</button></div>
    </div>
  </div>

  <div class="grid2 mt12">
    <button class="card" style="margin:0;text-align:left" data-sleep>
      <div class="kicker">🌙 Sleep</div>
      ${d.sleep.wake ? `<div style="font-weight:800;font-size:18px">${S.prettyTime(d.sleep.bed)} → ${S.prettyTime(d.sleep.wake)}</div><div class="muted small">${Math.floor((P.sleepDurationMin(d.sleep.bed, d.sleep.wake) || 0) / 60)}h ${(P.sleepDurationMin(d.sleep.bed, d.sleep.wake) || 0) % 60}m</div>`
        : `<div style="font-weight:800;font-size:18px">Log last night</div><div class="muted small">Anchor ${S.prettyTime(t.wake)}</div>`}
    </button>
    <button class="card" style="margin:0;text-align:left" data-energy>
      <div class="kicker">⚡ Energy & mood</div>
      ${d.energy != null ? `<div style="font-size:26px">${['🪫', '😮‍💨', '😐', '🙂', '⚡'][d.energy]} ${['😞', '😕', '😐', '🙂', '😄'][d.mood ?? 2]}</div>` : `<div style="font-weight:800;font-size:18px">How do you feel?</div><div class="muted small">10-second check</div>`}
    </button>
  </div>

  ${(ciMissing.length || !weighDone) ? `<div class="card cool glow mt12">
    <div class="kicker">This week</div><h3>Weekly check-ins</h3>
    <p class="muted small">Track change over time and show your doctor. +40 XP each.</p>
    <div class="chips mt12">
      ${!weighDone ? '<button class="chip" data-weigh>⚖️ Weigh-in</button>' : ''}
      ${ciMissing.map((x) => `<button class="chip" data-ci="${x}">${{ erection: '🫀 Erection', mood: '🧠 Mood', energy: '🔋 Energy & cold' }[x]}</button>`).join('')}
    </div></div>` : ''}

  <div class="card">
    <div class="kicker">You vs. last week (same point)</div>
    <div class="grid2 mt8">
      <div><div class="score-big" style="font-size:30px">${cmp.thisW.xp}</div><div class="muted small">XP this week</div></div>
      <div><div class="score-big" style="font-size:30px;color:var(--muted)">${cmp.lastW.xp}</div><div class="muted small">XP last week</div></div>
    </div>
    <p class="small mt8" style="color:${cmp.thisW.xp >= cmp.lastW.xp ? 'var(--green)' : 'var(--amber)'};font-weight:700">${cmp.thisW.xp >= cmp.lastW.xp ? (cmp.lastW.xp ? `You’re ahead by ${cmp.thisW.xp - cmp.lastW.xp} XP 🏁` : 'First week — set the bar high 🏁') : `${cmp.lastW.xp - cmp.thisW.xp} XP behind last-week you. Catch him 👀`}</p>
  </div>

  <div class="section-title">For you</div>
  ${night ? `<div class="empty"><span class="e">😴</span>Your feed is sleeping until morning.<br><span class="small">Revive protects your bedtime — see you tomorrow.</span></div>` : feedHtml(k)}
  `;
}

function feedHtml(k) {
  const st = S.get(); const tips = shuffledTips(k);
  const recs = [...RECIPES].sort(() => 0.5 - ((k.charCodeAt(9) * 7) % 10) / 10).slice(0, 4);
  const items = [];
  tips.forEach((t, i) => {
    items.push(`<div class="tipcard" style="${UI.grad(t.bg)}" data-tip="${t.id}">
      <div class="row between"><span class="pill">${t.cat}</span></div>
      <div class="big mt8">${t.e}</div><h3>${UI.esc(t.title)}</h3><p>${UI.esc(t.body)}</p>
      <div class="actions"><button data-like="${t.id}" class="${st.likedTips.includes(t.id) ? 'liked' : ''}">${st.likedTips.includes(t.id) ? UI.ICON.heartFill : UI.ICON.heart}</button>
      <button data-save="${t.id}" class="${st.savedTips.includes(t.id) ? 'saved' : ''}">${st.savedTips.includes(t.id) ? UI.ICON.bookmarkFill : UI.ICON.bookmark}</button></div></div>`);
    if (i % 4 === 2 && recs.length) {
      const r = recs.shift();
      items.push(`<a class="card" href="#cook/r/${r.id}" style="display:block;padding:0;color:inherit;text-decoration:none">
        <div style="${UI.grad(r.bg)};height:150px;display:flex;align-items:center;justify-content:center;font-size:80px">${r.emoji}</div>
        <div style="padding:14px"><div class="kicker">Recipe for you</div><h3>${UI.esc(r.name)}</h3><p class="muted small">${r.mins} min · ${r.kcal} kcal · ${r.protein} g protein · ¥${r.cost}</p></div></a>`);
    }
  });
  return items.join('') + `<div class="empty"><span class="e">🎉</span>You’re all caught up. New cards tomorrow.</div>`;
}

export function bind(root, _, { rerender }) {
  const st = S.get(); const k = S.dayKey(); const d = S.day(k);
  root.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { location.hash = b.dataset.go; }));
  root.querySelectorAll('[data-ess]').forEach((b) => b.addEventListener('click', (ev) => {
    const id = b.dataset.ess; const on = !d.checks[id]; G.setEssential(id, on, ev); G.updateBestStreak(); G.evaluateQuests();
    b.classList.toggle('done', on); setTimeout(rerender, 350);
  }));
  root.querySelector('[data-loot]')?.addEventListener('click', async () => { await G.openLoot(); rerender(); });
  root.querySelectorAll('[data-water]').forEach((b) => b.addEventListener('click', (ev) => {
    const v = +b.dataset.water; d.waterMl = Math.max(0, d.waterMl + v); S.save();
    if (v > 0) { G.award(`water_${d.waterMl}`, 3, ev, { silent: true }); UI.haptic(8); UI.ding('tick'); }
    if (d.waterMl >= 1500 && !d.checks.fluids) G.setEssential('fluids', true, ev);
    if (d.waterMl >= 2000 && v > 0 && d.waterMl - v < 2000) { UI.confetti(50); UI.toast('2 L reached — hydration hero!', '💧'); }
    G.evaluateQuests(); G.checkBadges(); rerender();
  }));
  root.querySelectorAll('[data-coffee]').forEach((b) => b.addEventListener('click', () => {
    const v = +b.dataset.coffee;
    if (v > 0) {
      d.coffee.push(S.hm());
      if (P.isAfterCutoff(S.hm())) {
        if (d.checks.caffeine) G.setEssential('caffeine', false);
        UI.toast('Logged. After cutoff — try decaf or water next time', '☕');
      }
    } else d.coffee.pop();
    S.save(); rerender();
  }));
  root.querySelector('[data-logmeal]')?.addEventListener('click', () => Sh.mealSheet(rerender));
  root.querySelectorAll('[data-nudge]').forEach((b) => b.addEventListener('click', (ev) => {
    const a = b.dataset.nudge;
    if (a === 'sleep') Sh.sleepSheet(rerender);
    else if (a === 'meal') Sh.mealSheet(rerender);
    else if (a === 'train') location.hash = 'train';
    else if (a === 'water') { d.waterMl += 250; S.save(); G.award(`water_${d.waterMl}`, 3, ev); if (d.waterMl >= 1500) G.setEssential('fluids', true, ev); G.evaluateQuests(); rerender(); }
    else b.remove();
  }));
  root.querySelector('[data-sleep]')?.addEventListener('click', () => Sh.sleepSheet(rerender));
  root.querySelector('[data-energy]')?.addEventListener('click', () => Sh.energySheet(rerender));
  root.querySelector('[data-breath]')?.addEventListener('click', () => Sh.breathing({ onDone: rerender }));
  root.querySelector('[data-weigh]')?.addEventListener('click', () => Sh.weighSheet(rerender));
  root.querySelectorAll('[data-ci]').forEach((b) => b.addEventListener('click', () => Sh.checkinSheet(b.dataset.ci, rerender)));
  root.querySelectorAll('[data-story]').forEach((b) => b.addEventListener('click', () => {
    const s = STORIES.find((x) => x.id === b.dataset.story);
    const slides = s.slides === 'dynamic' ? todayStory() : s.slides.map((x, i) => ({ ...x, bg: [['#1e1b4b', '#000'], ['#4c0519', '#000'], ['#14532d', '#000'], ['#0c4a6e', '#000'], ['#713f12', '#000']][i % 5] }));
    Sh.storyViewer(s, slides, () => { st.storiesSeen[s.id] = k; G.award(`story_${s.id}`, 5, null, { silent: true }); S.save(); rerender(); });
  }));
  root.querySelectorAll('[data-like]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.like; const i = st.likedTips.indexOf(id);
    if (i >= 0) st.likedTips.splice(i, 1); else { st.likedTips.push(id); UI.haptic(10); }
    S.save(); b.classList.toggle('liked'); b.innerHTML = (i >= 0 ? UI.ICON.heart : UI.ICON.heartFill);
  }));
  root.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.save; const i = st.savedTips.indexOf(id);
    if (i >= 0) st.savedTips.splice(i, 1); else { st.savedTips.push(id); UI.toast('Saved to Me → Saved', '🔖'); }
    S.save(); b.classList.toggle('saved'); b.innerHTML = (i >= 0 ? UI.ICON.bookmark : UI.ICON.bookmarkFill);
  }));
  // Count tips read as they scroll into view (feed engagement → quest).
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) {
      io.unobserve(e.target); const id = e.target.dataset.tip;
      d.readTips = d.readTips || []; if (!d.readTips.includes(id)) { d.readTips.push(id); d.tipsRead = d.readTips.length; S.save(); if (d.tipsRead === 3) G.evaluateQuests(); }
    }
  }), { threshold: 0.7 });
  root.querySelectorAll('[data-tip]').forEach((el) => io.observe(el));
}

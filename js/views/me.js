import * as S from '../store.js';
import * as UI from '../ui.js';
import * as G from '../gamify.js';
import * as P from '../plan.js';
import * as Lock from '../lock.js';
import * as ICS from '../ics.js';
import { TIPS, RED_FLAGS, CRISIS, DOCTOR_QUESTIONS, CHECKINS } from '../data/content.js';
import { pfWeek } from './train.js';

const LABS = [
  { name: 'Testosterone (morning, total)', unit: 'nmol/L', ref: '~8.6–29' },
  { name: 'TSH', unit: 'mIU/L', ref: '~0.4–4.0' }, { name: 'Free T4', unit: 'pmol/L', ref: '~12–22' },
  { name: 'Ferritin', unit: 'µg/L', ref: '~30–400' }, { name: 'Hemoglobin', unit: 'g/L', ref: '~130–175' },
  { name: 'Vitamin D (25-OH)', unit: 'nmol/L', ref: '>50' }, { name: 'Vitamin B12', unit: 'pmol/L', ref: '>150' },
  { name: 'HbA1c', unit: '%', ref: '<5.7' }, { name: 'Fasting glucose', unit: 'mmol/L', ref: '3.9–5.6' },
  { name: 'Prolactin', unit: 'µg/L', ref: '~4–15' }, { name: 'LH', unit: 'IU/L', ref: '~1.7–8.6' }, { name: 'FSH', unit: 'IU/L', ref: '~1.5–12.4' },
  { name: 'Blood pressure', unit: 'mmHg', ref: '<120/80' }, { name: 'Resting pulse', unit: 'bpm', ref: '60–100' },
];

export function render(parts) {
  const sub = parts[0];
  if (sub === 'medical') return medical();
  if (sub === 'summary') return summary();
  if (sub === 'reminders') return reminders();
  if (sub === 'badges') return badges();
  if (sub === 'saved') return saved();
  if (sub === 'settings') return settings();
  if (sub === 'install') return install();
  return main();
}

const back = (to = 'me') => `<a class="icon-btn" href="#${to}">${UI.ICON.back}</a>`;
const item = (href, ico, title, subt) => `<a class="list-item" href="#${href}" style="color:inherit;text-decoration:none"><div class="li-ico">${ico}</div><div class="grow"><b>${title}</b>${subt ? `<div class="muted small">${subt}</div>` : ''}</div><span class="chev">${UI.ICON.chev.replace('<svg', '<svg width="18" height="18"')}</span></a>`;

function main() {
  const st = S.get(); const lv = G.levelInfo(); const nb = Object.keys(st.game.badges).length;
  const qs = (st.medical.questions || []); const open = qs.filter((q) => !q.done).length;
  return `<div class="topbar"><div><div class="sub">Profile</div><h1>${UI.esc(st.profile.name || 'Me')}</h1></div><a class="icon-btn" href="#me/settings">⚙️</a></div>
  <div class="card glow" style="text-align:center">
    <div style="font-size:54px">${lv.level >= 10 ? '👑' : lv.level >= 6 ? '🦾' : lv.level >= 3 ? '🔥' : '🌱'}</div>
    <h2 class="mt8">Level ${lv.level} · ${lv.title}</h2>
    <div class="lvlbar mt12"><i style="width:${Math.round(lv.pct * 100)}%"></i></div>
    <div class="muted small mt8">${st.game.xp} XP total · ${lv.need - lv.into} XP to level ${lv.level + 1}</div>
    <div class="grid3 mt16"><div class="macro"><b>🔥 ${G.streak()}</b><span>streak</span></div><div class="macro"><b>🪙 ${st.game.coins}</b><span>coins</span></div><div class="macro"><b>❄️ ${st.game.freezes}</b><span>freezes</span></div></div>
    <button class="btn sm mt12" data-buyfreeze ${st.game.coins < 100 || st.game.freezes >= 3 ? 'disabled' : ''}>Buy streak freeze · 🪙100</button>
  </div>
  <a class="card" href="#me/badges" style="display:block;color:inherit;text-decoration:none"><div class="row between"><div class="kicker">Badges</div><span class="small muted">${nb}/${G.BADGES.length}</span></div>
    <div class="row mt8" style="gap:6px;font-size:28px;overflow:hidden">${G.BADGES.filter((b) => st.game.badges[b.id]).slice(-8).map((b) => b.e).join('') || '<span class="small muted">Complete actions to earn badges</span>'}</div></a>
  <div class="card tight">
    ${item('me/medical', '🩺', 'Medical & follow-up', `${open} questions for your doctor · ${st.medical.labs.length} lab results`)}
    ${item('me/summary', '🖨️', 'Doctor summary', 'One-page report of your last 4 weeks')}
    ${item('me/reminders', '⏰', 'Reminders', 'Add daily alerts to iPhone Calendar')}
    ${item('me/saved', '🔖', 'Saved cards', `${st.savedTips.length} saved`)}
    ${item('me/install', '📲', 'Install on iPhone', 'Home Screen + offline')}
    ${item('me/settings', '⚙️', 'Settings & privacy', st.lock.enabled ? 'Locked with ' + (st.lock.faceId ? 'Face ID + PIN' : 'PIN') : 'App lock off')}
  </div>
  <div class="card danger"><div class="kicker">Emergency (China)</div>
    <p class="small">Call <b>120</b> for chest pain or pressure, fainting, severe breathlessness, an erection lasting more than 4 hours, or thoughts of self-harm. Mental health hotline <b>12356</b>.</p></div>`;
}

function medical() {
  const st = S.get(); const m = st.medical; m.questions = m.questions || DOCTOR_QUESTIONS.map((q) => ({ id: S.uid(), q, done: false }));
  const clr = { brief: 'Discussed briefly', notCleared: 'Not cleared / waiting', cleared: 'Cleared for exercise' };
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Medical</h1><div class="sub">Follow-up, results & clearance</div></div></div>
  <div class="card ${m.exerciseCleared ? '' : 'danger'}"><div class="kicker">Exercise clearance</div>
    <div class="seg mt8">${Object.entries(clr).map(([k, l]) => `<button class="${m.clearance === k ? 'on' : ''}" data-clr="${k}">${l.split(' ')[0]}</button>`).join('')}</div>
    <p class="small muted mt8">${m.exerciseCleared ? '✅ Cleared. Activity unlocked in Train — still stop for any chest pain, dizziness or unusual breathlessness.' : 'Training stays gentle (walking + pelvic floor) until a doctor clears you for exercise.'}</p></div>

  <div class="section-title">Ask at your next visit <button class="link" data-addq>+ Add</button></div>
  <div class="card tight">${m.questions.map((q) => `<div class="check ${q.done ? 'done' : ''}"><button class="box" data-q="${q.id}" aria-label="Asked">${UI.ICON.check}</button><span class="label small" style="font-weight:500">${UI.esc(q.q)}</span><button class="faint" data-delq="${q.id}" aria-label="Delete" style="padding:6px">${UI.ICON.trash.replace('<svg', '<svg width="16" height="16"')}</button></div>`).join('')}</div>

  <div class="section-title">Visits <button class="link" data-addvisit>+ Add</button></div>
  <div class="card tight">${m.visits.length ? [...m.visits].reverse().map((v) => `<div class="list-item"><div class="li-ico">🩺</div><div class="grow"><b>${S.prettyDate(v.date)}${v.who ? ' · ' + UI.esc(v.who) : ''}</b><div class="muted small" style="white-space:pre-wrap">${UI.esc(v.notes)}</div></div><button class="icon-btn" data-delvisit="${v.id}">${UI.ICON.trash}</button></div>`).join('') : '<div class="empty small">No visits logged</div>'}</div>

  <div class="section-title">Lab results <button class="link" data-addlab>+ Add</button></div>
  <div class="card tight">${m.labs.length ? [...m.labs].sort((a, b) => b.date.localeCompare(a.date)).map((l) => `<div class="list-item"><div class="li-ico">🧪</div><div class="grow"><b>${UI.esc(l.name)}: ${UI.esc(l.value)} ${UI.esc(l.unit)}</b><div class="muted small">${S.prettyDate(l.date)}${l.ref ? ` · typical ${UI.esc(l.ref)}` : ''}</div></div><button class="icon-btn" data-dellab="${l.id}">${UI.ICON.trash}</button></div>`).join('') : '<div class="empty small">Add results when you get them. Ranges are typical guides — labs differ, your doctor interprets them.</div>'}</div>

  <div class="card"><div class="kicker">Supplements — what’s worth it</div>
    <div class="small" style="line-height:1.6">✅ Vitamin D / B12 — if a test or diet suggests a need<br>⚠️ Iron — only if deficiency is confirmed<br>🥩 Zinc — from food (meat, eggs, nuts); avoid high doses<br>🥤 Protein powder — optional convenience<br>🚫 “Testosterone boosters” — avoid unverified products<br>🚫 Sildenafil/tadalafil — not without a doctor, especially with your exertion symptoms</div></div>
  <div class="card danger"><div class="kicker">Get urgent help (120) for</div>${RED_FLAGS.map((r) => `<div class="small">• ${UI.esc(r)}</div>`).join('')}</div>`;
}

function summary() {
  const st = S.get(); const days = []; for (let i = 27; i >= 0; i--) days.push(S.addDays(S.dayKey(), -i));
  const logged = days.filter((k) => st.days[k]);
  const meals = logged.map((k) => new Set(st.days[k].meals.filter((m) => m.slot !== 'snack').map((m) => m.slot)).size);
  const avgMeals = meals.length ? (meals.reduce((a, b) => a + b, 0) / meals.length).toFixed(1) : '—';
  const kc = logged.map((k) => P.dayTotals(k).kcal).filter((x) => x > 0); const avgK = kc.length ? Math.round(kc.reduce((a, b) => a + b, 0) / kc.length) : '—';
  const water = logged.map((k) => st.days[k].waterMl).filter((x) => x > 0); const avgW = water.length ? (water.reduce((a, b) => a + b, 0) / water.length / 1000).toFixed(1) : '—';
  const coffee = logged.map((k) => st.days[k].coffee.length); const avgC = coffee.length ? (coffee.reduce((a, b) => a + b, 0) / coffee.length).toFixed(1) : '—';
  const nights = logged.map((k) => st.days[k].sleep).filter((s) => s.bed && s.wake);
  const avgSleep = nights.length ? nights.reduce((s, n) => s + P.sleepDurationMin(n.bed, n.wake), 0) / nights.length : null;
  const me = nights.filter((n) => n.morningErection).length;
  const ws = [...st.weights].sort((a, b) => a.date.localeCompare(b.date));
  const weeks = Object.keys(st.checkins).sort().slice(-6);
  const energyRed = weeks.some((w) => st.checkins[w].energy?.score?.redFlag);
  const html = `
    <h1>Revive — patient summary</h1>
    <p>Generated ${new Date().toLocaleString('en-GB')} · last 28 days · self-reported</p>
    <h2>Profile</h2><p>Male, ${st.profile.age} y · ${st.profile.heightCm} cm · ${ws.at(-1)?.kg ?? st.profile.startKg} kg (start ${st.profile.startKg} kg) · Halal diet · Lives in China</p>
    <h2>Main concerns (from 200-question self-assessment)</h2>
    <ul><li>Erections enlarge but not hard; lose erection almost always; rarely without direct stimulation; 6–12 months. High desire.</li>
    <li>Ejaculation within ~10–60 s with partner, little control.</li><li>Often orgasm with little/no noticeable semen.</li>
    <li>Intermittent chest pain, breathlessness or dizziness during exertion${energyRed ? ' — <b>reported again in recent weekly check-in</b>' : ''}.</li>
    <li>Cold intolerance, declining energy, frequent worry, loss of interest. Sleep usually after 3 AM, irregular.</li><li>~6 months of irregular eating; fluids &lt;1 L/day at baseline; daily coffee.</li></ul>
    <h2>Last 28 days (tracked in app)</h2>
    <table><tr><th>Days logged</th><td>${logged.length}</td><th>Main meals/day</th><td>${avgMeals}</td></tr>
    <tr><th>Avg kcal (logged days)</th><td>${avgK}</td><th>Avg fluids</th><td>${avgW} L</td></tr>
    <tr><th>Avg sleep</th><td>${avgSleep ? `${Math.floor(avgSleep / 60)} h ${Math.round(avgSleep % 60)} m` : '—'}</td><th>Coffee/day</th><td>${avgC}</td></tr>
    <tr><th>Morning erections noticed</th><td>${me} of ${nights.length} logged nights</td><th>Pelvic-floor sessions</th><td>${st.pf.sessions.filter((s) => days.includes(s.date)).length}</td></tr></table>
    <h2>Weight</h2><table><tr>${ws.slice(-8).map((w) => `<th>${w.date}</th>`).join('')}</tr><tr>${ws.slice(-8).map((w) => `<td>${w.kg} kg</td>`).join('')}</tr></table>
    <h2>Weekly self-check scores</h2>
    <table><tr><th>Week of</th><th>Erection/confidence (0–100)</th><th>PHQ-4 (0–12)</th><th>Energy/cold (0–100)</th></tr>
    ${weeks.map((w) => { const c = st.checkins[w]; return `<tr><td>${w}</td><td>${c.erection?.score?.pct ?? '—'}</td><td>${c.mood ? `${c.mood.score.total} (anx ${c.mood.score.anx}, dep ${c.mood.score.dep})` : '—'}</td><td>${c.energy?.score?.pct ?? '—'}${c.energy?.score?.redFlag ? ' ⚠ exertion symptoms' : ''}</td></tr>`; }).join('') || '<tr><td colspan="4">None yet</td></tr>'}</table>
    <h2>Lab results entered</h2>${st.medical.labs.length ? `<table>${st.medical.labs.map((l) => `<tr><td>${l.date}</td><td>${UI.esc(l.name)}</td><td>${UI.esc(l.value)} ${UI.esc(l.unit)}</td></tr>`).join('')}</table>` : '<p>None</p>'}
    <h2>Questions</h2><ol>${(st.medical.questions || []).filter((q) => !q.done).map((q) => `<li>${UI.esc(q.q)}</li>`).join('')}</ol>`;
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Doctor summary</h1><div class="sub">Show on your phone or print / save as PDF</div></div></div>
  <button class="btn primary block mb12" data-print>🖨️ Print / Save PDF</button>
  <div class="card summary-doc" style="background:#fff;color:#111;font-size:13px;line-height:1.45">${html.replace(/<h2>/g, '<h3 style="margin-top:14px;border-bottom:1px solid #ccc;font-size:14px">').replace(/<\/h2>/g, '</h3>').replace(/<table>/g, '<table style="width:100%;border-collapse:collapse;font-size:12px" border="1" cellpadding="4">')}</div>
  <template id="print-html">${html}</template>`;
}

function reminders() {
  const st = S.get(); st.reminderPrefs = st.reminderPrefs || {};
  const list = ICS.reminderList().map((r) => ({ ...r, on: st.reminderPrefs[r.id] ?? r.on }));
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Reminders</h1><div class="sub">Free daily alerts via iPhone Calendar</div></div></div>
  <div class="card tight">${list.map((r) => `<div class="list-item"><div class="grow"><b>${UI.esc(r.title)}</b><div class="muted small">${S.prettyTime(r.time)} daily</div></div><button class="toggle ${r.on ? 'on' : ''}" data-rem="${r.id}" aria-label="toggle"></button></div>`).join('')}</div>
  <button class="btn primary block" data-ics>📅 Add to iPhone Calendar</button>
  <div class="card mt12"><div class="kicker">How it works</div><div class="small" style="line-height:1.6">
    1. Tap the button above → Safari shows the calendar events → tap <b>Add All</b>.<br>
    2. Each one repeats daily with an alert. They come from your current sleep plan.<br>
    3. When your bedtime shifts (every 3 days), delete the “Revive” events in Calendar and add them again — or just keep them; meals follow your fixed wake time.<br>
    4. Tip: Calendar → Calendars → put them in a new calendar named <b>Revive</b> so they are easy to remove.<br><br>
    <b>Optional — Shortcuts:</b> Shortcuts app → Automation → <i>Time of Day</i> (your wake time) → <i>Open App</i> → Safari → Revive. It opens Revive every morning.</div></div>`;
}

function badges() {
  const st = S.get();
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Badges</h1><div class="sub">${Object.keys(st.game.badges).length} of ${G.BADGES.length} unlocked</div></div></div>
  <div class="badge-grid">${G.BADGES.map((b) => `<div class="badge ${st.game.badges[b.id] ? '' : 'locked'}"><div class="b">${b.e}</div><span>${UI.esc(b.n)}</span><span class="faint" style="font-weight:500">${UI.esc(b.d)}</span></div>`).join('')}</div>`;
}

function saved() {
  const st = S.get(); const tips = TIPS.filter((t) => st.savedTips.includes(t.id));
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Saved</h1></div></div>
  ${tips.length ? tips.map((t) => `<div class="tipcard" style="${UI.grad(t.bg)}"><div class="big">${t.e}</div><h3>${UI.esc(t.title)}</h3><p>${UI.esc(t.body)}</p></div>`).join('') : '<div class="empty"><span class="e">🔖</span>Save cards from your feed to read later</div>'}`;
}

function settings() {
  const st = S.get(); const s = st.settings;
  const tg = (key, label, sub, on) => `<div class="list-item"><div class="grow"><b>${label}</b>${sub ? `<div class="muted small">${sub}</div>` : ''}</div><button class="toggle ${on ? 'on' : ''}" data-set="${key}"></button></div>`;
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Settings</h1></div></div>
  <div class="card tight">
    <div class="list-item"><div class="grow"><b>App lock</b><div class="muted small">${st.lock.enabled ? (st.lock.faceId ? 'Face ID + PIN' : 'PIN') : 'Off'}</div></div><button class="toggle ${st.lock.enabled ? 'on' : ''}" data-lock></button></div>
    ${tg('winddown', 'Wind-down mode', 'Calmer app & sleeping feed after your wind-down time', s.winddown)}
    ${tg('sounds', 'Sounds', 'Reward chimes', s.sounds)}
    ${tg('haptics', 'Vibration', 'Where supported', s.haptics)}
  </div>
  <div class="section-title" style="font-size:16px">Profile</div>
  <div class="card">
    <div class="grid2"><div class="field" style="margin:0"><label>Name</label><input id="p-name" value="${UI.esc(st.profile.name)}"></div><div class="field" style="margin:0"><label>Age</label><input id="p-age" type="number" value="${st.profile.age}"></div></div>
    <div class="grid2"><div class="field"><label>Height (cm)</label><input id="p-h" type="number" value="${st.profile.heightCm}"></div><div class="field"><label>Water goal (ml)</label><input id="p-w" type="number" step="250" value="${st.profile.waterGoalMl}"></div></div>
    <div class="grid2"><div class="field"><label>Weekly food budget (¥)</label><input id="p-b" type="number" value="${st.profile.weeklyBudget}"></div><div class="field"><label>Start weight (kg)</label><input id="p-s" type="number" step="0.1" value="${st.profile.startKg}"></div></div>
    <button class="btn block mt12" data-saveprofile>Save profile</button>
  </div>
  <div class="section-title" style="font-size:16px">Privacy</div>
  <div class="notice">All data is stored only in this browser on this iPhone. Nothing is uploaded. If you delete Safari website data or the Home Screen app, your data is gone. You chose no backups; a manual export is here just in case.</div>
  <div class="grid2 mt12"><button class="btn" data-export>Export file</button><label class="btn" style="cursor:pointer">Import file<input type="file" accept=".json,application/json" data-import hidden></label></div>
  <button class="btn danger block mt12" data-reset>Delete all data</button>
  <p class="tiny faint mt16" style="text-align:center">Revive v1 · made for you · not medical advice</p>`;
}

function install() {
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Install on iPhone</h1></div></div>
  <div class="card"><div class="small" style="line-height:1.8">
    1. Open this page in <b>Safari</b> (not WeChat’s browser).<br>
    2. Tap the <b>Share</b> button (square with arrow).<br>
    3. Scroll and tap <b>Add to Home Screen</b> → <b>Add</b>.<br>
    4. Open <b>Revive</b> from your Home Screen. It runs full-screen and works offline.<br><br>
    <b>In China:</b> github.io can be slow or blocked on some networks. Load it once (use a VPN if needed) — after that it’s cached and works offline.</div></div>
  <div class="notice">Data lives inside the Home Screen app. Use the same Home Screen icon every time — opening the site in normal Safari is a separate copy.</div>`;
}

// ---------- add sheets ----------
function addLab(rerender) {
  UI.openSheet(`<h2>Add lab result</h2>
    <div class="field"><label>Test</label><select id="l-name">${LABS.map((l, i) => `<option value="${i}">${l.name}</option>`).join('')}<option value="other">Other…</option></select></div>
    <div class="field" id="l-other-wrap" hidden><label>Test name</label><input id="l-other"></div>
    <div class="grid2"><div class="field"><label>Value</label><input id="l-val" inputmode="decimal"></div><div class="field"><label>Unit</label><input id="l-unit" value="${LABS[0].unit}"></div></div>
    <div class="field"><label>Date</label><input type="date" id="l-date" value="${S.dayKey()}"></div>
    <button class="btn primary block mt16" id="l-save">Save</button>`, {
    onMount: (sh, close) => {
      const sel = sh.querySelector('#l-name');
      sel.onchange = () => { const o = sel.value === 'other'; sh.querySelector('#l-other-wrap').hidden = !o; if (!o) sh.querySelector('#l-unit').value = LABS[+sel.value].unit; };
      sh.querySelector('#l-save').onclick = (ev) => {
        const o = sel.value === 'other'; const def = o ? null : LABS[+sel.value];
        const name = o ? sh.querySelector('#l-other').value.trim() : def.name; const value = sh.querySelector('#l-val').value.trim();
        if (!name || !value) { UI.toast('Fill test and value', '⚠️'); return; }
        S.get().medical.labs.push({ id: S.uid(), name, value, unit: sh.querySelector('#l-unit').value, ref: def?.ref || '', date: sh.querySelector('#l-date').value || S.dayKey() });
        S.save(); G.award('lab_' + name, 20, ev); G.checkBadges(); close(); rerender();
      };
    },
  });
}
function addVisit(rerender) {
  UI.openSheet(`<h2>Log a doctor visit</h2>
    <div class="field"><label>Date</label><input type="date" id="v-date" value="${S.dayKey()}"></div>
    <div class="field"><label>Doctor / clinic</label><input id="v-who" placeholder="e.g. Urology, hospital name"></div>
    <div class="field"><label>What did they say?</label><textarea id="v-notes" rows="4" placeholder="Tests ordered, advice, next steps"></textarea></div>
    <button class="btn primary block mt16" id="v-save">Save</button>`, {
    onMount: (sh, close) => sh.querySelector('#v-save').onclick = (ev) => {
      S.get().medical.visits.push({ id: S.uid(), date: sh.querySelector('#v-date').value || S.dayKey(), who: sh.querySelector('#v-who').value.trim(), notes: sh.querySelector('#v-notes').value.trim() });
      S.save(); G.award('visit_' + S.dayKey(), 50, ev); G.checkBadges(); close(); rerender();
    },
  });
}

export function bind(root, parts, { rerender }) {
  const st = S.get(); const sub = parts[0];
  if (!sub) {
    root.querySelector('[data-buyfreeze]')?.addEventListener('click', () => { if (st.game.coins >= 100 && st.game.freezes < 3) { st.game.coins -= 100; st.game.freezes++; S.save(); UI.toast('Streak freeze bought', '❄️'); rerender(); } });
  }
  if (sub === 'medical') {
    const m = st.medical;
    root.querySelectorAll('[data-clr]').forEach((b) => b.onclick = async () => {
      const v = b.dataset.clr;
      if (v === 'cleared' && !(await UI.confirmSheet('Cleared by a doctor?', 'Only choose this if a doctor has checked your exertion symptoms and said exercise is OK.', 'Yes, I’m cleared'))) return;
      m.clearance = v; m.exerciseCleared = v === 'cleared'; S.save(); rerender();
    });
    root.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { const q = m.questions.find((x) => x.id === b.dataset.q); q.done = !q.done; S.save(); rerender(); });
    root.querySelectorAll('[data-delq]').forEach((b) => b.onclick = () => { m.questions = m.questions.filter((x) => x.id !== b.dataset.delq); S.save(); rerender(); });
    root.querySelector('[data-addq]').onclick = () => UI.openSheet(`<h2>Add a question</h2><div class="field"><textarea id="nq" rows="3"></textarea></div><button class="btn primary block mt12" id="nqs">Add</button>`, {
      onMount: (sh, close) => sh.querySelector('#nqs').onclick = () => { const q = sh.querySelector('#nq').value.trim(); if (q) { m.questions.push({ id: S.uid(), q, done: false }); S.save(); } close(); rerender(); },
    });
    root.querySelector('[data-addlab]').onclick = () => addLab(rerender);
    root.querySelector('[data-addvisit]').onclick = () => addVisit(rerender);
    root.querySelectorAll('[data-dellab]').forEach((b) => b.onclick = async () => { if (await UI.confirmSheet('Delete result?', '', 'Delete', true)) { m.labs = m.labs.filter((x) => x.id !== b.dataset.dellab); S.save(); rerender(); } });
    root.querySelectorAll('[data-delvisit]').forEach((b) => b.onclick = async () => { if (await UI.confirmSheet('Delete visit?', '', 'Delete', true)) { m.visits = m.visits.filter((x) => x.id !== b.dataset.delvisit); S.save(); rerender(); } });
  }
  if (sub === 'summary') {
    root.querySelector('[data-print]').onclick = () => {
      let pr = document.getElementById('print-root'); if (!pr) { pr = document.createElement('div'); pr.id = 'print-root'; document.body.appendChild(pr); }
      pr.innerHTML = root.querySelector('#print-html').innerHTML; window.print();
    };
  }
  if (sub === 'reminders') {
    st.reminderPrefs = st.reminderPrefs || {};
    root.querySelectorAll('[data-rem]').forEach((b) => b.onclick = () => { const id = b.dataset.rem; const cur = b.classList.contains('on'); st.reminderPrefs[id] = !cur; S.save(); b.classList.toggle('on'); });
    root.querySelector('[data-ics]').onclick = () => {
      const list = ICS.reminderList().map((r) => ({ ...r, on: st.reminderPrefs[r.id] ?? r.on }));
      ICS.downloadICS(list); G.award('reminders_setup', 30, null); UI.toast('Opening Calendar…', '📅');
    };
  }
  if (sub === 'settings') {
    root.querySelectorAll('[data-set]').forEach((b) => b.onclick = () => { const k = b.dataset.set; st.settings[k] = !st.settings[k]; S.save(); b.classList.toggle('on'); });
    root.querySelector('[data-lock]').onclick = async () => {
      if (st.lock.enabled) { if (await UI.confirmSheet('Turn off lock?', 'Anyone with your phone could open Revive.', 'Turn off', true)) { st.lock = { enabled: false, pinHash: null, credId: null, faceId: false }; S.saveNow(); rerender(); } }
      else Lock.setupSheet(rerender);
    };
    root.querySelector('[data-saveprofile]').onclick = () => {
      const p = st.profile; p.name = root.querySelector('#p-name').value.trim(); p.age = +root.querySelector('#p-age').value || p.age;
      p.heightCm = +root.querySelector('#p-h').value || p.heightCm; p.waterGoalMl = +root.querySelector('#p-w').value || p.waterGoalMl;
      p.weeklyBudget = +root.querySelector('#p-b').value || p.weeklyBudget; p.startKg = +root.querySelector('#p-s').value || p.startKg;
      S.save(); UI.toast('Profile saved', '✅'); rerender();
    };
    root.querySelector('[data-export]').onclick = () => {
      const blob = new Blob([S.exportJSON()], { type: 'application/json' }); const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `revive-${S.dayKey()}.json`; document.body.appendChild(a); a.click(); a.remove();
    };
    root.querySelector('[data-import]').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { const txt = await f.text(); if (await UI.confirmSheet('Replace all data?', 'This overwrites everything in Revive with the file’s contents.', 'Import', true)) { S.importJSON(txt); UI.toast('Imported', '✅'); location.hash = 'today'; } }
      catch (err) { UI.toast('That file could not be read', '⚠️'); }
    };
    root.querySelector('[data-reset]').onclick = async () => {
      if (await UI.confirmSheet('Delete everything?', 'All your logs, progress, XP and settings will be erased from this phone. This cannot be undone.', 'Delete all', true)) { S.resetAll(); location.hash = ''; location.reload(); }
    };
  }
}

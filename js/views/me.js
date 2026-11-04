import * as S from '../store.js';
import * as UI from '../ui.js';
import * as G from '../gamify.js';
import * as P from '../plan.js';
import * as Lock from '../lock.js';
import * as ICS from '../ics.js';
import * as Native from '../native.js';
import * as Cloud from '../cloud.js';
import { PHOTOS } from '../data/photos.js';
import { RECIPE, DELIVERY } from '../data/recipes.js';
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
  if (sub === 'account') return account();
  if (sub === 'credits') return credits();
  return main();
}

const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
let authEmail = '';
let accountWatch = null;
let accountRerender = null;
let codeSent = false;

function account() {
  const st = Cloud.status; const cfg = Cloud.getConfig();
  const head = `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Account & sync</h1><div class="sub">${st.user ? 'Signed in' : 'Optional — the app works fully without an account'}</div></div></div>`;
  if (!st.configured) return head + `
    <div class="card glow"><div class="kicker">☁️ Cloud sync</div><h3>Connect your Revive cloud</h3>
      <p class="muted small">Sync runs on your own private Supabase project, so your data never sits on anyone else’s server. Paste the two values from Supabase → Project Settings → API.</p>
      <div class="field"><label>Project URL</label><input id="cfg-url" placeholder="https://xxxx.supabase.co" autocomplete="off" autocapitalize="off"></div>
      <div class="field"><label>Anon public key</label><input id="cfg-key" placeholder="eyJhbGciOi…" autocomplete="off" autocapitalize="off"></div>
      <button class="btn primary block mt16" data-cfgsave>Connect</button></div>
    <div class="notice">Setup takes about 5 minutes — see docs/SETUP.md in the project.</div>`;
  if (!st.user) return head + `
    <div class="card glow"><div class="kicker">Sign in</div><h3>Keep every device in step</h3>
      <p class="muted small">Log a meal on your phone, see it on your PC instantly. Your data stays private to your account.</p>
      ${codeSent ? `<div class="field"><label>6-digit code sent to ${UI.esc(authEmail)}</label><input id="au-code" inputmode="numeric" maxlength="8" placeholder="123456" autocomplete="one-time-code"></div>
        <button class="btn primary block mt12" data-verify>Verify & sign in</button><button class="btn ghost block mt8" data-resend>Use a different email</button>`
      : `<div class="field"><label>Email</label><input id="au-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="${UI.esc(authEmail)}"></div>
        <button class="btn primary block mt12" data-sendcode>Email me a sign-in code</button>`}
      <div class="row mt16" style="gap:10px"><div class="grow" style="height:1px;background:var(--line)"></div><span class="tiny muted">or</span><div class="grow" style="height:1px;background:var(--line)"></div></div>
      <button class="btn block mt12" data-google><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Continue with Google</button>
      <p class="tiny faint mt8">Google sign-in needs a VPN in mainland China. Email codes work everywhere.</p></div>
    ${st.error ? `<div class="notice" style="color:var(--coral)">${UI.esc(st.error)}</div>` : ''}
    <button class="btn ghost block mt12 small" data-cfgclear>Disconnect cloud project</button>`;
  return head + `
    <div class="card glow" style="text-align:center"><div style="font-size:46px">☁️</div><h3 class="mt8">${UI.esc(st.user.email || 'Signed in')}</h3>
      <p class="muted small">${st.user.provider === 'google' ? 'Google account' : 'Email account'} · ${st.online ? (st.syncing ? 'Syncing…' : st.lastSync ? 'Last synced ' + ago(st.lastSync) : 'Connecting…') : 'Offline — changes will sync when you reconnect'}</p>
      <div class="grid2 mt16"><button class="btn" data-syncnow>🔄 Sync now</button><button class="btn danger" data-signout>Sign out</button></div></div>
    ${st.error ? `<div class="notice" style="color:var(--coral)">${UI.esc(st.error)}</div>` : ''}
    <div class="notice">Changes sync automatically within a few seconds. Your app lock and PIN stay on each device and are never uploaded.</div>
    <button class="btn ghost danger block mt16 small" data-delacct>Delete my account and cloud data</button>`;
}

function credits() {
  const rows = Object.entries(PHOTOS).map(([id, p]) => ({ name: RECIPE[id]?.name || DELIVERY.find((d) => d.id === id)?.name || id, ...p }));
  return `<div class="topbar">${back('me/settings')}<div class="grow"><h1 style="font-size:24px">Photo credits</h1><div class="sub">Free-licence photos from Wikimedia Commons</div></div></div>
  <div class="card tight">${rows.length ? rows.map((r) => `<div class="list-item"><div class="li-ico" style="background:url('${r.src}') center/cover"></div><div class="grow" style="min-width:0"><b>${UI.esc(r.name)}</b><div class="muted small">${UI.esc(r.credit)}</div><a class="tiny" href="${UI.esc(r.page)}" target="_blank" rel="noopener">Source</a>${r.licence_url ? ` · <a class="tiny" href="${UI.esc(r.licence_url)}" target="_blank" rel="noopener">Licence</a>` : ''}</div></div>`).join('') : '<div class="empty small">No photos bundled.</div>'}</div>
  <p class="tiny faint">Photos were resized and cropped to fit. Illustrated cards are original artwork.</p>`;
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
    ${item('me/account', Cloud.status.user ? '☁️' : '👤', Cloud.status.user ? 'Account & sync' : 'Sign in & sync devices', Cloud.status.user ? `${UI.esc(Cloud.status.user.email || 'Signed in')} · ${Cloud.status.lastSync ? 'synced ' + ago(Cloud.status.lastSync) : 'syncing…'}` : 'Phone, PC and Android stay in step')}
    ${item('me/medical', '🩺', 'Medical & follow-up', `${open} questions for your doctor · ${st.medical.labs.length} lab results`)}
    ${item('me/summary', '🖨️', 'Doctor summary', 'One-page report of your last 4 weeks')}
    ${item('me/reminders', '⏰', 'Reminders', Native.isNative ? (st.nativeReminders ? 'Notifications on' : 'Turn on daily notifications') : 'Add daily alerts to iPhone Calendar')}
    ${item('me/saved', '🔖', 'Saved cards', `${st.savedTips.length} saved`)}
    ${Native.isNative || window.reviveDesktop ? '' : item('me/install', '📲', 'Install on iPhone or PC', 'Home Screen · Windows app · offline')}
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
    <h2>Private symptom log (last 28 days)</h2>${(() => { const L = (st.sxLog || []).filter((x) => days.includes(x.date)); if (!L.length) return '<p>No entries</p>';
      const c = (f) => L.filter(f).length; const solo = L.filter((x) => x.type === 0), partner = L.filter((x) => x.type === 1);
      const firm = (a) => a.length ? Math.round(a.filter((x) => x.firm >= 3).length / a.length * 100) + '%' : '—';
      return `<table><tr><th>Entries</th><td>${L.length} (solo ${solo.length}, partner ${partner.length})</td></tr>
      <tr><th>Firm enough</th><td>solo ${firm(solo)} · partner ${firm(partner)}</td></tr>
      <tr><th>Lost erection early/partway</th><td>${c((x) => x.kept != null && x.kept < 2)} of ${L.length}</td></tr>
      <tr><th>Ejaculation &lt; 1 min / 1–2 min</th><td>${c((x) => x.time === 0)} / ${c((x) => x.time === 1)}</td></tr>
      <tr><th>Semen: less / none</th><td>${c((x) => x.semen === 1)} / ${c((x) => x.semen === 2)}</td></tr>
      <tr><th>Felt anxious/pressure</th><td>${c((x) => x.anxious)}</td></tr></table>`; })()}
    <h2>Lab results entered</h2>${st.medical.labs.length ? `<table>${st.medical.labs.map((l) => `<tr><td>${l.date}</td><td>${UI.esc(l.name)}</td><td>${UI.esc(l.value)} ${UI.esc(l.unit)}</td></tr>`).join('')}</table>` : '<p>None</p>'}
    <h2>Questions</h2><ol>${(st.medical.questions || []).filter((q) => !q.done).map((q) => `<li>${UI.esc(q.q)}</li>`).join('')}</ol>`;
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Doctor summary</h1><div class="sub">Show on your phone or print / save as PDF</div></div></div>
  <div class="grid2 mb12"><button class="btn primary" data-print>🖨️ Print / PDF</button><button class="btn" data-sharesum>📤 Share text</button></div>
  <div class="card summary-doc" style="background:#fff;color:#111;font-size:13px;line-height:1.45">${html.replace(/<h2>/g, '<h3 style="margin-top:14px;border-bottom:1px solid #ccc;font-size:14px">').replace(/<\/h2>/g, '</h3>').replace(/<table>/g, '<table style="width:100%;border-collapse:collapse;font-size:12px" border="1" cellpadding="4">')}</div>
  <template id="print-html">${html}</template>`;
}

function reminders() {
  const st = S.get(); st.reminderPrefs = st.reminderPrefs || {};
  const list = ICS.reminderList().map((r) => ({ ...r, on: st.reminderPrefs[r.id] ?? r.on }));
  if (Native.isNative) return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Reminders</h1><div class="sub">Daily notifications from Revive</div></div></div>
  <div class="card"><div class="list-item"><div class="grow"><b>Notifications</b><div class="muted small">${st.nativeReminders ? 'On — they follow your sleep plan automatically' : 'Off'}</div></div><button class="toggle ${st.nativeReminders ? 'on' : ''}" data-nativerem></button></div></div>
  <div class="card tight">${list.map((r) => `<div class="list-item"><div class="grow"><b>${UI.esc(r.title)}</b><div class="muted small">${S.prettyTime(r.time)} daily</div></div><button class="toggle ${r.on ? 'on' : ''}" data-rem="${r.id}" aria-label="toggle"></button></div>`).join('')}</div>
  <div class="notice">Times update by themselves as your bedtime shifts earlier. Turn individual reminders on or off above.</div>`;
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Reminders</h1><div class="sub">Free daily alerts via iPhone Calendar</div></div></div>
  <div class="card tight">${list.map((r) => `<div class="list-item"><div class="grow"><b>${UI.esc(r.title)}</b><div class="muted small">${S.prettyTime(r.time)} daily</div></div><button class="toggle ${r.on ? 'on' : ''}" data-rem="${r.id}" aria-label="toggle"></button></div>`).join('')}</div>
  <button class="btn primary block" data-ics>📅 Add to iPhone Calendar</button>
  <button class="btn block mt8" data-icsshare>Didn’t open? Share the file instead</button>
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
    <div class="list-item"><div class="grow"><b>App lock</b><div class="muted small">${st.lock.enabled ? (st.lock.faceId ? 'Face ID / Windows Hello + PIN' : 'PIN') : 'Off'}</div></div><button class="toggle ${st.lock.enabled ? 'on' : ''}" data-lock></button></div>
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
  <a class="list-item mt12" href="#me/credits" style="color:inherit;text-decoration:none"><div class="li-ico">📷</div><div class="grow"><b>Photo credits</b></div></a>
  <a class="list-item" href="privacy.html" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><div class="li-ico">🔒</div><div class="grow"><b>Privacy policy</b></div></a>
  <p class="tiny faint mt16" style="text-align:center">Revive 1.0 · not medical advice</p>`;
}

function install() {
  const canPc = !!window.__canInstall;
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Install Revive</h1><div class="sub">iPhone and Windows PC</div></div></div>
  <div class="card"><div class="kicker">🖥️ Windows PC</div>
    ${canPc ? '<button class="btn primary block mb12" data-installpc>Install on this PC</button>' : ''}
    <div class="small" style="line-height:1.8">
    1. Open <b>https://syluszephyr.github.io/SylusZephyr/</b> in <b>Microsoft Edge</b> or <b>Google Chrome</b>.<br>
    2. Click the <b>Install</b> icon in the address bar (a monitor with ⬇), or menu <b>⋯ → Apps → Install Revive</b>.<br>
    3. Revive opens in its own window and appears in the <b>Start menu</b> — right-click it to <b>Pin to taskbar</b>.<br>
    4. Works offline. Lock with <b>Windows Hello</b> (face, fingerprint or PIN) in Settings.<br>
    Keyboard: <kbd>1</kbd>–<kbd>5</kbd> switch tabs · <kbd>Esc</kbd> closes · type your PIN on the lock screen.</div></div>
  <div class="card"><div class="kicker">📱 iPhone</div><div class="small" style="line-height:1.8">
    1. Open the same link in <b>Safari</b> (not WeChat’s browser).<br>
    2. Tap <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>.<br>
    3. Always open Revive from the Home Screen icon.</div></div>
  <div class="card"><div class="kicker">🔄 Phone ⇄ PC</div><p class="small muted" style="line-height:1.6">Each device keeps its own private data — nothing is uploaded, so they don’t sync automatically. To move your progress, use <b>Me → Settings → Export file</b> on one device and <b>Import file</b> on the other (AirDrop, WeChat File Transfer or a USB cable).</p></div>
  <div class="notice">In China, github.io can be slow — load it once (VPN if needed). After that it works offline on both devices.</div>`;
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
  if (sub === 'account') {
    accountRerender = rerender;
    if (!accountWatch) accountWatch = Cloud.onChange(() => { if (location.hash === '#me/account' && !document.querySelector('.sheet')) setTimeout(() => accountRerender?.(), 0); });
    const busy = (b, label) => { b.disabled = true; b.textContent = label; };
    root.querySelector('[data-cfgsave]')?.addEventListener('click', async () => {
      const url = root.querySelector('#cfg-url').value, key = root.querySelector('#cfg-key').value;
      if (!/^https:\/\/.+/.test(url.trim()) || key.trim().length < 20) { UI.toast('Check the URL and key', '⚠️'); return; }
      Cloud.saveConfig(url, key); await Cloud.init(); UI.toast('Cloud connected', '☁️'); rerender();
    });
    root.querySelector('[data-cfgclear]')?.addEventListener('click', async () => { if (await UI.confirmSheet('Disconnect cloud?', 'This device stops syncing. Your local data stays.', 'Disconnect', true)) { Cloud.clearConfig(); location.reload(); } });
    root.querySelector('[data-sendcode]')?.addEventListener('click', async (e) => {
      authEmail = root.querySelector('#au-email').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(authEmail)) { UI.toast('Enter a valid email', '⚠️'); return; }
      busy(e.currentTarget, 'Sending…');
      try { await Cloud.sendEmailCode(authEmail); codeSent = true; UI.toast('Code sent — check your inbox', '📧'); } catch (err) { UI.toast(err.message || 'Could not send code', '⚠️'); }
      rerender();
    });
    root.querySelector('[data-verify]')?.addEventListener('click', async (e) => {
      const code = root.querySelector('#au-code').value; busy(e.currentTarget, 'Checking…');
      try { await Cloud.verifyEmailCode(authEmail, code); codeSent = false; G.award('cloud_signin', 50, null); UI.toast('Signed in — syncing', '☁️'); } catch (err) { UI.toast(err.message || 'Wrong or expired code', '⚠️'); }
      rerender();
    });
    root.querySelector('[data-resend]')?.addEventListener('click', () => { codeSent = false; rerender(); });
    root.querySelector('[data-google]')?.addEventListener('click', async () => { try { await Cloud.signInWithGoogle(); } catch (err) { UI.toast(err.message || 'Google sign-in failed', '⚠️'); } });
    root.querySelector('[data-syncnow]')?.addEventListener('click', async () => { await Cloud.syncNow(); UI.toast('Synced', '🔄'); rerender(); });
    root.querySelector('[data-delacct]')?.addEventListener('click', async () => {
      if (!(await UI.confirmSheet('Delete account?', 'Your cloud account and all synced data are permanently deleted. Data on this device stays unless you also delete it in Settings.', 'Delete account', true))) return;
      try { await Cloud.deleteAccount(); UI.toast('Account deleted', '🗑️'); } catch (err) { UI.toast(err.message || 'Could not delete account', '⚠️'); }
      rerender();
    });
    root.querySelector('[data-signout]')?.addEventListener('click', async () => { if (await UI.confirmSheet('Sign out?', 'Your data stays on this device. It stops syncing until you sign in again.', 'Sign out', true)) { await Cloud.signOut(); rerender(); } });
  }
  if (sub === 'install') {
    root.querySelector('[data-installpc]')?.addEventListener('click', async () => { const ok = await window.__promptInstall?.(); if (ok) UI.toast('Installed! Find Revive in your Start menu', '🖥️'); rerender(); });
  }
  if (sub === 'summary') {
    root.querySelector('[data-print]').onclick = async () => {
      if (Native.isNative) { const html = '<!doctype html><meta charset="utf-8"><title>Revive summary</title><body style="font-family:-apple-system,sans-serif;padding:20px">' + root.querySelector('#print-html').innerHTML + '</body>'; if (await Native.shareFile('Revive-summary.html', html, 'Revive summary')) return; }
      let pr = document.getElementById('print-root'); if (!pr) { pr = document.createElement('div'); pr.id = 'print-root'; document.body.appendChild(pr); }
      pr.innerHTML = root.querySelector('#print-html').innerHTML; window.print();
    };
    root.querySelector('[data-sharesum]').onclick = async () => {
      const tmp = document.createElement('div'); tmp.innerHTML = root.querySelector('#print-html').innerHTML;
      tmp.querySelectorAll('h1,h2,p,li,tr').forEach((el) => el.append('\n')); tmp.querySelectorAll('td,th').forEach((el) => el.append('  '));
      const text = tmp.textContent.replace(/\n\s*\n+/g, '\n').trim();
      if (await Native.shareText('Revive summary', text)) return;
      try { if (navigator.share) await navigator.share({ title: 'Revive summary', text }); else { await navigator.clipboard.writeText(text); UI.toast('Summary copied', '📋'); } } catch (e) {}
    };
  }
  if (sub === 'reminders') {
    st.reminderPrefs = st.reminderPrefs || {};
    root.querySelectorAll('[data-rem]').forEach((b) => b.onclick = () => { const id = b.dataset.rem; const cur = b.classList.contains('on'); st.reminderPrefs[id] = !cur; S.save(); b.classList.toggle('on'); window.__syncReminders?.(true); });
    root.querySelector('[data-nativerem]')?.addEventListener('click', async () => {
      if (st.nativeReminders) { st.nativeReminders = false; S.save(); await Native.cancelReminders(); UI.toast('Reminders off', '🔕'); rerender(); return; }
      if (!(await Native.requestNotifications())) { UI.toast('Allow notifications in iPhone Settings → Revive', '⚠️'); return; }
      st.nativeReminders = true; S.save(); const n = await window.__syncReminders?.(true); G.award('reminders_setup', 30, null); UI.toast(`${n || 0} daily reminders scheduled`, '⏰'); rerender();
    });
    if (Native.isNative) return;
    root.querySelector('[data-ics]').onclick = () => {
      const list = ICS.reminderList().map((r) => ({ ...r, on: st.reminderPrefs[r.id] ?? r.on }));
      ICS.downloadICS(list); G.award('reminders_setup', 30, null); UI.toast('Opening Calendar…', '📅');
    };
    root.querySelector('[data-icsshare]').onclick = async () => {
      const list = ICS.reminderList().map((r) => ({ ...r, on: st.reminderPrefs[r.id] ?? r.on }));
      try { if (!(await ICS.shareICS(list))) UI.toast('Sharing not supported — open Revive in Safari and try again', '⚠️'); else G.award('reminders_setup', 30, null); } catch (e) {}
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
    root.querySelector('[data-export]').onclick = async () => {
      if (await Native.shareFile(`revive-${S.dayKey()}.json`, S.exportJSON(), 'Revive data')) return;
      const blob = new Blob([S.exportJSON()], { type: 'application/json' }); const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `revive-${S.dayKey()}.json`; document.body.appendChild(a); a.click(); a.remove();
    };
    root.querySelector('[data-import]').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { const txt = await f.text(); if (await UI.confirmSheet('Replace all data?', 'This overwrites everything in Revive with the file’s contents.', 'Import', true)) { S.importJSON(txt); UI.toast('Imported', '✅'); location.hash = 'today'; } }
      catch (err) { UI.toast('That file could not be read', '⚠️'); }
    };
    root.querySelector('[data-reset]').onclick = async () => {
      if (await UI.confirmSheet('Delete everything?', 'All your logs, progress, XP and settings will be erased from this phone. This cannot be undone.', 'Delete all', true)) { await Native.clearPersisted(); await Native.cancelReminders(); S.resetAll(); location.hash = ''; location.reload(); }
    };
  }
}

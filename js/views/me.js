import * as S from '../store.js';
import * as UI from '../ui.js';
import * as G from '../gamify.js';
import * as P from '../plan.js';
import * as Lock from '../lock.js';
import * as ICS from '../ics.js';
import * as Native from '../native.js';
import * as Cloud from '../cloud.js';
import { PHOTOS } from '../data/photos.js';
import * as ShareCard from '../sharecard.js';
import { RECIPE, DELIVERY } from '../data/recipes.js';
import { TIPS, RED_FLAGS, CRISIS, DOCTOR_QUESTIONS, CHECKINS } from '../data/content.js';
import { pfWeek } from './train.js';
import * as Pr from '../prayer.js';
import * as Caf from '../caffeine.js';
import * as Theme from '../theme.js';
import * as Progress from '../progress.js';
import { LANGUAGES, locale, setLocale } from '../i18n.js';

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
  if (sub === 'prayer') return prayer();
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
    <div class="card glow"><div class="kicker">Cloud sync</div><h3>Connect your Revive cloud</h3>
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
    <div class="card glow" style="text-align:center"><div style="font-size:46px"></div><h3 class="mt8">${UI.esc(st.user.email || 'Signed in')}</h3>
      <p class="muted small">${st.user.provider === 'google' ? 'Google account' : 'Email account'} · ${st.online ? (st.syncing ? 'Syncing…' : st.lastSync ? 'Last synced ' + ago(st.lastSync) : 'Connecting…') : 'Offline — changes will sync when you reconnect'}</p>
      <div class="grid2 mt16"><button class="btn" data-syncnow>Sync now</button><button class="btn danger" data-signout>Sign out</button></div></div>
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
  return `<div class="topbar"><div><div class="sub">Profile</div><h1>${UI.esc(st.profile.name || 'Me')}</h1></div><a class="icon-btn" href="#me/settings" aria-label="Settings">${UI.ICON.gear}</a></div>
  <div class="card">
    <div class="small muted">Level ${lv.level}</div><h2 style="font-size:24px;margin-top:2px">${lv.title}</h2>
    <p class="small muted mt8">${G.TITLE_NOTE[Math.min(G.TITLE_NOTE.length - 1, Math.floor((lv.level - 1) / 2))]}</p>
    <div class="grid3 mt12">
      <div class="macro"><b>${G.streak()}</b><span>day streak</span></div>
      <div class="macro"><b>${st.game.bestStreak}</b><span>best streak</span></div>
      <div class="macro"><b>${Object.values(st.game.challenges || {}).filter((c) => c.done).length}</b><span>challenges</span></div>
    </div>
    <div class="row between small muted mt12"><span>${lv.need - lv.into} XP to level ${lv.level + 1}</span><span>${st.game.freezes} streak freeze${st.game.freezes === 1 ? '' : 's'}</span></div>
    <div class="lvlbar mt8"><i style="width:${Math.round(lv.pct * 100)}%"></i></div>
    <button class="btn block mt12" data-sharecard>Share progress image</button>
  </div>
  <button class="card" data-recap style="display:flex;width:100%;align-items:center;justify-content:space-between;text-align:left"><span><b>Monthly recap</b><div class="small muted">${Progress.monthData(Progress.lastMonthKey()).label}</div></span><span class="chev">${UI.ICON.chev}</span></button>
  <a class="card" href="#me/badges" style="display:flex;align-items:center;justify-content:space-between;color:inherit;text-decoration:none"><span><b>Milestones</b><div class="small muted">${nb} of ${G.BADGES.length} reached</div></span><span class="chev">${UI.ICON.chev}</span></a>
  <div class="card tight">
    ${!Cloud.getConfig() && !Cloud.status.user ? '' : item('me/account', Cloud.status.user ? '' : '', Cloud.status.user ? 'Account & sync' : 'Sign in & sync devices', Cloud.status.user ? `${UI.esc(Cloud.status.user.email || 'Signed in')} · ${Cloud.status.lastSync ? 'synced ' + ago(Cloud.status.lastSync) : 'syncing…'}` : 'Phone, PC and Android stay in step')}
    ${item('me/medical', '', 'Medical & follow-up', `${open} questions for your doctor · ${st.medical.labs.length} lab results`)}
    ${item('me/summary', '', 'Doctor summary', 'One-page report of your last 4 weeks')}
    ${item('me/reminders', '', 'Reminders', Native.isNative ? (st.nativeReminders ? 'Notifications on' : 'Turn on daily notifications') : 'Add daily alerts to iPhone Calendar')}
    ${item('me/prayer', '', 'Prayer times & Ramadan', Pr.settings().enabled ? `<span>${UI.esc(Pr.settings().cityName)}</span> · <span>${Pr.fasting() ? 'Fasting mode on' : Pr.next().label}</span> <span>${S.prettyTime(Pr.next().clock)}</span>` : 'Off · offline, no location needed')}
    ${item('me/saved', '', 'Library', `${TIPS.length} short reads · ${st.savedTips.length} saved`)}
    ${Native.isNative || window.reviveDesktop ? '' : item('me/install', '', 'Install on iPhone or PC', 'Home Screen · Windows app · offline')}
    ${item('me/settings', '', 'Settings & privacy', st.lock.enabled ? 'Locked with ' + (st.lock.faceId ? 'Face ID + PIN' : 'PIN') : 'App lock off')}
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
    <p class="small muted mt8">${m.exerciseCleared ? 'Cleared. Activity unlocked in Train — still stop for any chest pain, dizziness or unusual breathlessness.' : 'Training stays gentle (walking + pelvic floor) until a doctor clears you for exercise.'}</p></div>

  <div class="section-title">Ask at your next visit <button class="link" data-addq>+ Add</button></div>
  <div class="card tight">${m.questions.map((q) => `<div class="check ${q.done ? 'done' : ''}"><button class="box" data-q="${q.id}" aria-label="Asked">${UI.ICON.check}</button><span class="label small" style="font-weight:500">${UI.esc(q.q)}</span><button class="faint" data-delq="${q.id}" aria-label="Delete" style="padding:6px">${UI.ICON.trash.replace('<svg', '<svg width="16" height="16"')}</button></div>`).join('')}</div>

  <div class="section-title">Visits <button class="link" data-addvisit>+ Add</button></div>
  <div class="card tight">${m.visits.length ? [...m.visits].reverse().map((v) => `<div class="list-item"><div class="li-ico"></div><div class="grow"><b>${S.prettyDate(v.date)}${v.who ? ' · ' + UI.esc(v.who) : ''}</b><div class="muted small" style="white-space:pre-wrap">${UI.esc(v.notes)}</div></div><button class="icon-btn" data-delvisit="${v.id}">${UI.ICON.trash}</button></div>`).join('') : '<div class="empty small">No visits logged</div>'}</div>

  <div class="section-title">Lab results <button class="link" data-addlab>+ Add</button></div>
  <div class="card tight">${m.labs.length ? [...m.labs].sort((a, b) => b.date.localeCompare(a.date)).map((l) => `<div class="list-item"><div class="li-ico"></div><div class="grow"><b>${UI.esc(l.name)}: ${UI.esc(l.value)} ${UI.esc(l.unit)}</b><div class="muted small">${S.prettyDate(l.date)}${l.ref ? ` · typical ${UI.esc(l.ref)}` : ''}</div></div><button class="icon-btn" data-dellab="${l.id}">${UI.ICON.trash}</button></div>`).join('') : '<div class="empty small">Add results when you get them. Ranges are typical guides — labs differ, your doctor interprets them.</div>'}</div>

  <div class="card"><div class="kicker">Supplements — what’s worth it</div>
    <div class="small" style="line-height:1.6">Vitamin D / B12 — if a test or diet suggests a need<br>Iron — only if deficiency is confirmed<br>Zinc — from food (meat, eggs, nuts); avoid high doses<br>Protein powder — optional convenience<br>“Testosterone boosters” — avoid unverified products<br>Sildenafil/tadalafil — not without a doctor, especially with your exertion symptoms</div></div>
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
    <p><span>Generated</span> ${S.prettyDate(S.dayKey(), { day: 'numeric', month: 'long', year: 'numeric' })} ${S.prettyTime(S.hm())} · <span>last 28 days · self-reported</span></p>
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
    ${weeks.map((w) => { const c = st.checkins[w]; return `<tr><td>${w}</td><td>${c.erection?.score?.pct ?? '—'}</td><td>${c.mood ? `${c.mood.score.total} (anx ${c.mood.score.anx}, dep ${c.mood.score.dep})` : '—'}</td><td>${c.energy?.score?.pct ?? '—'}${c.energy?.score?.redFlag ? ' exertion symptoms' : ''}</td></tr>`; }).join('') || '<tr><td colspan="4">None yet</td></tr>'}</table>
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
  <div class="grid2 mb12"><button class="btn primary" data-print>Print / PDF</button><button class="btn" data-sharesum>Share text</button></div>
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
  <button class="btn primary block" data-ics>Add to iPhone Calendar</button>
  <button class="btn block mt8" data-icsshare>Didn’t open? Share the file instead</button>
  <div class="card mt12"><div class="kicker">How it works</div><div class="small" style="line-height:1.6">
    1. Tap the button above → Safari shows the calendar events → tap <b>Add All</b>.<br>
    2. Each one repeats daily with an alert. They come from your current sleep plan.<br>
    3. When your bedtime shifts (every 3 days), delete the “Revive” events in Calendar and add them again — or just keep them; meals follow your fixed wake time.<br>
    4. Tip: Calendar → Calendars → put them in a new calendar named <b>Revive</b> so they are easy to remove.<br><br>
    <b>Optional — Shortcuts:</b> Shortcuts app → Automation → <i>Time of Day</i> (your wake time) → <i>Open App</i> → Safari → Revive. It opens Revive every morning.</div></div>`;
}

function badges() {
  const st = S.get(); const got = G.BADGES.filter((b) => st.game.badges[b.id]); const left = G.BADGES.filter((b) => !st.game.badges[b.id]);
  const row = (b, done) => `<div class="list-item"><div class="li-ico" style="${done ? 'background:var(--green);color:#0b0c0e' : ''}">${done ? UI.ICON.check : UI.ICON.lock}</div><div class="grow"><b style="${done ? '' : 'color:var(--muted)'}">${UI.esc(b.n)}</b><div class="small muted">${UI.esc(b.d)}</div></div></div>`;
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Milestones</h1><div class="sub">${got.length} of ${G.BADGES.length} reached</div></div></div>
  ${got.length ? `<div class="section-title">Reached</div><div class="card tight">${got.map((b) => row(b, true)).join('')}</div>` : ''}
  <div class="section-title">Ahead</div><div class="card tight">${left.map((b) => row(b, false)).join('')}</div>`;
}

let libCat = 'all';
function saved() {
  const st = S.get(); const cats = [...new Set(TIPS.map((t) => t.cat))];
  const list = TIPS.filter((t) => libCat === 'all' || (libCat === 'saved' ? st.savedTips.includes(t.id) : t.cat === libCat));
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Library</h1><div class="sub">${TIPS.length} short reads on food, sleep, training and mood</div></div></div>
  <div class="chips scroll mb12">${[['all', 'All'], ['saved', `Saved (${st.savedTips.length})`], ...cats.map((c) => [c, c])].map(([id, l]) => `<button class="chip ${libCat === id ? 'on' : ''}" data-libcat="${UI.esc(id)}">${UI.esc(l)}</button>`).join('')}</div>
  ${list.length ? list.map((t) => { const sv = st.savedTips.includes(t.id); return `<article class="card"><div class="row between"><span class="small muted">${UI.esc(t.cat)}</span><button class="icon-btn" style="width:32px;height:32px" data-libsave="${t.id}" aria-pressed="${sv}" aria-label="Save">${sv ? UI.ICON.bookmarkFill : UI.ICON.bookmark}</button></div><h3 class="mt8">${UI.esc(t.title)}</h3><p class="small muted mt8" style="line-height:1.55">${UI.esc(t.body)}</p></article>`; }).join('') : '<div class="empty">Nothing saved yet.</div>'}`;
}

function prayer() {
  const st = S.get(); const cfg = Pr.settings(); const p = st.prayer || {};
  const list = Pr.todayList(); const nx = Pr.next(); const dtr = Pr.daysToRamadan(); const hj = Pr.hijri();
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Prayer & Ramadan</h1></div></div>
  <div class="card tight"><div class="list-item"><div class="grow"><b>Show prayer times on Today</b><div class="muted small">Worked out on this device from the sun’s position. No location permission, no internet.</div></div><button class="toggle ${cfg.enabled ? 'on' : ''}" data-prayeron aria-label="Show prayer times"></button></div></div>
  <div class="card tight">
    <div class="list-item"><div class="grow"><b>Notify me at each prayer</b><div class="muted small">${Native.isNative ? (st.nativeReminders ? 'Refreshed daily, works offline' : 'Turn on notifications in Me → Reminders first') : 'Available in the phone app'}</div></div><button class="toggle ${p.notify ? 'on' : ''}" data-prnotify aria-label="Prayer notifications" ${Native.isNative ? '' : 'disabled'}></button></div>
    <div class="list-item"><div class="grow"><b>Suhoor & iftar alerts</b><div class="muted small">45 min before dawn, 15 min before iftar, and a late-meal nudge — only on fasting days</div></div><button class="toggle ${p.fastAlerts !== false ? 'on' : ''}" data-prfast aria-label="Suhoor and iftar alerts" ${Native.isNative ? '' : 'disabled'}></button></div>
  </div>
  <div class="card">
    <div class="field" style="margin:0"><label>City</label><select id="pr-city">${Pr.CITIES.map((c) => `<option value="${c.id}" ${cfg.city === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}<option value="custom" ${cfg.city === 'custom' ? 'selected' : ''}>Other (enter coordinates)…</option></select></div>
    <div class="grid3 ${cfg.city === 'custom' ? '' : 'hidden'}" id="pr-custom"><div class="field"><label>Latitude</label><input id="pr-lat" type="number" step="0.001" value="${p.lat ?? cfg.lat}"></div><div class="field"><label>Longitude</label><input id="pr-lng" type="number" step="0.001" value="${p.lng ?? cfg.lng}"></div><div class="field"><label>UTC offset</label><input id="pr-tz" type="number" step="0.5" value="${cfg.tz}"></div></div>
    <div class="field"><label>Calculation method</label><select id="pr-method">${Object.entries(Pr.METHODS).map(([id, m]) => `<option value="${id}" ${cfg.method === id ? 'selected' : ''}>${m.name}</option>`).join('')}</select></div>
    <div class="field"><label>Asr</label><div class="seg" id="pr-asr"><button data-asr="standard" class="${cfg.asr === 'standard' ? 'on' : ''}">Standard</button><button data-asr="hanafi" class="${cfg.asr === 'hanafi' ? 'on' : ''}">Hanafi</button></div></div>
  </div>
  <div class="card"><div class="row between"><div class="kicker"><span>Today</span> · <span>${UI.esc(cfg.cityName)}</span></div><span class="small" style="font-weight:700"><span>${nx.label}</span> <span>in ${Pr.countdown(nx.inMin)}</span></span></div>
    ${list.map((x) => `<div class="list-item"><div class="grow"><b>${x.label}</b></div><span style="font-weight:800">${x.clock ? S.prettyTime(x.clock) : '—'}</span></div>`).join('')}
    <p class="tiny muted mt8">If your local mosque’s timetable differs, follow the mosque.</p></div>
  <div class="section-title" style="font-size:16px">Ramadan fasting mode</div>
  <div class="card">
    <p class="small muted">${dtr === 0 ? `It’s Ramadan${hj ? ` (day ${hj.day})` : ''}. Ramadan Mubarak ` : dtr ? `Ramadan starts in about <b>${dtr} days</b> (dates depend on the moon sighting).` : ''} Fasting mode moves your meals to suhoor and iftar, spreads water between iftar and dawn, and swaps the coffee rule for “none in the 6 h before bed”.</p>
    <div class="seg mt12" id="pr-ram">${[['auto', 'Auto in Ramadan'], ['on', 'On now'], ['off', 'Off']].map(([v, l]) => `<button data-ram="${v}" class="${cfg.ramadan === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="notice mt12">You’re still regaining weight and energy. Islam exempts people who are unwell from fasting. Ask your doctor first, and stop the fast if you feel faint, chest pain, a racing heart or confusion.</div>
  </div>
  <div class="card"><div class="kicker">Suhoor & iftar that work for you</div>
    <ul class="small" style="line-height:1.7;padding-left:18px;margin:8px 0 0">
      <li><b>Suhoor:</b> slow energy and protein — overnight oats, eggs on paratha, yogurt + dates + nuts. Two big glasses of water.</li>
      <li><b>Iftar:</b> 3 dates and water, pray, then a full plate. Don’t skip the late meal: you need the calories.</li>
      <li><b>Weight goal:</b> aim for at least two real meals plus a shake between iftar and suhoor.</li>
    </ul></div>`;
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
  <div class="section-title" style="font-size:16px">Language</div>
  <div class="card"><div class="seg lang-pick" data-no-tr>${LANGUAGES.map((l) => `<button data-lang="${l.code}" class="${locale === l.code ? 'on' : ''}" lang="${l.code}">${l.native}</button>`).join('')}</div></div>
  <div class="section-title" style="font-size:16px">Look</div>
  <div class="card">
    <div class="field" style="margin:0"><label>Accent colour</label><div class="chips">${Theme.ACCENTS.map((a) => `<button class="chip swatch ${Theme.current().accent === a.id ? 'on' : ''}" data-accent="${a.id}" aria-label="${a.label}" aria-pressed="${Theme.current().accent === a.id}"><i style="background:${a.c1}"></i>${a.label}</button>`).join('')}
      <label class="chip swatch ${Theme.current().accent === 'custom' ? 'on' : ''}" style="cursor:pointer"><i style="background:${Theme.current().custom}"></i>Custom<input type="color" data-customaccent value="${Theme.current().custom}" style="position:absolute;opacity:0;width:1px;height:1px" aria-label="Pick a custom accent colour"></label></div></div>
    <div class="field"><label>Background</label><div class="seg" id="bgseg">${Theme.BACKGROUNDS.map((b) => `<button data-bg="${b.id}" class="${Theme.current().bg === b.id ? 'on' : ''}">${b.label}</button>`).join('')}</div></div>
    <div class="field"><label>Text size</label><div class="seg" id="fsseg">${Theme.SIZES.map((b) => `<button data-fs="${b.id}" class="${Theme.current().size === b.id ? 'on' : ''}">${b.label}</button>`).join('')}</div></div>
  </div>
  <div class="section-title" style="font-size:16px">Coffee</div>
  <div class="card">
    <div class="grid2"><div class="field" style="margin:0"><label>Your usual cup (mg caffeine)</label><input id="p-cup" type="number" min="5" max="400" step="5" value="${Caf.cupMg()}"></div>
    <div class="field" style="margin:0"><label>Coffee cutoff</label><input id="p-cut" type="time" value="${st.profile.caffeineCutoff}"></div></div>
    <p class="tiny muted mt8">Luckin / Starbucks Americano ≈ 150 mg (medium). Single espresso ≈ 75 mg. Used for the “caffeine in your body” estimate.</p>
  </div>
  <div class="section-title" style="font-size:16px">Profile</div>
  <div class="card">
    <div class="grid2"><div class="field" style="margin:0"><label>Name</label><input id="p-name" value="${UI.esc(st.profile.name)}"></div><div class="field" style="margin:0"><label>Age</label><input id="p-age" type="number" value="${st.profile.age}"></div></div>
    <div class="grid2"><div class="field"><label>Height (cm)</label><input id="p-h" type="number" value="${st.profile.heightCm}"></div><div class="field"><label>Water goal (ml)</label><input id="p-w" type="number" step="250" value="${st.profile.waterGoalMl}"></div></div>
    <div class="grid2"><div class="field"><label>Weekly food budget (¥)</label><input id="p-b" type="number" value="${st.profile.weeklyBudget}"></div><div class="field"><label>Start weight (kg)</label><input id="p-s" type="number" step="0.1" value="${st.profile.startKg}"></div></div>
    <button class="btn block mt12" data-saveprofile>Save profile</button>
  </div>
  <div class="section-title" style="font-size:16px">Privacy</div>
  <div class="notice">${Cloud.status.user ? 'Your data lives on this device and syncs to your own private Supabase project while you’re signed in.' : 'Your data lives only on this device. Nothing is uploaded unless you sign in to sync. If you uninstall the app or clear site data, it’s gone — export a file now and then to be safe.'}</div>
  <div class="grid2 mt12"><button class="btn" data-export>Export file</button><label class="btn" style="cursor:pointer">Import file<input type="file" accept=".json,application/json" data-import hidden></label></div>
  <button class="btn danger block mt12" data-reset>Delete all data</button>
  <a class="list-item mt12" href="#me/account" style="color:inherit;text-decoration:none"><div class="li-ico"></div><div class="grow"><b>Cloud sync</b><div class="muted small">${Cloud.getConfig() ? 'Connected project' : 'Optional · connect your own Supabase project'}</div></div></a>
  <a class="list-item" href="#me/credits" style="color:inherit;text-decoration:none"><div class="li-ico"></div><div class="grow"><b>Photo credits</b></div></a>
  <a class="list-item" href="privacy.html" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><div class="li-ico"></div><div class="grow"><b>Privacy policy</b></div></a>
  <p class="tiny faint mt16" style="text-align:center">Revive 5.0 · not medical advice</p>`;
}

function install() {
  const canPc = !!window.__canInstall;
  return `<div class="topbar">${back()}<div class="grow"><h1 style="font-size:24px">Install Revive</h1><div class="sub">iPhone and Windows PC</div></div></div>
  <div class="card"><div class="kicker">Windows PC</div>
    ${canPc ? '<button class="btn primary block mb12" data-installpc>Install on this PC</button>' : ''}
    <div class="small" style="line-height:1.8">
    1. Open <b>https://syluszephyr.github.io/SylusZephyr/</b> in <b>Microsoft Edge</b> or <b>Google Chrome</b>.<br>
    2. Click the <b>Install</b> icon in the address bar (a monitor with ⬇), or menu <b>⋯ → Apps → Install Revive</b>.<br>
    3. Revive opens in its own window and appears in the <b>Start menu</b> — right-click it to <b>Pin to taskbar</b>.<br>
    4. Works offline. Lock with <b>Windows Hello</b> (face, fingerprint or PIN) in Settings.<br>
    Keyboard: <kbd>1</kbd>–<kbd>5</kbd> switch tabs · <kbd>Esc</kbd> closes · type your PIN on the lock screen.</div></div>
  <div class="card"><div class="kicker">iPhone</div><div class="small" style="line-height:1.8">
    1. Open the same link in <b>Safari</b> (not WeChat’s browser).<br>
    2. Tap <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>.<br>
    3. Always open Revive from the Home Screen icon.</div></div>
  <div class="card"><div class="kicker">Phone ⇄ PC</div><p class="small muted" style="line-height:1.6">Each device keeps its own private data — nothing is uploaded, so they don’t sync automatically. To move your progress, use <b>Me → Settings → Export file</b> on one device and <b>Import file</b> on the other (AirDrop, WeChat File Transfer or a USB cable).</p></div>
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
        if (!name || !value) { UI.toast('Fill test and value', ''); return; }
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
    root.querySelector('[data-sharecard]')?.addEventListener('click', async () => { try { await ShareCard.share(); G.award('share_card', 10, null, { silent: true }); } catch (e) { UI.toast('Could not create the image', ''); } });
    root.querySelector('[data-recap]')?.addEventListener('click', () => Progress.openRecap(Progress.lastMonthKey()));
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
      if (!/^https:\/\/.+/.test(url.trim()) || key.trim().length < 20) { UI.toast('Check the URL and key', ''); return; }
      Cloud.saveConfig(url, key); await Cloud.init(); UI.toast('Cloud connected', ''); rerender();
    });
    root.querySelector('[data-cfgclear]')?.addEventListener('click', async () => { if (await UI.confirmSheet('Disconnect cloud?', 'This device stops syncing. Your local data stays.', 'Disconnect', true)) { Cloud.clearConfig(); location.reload(); } });
    root.querySelector('[data-sendcode]')?.addEventListener('click', async (e) => {
      authEmail = root.querySelector('#au-email').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(authEmail)) { UI.toast('Enter a valid email', ''); return; }
      busy(e.currentTarget, 'Sending…');
      try { await Cloud.sendEmailCode(authEmail); codeSent = true; UI.toast('Code sent — check your inbox', ''); } catch (err) { UI.toast(err.message || 'Could not send code', ''); }
      rerender();
    });
    root.querySelector('[data-verify]')?.addEventListener('click', async (e) => {
      const code = root.querySelector('#au-code').value; busy(e.currentTarget, 'Checking…');
      try { await Cloud.verifyEmailCode(authEmail, code); codeSent = false; G.award('cloud_signin', 50, null); UI.toast('Signed in — syncing', ''); } catch (err) { UI.toast(err.message || 'Wrong or expired code', ''); }
      rerender();
    });
    root.querySelector('[data-resend]')?.addEventListener('click', () => { codeSent = false; rerender(); });
    root.querySelector('[data-google]')?.addEventListener('click', async () => { try { await Cloud.signInWithGoogle(); } catch (err) { UI.toast(err.message || 'Google sign-in failed', ''); } });
    root.querySelector('[data-syncnow]')?.addEventListener('click', async () => { await Cloud.syncNow(); UI.toast('Synced', ''); rerender(); });
    root.querySelector('[data-delacct]')?.addEventListener('click', async () => {
      if (!(await UI.confirmSheet('Delete account?', 'Your cloud account and all synced data are permanently deleted. Data on this device stays unless you also delete it in Settings.', 'Delete account', true))) return;
      try { await Cloud.deleteAccount(); UI.toast('Account deleted', ''); } catch (err) { UI.toast(err.message || 'Could not delete account', ''); }
      rerender();
    });
    root.querySelector('[data-signout]')?.addEventListener('click', async () => { if (await UI.confirmSheet('Sign out?', 'Your data stays on this device. It stops syncing until you sign in again.', 'Sign out', true)) { await Cloud.signOut(); rerender(); } });
  }
  if (sub === 'install') {
    root.querySelector('[data-installpc]')?.addEventListener('click', async () => { const ok = await window.__promptInstall?.(); if (ok) UI.toast('Installed! Find Revive in your Start menu', ''); rerender(); });
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
      try { if (navigator.share) await navigator.share({ title: 'Revive summary', text }); else { await navigator.clipboard.writeText(text); UI.toast('Summary copied', ''); } } catch (e) {}
    };
  }
  if (sub === 'reminders') {
    st.reminderPrefs = st.reminderPrefs || {};
    root.querySelectorAll('[data-rem]').forEach((b) => b.onclick = () => { const id = b.dataset.rem; const cur = b.classList.contains('on'); st.reminderPrefs[id] = !cur; S.save(); b.classList.toggle('on'); window.__syncReminders?.(true); });
    root.querySelector('[data-nativerem]')?.addEventListener('click', async () => {
      if (st.nativeReminders) { st.nativeReminders = false; S.save(); await Native.cancelReminders(); UI.toast('Reminders off', ''); rerender(); return; }
      if (!(await Native.requestNotifications())) { UI.toast('Allow notifications in iPhone Settings → Revive', ''); return; }
      st.nativeReminders = true; S.save(); const n = await window.__syncReminders?.(true); G.award('reminders_setup', 30, null); UI.toast(`${n || 0} daily reminders scheduled`, ''); rerender();
    });
    if (Native.isNative) return;
    root.querySelector('[data-ics]').onclick = () => {
      const list = ICS.reminderList().map((r) => ({ ...r, on: st.reminderPrefs[r.id] ?? r.on }));
      ICS.downloadICS(list); G.award('reminders_setup', 30, null); UI.toast('Opening Calendar…', '');
    };
    root.querySelector('[data-icsshare]').onclick = async () => {
      const list = ICS.reminderList().map((r) => ({ ...r, on: st.reminderPrefs[r.id] ?? r.on }));
      try { if (!(await ICS.shareICS(list))) UI.toast('Sharing not supported — open Revive in Safari and try again', ''); else G.award('reminders_setup', 30, null); } catch (e) {}
    };
  }
  if (sub === 'saved') {
    root.querySelectorAll('[data-libcat]').forEach((b) => b.onclick = () => { libCat = b.dataset.libcat; rerender(); });
    root.querySelectorAll('[data-libsave]').forEach((b) => b.onclick = () => { const id = b.dataset.libsave; const i = st.savedTips.indexOf(id); if (i >= 0) st.savedTips.splice(i, 1); else st.savedTips.push(id); S.save(); rerender(); });
  }
  if (sub === 'prayer') {
    const pr = () => (st.prayer = st.prayer || {});
    const set = (patch) => { Object.assign(pr(), patch); S.save(); window.__syncReminders?.(true); rerender(); };
    root.querySelector('[data-prnotify]').onclick = () => set({ notify: !pr().notify });
    root.querySelector('[data-prfast]').onclick = () => set({ fastAlerts: pr().fastAlerts === false });
    root.querySelector('[data-prayeron]').onclick = () => { set({ enabled: !Pr.settings().enabled }); if (Pr.settings().enabled) G.award('prayer_setup', 15, null); };
    root.querySelector('#pr-city').onchange = (e) => set({ city: e.target.value });
    root.querySelector('#pr-method').onchange = (e) => set({ method: e.target.value });
    root.querySelectorAll('[data-asr]').forEach((b) => b.onclick = () => set({ asr: b.dataset.asr }));
    root.querySelectorAll('[data-ram]').forEach((b) => b.onclick = () => set({ ramadan: b.dataset.ram }));
    ['lat', 'lng', 'tz'].forEach((k) => { const el = root.querySelector('#pr-' + k); if (el) el.onchange = () => { const v = +el.value; const ok = k === 'lat' ? Math.abs(v) <= 66 : k === 'lng' ? Math.abs(v) <= 180 : Math.abs(v) <= 14; if (Number.isFinite(v) && ok) set({ [k]: v }); else { UI.toast('That value looks off', ''); el.value = Pr.settings()[k]; } }; });
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
      S.save(); UI.toast('Profile saved', ''); rerender();
    };
    root.querySelectorAll('[data-lang]').forEach((b) => b.onclick = () => { if (b.dataset.lang === locale) return; S.get().settings.locale = b.dataset.lang; S.saveNow(); setLocale(b.dataset.lang); location.reload(); });
    const cup = root.querySelector('#p-cup'); const cut = root.querySelector('#p-cut');
    cup.onchange = () => { const v = Math.round(+cup.value); if (v >= 5 && v <= 400) { st.profile.cupMg = v; S.save(); UI.toast('Cup size saved', ''); } else cup.value = Caf.cupMg(); };
    cut.onchange = () => { if (/^\d{2}:\d{2}$/.test(cut.value)) { st.profile.caffeineCutoff = cut.value; S.save(); UI.toast('Cutoff saved', ''); } };
    root.querySelectorAll('[data-accent]').forEach((b) => b.onclick = () => { Theme.set({ accent: b.dataset.accent }); rerender(); });
    const ca = root.querySelector('[data-customaccent]');
    if (ca) { ca.oninput = () => Theme.set({ accent: 'custom', custom: ca.value }); ca.onchange = () => rerender(); }
    root.querySelectorAll('[data-bg]').forEach((b) => b.onclick = () => { Theme.set({ bg: b.dataset.bg }); rerender(); });
    root.querySelectorAll('[data-fs]').forEach((b) => b.onclick = () => { Theme.set({ size: b.dataset.fs }); rerender(); });
    root.querySelector('[data-export]').onclick = async () => {
      if (await Native.shareFile(`revive-${S.dayKey()}.json`, S.exportJSON(), 'Revive data')) return;
      const blob = new Blob([S.exportJSON()], { type: 'application/json' }); const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `revive-${S.dayKey()}.json`; document.body.appendChild(a); a.click(); a.remove();
    };
    root.querySelector('[data-import]').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { const txt = await f.text(); if (await UI.confirmSheet('Replace all data?', 'This overwrites everything in Revive with the file’s contents.', 'Import', true)) { S.importJSON(txt); UI.toast('Imported', ''); location.hash = 'today'; } }
      catch (err) { UI.toast('That file could not be read', ''); }
    };
    root.querySelector('[data-reset]').onclick = async () => {
      if (await UI.confirmSheet('Delete everything?', 'All your logs, progress, XP and settings will be erased from this phone. This cannot be undone.', 'Delete all', true)) { await Native.clearPersisted(); await Native.cancelReminders(); S.resetAll(); location.hash = ''; location.reload(); }
    };
  }
}

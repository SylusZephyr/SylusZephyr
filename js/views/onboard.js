import * as S from '../store.js';
import * as UI from '../ui.js';
import * as Lock from '../lock.js';
import { INGREDIENTS, STARTER_PANTRY } from '../data/ingredients.js';
import { RED_FLAGS, DOCTOR_QUESTIONS } from '../data/content.js';
import * as Pr from '../prayer.js';
import * as Region from '../region.js';
import { LANGUAGES, locale, setLocale } from '../i18n.js';

let step = 0;
const draft = { name: '', wake: '10:00', bed: '03:30', kg: 62, pantry: new Set(STARTER_PANTRY), prayer: null, city: 'beijing' };

const STEPS = [
  () => `<div class="col" style="min-height:70vh;justify-content:center;text-align:center;gap:16px">
      <div class="seg lang-pick" style="max-width:320px;margin:0 auto 12px" data-no-tr>${LANGUAGES.map((l) => `<button data-lang="${l.code}" class="${locale === l.code ? 'on' : ''}" lang="${l.code}">${l.native}</button>`).join('')}</div>
      <img src="icons/mark.svg" alt="" width="96" height="96" style="margin:0 auto">
      <h1 style="font-size:40px;letter-spacing:-0.03em">Revive</h1>
      <p class="muted" style="font-size:17px">Your private recovery companion.<br>Food that is easy. Sleep that settles. Training that works. Progress you can see.</p>
      <div class="notice mt12 ts"><b>Private by design.</b> Works fully offline with no account. Optional sync stays private to you. No ads, no tracking.</div>
      <div class="notice ts">Revive supports your plan — it doesn’t diagnose or replace your doctor.</div>
    </div>`,
  () => `<h1 class="mb8">What should we call you?</h1><p class="muted">Just for greetings. Optional.</p>
      <div class="field"><input id="ob-name" placeholder="Your name" value="${UI.esc(draft.name)}" autocomplete="off"></div>
      <h2 class="mt16 fs-lg">Current weight</h2>
      <div class="field"><input id="ob-kg" type="number" inputmode="decimal" step="0.1" value="${draft.kg}"> </div>
      <p class="muted small mt8">Goal zone: 66–68 kg, gained slowly (0.1–0.25 kg/week).</p>`,
  () => `<h1 class="mb8">Your sleep anchor</h1>
      <p class="muted">Your schedule is random right now — so first we lock <b>one wake-up time</b>, every day. Bedtime then shifts 15 min earlier every 3 days.</p>
      <div class="field"><label>Wake-up time I can hit every day</label><input id="ob-wake" type="time" value="${draft.wake}"></div>
      <div class="field"><label>When do you usually fall asleep now?</label><input id="ob-bed" type="time" value="${draft.bed}"></div>`,
  () => `<h1 class="mb8">Prayer times</h1>
      <p class="muted">Revive can show the five daily prayers on Today and switch to suhoor and iftar meals in Ramadan. It works out the times on your phone — no location access needed.</p>
      <div class="field"><label>Your city</label><select id="ob-city">${Pr.CITIES.map((c) => `<option value="${c.id}" ${draft.city === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
      <div class="grid2 mt16"><button class="btn primary" data-pr="1">Show prayer times</button><button class="btn" data-pr="0">Not now</button></div>
      <p class="muted small mt12">You can change this any time in Me → Prayer times & Ramadan.</p>`,
  () => `<h1 class="mb8">What’s in your kitchen?</h1><p class="muted">Tap what you have now. Revive will suggest meals from it. You can change this anytime in Cook.</p>
      <div class="chips mt16">${INGREDIENTS.filter((i) => ['Protein', 'Dairy', 'Bread & staples', 'Fruit & veg'].includes(i.cat)).slice(0, 36).map((i) => `<button class="chip ${draft.pantry.has(i.id) ? 'on' : ''}" data-ing="${i.id}">${i.e} ${UI.esc(i.name)}</button>`).join('')}</div>`,
  () => `<h1 class="mb8">Safety first</h1>
      <p class="muted">Your assessment flagged chest pain, breathlessness or dizziness during exertion. Your last doctor visit was brief, so until a doctor clears you:</p>
      <div class="card danger mt12"><b>Avoid</b> strenuous exercise, hard cycling, intense sports and any erection medication not prescribed to you. Revive keeps training to gentle walking + pelvic-floor work until you mark yourself cleared.</div>
      <div class="card"><div class="kicker">Get emergency help (${Region.region().ambulance}) for</div>${RED_FLAGS.map((r) => `<div class="small" style="padding:4px 0">• ${UI.esc(r)}</div>`).join('')}</div>
      <label class="row mt8" style="gap:12px"><input type="checkbox" id="ob-ack" class="sz22"> <span>I understand</span></label>`,
  () => `<div class="col" style="min-height:60vh;justify-content:center;text-align:center;gap:14px">
      <h1>Lock Revive?</h1>
      <p class="muted">Use Face ID (iPhone) or Windows Hello (PC) with a PIN backup so nobody else can open your health data.</p>
      <button class="btn primary block mt16" id="ob-lock">Set up lock + PIN</button>
      <button class="btn ghost block" id="ob-skip">Maybe later</button></div>`,
];

export function render() {
  const last = step === STEPS.length - 1;
  const body = STEPS[step]();
  // On the prayer step the two choices move on by themselves, so there is no Continue to get stuck on.
  const choice = body.includes('data-pr=');
  const needsAck = body.includes('id="ob-ack"');
  return `<main class="screen onboard" style="padding-bottom:120px">
    <div class="row mb12 gap6">${STEPS.map((_, i) => `<i style="flex:1;height:4px;border-radius:2px;background:${i <= step ? 'var(--text)' : 'var(--surface3)'}"></i>`).join('')}</div>
    ${body}
    ${last ? '' : `<div style="position:fixed;left:0;right:0;bottom:0;padding:16px 16px calc(var(--safe-bottom) + 18px);background:linear-gradient(transparent, var(--bg) 30%)">
      <div style="max-width:560px;margin:0 auto" class="row">
        ${step > 0 ? '<button class="btn" id="ob-back">Back</button>' : ''}
        ${choice ? '' : `<button class="btn primary grow" id="ob-next" ${needsAck ? 'disabled' : ''}>${step === 0 ? 'Let’s start' : 'Continue'}</button>`}</div></div>`}
  </main>`;
}

export function bind(root, done) {
  const rer = () => { root.innerHTML = render(); bind(root, done); UI.stripEmoji(root); window.scrollTo(0, 0); };
  const collect = () => {
    const n = root.querySelector('#ob-name'); if (n) draft.name = n.value.trim();
    const kg = root.querySelector('#ob-kg'); if (kg) draft.kg = parseFloat(kg.value) || 62;
    const w = root.querySelector('#ob-wake'); if (w) draft.wake = w.value || '10:00';
    const b = root.querySelector('#ob-bed'); if (b) draft.bed = b.value || '03:30';
    const c = root.querySelector('#ob-city'); if (c) draft.city = c.value;
  };
  root.querySelectorAll('[data-ing]').forEach((c) => c.addEventListener('click', () => {
    const id = c.dataset.ing; draft.pantry.has(id) ? draft.pantry.delete(id) : draft.pantry.add(id); c.classList.toggle('on'); UI.haptic(6);
  }));
  root.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.lang === locale) return; setLocale(b.dataset.lang); location.reload(); }));
  root.querySelectorAll('[data-pr]').forEach((b) => b.addEventListener('click', () => { collect(); draft.prayer = b.dataset.pr === '1'; step++; rer(); }));
  const ack = root.querySelector('#ob-ack');
  ack?.addEventListener('change', () => { root.querySelector('#ob-next').disabled = !ack.checked; });
  root.querySelector('#ob-back')?.addEventListener('click', () => { collect(); step--; rer(); });
  root.querySelector('#ob-next')?.addEventListener('click', () => {
    collect();
    step++; rer();
  });
  const finish = () => {
    const st = S.get();
    st.profile.name = draft.name; st.profile.startKg = draft.kg; st.profile.wakeAnchor = draft.wake; st.profile.currentBedtime = draft.bed;
    st.profile.bedShiftStartedOn = S.dayKey();
    st.pantry = [...draft.pantry]; st.medical.redFlagsAck = true; st.medical.questions = DOCTOR_QUESTIONS.map((q) => ({ id: S.uid(), q, done: false }));
    st.weights = [{ date: S.dayKey(), kg: draft.kg }];
    st.programStart = S.dayKey(); st.createdAt = Date.now();
    st.prayer = { ...(st.prayer || {}), enabled: !!draft.prayer, city: draft.city };
    st.onboarded = true; S.saveNow();
    UI.toast('Welcome to Revive'); st.game.xp += 50; S.saveNow();
    done();
  };
  root.querySelector('#ob-lock')?.addEventListener('click', () => Lock.setupSheet(finish));
  root.querySelector('#ob-skip')?.addEventListener('click', finish);
}

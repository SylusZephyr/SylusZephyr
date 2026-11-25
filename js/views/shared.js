// Shared sheets: meal logging, sleep logging, breathing session, weekly check-ins, weigh-in.
import * as S from '../store.js';
import * as UI from '../ui.js';
import * as G from '../gamify.js';
import { RECIPES, RECIPE, DELIVERY } from '../data/recipes.js';
import { CHECKINS, scoreCheckin, CRISIS } from '../data/content.js';
import { currentSlot, SLOT_LABEL, SLOT_EMOJI } from '../plan.js';
import { searchLocal, searchOnline, forPortion, lookupBarcode } from '../nutrition.js';
import { scanBarcode } from '../scanner.js';
import { art } from './cook.js';

const QUICK = [
  { name: 'Light snack', kcal: 200, protein: 5, e: '' },
  { name: 'Small meal', kcal: 400, protein: 15, e: '' },
  { name: 'Normal meal', kcal: 650, protein: 30, e: '' },
  { name: 'Big meal', kcal: 900, protein: 40, e: '' },
];

export function logMeal(entry, ev) {
  const k = S.dayKey(); const d = S.day(k);
  d.meals.push({ id: S.uid(), time: S.hm(), ...entry });
  if (['breakfast', 'lunch', 'dinner'].includes(entry.slot)) G.setEssential(entry.slot, true, ev);
  G.award(`meal_${d.meals.length}`, 10, ev, { silent: ['breakfast', 'lunch', 'dinner'].includes(entry.slot) });
  S.save();
}

// Distinct recent entries across all days, newest first — the fastest way to log a repeat meal.
function recentEntries(limit = 8) {
  const st = S.get(); const seen = new Set(); const out = [];
  const keys = Object.keys(st.days).sort().reverse().slice(0, 30);
  for (const k of keys) for (const m of [...(st.days[k].meals || [])].reverse()) {
    const key = (m.name || '').toLowerCase(); if (!key || seen.has(key)) continue;
    seen.add(key); out.push({ name: m.name, kcal: m.kcal, protein: m.protein, recipeId: m.recipeId, grams: m.grams });
    if (out.length >= limit) return out;
  }
  return out;
}

export function mealSheet(onDone, preset = {}) {
  let slot = preset.slot || currentSlot();
  const st = S.get(); st.myMeals = st.myMeals || [];
  const recents = recentEntries();
  const recent = [...new Set(Object.values(st.days).flatMap((d) => d.meals.map((m) => m.recipeId)).filter(Boolean))].slice(-6).reverse();
  const favs = st.favorites;
  const picks = [...new Set([...favs, ...recent, 'egg_paratha', 'chicken_cheese_wrap', 'airfryer_chicken_curry', 'shaker_smoothie'])].slice(0, 10).map((id) => RECIPE[id]).filter(Boolean);
  const entryRow = (m, attr) => `<button class="list-item" ${attr}><div class="grow" style="min-width:0"><b class="ellipsis" style="display:block">${UI.esc(m.name)}</b><div class="muted small">${m.kcal} kcal · ${m.protein} g protein</div></div><span class="add-dot" aria-hidden="true">${UI.ICON.plus}</span></button>`;
  const html = () => `<h2>Log a meal</h2>
    <div class="seg mt12" id="slotseg">${Object.keys(SLOT_LABEL).map((s) => `<button data-slot="${s}" class="${s === slot ? 'on' : ''}">${SLOT_LABEL[s].split(' ')[0]}</button>`).join('')}</div>
    <div class="row mt12" style="gap:8px"><label class="searchbar grow">${UI.ICON.search}<input id="food-q" type="search" placeholder="Search food — naan, 鸡蛋, Snickers…" autocomplete="off"></label>
      <button class="icon-btn" style="width:44px;height:44px;border-radius:12px" id="scan-btn" aria-label="Scan a barcode">${UI.ICON.barcode}</button></div>
    <div id="food-res"></div>
    <div id="meal-rest">
    ${st.myMeals.length ? `<div class="kicker mt16">My meals</div><div class="card tight" style="margin:0">${st.myMeals.map((m, i) => entryRow(m, `data-my="${i}"`)).join('')}</div>` : ''}
    ${recents.length ? `<div class="kicker mt16">Recent</div><div class="card tight" style="margin:0">${recents.map((m, i) => entryRow(m, `data-recent="${i}"`)).join('')}</div>` : ''}
    <div class="kicker mt16">Your recipes</div>
    <div class="carousel mini">${picks.map((r) => `<button class="ccard" data-rec="${r.id}"><div class="ph-wrap ${art(r).cls}" style="${art(r).style}">${art(r).emoji}</div><div class="cc-body"><div class="cc-name">${UI.esc(r.name)}</div><div class="cc-meta">${r.kcal} kcal · ${r.protein} g</div></div></button>`).join('')}</div>
    <div class="kicker mt16">Quick estimate</div>
    <div class="grid2">${QUICK.map((q, i) => `<button class="btn" data-quick="${i}" style="justify-content:space-between">${q.name}<span class="muted small">${q.kcal}</span></button>`).join('')}</div>
    <div class="kicker mt16">Delivery (Meituan 清真)</div>
    <div class="chips">${DELIVERY.map((d) => `<button class="chip" data-del="${d.id}">${UI.esc(d.name)}</button>`).join('')}</div>
    <div class="kicker mt16">Something else</div>
    <div class="field" style="margin-top:0"><input id="cust-name" placeholder="e.g. Lamb samsa ×2"></div>
    <div class="grid2 mt8"><input id="cust-kcal" type="number" inputmode="numeric" placeholder="kcal"><input id="cust-p" type="number" inputmode="numeric" placeholder="protein g (optional)"></div>
    <label class="row mt12" style="gap:10px"><input type="checkbox" id="cust-save" style="width:20px;height:20px"><span class="small">Save to My meals</span></label>
    <button class="btn block mt12" id="cust-add">Add</button></div>`;
  UI.openSheet(html(), {
    onMount: (sh, close) => {
      const wire = () => {
        sh.querySelectorAll('[data-slot]').forEach((b) => b.onclick = () => { slot = b.dataset.slot; sh.querySelectorAll('[data-slot]').forEach((x) => x.classList.toggle('on', x === b)); });
        const finish = (entry, ev) => { logMeal({ slot, ...entry }, ev); close(); UI.toast(`${SLOT_LABEL[slot]} logged`, SLOT_EMOJI[slot]); onDone && onDone(); };
        sh.querySelectorAll('[data-quick]').forEach((b) => b.onclick = (ev) => { const q = QUICK[b.dataset.quick]; finish({ name: q.name, kcal: q.kcal, protein: q.protein }, ev); });
        sh.querySelectorAll('[data-recent]').forEach((b) => b.onclick = (ev) => finish({ ...recents[+b.dataset.recent] }, ev));
        sh.querySelectorAll('[data-my]').forEach((b) => b.onclick = (ev) => { const m = st.myMeals[+b.dataset.my]; finish({ name: m.name, kcal: m.kcal, protein: m.protein }, ev); });
        sh.querySelector('#scan-btn').onclick = async () => {
          const code = await scanBarcode(); if (!code) return;
          res.innerHTML = '<p class="small muted mt12">Looking up ' + UI.esc(code) + '…</p>'; rest.style.display = 'none';
          const f = await lookupBarcode(code);
          if (f) portion(f);
          else { res.innerHTML = `<div class="card tight mt12"><b>Not found</b><p class="small muted mt8">${navigator.onLine ? 'This product isn’t in Open Food Facts yet.' : 'You’re offline.'} Enter it below as “Something else”.</p></div>`; rest.style.display = ''; }
        };
        sh.querySelectorAll('[data-rec]').forEach((b) => b.onclick = (ev) => { const r = RECIPE[b.dataset.rec]; finish({ name: r.name, recipeId: r.id, kcal: r.kcal, protein: r.protein }, ev); });
        sh.querySelectorAll('[data-del]').forEach((b) => b.onclick = (ev) => { const r = DELIVERY.find((x) => x.id === b.dataset.del); finish({ name: r.name, delivery: true, kcal: r.kcal, protein: r.protein }, ev); });
        // Food search
        const q = sh.querySelector('#food-q'), res = sh.querySelector('#food-res'), rest = sh.querySelector('#meal-rest');
        let found = [], timer = null, seq = 0;
        const row = (f, i) => `<button class="rwide" data-food="${i}"><div class="thumb" style="background:var(--surface2);width:48px;height:48px;font-size:24px">${f.image ? `<img src="${UI.esc(f.image)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px" loading="lazy" referrerpolicy="no-referrer">` : f.e}</div>
          <div class="grow" style="min-width:0"><div class="ellipsis" style="font-weight:700">${UI.esc(f.name)}</div><div class="muted small ellipsis">${f.brand ? UI.esc(f.brand) + ' · ' : ''}${forPortion(f, f.portionG).kcal} kcal · ${UI.esc(f.portionLabel)}</div></div>
          <span class="pill ${f.source === 'Revive' ? 'amber' : 'blue'}">${f.source === 'Revive' ? 'Built-in' : 'Online'}</span></button>`;
        const paint = (loading) => {
          res.innerHTML = found.length ? found.map(row).join('') + (loading ? '<p class="tiny muted mt8">Searching online…</p>' : '') : (q.value.trim() ? (loading ? '<p class="small muted">Searching…</p>' : '<p class="small muted">No match — use a quick size or custom below.</p>') : '');
          rest.style.display = q.value.trim() ? 'none' : '';
          res.querySelectorAll('[data-food]').forEach((b) => b.onclick = () => portion(found[+b.dataset.food]));
        };
        q.addEventListener('input', () => {
          clearTimeout(timer); const term = q.value; const my = ++seq;
          found = searchLocal(term); paint(term.trim().length >= 2);
          if (term.trim().length < 2) return;
          timer = setTimeout(async () => { const online = await searchOnline(term); if (my !== seq) return; found = [...found, ...online.filter((o) => !found.some((f) => f.name.toLowerCase() === o.name.toLowerCase()))].slice(0, 25); paint(false); }, 550);
        });
        const portion = (f) => {
          let grams = f.portionG;
          const draw = () => { const n = forPortion(f, grams); return `<div class="card tight mt12"><div class="row">${f.image ? `<img src="${UI.esc(f.image)}" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover" referrerpolicy="no-referrer">` : ''}<div class="grow"><b>${UI.esc(f.name)}</b><div class="muted small">${f.kcal100} kcal · ${f.protein100} g protein per 100 g</div></div></div>
            <div class="chips mt12">${[0.5, 1, 1.5, 2].map((m) => `<button class="chip ${Math.abs(grams - f.portionG * m) < 0.5 ? 'on' : ''}" data-mult="${m}">${m === 1 ? '' : m + ' × '}${UI.esc(f.portionLabel)}</button>`).join('')}</div>
            <div class="row mt12"><input id="food-g" type="number" inputmode="decimal" value="${Math.round(grams)}" style="width:110px"><span class="muted">grams</span><div class="grow" style="text-align:right"><b style="font-size:20px">${n.kcal}</b> kcal · <b>${n.protein}</b> g</div></div>
            <label class="row mt12" style="gap:10px"><input type="checkbox" id="food-save" style="width:20px;height:20px"><span class="small">Save to My meals</span></label>
            <div class="grid2 mt12"><button class="btn" data-back>Back</button><button class="btn primary" data-logfood>Log it</button></div></div>`; };
          const mount = () => {
            res.innerHTML = draw();
            res.querySelectorAll('[data-mult]').forEach((b) => b.onclick = () => { grams = f.portionG * +b.dataset.mult; mount(); });
            res.querySelector('#food-g').onchange = (e) => { grams = Math.max(1, +e.target.value || f.portionG); mount(); };
            res.querySelector('[data-back]').onclick = () => paint(false);
            res.querySelector('[data-logfood]').onclick = (ev) => {
              const n = forPortion(f, grams);
              if (res.querySelector('#food-save').checked) { const nm = `${f.name} (${Math.round(grams)} g)`; if (!st.myMeals.some((m) => m.name === nm)) { st.myMeals.unshift({ id: S.uid(), name: nm, kcal: n.kcal, protein: n.protein }); st.myMeals = st.myMeals.slice(0, 12); } }
              finish({ name: f.name, kcal: n.kcal, protein: n.protein, grams: Math.round(grams), food: f.source }, ev);
            };
          };
          mount();
        };
        sh.querySelector('#cust-add').onclick = (ev) => {
          const name = sh.querySelector('#cust-name').value.trim() || 'Meal'; const kcal = parseInt(sh.querySelector('#cust-kcal').value, 10) || 500;
          const pv = parseInt(sh.querySelector('#cust-p').value, 10); const protein = Number.isFinite(pv) ? pv : Math.round(kcal * 0.04);
          if (sh.querySelector('#cust-save').checked && !st.myMeals.some((m) => m.name.toLowerCase() === name.toLowerCase())) { st.myMeals.unshift({ id: S.uid(), name, kcal, protein }); st.myMeals = st.myMeals.slice(0, 12); }
          finish({ name, kcal, protein }, ev);
        };
      };
      wire();
    },
  });
}

export function sleepSheet(onDone) {
  const d = S.day(); const st = S.get();
  // Bed time for "today" is stored on the day you woke up (last night's bedtime).
  UI.openSheet(`<h2>Log sleep</h2><p class="muted small">Last night’s bedtime and this morning’s wake-up.</p>
    <div class="grid2 mt12">
      <div class="field"><label>Fell asleep</label><input type="time" id="sl-bed" value="${d.sleep.bed || st.profile.currentBedtime}"></div>
      <div class="field"><label>Woke up</label><input type="time" id="sl-wake" value="${d.sleep.wake || S.hm()}"></div>
    </div>
    <div class="field"><label>Sleep quality</label>${UI.scaleButtons('q', 5, d.sleep.q ?? null, ['', '', '', '', ''], true)}</div>
    <label class="row mt12" style="gap:10px"><input type="checkbox" id="sl-me" ${d.sleep.morningErection ? 'checked' : ''} style="width:22px;height:22px"><span>Morning erection noticed <span class="muted small">(private)</span></span></label>
    <button class="btn primary block mt16" id="sl-save">Save</button>`, {
    onMount: (sh, close) => {
      let q = d.sleep.q ?? null;
      sh.querySelectorAll('[data-scale="q"] button').forEach((b) => b.onclick = () => { q = +b.dataset.v; sh.querySelectorAll('[data-scale="q"] button').forEach((x) => x.classList.toggle('on', x === b)); });
      sh.querySelector('#sl-save').onclick = (ev) => {
        d.sleep.bed = sh.querySelector('#sl-bed').value; d.sleep.wake = sh.querySelector('#sl-wake').value; d.sleep.q = q;
        d.sleep.morningErection = sh.querySelector('#sl-me').checked;
        G.award('sleep_log', 15, ev);
        // Auto-tick sleep plan if wake within 45 min of anchor.
        const a = S.minutesOf(st.profile.wakeAnchor); const w = S.minutesOf(d.sleep.wake);
        const diff = Math.abs(((w - a + 720 + 1440) % 1440) - 720);
        if (diff <= 45) G.setEssential('sleep', true, ev);
        S.save(); close(); onDone && onDone();
        UI.toast(diff <= 45 ? 'On-anchor wake-up! Sleep plan ' : 'Sleep logged', '');
      };
    },
  });
}

// Breathing session: in 4, hold 2 (optional), out 6.
export function breathing({ minutes = 2, onDone } = {}) {
  const total = minutes * 60; let t = 0; let timer = null; let running = true;
  const phases = [{ n: 'Breathe in', s: 4, cls: 'big' }, { n: 'Breathe out', s: 6, cls: 'small' }];
  UI.fullscreen(`<div class="trainer">
    <div class="row between" style="width:100%"><button class="icon-btn" data-x>${UI.ICON.close}</button><div class="muted" id="br-left"></div><div style="width:40px"></div></div>
    <div class="orb-wrap"><div class="orb cool" id="orb"></div></div>
    <div class="phase" id="br-phase">Get comfortable</div>
    <div class="meta mt8">Belly breathing · in through the nose, slow out through the mouth</div>
  </div>`, {
    onMount: (w, close) => {
      const orb = w.querySelector('#orb'); const ph = w.querySelector('#br-phase'); const left = w.querySelector('#br-left');
      let pi = 0; let pt = 0;
      const step = () => {
        if (!running) return;
        const p = phases[pi];
        if (pt === 0) { ph.textContent = p.n; orb.style.setProperty('--t', p.s + 's'); orb.className = 'orb cool ' + p.cls; UI.haptic(10); }
        pt++; t++;
        left.textContent = `${Math.floor((total - t) / 60)}:${S.pad((total - t) % 60)}`;
        if (pt >= p.s) { pt = 0; pi = (pi + 1) % phases.length; }
        if (t >= total) { running = false; clearInterval(timer); close(); finish(); }
      };
      const finish = () => {
        const d = S.day(); d.breath = (d.breath || 0) + 1; S.save();
        G.award(`breath_${d.breath}`, 15, null); UI.toast('Breathing done — nervous system calmer', ''); onDone && onDone();
      };
      setTimeout(() => { timer = setInterval(step, 1000); step(); }, 800);
      w.querySelector('[data-x]').onclick = () => { running = false; clearInterval(timer); close(); };
    },
  });
}

export function checkinSheet(type, onDone) {
  const def = CHECKINS[type]; const wk = S.weekKey(); const st = S.get();
  const prev = st.checkins[wk]?.[type]?.answers || [];
  const answers = [...prev];
  const body = () => def.qs.map((q, i) => `<div class="card tight"><div style="font-weight:700" class="mb8">${i + 1}. ${UI.esc(q.q)}</div>
    <div class="col" style="gap:6px">${q.a.map((a, j) => `<button class="chip ${answers[i] === j ? 'on' : ''}" data-q="${i}" data-a="${j}" style="justify-content:flex-start;white-space:normal;text-align:left">${UI.esc(a)}</button>`).join('')}</div></div>`).join('');
  UI.openSheet(`<h2>${def.e} ${UI.esc(def.title)}</h2><p class="muted small mb12">${UI.esc(def.note)}</p><div id="ci-body">${body()}</div>
    <button class="btn primary block mt8" id="ci-save">Save check-in</button>`, {
    onMount: (sh, close) => {
      const wire = () => sh.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => {
        answers[+b.dataset.q] = +b.dataset.a; UI.haptic(6);
        sh.querySelectorAll(`[data-q="${b.dataset.q}"]`).forEach((x) => x.classList.toggle('on', x === b));
      });
      wire();
      sh.querySelector('#ci-save').onclick = async (ev) => {
        if (answers.filter((a) => a != null).length < def.qs.length) { UI.toast('Answer every question', ''); return; }
        const score = scoreCheckin(type, answers);
        st.checkins[wk] = st.checkins[wk] || {}; st.checkins[wk][type] = { answers, score, at: Date.now() };
        S.save(); G.award(`checkin_${type}_${wk}`, 40, ev, { once: true }); G.checkBadges(); close();
        if (type === 'mood' && score.flag) {
          UI.openSheet(`<h2>Thanks for being honest </h2><p class="muted mt8">Your answers suggest worry or low mood has been bothering you a fair amount. That is common, and it is treatable — please mention it at your next doctor visit (it is already on your question list).</p>
            <div class="card mt12"><div class="kicker">If you ever feel unsafe or in crisis</div>${CRISIS.map((c) => `<a class="list-item" href="tel:${c.num.replace(/[^0-9]/g, '')}"><div class="li-ico"></div><div class="grow"><b>${c.num}</b><div class="muted small">${UI.esc(c.name)}</div></div></a>`).join('')}</div>
            <button class="btn block mt8" data-ok>OK</button>`, { onMount: (s2, c2) => s2.querySelector('[data-ok]').onclick = c2 });
        } else if (type === 'energy' && score.redFlag) {
          UI.openSheet(`<h2>Exertion symptoms noted </h2><p class="muted mt8">You reported dizziness, breathlessness or chest discomfort during effort this week. Please get this checked soon and avoid strenuous activity until you have. If you have chest pain or pressure now, fainting or severe breathlessness, call <b>120</b>.</p><button class="btn block mt16" data-ok>I understand</button>`, { onMount: (s2, c2) => s2.querySelector('[data-ok]').onclick = c2 });
        } else UI.toast('Check-in saved', def.e);
        onDone && onDone();
      };
    },
  });
}

// Private symptom log — factual, for the doctor. Never shown outside Track/summary.
export const SX = {
  type: ['Solo', 'With partner'],
  firm: ['Not firm', 'Larger, not hard', 'Hard, not enough', 'Hard enough', 'Fully firm'],
  kept: ['Lost it early', 'Lost it partway', 'Kept it'],
  time: ['< 1 min', '1–2 min', '2–5 min', '> 5 min', 'Did not ejaculate'],
  semen: ['Normal amount', 'Less than usual', 'None / dry'],
};
export function sxSheet(onDone) {
  const v = {};
  const row = (key, label) => `<div class="field"><label>${label}</label><div class="chips">${SX[key].map((a, i) => `<button class="chip" data-k="${key}" data-v="${i}">${a}</button>`).join('')}</div></div>`;
  UI.openSheet(`<h2>Private log</h2><p class="muted small">Quick facts for your doctor. Stays on this phone. No judgement — data helps find causes.</p>
    ${row('type', 'Type')}${row('firm', 'Firmness at best')}${row('kept', 'Kept the erection?')}${row('time', 'Time to ejaculation')}${row('semen', 'Semen')}
    <label class="row mt12" style="gap:10px"><input type="checkbox" id="sx-anx" style="width:22px;height:22px"><span>I felt anxious / under pressure</span></label>
    <button class="btn primary block mt16" id="sx-save">Save</button>`, {
    onMount: (sh, close) => {
      sh.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { v[b.dataset.k] = +b.dataset.v; sh.querySelectorAll(`[data-k="${b.dataset.k}"]`).forEach((x) => x.classList.toggle('on', x === b)); UI.haptic(6); });
      sh.querySelector('#sx-save').onclick = (ev) => {
        if (v.firm == null) { UI.toast('Pick firmness at least', ''); return; }
        const st = S.get(); st.sxLog = st.sxLog || []; st.sxLog.push({ date: S.dayKey(), ...v, anxious: sh.querySelector('#sx-anx').checked });
        S.save(); G.award('sx_' + st.sxLog.length, 10, ev); close(); UI.toast('Logged privately', ''); onDone && onDone();
      };
    },
  });
}

export function weighSheet(onDone) {
  const st = S.get(); const last = [...st.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  UI.openSheet(`<h2>Weekly weigh-in</h2><p class="muted small">Same day each week, morning, after the toilet, before food.</p>
    <div class="field"><label>Weight (kg)</label><input id="wkg" type="number" inputmode="decimal" step="0.1" value="${last ? last.kg : st.profile.startKg}"></div>
    <button class="btn primary block mt16" id="wsave">Save</button>`, {
    onMount: (sh, close) => sh.querySelector('#wsave').onclick = (ev) => {
      const kg = parseFloat(sh.querySelector('#wkg').value); if (!kg || kg < 30 || kg > 200) { UI.toast('Enter a valid weight', ''); return; }
      const k = S.dayKey(); st.weights = st.weights.filter((w) => w.date !== k); st.weights.push({ date: k, kg });
      S.save(); G.award(`weigh_${S.weekKey()}`, 30, ev); G.checkBadges(); close();
      const diff = last ? kg - last.kg : 0;
      UI.toast(last ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg since last time` : 'Weight saved', diff > 0 ? '' : '');
      onDone && onDone();
    },
  });
}

export function energySheet(onDone) {
  const d = S.day();
  let energy = d.energy, mood = d.mood, appetite = d.appetite;
  UI.openSheet(`<h2>How are you right now?</h2>
    <div class="field"><label>Energy</label>${UI.scaleButtons('energy', 5, energy, ['', '', '', '', ''], true)}</div>
    <div class="field"><label>Mood</label>${UI.scaleButtons('mood', 5, mood, ['', '', '', '', ''], true)}</div>
    <div class="field"><label>Appetite</label>${UI.scaleButtons('appetite', 5, appetite, ['', '', '', '', ''], true)}</div>
    <div class="field"><label>Journal <span class="faint">(optional, private)</span></label><textarea id="en-note" rows="3" maxlength="600" placeholder="What helped today? What got in the way?">${UI.esc(d.notes || '')}</textarea></div>
    <button class="btn primary block mt16" id="en-save">Save</button>`, {
    onMount: (sh, close) => {
      sh.querySelectorAll('[data-scale] button').forEach((b) => b.onclick = () => {
        const n = b.parentElement.dataset.scale; const v = +b.dataset.v;
        if (n === 'energy') energy = v; if (n === 'mood') mood = v; if (n === 'appetite') appetite = v;
        b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); UI.haptic(6);
      });
      sh.querySelector('#en-save').onclick = (ev) => { d.energy = energy; d.mood = mood; d.appetite = appetite; const note = sh.querySelector('#en-note').value.trim(); if (note && note !== d.notes) G.award('journal', 10, null, { silent: true }); d.notes = note; S.save(); G.award('energy_log', 10, ev); close(); onDone && onDone(); };
    },
  });
}

// Story viewer

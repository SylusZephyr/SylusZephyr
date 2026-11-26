import * as S from '../store.js';
import * as UI from '../ui.js';
import * as G from '../gamify.js';
import * as P from '../plan.js';
import * as Sh from './shared.js';
import { RECIPES, RECIPE, DELIVERY } from '../data/recipes.js';
import { INGREDIENTS, ING, ING_CATS } from '../data/ingredients.js';
import * as Pr from '../prayer.js';
import { PHOTOS } from '../data/photos.js';
import { morph } from '../morph.js';

const filt = { feel: null, mins: null, budget: null, slot: null, q: '', cat: 'all' };

const FEELS = [
  { id: 'tired', e: '', l: 'Exhausted' },
  { id: 'lowappetite', e: '', l: 'Not hungry' },
  { id: 'ok', e: '', l: 'Normal' },
  { id: 'energetic', e: '', l: 'Energetic' },
];
const TIMES = [{ v: 5, l: '≤5 min' }, { v: 15, l: '≤15 min' }, { v: 30, l: '≤30 min' }];
const BUDGETS = [{ v: 8, l: '≤¥8' }, { v: 15, l: '≤¥15' }, { v: 99, l: 'Any' }];

/** @param {{ slot?: string, feel?: string, mins?: number, budget?: number }} [filters] */
export function suggest({ slot, feel, mins, budget } = {}) {
  const pantry = new Set(S.get().pantry); const st = S.get(); const fastingNow = Pr.fasting();
  return RECIPES.map((r) => {
    const req = r.ing.filter((i) => !i.opt);
    const have = req.filter((i) => pantry.has(i.id)).length;
    const total = req.length;
    let score = (have / total) * 60;
    if (have === total) score += 25;
    if (slot && r.meals.includes(slot)) score += 20; else if (slot) score -= 15;
    if (feel && r.feel.includes(feel)) score += 18;
    if (feel === 'tired') score -= r.mins / 2;
    if (feel === 'lowappetite' && r.tags.some((t) => ['creamy', 'drinkable', 'sweet'].includes(t))) score += 8;
    if (mins && r.mins > mins) score -= 40;
    if (budget && r.cost > budget) score -= 30;
    if (fastingNow) { if ((slot === 'breakfast' && r.tags.includes('suhoor')) || (slot !== 'breakfast' && r.tags.includes('iftar'))) score += 22; }
    else if (r.tags.includes('suhoor') || r.tags.includes('iftar')) score -= 4; // keep Ramadan dishes from crowding normal days
    if (st.favorites.includes(r.id)) score += 6;
    score += Math.min(6, (st.cooked[r.id] || 0) * 2); // familiar meals with small variations
    const rating = st.recipeNotes?.[r.id]?.rating; if (rating) score += (rating - 3) * 6; // your own ratings steer suggestions
    return { r, have, total, score, missing: req.filter((i) => !pantry.has(i.id)) };
  }).sort((a, b) => b.score - a.score);
}

const methodPill = (m) => m === 'airfryer' ? '<span class="pill amber method">Air fryer</span>' : '<span class="pill green method">No-cook</span>';

// Photo if we have one, otherwise the illustrated gradient + emoji.
// Photos are real <img> elements so the browser can lazy-load and decode them off the main thread.
export function art(r, { eager = false } = {}) {
  const p = PHOTOS[r.id];
  if (!p) {
    // No photo yet: a soft tile in the dish's own colour with a line icon, never initials.
    const drink = /shake|smoothie|lassi|milk/i.test(r.name);
    return { cls: 'mono-tile', style: `--tint:${r.bg[0]}`, emoji: `<span class="mono" aria-hidden="true">${drink ? UI.ICON.cup : UI.ICON.meal}</span>` };
  }
  return { cls: 'has-photo', style: 'background:var(--surface2)', emoji: `<img class="ph" src="${p.src}" alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="720" height="540">` };
}

function recipeCard(r) {
  const fav = S.get().favorites.includes(r.id); const a = art(r);
  return `<a class="rcard plain" data-key="r-${r.id}" href="#cook/r/${r.id}"><div class="hero ${a.cls}" style="${a.style}">${a.emoji}${fav ? `<span class="fav c-coral">${UI.ICON.heartFill}</span>` : ''}${methodPill(r.method)}</div>
    <div class="body"><div class="name">${UI.esc(r.name)}</div><div class="meta">${r.mins} min · ${r.kcal} kcal · ¥${r.cost}</div></div></a>`;
}

export function render(parts) {
  const sub = parts[0];
  if (sub === 'r' && RECIPE[parts[1]]) return detail(RECIPE[parts[1]]);
  if (sub === 'pantry') return pantryView();
  if (sub === 'delivery') return deliveryView();
  if (sub === 'shop') return shopView();
  if (sub === 'plan') return planView();
  return main();
}

function main() {
  const st = S.get();
  const slot = filt.slot || P.currentSlot();
  const sug = suggest({ slot, feel: filt.feel, mins: filt.mins, budget: filt.budget }).slice(0, 8);
  let list = RECIPES;
  if (filt.cat === 'fav') list = list.filter((r) => st.favorites.includes(r.id));
  else if (filt.cat === 'ready') { const pantry = new Set(st.pantry); list = list.filter((r) => r.ing.filter((i) => !i.opt).every((i) => pantry.has(i.id))); }
  else if (filt.cat === 'ramadan') list = list.filter((r) => r.tags.includes('suhoor') || r.tags.includes('iftar'));
  else if (filt.cat === 'nocook') list = list.filter((r) => r.method === 'nocook');
  else if (['breakfast', 'lunch', 'dinner', 'snack'].includes(filt.cat)) list = list.filter((r) => r.meals.includes(filt.cat));
  else if (filt.cat === 'protein') list = [...list].sort((a, b) => b.protein - a.protein).slice(0, 16);
  else if (filt.cat === 'quick') list = list.filter((r) => r.mins <= 10);
  if (filt.q) { const q = filt.q.toLowerCase(); list = list.filter((r) => r.name.toLowerCase().includes(q) || r.ing.some((i) => ING[i.id]?.name.toLowerCase().includes(q)) || r.tags.join(' ').includes(q)); }
  const shopN = (st.shopping || []).filter((x) => !x.done).length;
  const active = [filt.slot && P.SLOT_LABEL[filt.slot], filt.feel && FEELS.find((f) => f.id === filt.feel)?.l, filt.mins && `≤ ${filt.mins} min`, filt.budget && filt.budget < 99 && `≤ ¥${filt.budget}`].filter(Boolean);
  const CATS = [['all', 'All'], ['ready', 'Ready to make'], ['fav', 'Favourites'], ['quick', 'Under 10 min'], ['protein', 'High protein'], ['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snacks'], ['nocook', 'No-cook'], ['ramadan', 'Suhoor & iftar']];
  return `
  <div class="topbar"><div><div class="sub">${RECIPES.length} halal recipes · air fryer & no-cook</div><h1>Cook</h1></div>
    <div class="row"><a class="icon-btn" href="#cook/shop" aria-label="Shopping list${shopN ? `, ${shopN} items` : ''}" style="position:relative">${UI.ICON.cart}${shopN ? `<span class="badge-dot">${shopN}</span>` : ''}</a><a class="icon-btn" href="#cook/pantry" aria-label="Pantry">${UI.ICON.pantry}</a></div></div>

  <label class="searchbar">${UI.ICON.search}<input id="rq" type="search" placeholder="Search recipes or ingredients" value="${UI.esc(filt.q)}" autocomplete="off"></label>

  ${filt.q ? '' : `<div class="row between" style="margin:18px 2px 10px"><div><div style="font-weight:650;font-size:18px">${P.SLOT_LABEL[slot]} ideas</div><div class="small muted">${active.length ? active.join(' · ') : (st.pantry.length ? `From your ${st.pantry.length} pantry items` : 'Mark what you have in My pantry for better picks')}</div></div>
    <button class="btn sm" data-filters>${UI.ICON.sliders}<span>Filters${active.length ? ` · ${active.length}` : ''}</span></button></div>
  <div class="carousel" role="list">${sug.map(({ r, have, total, missing }) => { const a = art(r); return `<a class="ccard" role="listitem" href="#cook/r/${r.id}">
      <div class="ph-wrap ${a.cls}" style="${a.style}">${a.emoji}<span class="ready ${have === total ? 'yes' : ''}">${have === total ? 'Ready' : `Need ${missing.length}`}</span></div>
      <div class="cc-body"><div class="cc-name">${UI.esc(r.name)}</div><div class="cc-meta">${r.mins} min · ${r.kcal} kcal · ${r.protein} g protein</div></div></a>`; }).join('')}</div>
  ${filt.feel === 'tired' ? '<a class="btn block mt8" href="#cook/delivery">Too tired? Order halal delivery</a>' : ''}
  ${planTeaser()}`}

  <div class="chips scroll mb12 ${filt.q ? 'mt16' : ''}">${CATS.map(([id, l]) => `<button class="chip ${filt.cat === id ? 'on' : ''}" data-cat="${id}">${l}</button>`).join('')}</div>
  <div class="recipe-grid" id="rgrid">${list.length ? list.map(recipeCard).join('') : '<div class="empty span-all">No recipes match. Try another filter.</div>'}</div>

  <a class="list-row mt16" href="#cook/delivery"><span class="ico">${UI.ICON.bag}</span><span class="grow"><b>Halal delivery picks</b><span class="small muted">Meituan and Ele.me orders that still hit your protein</span></span><span class="chev">${UI.ICON.chev}</span></a>`;
}

function filterSheet(rerender) {
  const draw = () => `<h2>Filters</h2>
    <div class="field"><label>Meal</label><div class="seg">${Object.keys(P.SLOT_LABEL).map((s) => `<button data-slot="${s}" class="${(filt.slot || P.currentSlot()) === s ? 'on' : ''}">${P.SLOT_LABEL[s].split(' ')[0]}</button>`).join('')}</div></div>
    <div class="field"><label>How you feel</label><div class="chips">${FEELS.map((f) => `<button class="chip ${filt.feel === f.id ? 'on' : ''}" data-feel="${f.id}">${f.l}</button>`).join('')}</div></div>
    <div class="field"><label>Time</label><div class="chips">${TIMES.map((t) => `<button class="chip ${filt.mins === t.v ? 'on' : ''}" data-mins="${t.v}">${t.l}</button>`).join('')}</div></div>
    <div class="field"><label>Budget</label><div class="chips">${BUDGETS.map((t) => `<button class="chip ${filt.budget === t.v ? 'on' : ''}" data-budget="${t.v}">${t.l}</button>`).join('')}</div></div>
    <div class="grid2 mt16"><button class="btn" data-reset-f>Reset</button><button class="btn primary" data-apply>Show ideas</button></div>`;
  UI.openSheet(draw(), {
    onMount: (sh, close) => {
      const wire = () => {
        sh.querySelectorAll('[data-slot]').forEach((b) => b.onclick = () => { filt.slot = b.dataset.slot; redraw(); });
        sh.querySelectorAll('[data-feel]').forEach((b) => b.onclick = () => { filt.feel = filt.feel === b.dataset.feel ? null : b.dataset.feel; redraw(); });
        sh.querySelectorAll('[data-mins]').forEach((b) => b.onclick = () => { const v = +b.dataset.mins; filt.mins = filt.mins === v ? null : v; redraw(); });
        sh.querySelectorAll('[data-budget]').forEach((b) => b.onclick = () => { const v = +b.dataset.budget; filt.budget = filt.budget === v ? null : v; redraw(); });
        sh.querySelector('[data-reset-f]').onclick = () => { Object.assign(filt, { slot: null, feel: null, mins: null, budget: null }); redraw(); };
        sh.querySelector('[data-apply]').onclick = () => { close(); rerender(); };
      };
      const redraw = () => { morph(sh, sh.querySelector('.grabber').outerHTML + draw()); wire(); UI.haptic(6); };
      wire();
    },
    onClose: rerender,
  });
}

function detail(r) {
  const st = S.get(); const pantry = new Set(st.pantry); const fav = st.favorites.includes(r.id);
  const missing = r.ing.filter((i) => !i.opt && !pantry.has(i.id));
  const cookedN = st.cooked[r.id] || 0;
  return `
  <div class="hero-lg ${art(r).cls}" style="${art(r).style}"><a class="icon-btn back" href="#cook">${UI.ICON.back}</a><button class="icon-btn fav" data-fav aria-pressed="${fav}" aria-label="Favourite" style="${fav ? 'color:var(--coral)' : ''}">${fav ? UI.ICON.heartFill : UI.ICON.heart}</button>${art(r, { eager: true }).emoji}</div>
  ${PHOTOS[r.id] ? `<div class="photo-credit">Photo: ${UI.esc(PHOTOS[r.id].credit)}</div>` : ''}
  <div class="row wrap mb8 gap6">${methodPill(r.method)}${r.tags.map((t) => `<span class="pill">${t}</span>`).join('')}${cookedN ? `<span class="pill green">Cooked ${cookedN}×</span>` : ''}</div>
  <h1 style="font-size:28px">${UI.esc(r.name)}</h1>
  <p class="muted mt8">${UI.esc(r.desc)}</p>
  <div class="stats mt16">
    <div class="stat"><b>${r.mins}<small> min</small></b><span>Time</span></div><div class="stat"><b>${r.kcal}</b><span>kcal</span></div>
    <div class="stat"><b>${r.protein}<small> g</small></b><span>Protein</span></div><div class="stat"><b>¥${r.cost}</b><span>Approx.</span></div>
  </div>
  <div class="grid2 mt16"><button class="btn primary" data-cook>Start cooking</button><button class="btn" data-ate>I ate this</button></div>

  <div class="section-title">Ingredients ${missing.length ? `<button class="link" data-addmissing>+ Add ${missing.length} to list</button>` : '<span class="pill green">All in pantry</span>'}</div>
  <div class="card">${r.ing.map((i) => { const g = ING[i.id]; const have = pantry.has(i.id); return `<button class="ing ${have ? 'have' : ''} w100 ts" data-toggle="${i.id}">
    <span class="have-dot" aria-hidden="true">${have ? UI.ICON.check : ''}</span><div class="grow"><div class="name">${UI.esc(g.name)} ${i.opt ? '<span class="muted small">(optional)</span>' : ''}</div><div class="zh">${UI.esc(g.zh)}</div></div><div class="muted small">${UI.esc(i.q)}</div></button>`; }).join('')}
    <p class="tiny muted mt8">Tap an ingredient to mark it as in/out of your pantry. Chinese names help when shopping on Hema/Taobao.</p></div>

  ${(() => { const n = (st.recipeNotes || {})[r.id] || {}; return `<div class="section-title">Your verdict</div><div class="card tight">
    <div class="row" role="group" aria-label="Your rating">${[1, 2, 3, 4, 5].map((i) => `<button class="star ${i <= (n.rating || 0) ? 'on' : ''}" data-rate="${i}" aria-label="${i} star${i > 1 ? 's' : ''}" aria-pressed="${i === n.rating}">${UI.ICON.star}</button>`).join('')}<span class="muted small" style="margin-left:auto">${n.rating ? ['', 'Not for me', 'Meh', 'Good', 'Great', 'Favourite'][n.rating] : 'Rate it after cooking'}</span></div>
    <textarea id="r-note" rows="2" class="mt8" maxlength="300" placeholder="Your notes — less chili, extra 2 minutes, add cheese…">${UI.esc(n.note || '')}</textarea></div>`; })()}

  ${r.vars ? `<div class="section-title">Switch it up</div><div class="card tight">${r.vars.map((v) => `<div class="small" style="padding:7px 0;border-bottom:1px solid var(--line)">${UI.esc(v)}</div>`).join('')}<p class="tiny faint mt8">Same easy method, different taste — so you never get bored.</p></div>` : ''}

  <div class="section-title">Steps</div>
  <div class="card">${r.steps.map((s, i) => `<div class="step"><div class="n">${i + 1}</div><div class="grow">${UI.esc(s.t)}${s.timer ? ` <span class="timer-pill">${UI.ICON.clock}${fmtT(s.timer)}</span>` : ''}</div></div>`).join('')}</div>
  <div class="notice">Air fryers vary — check chicken is cooked through (no pink, juices clear). Times are for a 4–6 L basket air fryer, preheated.</div>`;
}
const fmtT = (s) => s >= 60 ? `${Math.floor(s / 60)}:${S.pad(s % 60)}` : `${s}s`;

let panQ = '';
function pantryView() {
  const pantry = new Set(S.get().pantry); const q = panQ.trim().toLowerCase();
  const match = (i) => !q || i.name.toLowerCase().includes(q) || (i.zh || '').includes(q);
  return `<div class="topbar"><a class="icon-btn" href="#cook" aria-label="Back">${UI.ICON.back}</a><div class="grow"><h1 class="h-sub">My pantry</h1><div class="sub">${pantry.size} of ${INGREDIENTS.length} items · tap to toggle</div></div></div>
  <label class="searchbar">${UI.ICON.search}<input id="pan-q" type="search" placeholder="Find an ingredient" value="${UI.esc(panQ)}" autocomplete="off"></label>
  ${ING_CATS.map((c) => { const list = INGREDIENTS.filter((i) => i.cat === c && match(i)); if (!list.length) return ''; const have = INGREDIENTS.filter((i) => i.cat === c && pantry.has(i.id)).length; const all = INGREDIENTS.filter((i) => i.cat === c).length;
    return `<div class="section-title">${c}<span class="small muted">${have} of ${all}</span></div><div class="chips">${list.map((i) => `<button class="chip ${pantry.has(i.id) ? 'on' : ''}" data-pan="${i.id}">${UI.esc(i.name)}</button>`).join('')}</div>`; }).join('') || '<div class="empty">No ingredient matches.</div>'}
  <div class="grid2 mt16"><button class="btn" data-clear>Clear all</button><a class="btn primary" href="#cook">Done</a></div>`;
}

function deliveryView() {
  return `<div class="topbar"><a class="icon-btn" href="#cook" aria-label="Back">${UI.ICON.back}</a><div class="grow"><h1 class="h-sub">Halal delivery</h1><div class="sub">Meituan 美团 · Ele.me 饿了么</div></div></div>
  <div class="notice mb12">Search <b>清真</b> in the app and sort by rating. Ask for <b>少盐</b> (less salt) and <b>加蛋 / 加肉</b> (extra egg / meat) for protein. Ordering still counts — eating something is the win.</div>
  ${DELIVERY.map((d) => `<div class="card tight deliv"><div class="row" style="align-items:flex-start;gap:14px"><div class="dthumb ${PHOTOS[d.id] ? 'has-photo' : 'mono-tile'}" style="--tint:${d.bg?.[0] || '#555'}">${PHOTOS[d.id] ? `<img class="ph" src="${PHOTOS[d.id].src}" alt="" loading="lazy" decoding="async">` : `<span class="mono" aria-hidden="true">${UI.ICON.bag}</span>`}</div>
    <div class="grow"><b>${UI.esc(d.name)}</b><div class="small muted">${UI.esc(d.zh)}</div><div class="small mt8">~¥${d.cost} · ${d.kcal} kcal · ${d.protein} g protein</div></div></div>
    <p class="small muted mt8">${UI.esc(d.tip)}</p>
    <div class="row mt12 gap8"><button class="btn sm grow" data-copy="${UI.esc(d.zh)}">Copy search</button><button class="btn sm grow" data-ate-del="${d.id}">${UI.ICON.check}<span>I ate this</span></button></div></div>`).join('')}`;
}

function shopView() {
  const st = S.get(); st.shopping = st.shopping || [];
  const items = st.shopping.map((x) => ({ ...x, g: ING[x.id] })).filter((x) => x.g);
  const left = items.filter((x) => !x.done); const total = left.reduce((a, x) => a + x.g.price, 0);
  const weekly = st.profile.weeklyBudget; const bought = items.length - left.length;
  return `<div class="topbar"><a class="icon-btn" href="#cook" aria-label="Back">${UI.ICON.back}</a><div class="grow"><h1 class="h-sub">Shopping list</h1><div class="sub">${total ? `About ¥${total} to buy · ` : ''}Budget ¥${weekly} a week</div></div></div>
  ${items.length ? `<div class="card tight"><div class="row between small"><span class="muted">${bought} of ${items.length} bought</span><b>~¥${total}</b></div><div class="lvlbar mt8"><i style="width:${Math.round(bought / items.length * 100)}%;background:var(--green)"></i></div></div>` : ''}
  ${total > weekly ? '<div class="notice mb12">This list is over your weekly budget. Spices and protein powder last for weeks, so it evens out.</div>' : ''}
  ${items.length ? `<div class="card ess-list">${items.map((x) => `<button class="check ${x.done ? 'done' : ''} w100 ts" data-shop="${x.id}"><span class="box">${UI.ICON.check}</span><span class="label">${UI.esc(x.g.name)}<span class="zh muted small db">${UI.esc(x.g.zh)} · ${x.g.unit}</span></span><span class="muted small">¥${x.g.price}</span></button>`).join('')}</div>`
    : `<div class="card empty-state"><span class="es-ico">${UI.ICON.cart}</span><b>Your list is empty</b><p class="small muted">Open a recipe and tap “Add to list”, or plan your week to get one list for everything.</p><a class="btn sm mt12" href="#cook/plan">Plan your week</a></div>`}
  <div class="section-title">Always-stocked essentials</div>
  <div class="chips">${['eggs', 'cooked_chicken', 'shouzhuabing', 'tortilla', 'yogurt', 'milk', 'banana', 'instant_rice', 'frozen_veg', 'chicken_thigh'].map((id) => `<button class="chip" data-addshop="${id}">${UI.ICON.plus.replace('<svg', '<svg width="14" height="14"')}${UI.esc(ING[id].name)}</button>`).join('')}</div>
  ${items.length ? '<div class="grid2 mt16"><button class="btn" data-shopclear>Clear bought</button><button class="btn primary" data-shopstock>Move bought to pantry</button></div>' : ''}
  <div class="notice mt16">Hema 盒马 and Meituan Grocery 美团买菜 deliver in about 30 minutes. Search the Chinese names above.</div>`;
}

// ---------- Cook mode ----------
function cookMode(r, rerender) {
  let i = 0; let remaining = 0; let iv = null; let running = false;
  UI.fullscreen(`<div class="cookmode">
    <div class="row between"><button class="icon-btn" data-x>${UI.ICON.close}</button><b class="ellipsis" style="max-width:60%">${r.emoji} ${UI.esc(r.name)}</b><div class="w40"></div></div>
    <div class="progress">${r.steps.map(() => '<i></i>').join('')}</div>
    <div class="stepbig"><div class="num" id="cm-num"></div><div class="txt" id="cm-txt"></div><div id="cm-timer"></div></div>
    <div class="grid2"><button class="btn" data-prev>Back</button><button class="btn primary" data-next>Next</button></div>
  </div>`, {
    onMount: (w, close) => {
      const bars = [...w.querySelectorAll('.progress i')];
      let wake = null; try { navigator.wakeLock?.request('screen').then((l) => { wake = l; }).catch(() => {}); } catch (e) {}
      const stop = () => { clearInterval(iv); running = false; };
      const paintTimer = () => {
        const s = r.steps[i]; const el = w.querySelector('#cm-timer');
        if (!s.timer) { el.innerHTML = ''; return; }
        morph(el, `<div class="timer">${fmtT(remaining)}</div><div class="row" style="justify-content:center;gap:10px"><button class="btn ${running ? '' : 'primary'}" data-tt>${running ? 'Pause' : 'Start timer'}</button><button class="btn" data-tr>${UI.ICON.refresh}</button></div>`);
        el.querySelector('[data-tt]').onclick = () => { if (running) stop(); else start(); paintTimer(); };
        el.querySelector('[data-tr]').onclick = () => { stop(); remaining = s.timer; paintTimer(); };
      };
      const start = () => {
        running = true; clearInterval(iv);
        iv = setInterval(() => {
          remaining--; const t = w.querySelector('.timer'); if (t) t.textContent = fmtT(Math.max(0, remaining));
          if (remaining <= 0) { stop(); UI.ding('level'); UI.haptic(400); UI.toast('Timer done!', ''); paintTimer(); }
        }, 1000);
      };
      const show = () => {
        stop(); const s = r.steps[i]; remaining = s.timer || 0;
        w.querySelector('#cm-num').textContent = `Step ${i + 1} of ${r.steps.length}`;
        w.querySelector('#cm-txt').textContent = s.t;
        bars.forEach((b, j) => b.classList.toggle('on', j <= i));
        w.querySelector('[data-next]').textContent = i === r.steps.length - 1 ? 'Done ' : 'Next';
        paintTimer();
      };
      w.querySelector('[data-prev]').onclick = () => { if (i > 0) { i--; show(); } };
      w.querySelector('[data-next]').onclick = async () => {
        if (i < r.steps.length - 1) { i++; show(); UI.haptic(8); return; }
        stop(); try { wake && wake.release(); } catch (e) {} close();
        const st = S.get(); st.cooked[r.id] = (st.cooked[r.id] || 0) + 1;
        const d = S.day(); d.cookedCount = (d.cookedCount || 0) + 1; S.save();
        G.award(`cook_${r.id}`, 40, null); G.checkBadges();
        const times = st.cooked[r.id];
        if (await UI.confirmSheet('Done', `${times > 1 ? `That’s ${times} times you’ve made this. ` : ''}Log it as ${P.SLOT_LABEL[P.currentSlot()].toLowerCase()}? ${r.kcal} kcal · ${r.protein} g protein.`, 'Log meal')) {
          Sh.logMeal({ slot: P.currentSlot(), name: r.name, recipeId: r.id, kcal: r.kcal, protein: r.protein });
        }
        rerender();
      };
      w.querySelector('[data-x]').onclick = () => { stop(); try { wake && wake.release(); } catch (e) {} close(); };
      show();
    },
  });
}

export function bind(root, parts, { rerender }) {
  const st = S.get();
  const sub = parts[0];
  if (!sub) {
    root.querySelector('[data-search]')?.addEventListener('click', () => import('./search.js').then((m) => m.open()));
    root.querySelector('[data-filters]')?.addEventListener('click', () => filterSheet(rerender));
    root.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { filt.cat = b.dataset.cat; rerender(); });
    const q = root.querySelector('#rq');
    q.addEventListener('input', () => {
      filt.q = q.value; const grid = root.querySelector('#rgrid'); const ql = filt.q.toLowerCase();
      const list = RECIPES.filter((r) => !ql || r.name.toLowerCase().includes(ql) || r.ing.some((i) => ING[i.id]?.name.toLowerCase().includes(ql)) || r.tags.join(' ').includes(ql));
      morph(grid, list.length ? list.map(recipeCard).join('') : '<div class="empty span-all">Nothing found</div>');
    });
  }
  if (sub === 'r') {
    const r = RECIPE[parts[1]]; if (!r) return;
    root.querySelector('[data-fav]').onclick = () => { const i = st.favorites.indexOf(r.id); if (i >= 0) st.favorites.splice(i, 1); else { st.favorites.push(r.id); UI.toast('Added to favourites', ''); UI.haptic(10); } S.save(); rerender(); };
    root.querySelector('[data-cook]').onclick = () => cookMode(r, rerender);
    st.recipeNotes = st.recipeNotes || {};
    root.querySelectorAll('[data-rate]').forEach((b) => b.onclick = () => {
      const n = st.recipeNotes[r.id] = st.recipeNotes[r.id] || {}; const v = +b.dataset.rate;
      n.rating = n.rating === v ? 0 : v; S.save(); UI.haptic(8);
      if (v >= 4 && !st.favorites.includes(r.id)) { st.favorites.push(r.id); S.save(); UI.toast('Rated highly — added to favourites', ''); }
      rerender();
    });
    root.querySelector('#r-note')?.addEventListener('change', (e) => { const n = st.recipeNotes[r.id] = st.recipeNotes[r.id] || {}; n.note = e.target.value.trim(); S.save(); UI.toast('Note saved', ''); });
    root.querySelector('[data-ate]').onclick = (ev) => { Sh.logMeal({ slot: P.currentSlot(), name: r.name, recipeId: r.id, kcal: r.kcal, protein: r.protein }, ev); UI.toast(`${P.SLOT_LABEL[P.currentSlot()]} logged: ${r.name}`, r.emoji); };
    root.querySelectorAll('[data-toggle]').forEach((b) => b.onclick = () => { const id = b.dataset.toggle; const i = st.pantry.indexOf(id); if (i >= 0) st.pantry.splice(i, 1); else st.pantry.push(id); S.save(); rerender(); });
    root.querySelector('[data-addmissing]')?.addEventListener('click', () => {
      st.shopping = st.shopping || []; const pantry = new Set(st.pantry);
      r.ing.filter((i) => !i.opt && !pantry.has(i.id)).forEach((i) => { if (!st.shopping.some((x) => x.id === i.id)) st.shopping.push({ id: i.id, done: false }); });
      S.save(); UI.toast('Added to shopping list', ''); rerender();
    });
  }
  if (sub === 'pantry') {
    root.querySelectorAll('[data-pan]').forEach((b) => b.onclick = () => { const id = b.dataset.pan; const i = st.pantry.indexOf(id); if (i >= 0) st.pantry.splice(i, 1); else st.pantry.push(id); S.save(); b.classList.toggle('on'); UI.haptic(6); });
    const pq = root.querySelector('#pan-q');
    if (pq) pq.oninput = () => { panQ = pq.value; const pos = pq.selectionStart; rerender(); const n = document.querySelector('#pan-q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
    root.querySelector('[data-clear]').onclick = async () => { if (await UI.confirmSheet('Clear pantry?', 'Remove all items from your pantry.', 'Clear', true)) { st.pantry = []; S.save(); rerender(); } };
  }
  if (sub === 'delivery') {
    root.querySelectorAll('[data-copy]').forEach((b) => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); UI.toast('Copied — paste into Meituan', ''); } catch (e) { UI.toast(b.dataset.copy, ''); } });
    root.querySelectorAll('[data-ate-del]').forEach((b) => b.onclick = (ev) => { const d = DELIVERY.find((x) => x.id === b.dataset.ateDel); Sh.logMeal({ slot: P.currentSlot(), name: d.name, delivery: true, kcal: d.kcal, protein: d.protein }, ev); UI.toast(`Logged ${d.name}`, d.emoji); });
  }
  if (sub === 'plan') {
    root.querySelector('[data-genplan]')?.addEventListener('click', () => { generatePlan(); G.award('plan_' + S.weekKey(), 25, null); rerender(); });
    root.querySelectorAll('[data-swap]').forEach((b) => b.onclick = () => { const [i, slot] = b.dataset.swap.split(':'); swapMeal(+i, slot); UI.haptic(8); rerender(); });
    root.querySelector('[data-planshop]')?.addEventListener('click', () => {
      st.shopping = st.shopping || []; const need = planIngredients().filter((id) => !st.pantry.includes(id));
      need.forEach((id) => { if (!st.shopping.some((x) => x.id === id)) st.shopping.push({ id, done: false }); });
      S.save(); UI.toast(`${need.length} items added to shopping list`, ''); location.hash = 'cook/shop';
    });
  }
  if (sub === 'shop') {
    st.shopping = st.shopping || [];
    root.querySelectorAll('[data-shop]').forEach((b) => b.onclick = () => { const x = st.shopping.find((y) => y.id === b.dataset.shop); x.done = !x.done; S.save(); rerender(); });
    root.querySelectorAll('[data-addshop]').forEach((b) => b.onclick = () => { if (!st.shopping.some((x) => x.id === b.dataset.addshop)) { st.shopping.push({ id: b.dataset.addshop, done: false }); S.save(); rerender(); } });
    root.querySelector('[data-shopclear]')?.addEventListener('click', () => { st.shopping = st.shopping.filter((x) => !x.done); S.save(); rerender(); });
    root.querySelector('[data-shopstock]')?.addEventListener('click', () => {
      const bought = st.shopping.filter((x) => x.done).map((x) => x.id); st.pantry = [...new Set([...st.pantry, ...bought])];
      st.shopping = st.shopping.filter((x) => !x.done); S.save(); UI.toast(`${bought.length} items added to pantry`, ''); G.award(`shop_${S.dayKey()}`, 15, null, { silent: true }); rerender();
    });
  }
}

// ---------- Weekly meal plan ----------
const PLAN_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
// Core rotation per slot = your stated preferences (desi savory breakfast, wraps, curry + roti, smoothies).
const CORE = {
  breakfast: ['egg_paratha', 'overnight_oats', 'naan_egg_cheese', 'egg_muffins', 'aloo_paratha_cheat', 'omelette_roll', 'palak_paratha', 'egg_bhurji_toast'],
  lunch: ['chicken_cheese_wrap', 'tikka_wrap', 'tuna_melt', 'hummus_wrap', 'kebab_naan', 'shawarma_pita', 'caesar_wrap'],
  dinner: ['airfryer_chicken_curry', 'tandoori_thighs', 'tray_bake', 'shawarma_bowl', 'kofta_tray', 'chicken_seekh', 'malai_tikka', 'green_chutney_chicken'],
  snack: ['shaker_smoothie', 'protein_milk_dates', 'mango_lassi', 'yogurt_bowl', 'date_shake', 'date_balls'],
};
function pickFor(slot, used, rnd) {
  const st = S.get();
  const favs = st.favorites.filter((id) => RECIPE[id]?.meals.includes(slot));
  const ids = [...new Set([...favs, ...CORE[slot]])];
  const scored = suggest({ slot }).filter((x) => ids.includes(x.r.id)).slice(0, 4); // max 4 options per slot = familiar
  const weights = scored.map((x, i) => (4 - i) * (favs.includes(x.r.id) ? 2 : 1) / (1 + (used[x.r.id] || 0) * 2));
  let t = rnd() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < scored.length; i++) { t -= weights[i]; if (t <= 0) return scored[i].r.id; }
  return scored[0]?.r.id;
}
export function generatePlan() {
  const st = S.get(); const used = {}; const days = [];
  for (let d = 0; d < 7; d++) { const day = {}; PLAN_SLOTS.forEach((sl) => { const id = pickFor(sl, used, Math.random); day[sl] = id; used[id] = (used[id] || 0) + 1; }); days.push(day); }
  st.weekPlan = { week: S.weekKey(), days }; S.save();
}
function swapMeal(i, slot) {
  const st = S.get(); const cur = st.weekPlan.days[i][slot];
  const opts = suggest({ slot }).filter((x) => x.r.meals.includes(slot) && x.r.id !== cur).slice(0, 10);
  st.weekPlan.days[i][slot] = opts[Math.floor(Math.random() * opts.length)].r.id; S.save();
}
function planIngredients() {
  const st = S.get(); const ids = new Set();
  (st.weekPlan?.days || []).forEach((d) => PLAN_SLOTS.forEach((sl) => RECIPE[d[sl]]?.ing.filter((i) => !i.opt).forEach((i) => ids.add(i.id))));
  return [...ids];
}
export function planToday(slot) {
  const st = S.get(); if (!st.weekPlan || st.weekPlan.week !== S.weekKey()) return null;
  const idx = (S.keyToDate(S.dayKey()).getDay() + 6) % 7; return RECIPE[st.weekPlan.days[idx]?.[slot]] || null;
}
function planTeaser() {
  const st = S.get(); const has = st.weekPlan && st.weekPlan.week === S.weekKey();
  const today = has ? ['breakfast', 'lunch', 'dinner'].map((sl) => planToday(sl)).filter(Boolean) : [];
  return `<a class="list-row mt12" href="#cook/plan"><span class="ico">${UI.ICON.calendar}</span><span class="grow"><b>${has ? 'Today’s plan' : 'Plan your week'}</b><span class="small muted ellipsis">${has ? today.map((r) => UI.esc(r.name)).join(' · ') : 'Favourites with small variations, one shopping list'}</span></span><span class="chev">${UI.ICON.chev}</span></a>`;
}
function planView() {
  const st = S.get(); const has = st.weekPlan && st.weekPlan.week === S.weekKey();
  const todayIdx = (S.keyToDate(S.dayKey()).getDay() + 6) % 7;
  const wk = S.weekKey();
  let cost = 0, kcal = 0;
  if (has) st.weekPlan.days.forEach((d) => PLAN_SLOTS.forEach((sl) => { const r = RECIPE[d[sl]]; if (r) { cost += r.cost; kcal += r.kcal; } }));
  return `<div class="topbar"><a class="icon-btn" href="#cook">${UI.ICON.back}</a><div class="grow"><h1 class="h-sub">Meal plan</h1><div class="sub"><span>Week of</span> ${S.prettyDate(wk, { day: 'numeric', month: 'short' })}</div></div></div>
  ${has ? `<div class="card"><div class="stats"><div class="stat"><b>¥${cost}</b><span>Whole week</span></div><div class="stat"><b>${Math.round(kcal / 7)}</b><span>kcal a day</span></div><div class="stat"><b>${planIngredients().filter((id) => !st.pantry.includes(id)).length}</b><span>To buy</span></div></div></div>
    ${st.weekPlan.days.map((d, i) => { const k = S.addDays(wk, i); return `<div class="card tight" style="${i === todayIdx ? 'border-color:var(--line2)' : ''}">
      <div class="row between mb8"><b>${S.prettyDate(k, { weekday: 'long' })}${i === todayIdx ? ' · today' : ''}</b><span class="muted small">${PLAN_SLOTS.reduce((s, sl) => s + (RECIPE[d[sl]]?.kcal || 0), 0)} kcal</span></div>
      ${PLAN_SLOTS.map((sl) => { const r = RECIPE[d[sl]]; if (!r) return ''; return `<div class="row" style="padding:5px 0"><span class="slot-tag">${P.SLOT_LABEL[sl].split(' ')[0]}</span><a href="#cook/r/${r.id}" class="grow ellipsis plain">${r.emoji} ${UI.esc(r.name)}</a><button class="icon-btn sz32" data-swap="${i}:${sl}" aria-label="Swap meal">${UI.ICON.refresh}</button></div>`; }).join('')}
    </div>`; }).join('')}
    <div class="grid2 mt8"><button class="btn" data-genplan>Regenerate</button><button class="btn primary" data-planshop>Shopping list</button></div>`
    : `<div class="empty"><span class="e"></span>No plan for this week yet.</div><button class="btn primary block" data-genplan>Generate my week</button>`}
  <div class="notice mt12">Plans lean on your favourites and what’s in your pantry, with small variations so you don’t get bored. Tap the arrows to swap any meal.</div>`;
}

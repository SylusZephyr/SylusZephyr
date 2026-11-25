import * as S from '../store.js';
import * as UI from '../ui.js';
import * as G from '../gamify.js';
import * as Sh from './shared.js';
import { PF_PHASES, PF_EDU, pfPhase, RED_FLAGS } from '../data/content.js';

export function pfWeek() {
  const st = S.get(); const ss = st.pf.sessions;
  if (st.pf.manualWeek) return st.pf.manualWeek;
  if (!ss.length) return 1;
  const first = ss[0].date; const days = Math.round((S.keyToDate(S.dayKey()) - S.keyToDate(first)) / 86400000);
  return Math.min(12, Math.floor(days / 7) + 1);
}

function weekCounts() {
  const st = S.get(); const out = [];
  for (let i = 6; i >= 0; i--) { const k = S.addDays(S.dayKey(), -i); out.push({ k, n: st.pf.sessions.filter((s) => s.date === k).length }); }
  return out;
}

const CARDIO = [
  { w: 1, min: 10, t: 'Easy walk, can talk comfortably' }, { w: 2, min: 15, t: 'Easy walk or very gentle cycling' },
  { w: 3, min: 20, t: 'Brisk walk / easy cycling' }, { w: 4, min: 25, t: 'Brisk walk / cycling, conversational' },
  { w: 5, min: 30, t: 'Cycling or sport, moderate' }, { w: 6, min: 35, t: 'Cycling or sport, moderate' },
];

// Line drawings of the three training positions. The dot marks the pelvic floor.
const FIG = {
  lying: '<path d="M8 62h104"/><circle cx="16" cy="50" r="6"/><path d="M23 53h46l16-20 15 22"/><path d="M30 56l26 2"/><circle class="pf-dot" cx="66" cy="54" r="3.5"/>',
  sitting: '<path d="M8 74h104"/><path d="M44 50h36M48 50v24M78 50v24"/><circle cx="54" cy="10" r="6"/><path d="M54 17v30h26v24"/><path d="M54 24l12 14"/><circle class="pf-dot" cx="56" cy="46" r="3.5"/>',
  standing: '<path d="M8 76h104"/><circle cx="60" cy="9" r="6"/><path d="M60 16v30M60 46l-7 29M60 46l7 29M60 22l-10 18M60 22l10 18"/><circle class="pf-dot" cx="60" cy="45" r="3.5"/>',
};
const posKey = (pos) => (/stand|walk/i.test(pos) ? 'standing' : /sit/i.test(pos) ? 'sitting' : 'lying');
const figure = (k, label) => `<figure class="pos-fig"><svg viewBox="0 0 120 80" aria-hidden="true">${FIG[k]}</svg><figcaption>${label}</figcaption></figure>`;

// Walking plan: a daily target that steps up after a week with 5 days on target.
function walkPlan() {
  const st = S.get(); const cleared = st.medical.exerciseCleared;
  st.walkPlan = st.walkPlan || { level: 1, weeks: {} };
  const level = cleared ? Math.min(CARDIO.length, st.walkPlan.level) : 1;
  const c = cleared ? CARDIO[level - 1] : { min: 10, t: 'Easy walk, can talk comfortably' };
  const wk = S.weekKey(); const days = Array.from({ length: 7 }, (_, i) => S.addDays(wk, i));
  const mins = days.map((k) => st.days[k]?.walkMin || 0);
  const hit = mins.filter((m) => m >= c.min).length;
  return { level, c, days, mins, hit, cleared };
}
function checkWalkLevel() {
  const st = S.get(); const w = walkPlan(); const wk = S.weekKey();
  if (w.cleared && w.hit >= 5 && !st.walkPlan.weeks[wk] && w.level < CARDIO.length) {
    st.walkPlan.weeks[wk] = true; st.walkPlan.level = w.level + 1; S.save();
    UI.toast(`Walking level ${w.level + 1}: ${CARDIO[w.level].min} minutes a day`);
  }
}

export function render() {
  const st = S.get(); const d = S.day(); const wk = pfWeek(); const ph = pfPhase(wk);
  const todayN = d.pf || 0; const counts = weekCounts();
  const control = (st.pf.control || []).length;
  const mins = Math.ceil((ph.reps * (ph.hold + ph.rest) + ph.flicks * 2 + ph.reverse * 6 + 20) / 60);
  const w = walkPlan();
  return `
  <div class="topbar"><div><div class="sub">Pelvic floor · week ${wk} of 12</div><h1>Train</h1></div></div>

  <section class="card">
    <div class="row" style="gap:16px">
      ${UI.ring(Math.min(1, todayN / 3), 96, 10, todayN >= 3 ? 'var(--green)' : 'var(--a1)', `${todayN}/3`, 'today')}
      <div class="grow"><div class="kicker">${ph.name}</div><h3>${ph.reps} holds of ${ph.hold} seconds</h3>
        <p class="muted small mt8">Then ${ph.flicks} quick flicks and ${ph.reverse} reverse Kegels. About ${mins} min.</p></div>
    </div>
    <button class="btn primary block mt16" data-pf>${UI.ICON.play}<span>Start session</span></button>
    <div class="week-dots mt16">${counts.map((c) => `<div class="wd ${c.k === S.dayKey() ? 'today' : ''}"><i class="${c.n >= 3 ? 'full' : c.n ? 'part' : ''}" style="--n:${Math.min(3, c.n)}"></i><span>${S.prettyDate(c.k, { weekday: 'narrow' })}</span></div>`).join('')}</div>
  </section>

  <div class="section-title">How to do it</div>
  <section class="card guide">
    <div class="pos-row">${figure(posKey(ph.pos), UI.esc(ph.pos))}</div>
    <div class="timeline" style="--hold:${ph.hold}s;--rest:${ph.rest}s" aria-hidden="true"><div class="tl-bar"><i></i></div><div class="tl-labels"><span>Squeeze</span><span>Hold ${ph.hold}s</span><span>Release ${ph.rest}s</span></div></div>
    <ol class="steps-list">
      <li><b>Find the muscle.</b> It’s the one you’d use to stop passing wind and to stop urine midstream. Don’t practise on the toilet.</li>
      <li><b>Squeeze and lift</b> inwards and upwards. Buttocks, thighs and stomach stay loose. Keep breathing.</li>
      <li><b>Let go fully</b> between holds. The release matters as much as the squeeze.</li>
    </ol>
  </section>

  <div class="section-title">Program</div>
  <section class="card tight">
    ${PF_PHASES.map((p) => { const active = p.weeks.includes(wk); const done = Math.max(...p.weeks) < wk; return `<div class="list-item">
      <div class="li-ico" style="${active ? 'background:var(--text);color:#0b0c0e' : done ? 'background:var(--green);color:#0b0c0e' : ''}">${done ? UI.ICON.check : active ? UI.ICON.play : UI.ICON.lock}</div>
      <div class="grow"><b>${p.name}</b> <span class="muted small">· weeks ${p.weeks[0]}–${p.weeks.at(-1)}</span><div class="muted small">${p.reps} × ${p.hold}s holds · ${p.flicks} flicks · ${p.pos.toLowerCase()}</div></div></div>`; }).join('')}
    <div class="row between" style="padding:12px 2px 4px"><span class="small muted">Program week</span><div class="row"><button class="icon-btn" style="width:32px;height:32px" data-wk="-1" aria-label="Previous week">${UI.ICON.minus}</button><b style="min-width:20px;text-align:center">${wk}</b><button class="icon-btn" style="width:32px;height:32px" data-wk="1" aria-label="Next week">${UI.ICON.plus}</button></div></div>
  </section>

  <div class="section-title">Walking</div>
  <section class="card ${w.cleared ? '' : 'danger'}">
    <div class="row between"><div class="kicker" style="margin:0">${w.cleared ? `Level ${w.level} of ${CARDIO.length}` : 'Gentle walks only until a doctor clears you'}</div><span class="small muted">${w.hit} of 5 days</span></div>
    <h3 class="mt8">${w.c.min} minutes a day</h3><p class="small muted">${UI.esc(w.c.t)}.${w.cleared && w.level < CARDIO.length ? ` Five days on target this week moves you to ${CARDIO[w.level].min} minutes.` : ''}</p>
    <div class="walk-week mt12">${w.days.map((k, i) => `<div class="ww ${k === S.dayKey() ? 'today' : ''}"><div class="col-bar"><i style="height:${Math.min(100, Math.round(w.mins[i] / w.c.min * 100))}%" class="${w.mins[i] >= w.c.min ? 'hit' : ''}"></i></div><span>${S.prettyDate(k, { weekday: 'narrow' })}</span></div>`).join('')}</div>
    <div class="grid3 mt12">${[5, 10, 15].map((m) => `<button class="btn sm" data-walk="${m}">+${m} min</button>`).join('')}</div>
    ${w.cleared ? '' : `<p class="small muted mt12">You reported chest pain, breathlessness or dizziness on exertion. Walk at a pace where you can talk. Mark yourself cleared in <a href="#me/medical">Medical</a> once a doctor has checked you.</p>`}
    <p class="tiny muted mt8">Stop and call 120 for chest pain or pressure, fainting, or severe breathlessness.</p>
  </section>

  <div class="grid2">
    <button class="card" style="margin:0;text-align:left" data-breath><div class="kicker">Breathing</div><b>2-minute calm</b><div class="muted small">In for 4, out for 6</div></button>
    <button class="card" style="margin:0;text-align:left" data-control><div class="kicker">Control practice</div><b>${control} logged</b><div class="muted small">Stop–start, private</div></button>
  </div>

  <div class="section-title">Learn</div>
  <section class="card tight">${PF_EDU.map((e) => `<details class="learn"><summary><b>${UI.esc(e.t)}</b><span class="chev">${UI.ICON.chev}</span></summary><p class="small muted">${UI.esc(e.b)}</p></details>`).join('')}</section>
  `;
}

// Guided session runner
function runSession(rerender) {
  const wk = pfWeek(); const ph = pfPhase(wk);
  const seq = [{ kind: 'intro', s: 5, label: 'Get ready', sub: ph.pos + '. Breathe normally.' }];
  for (let i = 0; i < ph.reps; i++) { seq.push({ kind: 'squeeze', s: ph.hold, label: 'Squeeze & lift', sub: `Hold ${i + 1}/${ph.reps}` }); seq.push({ kind: 'relax', s: ph.rest, label: 'Fully relax', sub: 'Let it all go' }); }
  seq.push({ kind: 'intro', s: 5, label: 'Quick flicks next', sub: 'Fast squeeze-release, 1 second each' });
  for (let i = 0; i < ph.flicks; i++) { seq.push({ kind: 'squeeze', s: 1, label: 'Flick!', sub: `${i + 1}/${ph.flicks}` }); seq.push({ kind: 'relax', s: 1, label: 'Release', sub: '' }); }
  seq.push({ kind: 'intro', s: 5, label: 'Reverse Kegels', sub: 'Gently let the pelvic floor drop & lengthen — like starting to pee. No straining.' });
  for (let i = 0; i < ph.reverse; i++) { seq.push({ kind: 'reverse', s: 3, label: 'Drop & lengthen', sub: `${i + 1}/${ph.reverse}` }); seq.push({ kind: 'relax', s: 3, label: 'Rest', sub: 'Breathe' }); }
  const total = seq.reduce((a, b) => a + b.s, 0);
  let idx = 0; let left = seq[0].s; let elapsed = 0; let iv = null; let paused = false;

  UI.fullscreen(`<div class="trainer">
    <div class="row between" style="width:100%"><button class="icon-btn" data-x>${UI.ICON.close}</button><div class="muted small" id="tr-left"></div><button class="icon-btn" data-p>${UI.ICON.pause}</button></div>
    <div class="lvlbar" style="width:100%;margin-top:14px"><i id="tr-bar" style="width:0%"></i></div>
    <div class="orb-wrap"><div class="orb" id="orb"><svg class="orb-ring" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="92"/></svg><div class="count" id="tr-count"></div></div></div>
    <div class="phase" id="tr-label"></div><div class="meta mt8" id="tr-sub"></div>
    <p class="tiny faint mt16" style="text-align:center">Keep breathing. Buttocks, thighs and stomach stay loose.</p>
  </div>`, {
    onMount: (w, close) => {
      const orb = w.querySelector('#orb');
      let wake = null; try { navigator.wakeLock?.request('screen').then((l) => { wake = l; }).catch(() => {}); } catch (e) {}
      const paint = () => {
        const s = seq[idx];
        w.querySelector('#tr-label').textContent = s.label; w.querySelector('#tr-sub').textContent = s.sub;
        w.querySelector('#tr-count').textContent = left;
        w.querySelector('#tr-bar').style.width = `${(elapsed / total) * 100}%`;
        w.querySelector('#tr-left').textContent = `${Math.floor((total - elapsed) / 60)}:${S.pad((total - elapsed) % 60)} left`;
      };
      const enter = () => {
        const s = seq[idx]; orb.style.setProperty('--t', Math.min(1.2, s.s * 0.6) + 's');
        orb.className = 'orb ' + (s.kind === 'squeeze' ? 'small' : s.kind === 'reverse' ? 'big cool' : s.kind === 'relax' ? '' : 'cool');
        if (s.kind === 'squeeze') { UI.haptic(20); UI.ding('tick'); } else if (s.kind === 'relax') UI.haptic(6);
      };
      const finish = async () => {
        clearInterval(iv); try { wake && wake.release(); } catch (e) {} close();
        const st = S.get(); const d = S.day();
        st.pf.sessions.push({ date: S.dayKey(), at: Date.now(), week: wk }); d.pf = (d.pf || 0) + 1; S.save();
        G.award(`pf_${d.pf}`, 30, null); G.checkBadges();
        UI.toast(d.pf >= 3 ? 'Three sessions today — daily target done' : `Session ${d.pf} of 3 done`);
        rerender();
      };
      const tick = () => {
        if (paused) return; left--; elapsed++;
        if (left <= 0) { idx++; if (idx >= seq.length) return finish(); left = seq[idx].s; enter(); }
        paint();
      };
      w.querySelector('[data-x]').onclick = () => { clearInterval(iv); try { wake && wake.release(); } catch (e) {} close(); };
      w.querySelector('[data-p]').onclick = (e) => { paused = !paused; e.currentTarget.innerHTML = paused ? UI.ICON.play : UI.ICON.pause; };
      enter(); paint(); iv = setInterval(tick, 1000);
    },
  });
}

function controlSheet(rerender) {
  UI.openSheet(`<h2>Control practice</h2>
    <p class="muted small">Solo stop–start practice: build arousal to ~7/10, stop and breathe slowly until it drops to ~4, then resume. Aim for 3–4 cycles. See “Stop–start technique” in Learn.</p>
    <div class="field"><label>Cycles completed</label>${UI.scaleButtons('cyc', 5, null, ['1', '2', '3', '4', '5+'])}</div>
    <div class="field"><label>How much control did you feel?</label>${UI.scaleButtons('ctl', 5, null, ['', '', '', '', ''], true)}</div>
    <button class="btn primary block mt16" data-save>Save (private)</button>`, {
    onMount: (sh, close) => {
      let cyc = null, ctl = null;
      sh.querySelectorAll('[data-scale] button').forEach((b) => b.onclick = () => { const n = b.parentElement.dataset.scale; if (n === 'cyc') cyc = +b.dataset.v + 1; else ctl = +b.dataset.v + 1; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); });
      sh.querySelector('[data-save]').onclick = (ev) => {
        const st = S.get(); st.pf.control = st.pf.control || []; st.pf.control.push({ date: S.dayKey(), cycles: cyc, control: ctl });
        S.save(); G.award('control_practice', 25, ev); close(); rerender();
      };
    },
  });
}

export function bind(root, _, { rerender }) {
  const st = S.get();
  root.querySelector('[data-pf]').onclick = () => runSession(rerender);
  root.querySelector('[data-breath]').onclick = () => Sh.breathing({ onDone: rerender });
  root.querySelector('[data-control]').onclick = () => controlSheet(rerender);
  root.querySelectorAll('[data-wk]').forEach((b) => b.onclick = () => { st.pf.manualWeek = Math.max(1, Math.min(12, pfWeek() + +b.dataset.wk)); S.save(); rerender(); });
  root.querySelectorAll('[data-walk]').forEach((b) => b.onclick = (ev) => {
    const m = +b.dataset.walk; const d = S.day(); d.walkMin = (d.walkMin || 0) + m; st.walks = st.walks || []; st.walks.push({ date: S.dayKey(), min: m });
    S.save(); G.award(`walk_${st.walks.length}`, 10 + m, ev); if (!d.checks.outdoors) G.setEssential('outdoors', true, ev); checkWalkLevel(); rerender();
    UI.undoToast(`Walk logged · ${d.walkMin} min today`, () => { d.walkMin = Math.max(0, d.walkMin - m); st.walks.pop(); S.save(); rerender(); }, 4000);
  });
}

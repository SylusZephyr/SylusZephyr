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

export function render() {
  const st = S.get(); const d = S.day(); const wk = pfWeek(); const ph = pfPhase(wk);
  const todayN = d.pf || 0; const counts = weekCounts();
  const cleared = st.medical.exerciseCleared;
  const walkWeek = Math.min(6, Math.floor(((st.walks || []).length) / 5) + 1);
  const cardio = CARDIO.find((c) => c.w === walkWeek);
  const control = (st.pf.control || []).length;
  return `
  <div class="topbar"><div><div class="sub">12-week pelvic-floor program</div><h1>Train</h1></div><div class="hud"><div class="stat">💪 ${st.pf.sessions.length}</div></div></div>

  <div class="card glow">
    <div class="row" style="gap:16px">
      ${UI.ring(Math.min(1, todayN / 3), 104, 11, todayN >= 3 ? 'url(#gradGreen)' : 'url(#gradWarm)', `${todayN}/3`, 'today')}
      <div class="grow"><div class="kicker">Week ${wk} · ${ph.name}</div><h3>${ph.reps} × ${ph.hold}s holds</h3>
        <p class="muted small">${ph.flicks} quick flicks · ${ph.reverse} reverse Kegels<br>Position: ${ph.pos}</p></div>
    </div>
    <button class="btn primary block mt16" data-pf>▶ Start session (~${Math.ceil((ph.reps * (ph.hold + ph.rest) + ph.flicks * 2 + ph.reverse * 6 + 20) / 60)} min)</button>
    <div class="heat mt16">${counts.map((c) => `<i class="${c.n >= 3 ? 'l4' : c.n === 2 ? 'l3' : c.n === 1 ? 'l2' : ''} ${c.k === S.dayKey() ? 'today' : ''}" title="${c.k}"></i>`).join('')}</div>
    <div class="row between tiny muted mt8">${counts.map((c) => `<span style="width:14%;text-align:center">${S.prettyDate(c.k, { weekday: 'narrow' })}</span>`).join('')}</div>
  </div>

  <div class="card">
    <div class="kicker">Program roadmap</div>
    ${PF_PHASES.map((p) => { const active = p.weeks.includes(wk); const done = Math.max(...p.weeks) < wk; return `<div class="row" style="padding:8px 0;opacity:${active || done ? 1 : 0.8}">
      <div class="q-ico" style="width:36px;height:36px;border-radius:10px;background:${active ? 'var(--grad-warm)' : done ? 'var(--grad-green)' : 'var(--surface3)'};display:flex;align-items:center;justify-content:center">${done ? '✓' : active ? '▶' : '🔒'}</div>
      <div class="grow"><b>${p.name}</b> <span class="muted small">weeks ${p.weeks[0]}–${p.weeks.at(-1)}</span><div class="muted small">${p.reps}×${p.hold}s hold · ${p.flicks} flicks · ${p.pos}</div></div></div>`; }).join('')}
    <div class="row between mt8"><span class="small muted">Adjust week</span><div class="row"><button class="btn sm" data-wk="-1">−</button><b>${wk}</b><button class="btn sm" data-wk="1">+</button></div></div>
  </div>

  <div class="grid2">
    <button class="card" style="margin:0;text-align:left" data-breath><div class="kicker">🌬️ Breathing</div><b>2-min calm</b><div class="muted small">In 4 · out 6. Lowers arousal & stress.</div></button>
    <button class="card" style="margin:0;text-align:left" data-control><div class="kicker">🌊 Control practice</div><b>${control} logged</b><div class="muted small">Stop–start (private)</div></button>
  </div>

  <div class="section-title">Activity</div>
  ${cleared ? `<div class="card">
      <div class="kicker">Cleared for exercise ✅ · Level ${walkWeek}</div><h3>${cardio.min} min · ${UI.esc(cardio.t)}</h3>
      <p class="muted small">Stop immediately if you get chest pain, pressure, dizziness or unusual breathlessness.</p>
      <div class="grid3 mt12">${[10, 20, 30].map((m) => `<button class="btn sm" data-walk="${m}">+${m} min</button>`).join('')}</div></div>`
    : `<div class="card danger">
      <div class="kicker">Exercise locked 🔒</div><h3>Gentle walking only</h3>
      <p class="muted small">You reported chest pain, breathlessness or dizziness on exertion and your doctor visit was brief. Until a doctor clears you, stick to easy walks at a pace where you can talk. Mark yourself cleared in <a href="#me/medical">Me → Medical</a>.</p>
      <div class="grid3 mt12">${[5, 10, 15].map((m) => `<button class="btn sm" data-walk="${m}">+${m} min walk</button>`).join('')}</div>
      <p class="tiny muted mt8">Stop and seek help (120) for: ${RED_FLAGS.slice(0, 3).join(' · ').toLowerCase()}.</p></div>`}

  <div class="section-title">Learn</div>
  ${PF_EDU.map((e, i) => `<details class="card tight"><summary class="row" style="list-style:none;cursor:pointer"><span style="font-size:22px">${e.e}</span><b class="grow">${UI.esc(e.t)}</b><span class="faint">${UI.ICON.chev.replace('<svg', '<svg width="18" height="18"')}</span></summary><p class="muted small mt8" style="line-height:1.55">${UI.esc(e.b)}</p></details>`).join('')}
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
    <div class="orb-wrap"><div class="orb" id="orb"><div class="count" id="tr-count"></div></div></div>
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
        G.award(`pf_${d.pf}`, 30, null); G.evaluateQuests(); G.checkBadges();
        if (d.pf === 3) await UI.celebrate({ big: '💪', title: '3/3 sessions today!', body: 'Daily training target hit. This is how control is built.', rarity: 'DAILY TARGET' });
        else UI.toast(`Session ${d.pf}/3 done`, '💪');
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
  UI.openSheet(`<h2>🌊 Control practice</h2>
    <p class="muted small">Solo stop–start practice: build arousal to ~7/10, stop and breathe slowly until it drops to ~4, then resume. Aim for 3–4 cycles. See “Stop–start technique” in Learn.</p>
    <div class="field"><label>Cycles completed</label>${UI.scaleButtons('cyc', 5, null, ['1', '2', '3', '4', '5+'])}</div>
    <div class="field"><label>How much control did you feel?</label>${UI.scaleButtons('ctl', 5, null, ['😣', '😕', '😐', '🙂', '😎'], true)}</div>
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
    S.save(); G.award(`walk_${st.walks.length}`, 10 + m, ev); if (!d.checks.outdoors) G.setEssential('outdoors', true, ev); G.evaluateQuests(); rerender();
  });
}

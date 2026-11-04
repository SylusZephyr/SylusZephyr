// Small UI helpers: escaping, icons, sheets, toasts, confetti, haptic-ish feedback.
import * as S from './store.js';
import * as Native from './native.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const svg = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;
export const ICON = {
  home: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  cook: svg('<path d="M6 13.9A4 4 0 0 1 7 6a5 5 0 0 1 10 0 4 4 0 0 1 1 7.9V20H6z"/><path d="M6 17h12"/>'),
  train: svg('<path d="M6.5 6.5l11 11"/><path d="M21 21l-1-1"/><path d="M3 3l1 1"/><path d="M18 22l4-4"/><path d="M2 6l4-4"/><path d="M3 10l7-7"/><path d="M14 21l7-7"/>'),
  track: svg('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
  me: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  check: svg('<path d="M5 12l5 5L20 7"/>', 'stroke-width="3"'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  close: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'),
  heartFill: svg('<path fill="currentColor" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'),
  bookmark: svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
  bookmarkFill: svg('<path fill="currentColor" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
  share: svg('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>'),
  play: svg('<path fill="currentColor" d="M6 4l14 8-14 8z"/>'),
  pause: svg('<path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  face: svg('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9v1M15 9v1M12 9v4h-1M9 16c1.5 1 4.5 1 6 0"/>'),
  chev: svg('<path d="M9 18l6-6-6-6"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
};

// ---------- feedback ----------
export function haptic(ms = 12) {
  try {
    if (!S.get().settings.haptics) return;
    if (Native.haptic(ms >= 300 ? 'success' : ms >= 40 ? 'medium' : 'light')) return; if (S.get().settings.haptics && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) {}
}
let audioCtx = null;
export function ding(kind = 'tick') {
  try {
    if (!S.get().settings.sounds) return;
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const notes = { tick: [880], xp: [660, 990], level: [523, 659, 784, 1047], loot: [784, 988, 1175, 1568], soft: [440] }[kind] || [880];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.25);
      o.connect(g).connect(audioCtx.destination); o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.3);
    });
  } catch (e) {}
}

const toastQueue = [];
let toastActive = 0;
export function toast(msg, icon = '✨') {
  toastQueue.push([msg, icon]); pumpToasts();
}
function pumpToasts() {
  const root = $('#toast-root'); if (!root) return;
  while (toastActive < 2 && toastQueue.length) {
    const [msg, icon] = toastQueue.shift(); toastActive++;
    const el = document.createElement('div'); el.className = 'toast';
    el.innerHTML = `<span style="font-size:18px">${icon}</span><span>${esc(msg)}</span>`;
    root.appendChild(el);
    setTimeout(() => { el.remove(); toastActive--; pumpToasts(); }, 2700);
  }
}
// A toast with an Undo button. Calls onUndo if tapped within `ms`.
export function undoToast(msg, onUndo, ms = 5000) {
  const root = $('#toast-root'); if (!root) return;
  const el = document.createElement('div'); el.className = 'toast undo';
  el.innerHTML = `<span>${esc(msg)}</span><button class="undo-btn" type="button">Undo</button>`;
  root.appendChild(el);
  let done = false;
  const finish = () => { if (!done) { done = true; el.remove(); } };
  el.querySelector('.undo-btn').addEventListener('click', () => { if (done) return; onUndo(); finish(); });
  setTimeout(finish, ms);
}

export function xpPop(amount, x, y) {
  const el = document.createElement('div'); el.className = 'xp-pop';
  el.textContent = `+${amount} XP`;
  el.style.left = `${Number.isFinite(x) ? x : window.innerWidth / 2}px`; el.style.top = `${(Number.isFinite(y) ? y : window.innerHeight / 2) - 20}px`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1150);
}

// ---------- confetti ----------
let confettiParts = [];
let confettiRunning = false;
export function confetti(n = 90, originY = 0.35) {
  const c = $('#confetti'); if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  c.width = window.innerWidth * dpr; c.height = window.innerHeight * dpr;
  const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#ffb547', '#ff6b6b', '#34d399', '#5aa9ff', '#a78bfa', '#f472b6'];
  for (let i = 0; i < n; i++) {
    confettiParts.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 80, y: window.innerHeight * originY,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 3,
      c: colors[(Math.random() * colors.length) | 0], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, life: 0,
    });
  }
  if (confettiRunning) return; confettiRunning = true;
  const tick = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    confettiParts.forEach((p) => {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); ctx.restore();
    });
    confettiParts = confettiParts.filter((p) => p.y < window.innerHeight + 40 && p.life < 240);
    if (confettiParts.length) requestAnimationFrame(tick); else { confettiRunning = false; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  };
  requestAnimationFrame(tick);
}

// ---------- overlays ----------
let sheetStack = [];
export function openSheet(html, { onMount, onClose, cls = '' } = {}) {
  const root = $('#overlay-root');
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet ${cls}" role="dialog"><div class="grabber"></div>${html}</div>`;
  root.appendChild(wrap);
  const close = () => { if (!wrap.isConnected) return; wrap.remove(); sheetStack = sheetStack.filter((s) => s !== close); onClose && onClose(); };
  wrap.querySelector('.sheet-backdrop').addEventListener('click', close);
  // swipe down to close
  const sh = wrap.querySelector('.sheet'); let sy = null;
  sh.addEventListener('touchstart', (e) => { if (sh.scrollTop <= 0) sy = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener('touchmove', (e) => { if (sy == null) return; const dy = e.touches[0].clientY - sy; if (dy > 0) sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
  sh.addEventListener('touchend', (e) => { if (sy == null) return; const dy = (e.changedTouches[0].clientY - sy); sy = null; if (dy > 110) close(); else sh.style.transform = ''; });
  sheetStack.push(close);
  onMount && onMount(sh, close);
  return close;
}
export function closeAllSheets() { [...sheetStack].forEach((c) => c()); }

export function fullscreen(html, { onMount, cls = '' } = {}) {
  const root = $('#overlay-root');
  const wrap = document.createElement('div'); wrap.className = cls; wrap.innerHTML = html;
  root.appendChild(wrap);
  const close = () => wrap.remove();
  onMount && onMount(wrap, close);
  return close;
}

export function celebrate({ big, title, body, rarity, color = 'var(--amber)', btn = 'Collect' }) {
  ding('level'); haptic(30); confetti(140, 0.3);
  return new Promise((resolve) => {
    fullscreen(`<div class="celebrate"><div class="box">
      ${rarity ? `<div class="rarity" style="color:${color}">${esc(rarity)}</div>` : ''}
      <div class="big">${big}</div><h2>${esc(title)}</h2><p class="muted">${body}</p>
      <button class="btn primary block mt16" data-close>${esc(btn)}</button></div></div>`, {
      onMount: (w, close) => w.querySelector('[data-close]').addEventListener('click', () => { close(); resolve(); }),
    });
  });
}

export function confirmSheet(title, body, okLabel = 'OK', danger = false) {
  return new Promise((resolve) => {
    let done = false;
    openSheet(`<h2>${esc(title)}</h2><p class="muted mt8">${body}</p>
      <div class="grid2 mt16"><button class="btn" data-no>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(okLabel)}</button></div>`, {
      onMount: (sh, close) => {
        sh.querySelector('[data-no]').onclick = () => { done = true; close(); resolve(false); };
        sh.querySelector('[data-yes]').onclick = () => { done = true; close(); resolve(true); };
      },
      onClose: () => { if (!done) resolve(false); },
    });
  });
}

// ---------- svg ring ----------
export function ring(pct, size = 120, stroke = 12, color = 'url(#gradWarm)', label = '', sub = '') {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const off = c * (1 - Math.max(0, Math.min(1, pct)));
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
      <defs><linearGradient id="gradWarm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb547"/><stop offset="1" stop-color="#ff6b6b"/></linearGradient>
      <linearGradient id="gradCool" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5aa9ff"/><stop offset="1" stop-color="#a78bfa"/></linearGradient>
      <linearGradient id="gradGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#5aa9ff"/></linearGradient></defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--surface3)" stroke-width="${stroke}" fill="none"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .8s cubic-bezier(.2,.9,.3,1)"/>
    </svg><div class="center"><b>${label}</b><span>${sub}</span></div></div>`;
}

export const grad = (bg) => `background:linear-gradient(135deg, ${bg[0]}, ${bg[1]})`;

export function scaleButtons(name, n, current, labels = null, emoji = false) {
  return `<div class="scale ${emoji ? 'emoji-scale' : ''}" data-scale="${name}">${Array.from({ length: n }, (_, i) =>
    `<button data-v="${i}" class="${current === i ? 'on' : ''}">${labels ? labels[i] : i + 1}</button>`).join('')}</div>`;
}

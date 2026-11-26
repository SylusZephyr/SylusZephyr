// Small UI helpers: escaping, icons, sheets, toasts and haptic feedback.
import * as S from './store.js';
import * as Native from './native.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** @type {(sel: string, root?: ParentNode) => HTMLElement | null} */
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
  drop: svg('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  cup: svg('<path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3v2M12 3v2"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  meal: svg('<path d="M7 3v8a2 2 0 0 0 2 2v8"/><path d="M11 3v8a2 2 0 0 1-2 2"/><path d="M17 21V3c-2 1-3 3.5-3 7s1 4 3 4"/>'),
  flame: svg('<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-1.5-2-1.5-3C7 10 6 12.5 6 15a6 6 0 0 0 6 6z"/>'),
  mood: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
  scale: svg('<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M8.5 10a4.5 4.5 0 0 1 7 0"/><path d="M12 10l1.5-2"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  bed: svg('<path d="M3 18V7"/><path d="M3 14h18v4"/><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>'),
  pulse: svg('<path d="M3 12h4l2-6 4 12 2-6h6"/>'),
  crescent: svg('<path d="M15.5 4.5a8 8 0 1 0 4 10 6.5 6.5 0 1 1-4-10z"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>'),
  doctor: svg('<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>'),
  phone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  star: svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', 'stroke-width="1.6"'),
  sliders: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  refresh: svg('<path d="M20 11a8 8 0 0 0-14.9-3.5L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.9 3.5L20 15"/><path d="M20 20v-5h-5"/>'),
  bag: svg('<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  barcode: svg('<path d="M4 6v12M7 6v12M10 6v12M14 6v12M17 6v12M20 6v12"/>', 'stroke-width="1.6"'),
  cart: svg('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.4 11h11.2L21 8H6.2"/>'),
  pantry: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 12h16M10 7.5h4M10 16.5h4"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
};

// ---------- emoji-free chrome ----------
// Content still carries emoji in places (data files, older copy). Interface text should not:
// this pass swaps known ones for line icons and drops the rest, so the look stays consistent.
const EMOJI = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u20E3|\p{Emoji_Modifier}|\u200D(?:\p{Extended_Pictographic}))*\s?/gu;
const ICON_FOR = { '🩺': 'doctor', '🖨️': 'list', '⏰': 'clock', '🕌': 'crescent', '🔖': 'bookmark', '📲': 'share', '⚙️': 'gear', '👤': 'me', '☁️': 'me', '🔒': 'lock', '📷': 'share', '💧': 'drop', '☕': 'cup', '🌙': 'moon', '🍽️': 'meal', '🍳': 'meal', '🌯': 'meal', '🍛': 'meal', '🥤': 'cup', '🧪': 'pulse', '⚖️': 'scale', '🔍': 'search', '🛒': 'cart', '🧺': 'pantry', '✏️': 'edit', '🗑️': 'trash', '📤': 'share', '❤️': 'heartFill', '🤍': 'heart' };
const SKIP = '.thumb, .hero, .hero-lg, .rcard .hero, .dthumb, input, textarea, .celebrate .big, .lock';
export function stripEmoji(root) {
  if (!root) return;
  root.querySelectorAll('.li-ico, .q-ico, .icon-btn').forEach((el) => {
    if (el.querySelector('svg') || el.style.background) return;
    const t = el.textContent.trim(); if (!t) return;
    const name = ICON_FOR[t] || ICON_FOR[t.replace('\uFE0F', '')];
    if (name && ICON[name]) el.innerHTML = ICON[name]; else if (!el.classList.contains('icon-btn')) el.remove();
  });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    if (!EMOJI.test(n.nodeValue)) continue; EMOJI.lastIndex = 0;
    if (n.parentElement?.closest(SKIP)) continue;
    n.nodeValue = n.nodeValue.replace(EMOJI, '').replace(/^\s+(?=\S)/, (m) => (n.previousSibling ? m : ''));
  }
}

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
export function toast(msg, icon) {
  msg = String(msg).replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim();
  // The same message twice in a row (a double tap, a repeated save) shows once.
  if (toastQueue.some((q) => q[0] === msg) || [...document.querySelectorAll('#toast-root .toast')].some((t) => t.dataset.msg === msg)) return;
  toastQueue.push([msg, icon]); pumpToasts();
}
function pumpToasts() {
  const root = $('#toast-root'); if (!root) return;
  while (toastActive < 2 && toastQueue.length) {
    const [msg] = toastQueue.shift(); toastActive++;
    const el = document.createElement('div'); el.className = 'toast'; el.dataset.msg = msg;
    el.innerHTML = `<span>${esc(msg)}</span>`;
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

// ---------- overlays ----------
let sheetStack = [];
/**
 * Bottom sheet. Returns a function that closes it.
 * @param {string} html
 * @param {{ onMount?: (sheet: HTMLElement, close: () => void) => void, onClose?: () => void, cls?: string }} [opts]
 */
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
  stripEmoji(sh);
  return close;
}
export function closeAllSheets() { [...sheetStack].forEach((c) => c()); }

/**
 * Full-screen overlay (cook mode, trainer). Returns a function that closes it.
 * @param {string} html
 * @param {{ onMount?: (wrap: HTMLElement, close: () => void) => void, cls?: string }} [opts]
 */
export function fullscreen(html, { onMount, cls = '' } = {}) {
  const root = $('#overlay-root');
  const wrap = document.createElement('div'); wrap.className = cls; wrap.innerHTML = html;
  root.appendChild(wrap);
  const close = () => wrap.remove();
  onMount && onMount(wrap, close);
  return close;
}

/** @param {{ big?: string, title: string, body?: string, rarity?: string, color?: string, btn?: string }} opts */
export function celebrate({ big, title, body, rarity, color = 'var(--muted)', btn = 'Continue' }) {
  haptic(20);
  return new Promise((resolve) => {
    fullscreen(`<div class="celebrate"><div class="box">
      ${rarity ? `<div class="rarity" style="color:${color}">${esc(rarity)}</div>` : ''}
      ${big ? `<div class="big">${big}</div>` : ''}<h2>${esc(title)}</h2><p class="muted">${body}</p>
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
      <defs><linearGradient id="gradWarm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--a1)"/><stop offset="1" style="stop-color:var(--a2)"/></linearGradient>
      <linearGradient id="gradCool" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5aa9ff"/><stop offset="1" stop-color="#a78bfa"/></linearGradient>
      <linearGradient id="gradGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#5aa9ff"/></linearGradient></defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--surface3)" stroke-width="${stroke}" fill="none"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .8s cubic-bezier(.2,.9,.3,1)"/>
    </svg><div class="center"><b>${label}</b><span>${sub}</span></div></div>`;
}

export const grad = (bg) => `background:linear-gradient(135deg, ${bg[0]}, ${bg[1]})`;

// Rating rows. Face-emoji scales became plain 1–5 buttons with words at each end.
const SCALE_ENDS = { energy: ['Drained', 'Full of energy'], mood: ['Low', 'Great'], appetite: ['No appetite', 'Very hungry'], q: ['Poor', 'Great'], ctl: ['No control', 'Full control'] };
export function scaleButtons(name, n, current, labels = null, emoji = false) {
  const ends = emoji ? SCALE_ENDS[name] : null;
  return `<div class="scale" data-scale="${name}">${Array.from({ length: n }, (_, i) =>
    `<button data-v="${i}" class="${current === i ? 'on' : ''}" aria-label="${i + 1} of ${n}${ends && i === 0 ? ', ' + ends[0] : ends && i === n - 1 ? ', ' + ends[1] : ''}">${labels && !emoji ? labels[i] : i + 1}</button>`).join('')}</div>${ends ? `<div class="row between tiny muted" style="margin-top:6px"><span>${ends[0]}</span><span>${ends[1]}</span></div>` : ''}`;
}

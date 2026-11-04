import * as S from './store.js';
import * as UI from './ui.js';
import * as G from './gamify.js';
import * as Lock from './lock.js';
import { inWindDown, isAfterCutoff } from './plan.js';
import * as Today from './views/today.js';
import * as Cook from './views/cook.js';
import * as Train from './views/train.js';
import * as Track from './views/track.js';
import * as Me from './views/me.js';
import * as Onboard from './views/onboard.js';
import * as Native from './native.js';
import { reminderList } from './ics.js';
import * as Cloud from './cloud.js';
import { applyRemoteContent } from './content.js';

await Native.restoreStorage();
S.load();
S.setPersistHook((json) => { Native.persist(json); Cloud.schedulePush(); });
Native.initChrome();
applyRemoteContent();
window.addEventListener('revive:content', () => { if (applyRemoteContent()) render({ keepScroll: true }); });
window.addEventListener('revive:remote-update', () => { if (!document.querySelector('.sheet, .cookmode, .trainer')) render({ keepScroll: true }); UI.toast('Synced from your other device', '🔄'); });

const TABS = [
  { id: 'today', label: 'Today', icon: UI.ICON.home, view: Today },
  { id: 'cook', label: 'Cook', icon: UI.ICON.cook, view: Cook },
  { id: 'train', label: 'Train', icon: UI.ICON.train, view: Train },
  { id: 'track', label: 'Track', icon: UI.ICON.track, view: Track },
  { id: 'me', label: 'Me', icon: UI.ICON.me, view: Me },
];

export function route() {
  const h = (location.hash || '#today').slice(1).split('/');
  return { tab: TABS.find((t) => t.id === h[0]) ? h[0] : 'today', parts: h.slice(1) };
}
export function go(hash) { if (location.hash === '#' + hash) render(); else location.hash = hash; }

let lastScroll = {};
export function render({ keepScroll = false } = {}) {
  const app = UI.$('#app');
  const st = S.get();
  if (!st.onboarded) { app.innerHTML = Onboard.render(); Onboard.bind(app, () => { render(); }); return; }
  const r = route();
  const tab = TABS.find((t) => t.id === r.tab);
  const y = window.scrollY;
  const nightMode = inWindDown();
  document.body.classList.toggle('night', nightMode);
  app.innerHTML = `<main class="screen" id="screen">${tab.view.render(r.parts, { night: nightMode })}</main>
    <nav class="tabbar"><div class="brand"><span>🔥</span>Revive</div>${TABS.map((t, i) => `<a class="tab ${t.id === r.tab ? 'active' : ''}" href="#${t.id}" aria-label="${t.label}">${t.icon}<span>${t.label}</span>${IS_DESKTOP ? `<kbd>${i + 1}</kbd>` : ''}</a>`).join('')}${IS_DESKTOP ? '<div class="side-foot">Private · stored only on this PC<br>Keys: 1–5 tabs · Esc closes</div>' : ''}</nav>`;
  tab.view.bind && tab.view.bind(UI.$('#screen'), r.parts, { rerender: () => render({ keepScroll: true }) });
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, lastScroll[location.hash] || 0);
}

window.addEventListener('scroll', () => { lastScroll[location.hash] = window.scrollY; }, { passive: true });
window.addEventListener('hashchange', () => { UI.closeAllSheets(); render(); });

// End-of-day bookkeeping: auto-credit 'no coffee after cutoff' if true, finish quests.
function closeDay(k) {
  const d = S.get().days[k];
  if (d && !d.checks.caffeine && !d.coffee.some((c) => isAfterCutoff(c)) && G.essentialsDone(k) > 0) {
    d.checks.caffeine = true; G.award('ess_caffeine', 10, null, { k, silent: true });
  }
  G.evaluateQuests(k, true, true); S.save();
}
// Close any past days not yet closed (app wasn't open at rollover).
function closePastDays() {
  const st = S.get(); st.closedDays = st.closedDays || {};
  for (let i = 1; i <= 7; i++) { const k = S.addDays(S.dayKey(), -i); if (st.days[k] && !st.closedDays[k]) { closeDay(k); st.closedDays[k] = true; } }
  S.save();
}

// Re-render when the day rolls over or the app comes back to foreground.
let lastDay = S.dayKey();
function onForeground() {
  if (S.dayKey() !== lastDay) { closeDay(lastDay); lastDay = S.dayKey(); }
  closePastDays();
  const frozen = G.applyFreezeIfNeeded();
  if (frozen) UI.toast('Streak freeze used for yesterday ❄️ — streak saved!', '🧊');
  G.updateBestStreak();
  G.evaluateQuests();
  G.dailyOpen();
  render({ keepScroll: true });
  G.maybeWeeklyReview();
  syncReminders();
}

// Native: keep daily notifications in step with the (shifting) sleep plan — once a day.
export async function syncReminders(force = false) {
  const st = S.get();
  if (!Native.isNative || !st.onboarded || !st.nativeReminders) return;
  if (!force && st.remindersSyncedFor === S.dayKey()) return;
  st.reminderPrefs = st.reminderPrefs || {};
  const ROUTE = { breakfast: 'cook', lunch: 'cook', dinner: 'cook', snack: 'cook', prep: 'cook/r/overnight_oats', kegel1: 'train', kegel2: 'train', bed: 'today', winddown: 'today' };
  const n = await Native.scheduleReminders(reminderList().map((r) => ({ ...r, route: ROUTE[r.id] || 'today', on: st.reminderPrefs[r.id] ?? r.on })));
  st.remindersSyncedFor = S.dayKey(); S.save();
  return n;
}
window.__syncReminders = syncReminders;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { S.saveNow(); hiddenAt = Date.now(); }
  else {
    // Re-lock after 60s in the background
    if (S.get().lock.enabled && Date.now() - hiddenAt > 60_000) { Lock.lockNow(); Lock.showLock(onForeground); }
    else onForeground();
  }
});
let hiddenAt = Date.now();
setInterval(() => { if (document.visibilityState === 'visible' && S.dayKey() !== lastDay) onForeground(); }, 60_000);

// Keyboard (PC): 1–5 switch tabs, Esc closes sheets/overlays.
const IS_DESKTOP = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
  const lock = document.querySelector('.lock .keypad');
  if (lock) {
    if (/^[0-9]$/.test(e.key)) lock.querySelector(`[data-k="${e.key}"]`)?.click();
    if (e.key === 'Backspace') lock.querySelector('[data-del]')?.click();
    return;
  }
  const pinSheet = document.querySelector('.sheet .keypad');
  if (pinSheet) { if (/^[0-9]$/.test(e.key)) pinSheet.querySelector(`[data-k="${e.key}"]`)?.click(); if (e.key === 'Backspace') pinSheet.querySelector('[data-del]')?.click(); }
  if (e.key === 'Escape') {
    const fs = document.querySelector('.celebrate [data-close], .story-viewer [data-x], .cookmode [data-x], .trainer [data-x]');
    if (fs) fs.click(); else UI.closeAllSheets();
    return;
  }
  if (!document.querySelector('#overlay-root > *') && /^[1-5]$/.test(e.key)) location.hash = TABS[+e.key - 1].id;
});

// PC/Android install prompt (Edge/Chrome): keep the event so "Install" can trigger it.
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; window.__canInstall = true; if (location.hash.startsWith('#me')) render({ keepScroll: true }); });
window.addEventListener('appinstalled', () => { deferredInstall = null; window.__canInstall = false; UI.toast('Revive installed on this PC', '🖥️'); });
export async function promptInstall() {
  if (!deferredInstall) return false;
  deferredInstall.prompt(); const r = await deferredInstall.userChoice.catch(() => null); deferredInstall = null; window.__canInstall = false;
  return r?.outcome === 'accepted';
}
window.__promptInstall = promptInstall;

// Environment hints: WeChat's in-app browser can't install or keep data reliably.
const UA = navigator.userAgent || '';
const IN_WECHAT = !Native.isNative && /MicroMessenger/i.test(UA);
const IS_STANDALONE = window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
const IS_IOS = /iPhone|iPad|iPod/.test(UA);
function wechatGate() {
  UI.fullscreen(`<div class="lock" style="z-index:600;text-align:center">
    <div class="logo">🧭</div><h2>Open in Safari</h2>
    <p class="muted" style="max-width:320px">WeChat’s browser can’t install Revive or keep your data safely.<br><br>Tap <b>···</b> (top right) → <b>Open in Browser / 在浏览器打开</b>, then in Safari: Share → <b>Add to Home Screen</b>.</p>
  </div>`);
}
export function installHintNeeded() { return IS_IOS && !IS_STANDALONE && !IN_WECHAT; }

// Boot
function boot() {
  if (IN_WECHAT) { wechatGate(); return; }
  Lock.showLock(() => {
    if (S.get().onboarded) { closePastDays(); G.applyFreezeIfNeeded(); G.updateBestStreak(); G.evaluateQuests(); G.dailyOpen(); }
    render();
    if (S.get().onboarded) setTimeout(() => G.maybeWeeklyReview(), 900);
  });
  S.requestPersist();
  Cloud.init();
  if (Native.isNative) {
    Native.onNotificationTap((route) => { location.hash = route; });
    syncReminders();
    Native.onBackButton(() => {
      const close = document.querySelector('.celebrate [data-close], .story-viewer [data-x], .cookmode [data-x], .trainer [data-x]');
      if (close) { close.click(); return; }
      if (document.querySelector('.sheet')) { UI.closeAllSheets(); return; }
      if (document.querySelector('.lock')) { Native.exitApp(); return; }
      const h = (location.hash || '#today').slice(1);
      if (h.includes('/')) history.back();
      else if (h !== 'today') location.hash = 'today';
      else Native.exitApp();
    });
  }
  if (!Native.isNative && 'serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) UI.toast('Update ready — reopen the app to refresh', '⬆️'); });
      });
    }).catch(() => {});
  }
}
boot();

// expose for debugging / tests
window.__revive = { S, G, render, go };

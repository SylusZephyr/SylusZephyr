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

S.load();

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
    <nav class="tabbar">${TABS.map((t) => `<a class="tab ${t.id === r.tab ? 'active' : ''}" href="#${t.id}" aria-label="${t.label}">${t.icon}<span>${t.label}</span></a>`).join('')}</nav>`;
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
  G.evaluateQuests(k, true); S.save();
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
}
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

// Boot
function boot() {
  Lock.showLock(() => {
    if (S.get().onboarded) { closePastDays(); G.applyFreezeIfNeeded(); G.updateBestStreak(); G.evaluateQuests(); G.dailyOpen(); }
    render();
    if (S.get().onboarded) setTimeout(() => G.maybeWeeklyReview(), 900);
  });
  S.requestPersist();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
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

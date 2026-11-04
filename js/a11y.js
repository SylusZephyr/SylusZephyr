// Accessibility layer applied to everything the app renders: names for icon-only controls,
// states for toggles/checkboxes/chips, label↔input links, dialog semantics and focus handling.
// Runs on every DOM change, so new screens and sheets are covered automatically.

const ICON_NAMES = {
  'data-like': 'Like', 'data-save': 'Save card', 'data-fav': 'Favourite', 'data-x': 'Close', 'data-del': 'Delete last digit',
  'data-delmeal': 'Delete meal', 'data-delw': 'Delete weigh-in', 'data-dellab': 'Delete result', 'data-delvisit': 'Delete visit',
  'data-delq': 'Delete question', 'data-p': 'Pause or resume', 'data-face': 'Unlock with Face ID', 'data-swap': 'Swap meal',
  'data-tr': 'Reset timer',
};

const textOf = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

function nameControl(el) {
  if (el.getAttribute('aria-label') || textOf(el)) return;
  for (const [attr, name] of Object.entries(ICON_NAMES)) if (el.hasAttribute(attr)) { el.setAttribute('aria-label', name); return; }
  if (el.classList.contains('back') || (el.tagName === 'A' && el.classList.contains('icon-btn') && el.querySelector('svg'))) { el.setAttribute('aria-label', 'Back'); return; }
  if (el.classList.contains('fav')) { el.setAttribute('aria-label', 'Favourite'); return; }
  // Fall back to the row's title, e.g. a toggle next to "Wind-down mode"
  const row = el.closest('.list-item, .row, .field');
  const label = row && textOf(row.querySelector('b, label'));
  if (label) el.setAttribute('aria-label', label);
}

export function enhance(root = document) {
  // Icon-only buttons and links
  root.querySelectorAll('button, a[href]').forEach(nameControl);

  // Toggle switches
  root.querySelectorAll('button.toggle').forEach((t) => {
    t.setAttribute('role', 'switch');
    t.setAttribute('aria-checked', String(t.classList.contains('on')));
  });

  // Checklist rows and the boxes inside them
  root.querySelectorAll('.check').forEach((c) => {
    const box = c.matches('button') ? c : c.querySelector('button.box');
    if (!box) return;
    box.setAttribute('role', 'checkbox');
    box.setAttribute('aria-checked', String(c.classList.contains('done')));
    if (!box.getAttribute('aria-label') && !c.matches('button')) box.setAttribute('aria-label', textOf(c.querySelector('.label')) || 'Done');
  });

  // Chips, segmented controls and rating scales are toggle buttons
  root.querySelectorAll('.chip, .seg button, .scale button').forEach((b) => {
    if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.classList.contains('on')));
  });
  root.querySelectorAll('.scale.emoji-scale').forEach((sc) => {
    const label = textOf(sc.closest('.field')?.querySelector('label'));
    sc.setAttribute('role', 'group'); if (label) sc.setAttribute('aria-label', label);
    sc.querySelectorAll('button').forEach((b, i, all) => { if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', `${label || 'Rating'} ${i + 1} of ${all.length}`); });
  });

  // Form fields: tie each label to its control
  root.querySelectorAll('.field').forEach((f) => {
    const label = f.querySelector(':scope > label'); const input = f.querySelector('input, select, textarea');
    if (!label || !input) return;
    if (input.id) label.htmlFor = input.id; else if (!input.getAttribute('aria-label')) input.setAttribute('aria-label', textOf(label));
  });
  root.querySelectorAll('input[placeholder]:not([aria-label]):not([id])').forEach((i) => i.setAttribute('aria-label', i.placeholder));

  // Progress bars
  root.querySelectorAll('.lvlbar').forEach((bar) => {
    const w = parseFloat(bar.querySelector('i')?.style.width) || 0;
    const ctx = bar.closest('.card, .hero-level, .hero-today'); const name = textOf(ctx?.querySelector('b, .kicker, h3')) || 'Progress';
    bar.setAttribute('aria-label', name.slice(0, 60));
    bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', String(Math.round(w)));
  });

  // Decorative emoji next to text shouldn't be read twice
  root.querySelectorAll('.emoji, .q-ico, .li-ico, .n-e, .ob-badge, .chest, .big').forEach((e) => e.setAttribute('aria-hidden', 'true'));

  // Dialogs
  root.querySelectorAll('.sheet, .celebrate .box, .story-viewer, .cookmode, .trainer, .lock').forEach((d) => {
    if (d.getAttribute('role') === 'dialog') return;
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    const title = textOf(d.querySelector('h1, h2, h3')); if (title) d.setAttribute('aria-label', title);
    if (!d.hasAttribute('tabindex')) d.setAttribute('tabindex', '-1');
    lastFocus = document.activeElement;
    setTimeout(() => { const first = d.querySelector('input, textarea, select, button.primary, button'); (first || d).focus({ preventScroll: true }); }, 60);
  });
}

let lastFocus = null;
let scheduled = false;
export function start() {
  const toasts = document.getElementById('toast-root');
  if (toasts) { toasts.setAttribute('role', 'status'); toasts.setAttribute('aria-live', 'polite'); }
  document.querySelector('nav.tabbar')?.setAttribute('aria-label', 'Main');
  const run = () => { scheduled = false; enhance(document); document.querySelector('nav.tabbar')?.setAttribute('aria-label', 'Main'); document.querySelectorAll('.tab.active').forEach((t) => t.setAttribute('aria-current', 'page')); };
  new MutationObserver((muts) => {
    // When a dialog closes, give focus back to whatever opened it.
    for (const m of muts) for (const n of m.removedNodes) if (n.nodeType === 1 && n.querySelector?.('[role="dialog"]') && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    if (!scheduled) { scheduled = true; requestAnimationFrame(run); }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  run();

  // Keep keyboard focus inside an open dialog
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const dialogs = document.querySelectorAll('[role="dialog"]'); const d = dialogs[dialogs.length - 1]; if (!d) return;
    const items = [...d.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

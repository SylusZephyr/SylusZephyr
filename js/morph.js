// Updates a live DOM tree to match freshly rendered HTML, touching only what changed.
// Keeping the same nodes means: no flash, images don't reload, focus and caret stay put,
// scroll position holds, and CSS transitions (rings, bars) animate between states.
//
// Matching: elements with an id or data-key are matched by that key; everything else is
// matched by position and tag name. A mismatch replaces just that node.

import { translateTree } from './i18n.js';
import { stripEmoji } from './ui.js';

// Attributes and classes the app adds at runtime (accessibility layer, image fade-in) rather than
// in templates. They survive a morph unless the new markup sets them itself.
const RUNTIME_ATTR = /^(aria-|role$|tabindex$|for$)/;
const RUNTIME_CLASS = ['loaded'];

const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') || n.id || null : null);

function syncAttributes(from, to) {
  for (const { name } of [...from.attributes]) if (!to.hasAttribute(name) && !RUNTIME_ATTR.test(name)) from.removeAttribute(name);
  for (const { name, value } of [...to.attributes]) {
    let v = value;
    if (name === 'class') for (const c of RUNTIME_CLASS) if (from.classList.contains(c) && !to.classList.contains(c)) v += ' ' + c;
    if (from.getAttribute(name) !== v) from.setAttribute(name, v);
  }
}

function syncFormState(from, to) {
  const focused = from === document.activeElement;
  if (from.tagName === 'INPUT') {
    if (from.type === 'checkbox' || from.type === 'radio') from.checked = to.hasAttribute('checked');
    else if (!focused && from.value !== (to.getAttribute('value') ?? '')) from.value = to.getAttribute('value') ?? '';
  } else if (from.tagName === 'TEXTAREA') {
    if (!focused && from.value !== to.textContent) from.value = to.textContent;
  } else if (from.tagName === 'SELECT') {
    const sel = [...to.options].find((o) => o.hasAttribute('selected'));
    if (sel && !focused) from.value = sel.value;
  }
}

function morphNode(from, to) {
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) { from.replaceWith(to); return; }
  if (from.nodeType === 3 || from.nodeType === 8) { if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue; return; }
  if (from.nodeType !== 1) return;
  syncAttributes(from, to);
  if (from.tagName === 'TEXTAREA') { syncFormState(from, to); return; }
  morphChildren(from, to);
  if (from.tagName === 'INPUT' || from.tagName === 'SELECT') syncFormState(from, to);
}

export function morphChildren(parent, target) {
  const keyed = new Map();
  for (const c of parent.childNodes) { const k = keyOf(c); if (k) keyed.set(k, c); }
  let cur = parent.firstChild;
  for (const next of [...target.childNodes]) {
    const k = keyOf(next);
    let match = null;
    if (k && keyed.has(k)) match = keyed.get(k);
    else if (cur && !keyOf(cur) && cur.nodeType === next.nodeType && cur.nodeName === next.nodeName) match = cur;
    if (match) {
      if (match !== cur) parent.insertBefore(match, cur);
      cur = match.nextSibling;
      morphNode(match, next);
    } else {
      parent.insertBefore(next, cur);
    }
  }
  while (cur) { const n = cur.nextSibling; cur.remove(); cur = n; }
}

// Morph `el`'s contents to the given HTML string.
export function morph(el, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  // Translate and clean the new markup before comparing, so unchanged text is left alone.
  stripEmoji(tpl.content); translateTree(tpl.content);
  morphChildren(el, tpl.content);
}

// Listeners a view attaches during bind() belong to that render. Before the next bind they are
// removed, so a node kept by morph never ends up with the same handler twice.
const owned = [];
export function bindScope(run) {
  for (const [node, type, fn, opts] of owned.splice(0)) node.removeEventListener(type, fn, opts);
  const original = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    owned.push([this, type, fn, opts]);
    return original.call(this, type, fn, opts);
  };
  try { run(); } finally { EventTarget.prototype.addEventListener = original; }
}

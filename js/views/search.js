// One search box for recipes, foods, tips and app screens.
import * as UI from '../ui.js';
import { RECIPES } from '../data/recipes.js';
import { ING } from '../data/ingredients.js';
import { TIPS } from '../data/content.js';
import { searchLocal } from '../nutrition.js';
import { art } from './cook.js';

const SCREENS = [
  ['Today', '#today', '🏠', 'home essentials streak'], ['Cook', '#cook', '🍳', 'recipes suggest'], ['Meal plan', '#cook/plan', '📅', 'week plan'],
  ['Shopping list', '#cook/shop', '🛒', 'groceries buy'], ['Pantry', '#cook/pantry', '🧺', 'kitchen ingredients'], ['Halal delivery', '#cook/delivery', '📦', 'meituan order takeaway'],
  ['Train', '#train', '💪', 'pelvic floor kegel exercise'], ['Track', '#track', '📈', 'progress charts'], ['Sleep', '#track', '🌙', 'bedtime wake'],
  ['Medical & follow-up', '#me/medical', '🩺', 'doctor labs tests questions'], ['Doctor summary', '#me/summary', '🖨️', 'report print pdf'],
  ['Reminders', '#me/reminders', '⏰', 'notifications alerts calendar'], ['Account & sync', '#me/account', '☁️', 'login sign in google cloud'],
  ['Badges', '#me/badges', '🏅', 'achievements'], ['Settings', '#me/settings', '⚙️', 'lock pin face privacy export'], ['Saved cards', '#me/saved', '🔖', 'bookmarks tips'],
];

const norm = (s) => (s || '').toLowerCase();
function score(hay, q) {
  const h = norm(hay); if (!q) return 0;
  if (h.startsWith(q)) return 3; if (h.includes(' ' + q)) return 2; if (h.includes(q)) return 1;
  return q.split(/\s+/).every((w) => h.includes(w)) ? 1 : 0;
}

export function results(qRaw) {
  const q = norm(qRaw).trim(); if (!q) return { screens: [], recipes: [], foods: [], tips: [] };
  const recipes = RECIPES.map((r) => ({ r, s: score(r.name, q) * 3 + score(r.tags.join(' '), q) + score(r.ing.map((i) => ING[i.id]?.name + ' ' + ING[i.id]?.zh).join(' '), q) }))
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.r);
  const screens = SCREENS.filter(([n, , , k]) => score(n + ' ' + k, q) > 0).slice(0, 4);
  const tips = TIPS.filter((t) => score(t.title + ' ' + t.body, q) > 0).slice(0, 4);
  const foods = searchLocal(q).slice(0, 4);
  return { screens, recipes, foods, tips };
}

export function open() {
  UI.openSheet(`<h2>Search</h2>
    <div class="field"><input id="gs-q" type="search" placeholder="Recipes, foods, tips, screens…" autocomplete="off" enterkeyhint="search"></div>
    <div id="gs-res" class="mt8"><p class="muted small">Try “chicken”, “breakfast”, “sleep”, “鸡蛋” or “doctor”.</p></div>`, {
    onMount: (sh, close) => {
      const q = sh.querySelector('#gs-q'); const out = sh.querySelector('#gs-res');
      const go = (hash) => { close(); location.hash = hash.replace(/^#/, ''); };
      const paint = () => {
        const r = results(q.value);
        const sec = (title, html) => html ? `<div class="kicker mt12">${title}</div>${html}` : '';
        const html =
          sec('Screens', r.screens.map(([n, h, e]) => `<button class="list-item" data-go="${h}"><div class="li-ico">${e}</div><div class="grow"><b>${UI.esc(n)}</b></div></button>`).join('')) +
          sec('Recipes', r.recipes.map((x) => { const a = art(x); return `<button class="rwide" data-go="#cook/r/${x.id}"><div class="thumb ${a.cls}" style="${a.style};width:52px;height:52px;font-size:26px">${a.emoji}</div><div class="grow" style="min-width:0"><b class="ellipsis" style="display:block">${UI.esc(x.name)}</b><span class="muted small">${x.mins} min · ${x.kcal} kcal</span></div></button>`; }).join('')) +
          sec('Foods', r.foods.map((f) => `<div class="list-item"><div class="li-ico">${f.e}</div><div class="grow"><b>${UI.esc(f.name)}</b><div class="muted small">${f.kcal100} kcal · ${f.protein100} g protein per 100 g · ${UI.esc(f.zh)}</div></div></div>`).join('')) +
          sec('Tips', r.tips.map((t) => `<div class="list-item" style="align-items:flex-start"><div class="li-ico">${t.e}</div><div class="grow"><b>${UI.esc(t.title)}</b><div class="muted small">${UI.esc(t.body)}</div></div></div>`).join(''));
        out.innerHTML = q.value.trim() ? (html || '<p class="muted small">Nothing found.</p>') : '<p class="muted small">Try “chicken”, “breakfast”, “sleep”, “鸡蛋” or “doctor”.</p>';
        out.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
      };
      q.addEventListener('input', paint);
      q.addEventListener('keydown', (e) => { if (e.key === 'Enter') out.querySelector('[data-go]')?.click(); });
      setTimeout(() => q.focus(), 80);
    },
  });
}

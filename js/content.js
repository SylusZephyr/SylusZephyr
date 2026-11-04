// Folds recipes/tips/stories published in the cloud `content` table into the bundled data.
// Cached locally, so new content keeps working offline after the first fetch.
import { RECIPES, RECIPE, DELIVERY } from './data/recipes.js';
import { TIPS, STORIES } from './data/content.js';
import { ING } from './data/ingredients.js';
import { cachedContent } from './cloud.js';

const isStr = (x) => typeof x === 'string' && x.length > 0;
const isNum = (x) => typeof x === 'number' && isFinite(x);

function validRecipe(r) {
  return r && isStr(r.id) && isStr(r.name) && Array.isArray(r.ing) && Array.isArray(r.steps) && r.steps.length
    && isNum(r.kcal) && isNum(r.protein) && Array.isArray(r.meals)
    && r.ing.every((i) => isStr(i.id) && ING[i.id]) && r.steps.every((s) => isStr(s.t));
}
const validTip = (t) => t && isStr(t.id) && isStr(t.title) && isStr(t.body);
const validStory = (s) => s && isStr(s.id) && isStr(s.label) && Array.isArray(s.slides) && s.slides.every((x) => isStr(x.title));

function upsert(list, item, map) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item; else list.push(item);
  if (map) map[item.id] = item;
}

export function applyRemoteContent() {
  const { items } = cachedContent();
  let added = 0;
  for (const row of items || []) {
    const d = { ...row.data, id: row.id };
    if (row.kind === 'recipe' && validRecipe(d)) {
      upsert(RECIPES, { fav: false, tags: [], feel: ['ok'], emoji: '🍽️', bg: ['#334155', '#0f172a'], method: 'airfryer', mins: 15, cost: 10, desc: '', remote: true, ...d }, RECIPE); added++;
    } else if (row.kind === 'tip' && validTip(d)) {
      upsert(TIPS, { e: '💡', bg: ['#1e293b', '#020617'], cat: 'New', ...d }); added++;
    } else if (row.kind === 'story' && validStory(d)) {
      upsert(STORIES, { e: '✨', ...d }); added++;
    } else if (row.kind === 'delivery' && isStr(d.name) && isNum(d.kcal)) {
      upsert(DELIVERY, { emoji: '🥡', cost: 30, protein: 25, tip: '', zh: '', ...d }); added++;
    }
  }
  return added;
}

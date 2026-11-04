// Food search: instant results from the built-in list, then live results from
// Open Food Facts (free, open database) when online. Every result is normalised to
// { name, kcal100, protein100, portionG, portionLabel }.
import { FOODS } from './data/foods.js';

const norm = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export function searchLocal(q) {
  const t = norm(q).trim(); if (!t) return [];
  const words = t.split(/\s+/);
  return FOODS.map((f) => {
    const hay = norm(f.name + ' ' + f.zh);
    let score = 0;
    if (norm(f.name).startsWith(t)) score += 50;
    if (hay.includes(t)) score += 30;
    score += words.filter((w) => hay.includes(w)).length * 10;
    return { f, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 12).map((x) => x.f);
}

const cache = new Map();
export async function searchOnline(q, { timeoutMs = 7000 } = {}) {
  const t = q.trim(); if (t.length < 2 || !navigator.onLine) return [];
  if (cache.has(t)) return cache.get(t);
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const url = 'https://world.openfoodfacts.org/cgi/search.pl?' + new URLSearchParams({
    search_terms: t, search_simple: '1', action: 'process', json: '1', page_size: '20',
    fields: 'code,product_name,product_name_en,product_name_zh,brands,nutriments,serving_quantity,serving_size,image_small_url',
  });
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const items = (data.products || []).map((p) => {
      const n = p.nutriments || {};
      const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
      const name = p.product_name_en || p.product_name || p.product_name_zh;
      if (!name || kcal == null || !isFinite(kcal)) return null;
      const serving = parseFloat(p.serving_quantity);
      return {
        id: 'off_' + p.code, name: name.trim(), brand: (p.brands || '').split(',')[0].trim(),
        kcal100: Math.round(kcal), protein100: Math.round((n.proteins_100g || 0) * 10) / 10,
        portionG: serving > 0 && serving < 2000 ? serving : 100, portionLabel: p.serving_size || '100 g',
        image: p.image_small_url || null, e: '🛒', source: 'Open Food Facts',
      };
    }).filter(Boolean);
    cache.set(t, items);
    return items;
  } catch (e) { return []; } finally { clearTimeout(timer); }
}

export function forPortion(food, grams) {
  const k = grams / 100;
  return { kcal: Math.round(food.kcal100 * k), protein: Math.round(food.protein100 * k) };
}

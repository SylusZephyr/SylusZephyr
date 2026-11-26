// Computed-style snapshot of every element across the app's main states, for CSS refactors that
// must not change what anyone sees.
//   node scripts/style-snapshot.mjs capture before.json      (app served on :8765)
//   ...refactor...
//   node scripts/style-snapshot.mjs capture after.json
//   node scripts/style-snapshot.mjs compare before.json after.json   (exit 1 on any difference)
import { chromium, devices } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8765/';
const STATES = [
  ['today'], ['cook'], ['cook/r/chicken_seekh'], ['cook/pantry'], ['cook/shop'], ['cook/plan'], ['cook/delivery'],
  ['train'], ['track'], ['me'], ['me/settings'], ['me/medical'],
  ['today', '[data-logmeal]'], ['today', '[data-drinks]'], ['cook', '[data-filters]'], ['today', '[data-search]'],
];

async function capture(file) {
  const b = await chromium.launch(); const out = {};
  for (const [label, vp] of [['phone', devices['iPhone 13']], ['desk', { viewport: { width: 1280, height: 860 } }]]) {
    const ctx = await b.newContext({ ...vp, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.clock.install({ time: new Date('2026-11-24T13:20:00') });
    await p.goto(BASE); await p.waitForTimeout(300);
    await p.evaluate(() => { const S = window.__revive.S; const st = S.get(); st.onboarded = true; st.profile.name = 'Wajid';
      st.weights = [{ date: '2026-10-20', kg: 62 }, { date: '2026-11-17', kg: 63.1 }];
      const d = S.day(); d.coffee = ['10:30']; d.waterMl = 1000; d.checks.breakfast = true; d.sleep = { bed: '02:40', wake: '10:05' };
      d.meals.push({ id: 'a', slot: 'breakfast', name: 'Egg paratha', kcal: 620, protein: 28, time: '10:40' });
      st.prayer = { enabled: true, city: 'beijing' }; S.saveNow(); });
    for (const [h, click] of STATES) {
      await p.goto(BASE + '#' + h); await p.reload(); await p.waitForTimeout(600);
      await p.evaluate(() => document.querySelectorAll('#overlay-root > *, .toast').forEach((e) => e.remove()));
      if (click) { await p.click(click).catch(() => {}); await p.waitForTimeout(500); }
      out[label + ':' + h + (click || '')] = await p.evaluate(() => {
        const res = {}; const path = (el) => { const a = []; for (let e = el; e && e !== document.body; e = e.parentElement) a.unshift(e.tagName + ':' + [...e.parentElement.children].indexOf(e)); return a.join('/'); };
        for (const el of document.body.querySelectorAll('*')) { if (el.closest('svg') && el.tagName !== 'svg') continue; const cs = getComputedStyle(el); const o = {}; for (const k of cs) if (!k.startsWith('transition') && !k.startsWith('animation')) o[k] = cs.getPropertyValue(k); o['::before'] = getComputedStyle(el, '::before').content + getComputedStyle(el, '::before').background; o['@class'] = String(el.className?.baseVal ?? el.className); res[path(el)] = o; }
        return res; });
    }
    await ctx.close();
  }
  writeFileSync(file, JSON.stringify(out)); await b.close(); console.log('states', Object.keys(out).length);
}

function compare(fa, fb) {
  const a = JSON.parse(readFileSync(fa, 'utf8')), b = JSON.parse(readFileSync(fb, 'utf8'));
  let n = 0; const seen = new Set();
  // Elements are matched by DOM position; class names may change (that is the point of a refactor).
  for (const s in a) for (const el in a[s]) {
    const x = a[s][el], y = b[s]?.[el];
    if (!y) { if (n++ < 20) console.log('missing', s, el); continue; }
    for (const k in x) if (k !== '@class' && x[k] !== y[k]) { const key = x['@class'] + ' ' + k; if (!seen.has(key) && seen.size < 60) { seen.add(key); console.log(s, '|', x['@class'], '|', k, ':', x[k], '→', y[k]); } n++; }
  }
  console.log('differences', n); return n;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'capture') await capture(args[0]);
else if (cmd === 'compare') process.exit(compare(args[0], args[1]) ? 1 : 0);
else { console.log('usage: capture OUT.json | compare A.json B.json'); process.exit(2); }

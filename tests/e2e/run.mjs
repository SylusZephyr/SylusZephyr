// End-to-end checks in a real browser: the main journeys, all three languages,
// accessibility (axe-core, WCAG 2 A/AA) and random-tap stability.
// usage: npm run test:e2e
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium, devices } from 'playwright';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  if (path.startsWith('..')) { res.writeHead(403); res.end(); return; }
  try { const body = await readFile(join(ROOT, path)); res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}/`;
const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

const browser = await chromium.launch();
const results = [];
async function test(name, fn, { allowErrors = false } = {}) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_|net::|vibrate/.test(m.text())) errors.push(m.text()); });
  try { await fn(page); if (!allowErrors) assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`); results.push(['ok', name]); }
  catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); }
  await ctx.close();
}
const clear = (p) => p.evaluate(() => document.querySelectorAll('#overlay-root > *, .toast').forEach((e) => e.remove()));
async function ready(page, patch = {}) {
  await page.goto(BASE); await page.waitForFunction(() => window.__revive);
  await page.evaluate((patch) => {
    const S = window.__revive.S; const st = S.get();
    Object.assign(st, { onboarded: true }); st.game.reviewed = S.weekKey(); st.game.recapSeen = '9999-01';
    if (patch.locale) st.settings.locale = patch.locale;
    S.saveNow();
  }, patch);
  await page.reload(); await page.waitForSelector('#screen'); await page.waitForTimeout(300); await clear(page);
}
const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(250); await clear(page); };

await test('onboarding reaches Today', async (p) => {
  await p.goto(BASE); await p.waitForSelector('#ob-next');
  for (let i = 0; i < 10 && await p.$('#ob-next, [data-pr]'); i++) {
    // The prayer step has no Continue: picking an answer moves on.
    if (await p.$('[data-pr="0"]')) { await p.click('[data-pr="0"]'); await p.waitForTimeout(150); continue; }
    if (await p.$('#ob-ack')) {
      assert.equal(await p.$eval('#ob-next', (b) => b.disabled), true, 'Continue waits for "I understand"');
      await p.check('#ob-ack');
    }
    await p.click('#ob-next'); await p.waitForTimeout(150);
  }
  await p.click('#ob-skip'); await p.waitForSelector('.t-head');
  assert.equal(await p.evaluate(() => window.__revive.S.get().onboarded), true);
});

await test('Today: water with undo, essentials, meal and drink logging', async (p) => {
  await ready(p);
  await p.click('[data-water]'); assert.equal(await p.evaluate(() => window.__revive.S.day().waterMl), 250);
  await p.click('.undo-btn'); assert.equal(await p.evaluate(() => window.__revive.S.day().waterMl), 0);
  await clear(p); await p.click('[data-ess="outdoors"]'); await p.waitForTimeout(350);
  assert.equal(await p.evaluate(() => window.__revive.S.day().checks.outdoors), true);
  await p.click('[data-logmeal]'); await p.click('[data-quick="2"]'); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => window.__revive.S.day().meals.length), 1);
  await clear(p); await p.click('[data-drinks]'); await p.click('[data-mg="40"]'); await p.waitForTimeout(200);
  assert.match(await p.evaluate(() => window.__revive.S.day().coffee[0]), /@40$/);
  assert.ok(await p.$('.caf-card'), 'caffeine card shows after a drink');
});

await test('Last night and the usual meal log in one tap from Today, with undo', async (p) => {
  await p.clock.install({ time: new Date('2026-11-24T10:40:00') });
  await p.goto(BASE); await p.waitForFunction(() => window.__revive);
  await p.evaluate(() => {
    const S = window.__revive.S; const st = S.get(); Object.assign(st, { onboarded: true }); st.game.reviewed = S.weekKey(); st.game.recapSeen = '9999-01';
    for (const back of [1, 2, 4]) S.day(S.addDays(S.dayKey(), -back)).meals.push({ id: 'm' + back, slot: 'breakfast', name: 'Egg paratha', kcal: 520, protein: 20, time: '10:30' });
    S.saveNow();
  });
  await p.reload(); await p.waitForSelector('#screen'); await clear(p);
  // Last night as planned, one tap, undoable
  await p.click('[data-usual="sleep"]'); await p.waitForTimeout(200);
  assert.equal(await p.evaluate(() => window.__revive.S.day().sleep.wake), '10:00');
  assert.equal(await p.evaluate(() => window.__revive.S.day().checks.sleep), true);
  await p.click('.undo-btn'); await p.waitForTimeout(200);
  assert.equal(await p.evaluate(() => window.__revive.S.day().sleep.wake), undefined);
  assert.equal(await p.evaluate(() => window.__revive.S.day().checks.sleep), false);
  await clear(p);
  assert.match(await p.textContent('.nx-row[data-key="nx-breakfast"]'), /Egg paratha/);
  await p.click('[data-usual="breakfast"]'); await p.waitForTimeout(200);
  assert.equal(await p.evaluate(() => window.__revive.S.day().meals.length), 1);
  assert.equal(await p.evaluate(() => window.__revive.S.day().checks.breakfast), true);
  await p.click('.undo-btn'); await p.waitForTimeout(200);
  assert.equal(await p.evaluate(() => window.__revive.S.day().meals.length), 0);
  assert.equal(await p.evaluate(() => window.__revive.S.day().checks.breakfast), false);
});

await test('Re-rendering updates in place: nodes, focus and handlers survive', async (p) => {
  await ready(p);
  const before = await p.evaluate(() => { window.__keep = document.querySelector('#screen .card'); return !!window.__keep; });
  assert.ok(before);
  for (let i = 0; i < 5; i++) await p.evaluate(() => window.__revive.render({ keepScroll: true }));
  assert.equal(await p.evaluate(() => window.__keep.isConnected), true, 'unchanged cards are kept, not rebuilt');
  await p.click('[data-water]'); await clear(p);
  assert.equal(await p.evaluate(() => window.__revive.S.day().waterMl), 250, 'one tap logs once after repeated renders');
  await go(p, 'cook/pantry');
  await p.click('#pan-q'); await p.keyboard.type('chick', { delay: 30 });
  assert.equal(await p.evaluate(() => document.activeElement?.id), 'pan-q', 'search keeps focus while results update');
  assert.equal(await p.inputValue('#pan-q'), 'chick');
});

await test('Cook: filters, categories, recipe and cook mode', async (p) => {
  await ready(p); await go(p, 'cook');
  await p.click('[data-filters]'); await p.click('[data-feel="tired"]'); await p.click('[data-apply]'); await p.waitForTimeout(250);
  assert.match(await p.textContent('[data-filters]'), /1/);
  await p.click('[data-cat="ramadan"]'); await p.waitForTimeout(200);
  assert.ok((await p.$$('#rgrid .rcard')).length >= 8);
  await go(p, 'cook/r/iftar_pakora'); await p.click('[data-cook]'); await p.waitForSelector('.cookmode');
});

await test('Train: guided session starts and closes', async (p) => {
  await ready(p); await go(p, 'train'); await p.click('[data-pf]'); await p.waitForSelector('.trainer');
  await p.click('.trainer [data-x]'); assert.equal(await p.$('.trainer'), null);
});

await test('Track and Me screens render', async (p) => {
  await ready(p);
  for (const h of ['track', 'me', 'me/medical', 'me/summary', 'me/settings', 'me/prayer', 'me/saved', 'me/badges', 'cook/plan', 'cook/shop', 'cook/pantry', 'cook/delivery']) {
    await go(p, h); assert.equal(await p.$('[data-crash-home]'), null, `${h} crashed`);
  }
  await go(p, 'track'); for (const t of ['food', 'sleep', 'body', 'checkins']) { await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(120); }
});

// Every route, Track tab and sheet, in Chinese and Urdu: no English left on screen.
// Allowed: brand and product names, photo authors, URLs, and text already mixed with CJK/Arabic script.
const ROUTES = ['today', 'cook', 'cook/delivery', 'cook/pantry', 'cook/plan', 'cook/shop', 'cook/r/egg_paratha', 'cook/r/egg_muffins', 'train', 'track',
  'me', 'me/account', 'me/credits', 'me/medical', 'me/prayer', 'me/settings', 'me/summary', 'me/badges', 'me/saved', 'me/reminders', 'me/install'];
const SHEET_BUTTONS = ['[data-logmeal]', '[data-drinks]', '[data-filters]', '[data-search]', '[data-weigh]', '[data-logsleep]', '[data-ci]', '[data-recap]', '[data-sleepset]'];
const ALLOWED = 'Revive|Wajid|Supabase|iPhone|Windows|Android|OLED|ISNA|UTC|PHQ|XP|Face ID|Hello|Google|Meituan|Ele\\.me|Hema|CC BY|CC0|Public domain|Commons|Wikimedia|Open Food Facts|PIN|BMI|kcal|GitHub|JSON|ICS|PDF|Kegel|Safari|Microsoft Edge|^Esc$';
const untranslated = (p) => p.evaluate((allowed) => {
  const ok = new RegExp(allowed); const out = [];
  for (const root of [document.querySelector('#app'), document.querySelector('#overlay-root')]) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const t = w.currentNode.nodeValue.replace(/\s+/g, ' ').trim(); const el = w.currentNode.parentElement;
      if (!el || el.closest('script,style,svg,textarea,[data-no-tr],.chart')) continue;
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      if (/[A-Za-z]{3}/.test(t) && !/[㐀-鿿؀-ۿ]/.test(t) && !ok.test(t) && !/^https?:/.test(t)) out.push(t);
    }
  }
  return out;
}, ALLOWED);

for (const loc of ['zh', 'ur']) {
  await test(`${loc === 'zh' ? 'Chinese' : 'Urdu'}: every screen and sheet is translated`, async (p) => {
    await ready(p, { locale: loc });
    const left = new Map();
    const note = async (where) => { for (const t of await untranslated(p)) if (!left.has(t)) left.set(t, where); };
    for (const r of ROUTES) {
      await go(p, r); await note(r);
      if (r === 'track') for (const t of ['food', 'sleep', 'body', 'checkins']) { await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(150); await note(`track/${t}`); }
      for (const sel of SHEET_BUTTONS) {
        const n = await p.$$eval(`#screen ${sel}`, (els) => els.length);
        for (let i = 0; i < n; i++) {
          await go(p, r); const el = (await p.$$(`#screen ${sel}`))[i]; if (!el) continue;
          await el.click(); await p.waitForTimeout(300); await note(`${r} ${sel}`); await clear(p);
        }
      }
    }
    assert.deepEqual([...left].map(([t, w]) => `${w}: ${t}`), []);
  });
}

await test('Urdu switches to right-to-left', async (p) => {
  await ready(p, { locale: 'ur' });
  assert.equal(await p.evaluate(() => document.documentElement.dir), 'rtl');
  assert.match(await p.textContent('nav.tabbar'), /آج/);
});

await test('Accessibility: no WCAG A/AA violations', async (p) => {
  await ready(p);
  for (const h of ['today', 'cook', 'cook/r/egg_paratha', 'train', 'track', 'me', 'me/settings', 'me/prayer']) {
    await go(p, h); await p.addScriptTag({ path: axePath });
    const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
    assert.deepEqual(v, [], h);
  }
});

await test('Hostile text in any field is shown as text, never run', async (p) => {
  await ready(p);
  const X = '<img src=x onerror="window.__xss=1"><b id="inj">x</b>';
  await p.evaluate((X) => {
    const S = window.__revive.S; const st = S.get(); const d = S.day();
    st.profile.name = X; d.notes = X; d.meals.push({ id: 'x', slot: 'lunch', name: X, kcal: 100, protein: 5, time: '12:00' });
    st.myMeals = [{ id: 'm', name: X, kcal: 100, protein: 5 }];
    st.medical.visits.push({ id: 'v', date: S.dayKey(), who: X, notes: X }); st.medical.labs.push({ id: 'l', date: S.dayKey(), name: X, value: X, unit: X, ref: X });
    st.medical.questions = [{ id: 'q', q: X, done: false }]; st.recipeNotes = { egg_paratha: { rating: 4, note: X } };
    st.prayer = { enabled: true, city: 'custom', lat: 39.9, lng: 116.4, tz: 8 }; S.saveNow();
  }, X);
  await p.reload(); await p.waitForSelector('#screen');
  for (const h of ['today', 'track', 'me', 'me/medical', 'me/summary', 'me/settings', 'cook/r/egg_paratha']) {
    await go(p, h); if (h === 'track') { await p.click('[data-tab="food"]'); await p.waitForTimeout(150); }
  }
  await go(p, 'today'); await p.click('[data-logmeal]'); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => window.__xss), undefined, 'injected script ran');
  assert.equal(await p.$('#inj'), null, 'injected element was rendered');
});

await test('Imported backup files are validated', async (p) => {
  await ready(p);
  const bad = await p.evaluate(() => { try { window.__revive.S.importJSON('{"profile":5,"days":"x"}'); return 'accepted'; } catch (e) { return 'rejected'; } });
  assert.equal(bad, 'rejected');
  const odd = await p.evaluate(() => { const S = window.__revive.S; S.importJSON(JSON.stringify({ version: 2, profile: { name: 'A' }, days: { 'not-a-date': {}, '2026-01-02': { meals: [{ name: 'ok', kcal: 'NaN' }], waterMl: -5 } }, weights: [{ date: 'bad', kg: 'x' }, { date: '2026-01-02', kg: 63 }] })); const st = S.get(); return { days: Object.keys(st.days), water: st.days['2026-01-02'].waterMl, kcal: st.days['2026-01-02'].meals[0].kcal, weights: st.weights.length }; });
  assert.deepEqual(odd, { days: ['2026-01-02'], water: 0, kcal: 0, weights: 1 });
});

await test('Two windows open at once never lose each other’s entries', async (p) => {
  await ready(p);
  const q = await p.context().newPage(); await q.goto(BASE); await q.waitForSelector('#screen'); await q.waitForTimeout(300);
  await q.evaluate(() => document.querySelectorAll('#overlay-root > *, .toast').forEach((e) => e.remove()));
  await p.click('[data-water]'); await p.waitForTimeout(300);           // window A: water
  await q.click('[data-logmeal]'); await q.click('[data-quick="1"]');      // window B: a meal, saved after A
  await q.waitForTimeout(500); await p.waitForTimeout(300);
  for (const page of [p, q]) {
    const d = await page.evaluate(() => { const d = window.__revive.S.day(); return { water: d.waterMl, meals: d.meals.length }; });
    assert.deepEqual(d, { water: 250, meals: 1 });
  }
  const stored = await p.evaluate(() => { const d = Object.values(JSON.parse(localStorage.getItem('revive.v1')).days).pop(); return { water: d.waterMl, meals: d.meals.length }; });
  assert.deepEqual(stored, { water: 250, meals: 1 });
  await q.close();
});

await test('Stays fast with three years of history', async (p) => {
  await ready(p);
  const kb = await p.evaluate(() => { const S = window.__revive.S; const st = S.get(); st.createdAt = Date.now() - 1100 * 864e5;
    for (let i = 0; i < 1095; i++) { const d = S.day(S.addDays(S.dayKey(), -i)); d.meals = Array.from({ length: 5 }, (_, j) => ({ id: `${i}-${j}`, slot: 'lunch', name: 'Chicken wrap', kcal: 500, protein: 30, time: '13:00' })); d.checks = { breakfast: true, lunch: true, dinner: true }; d.energy = 3; d.mood = 3; d.sleep = { bed: '00:30', wake: '08:30' }; d.coffee = ['09:00']; d.waterMl = 2000; }
    S.saveNow(); return Math.round(localStorage.getItem('revive.v1').length / 1024); });
  assert.ok(kb < 2500, `stored ${kb} KB`);
  await p.reload(); await p.waitForSelector('.t-head');
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (const h of ['today', 'cook', 'train', 'track', 'me']) {
    const ms = await p.evaluate(async (h) => { const t = performance.now(); location.hash = h; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t; }, h);
    assert.ok(ms < 500, `${h} took ${Math.round(ms)} ms on a slow phone`);
  }
});

await test('A screen error shows recovery instead of a blank app', async (p) => {
  await ready(p);
  await p.evaluate(() => { window.__revive.S.day().meals = null; window.__revive.render(); });
  await p.waitForSelector('[data-crash-home]');
  await p.evaluate(() => { window.__revive.S.day().meals = []; }); await p.click('[data-crash-home]');
  await p.waitForSelector('.t-head');
}, { allowErrors: true });

await test('Random taps across the app cause no errors', async (p) => {
  await ready(p);
  for (const h of ['today', 'cook', 'train', 'track', 'me', 'me/settings']) {
    await go(p, h);
    for (let i = 0; i < 25; i++) {
      const els = await p.$$('#screen button:not([data-reset]):not([data-lock]):not([data-lang]), .sheet button');
      if (!els.length) break;
      const el = els[Math.floor(Math.random() * els.length)];
      if (await el.isVisible().catch(() => false)) await el.click({ timeout: 1000 }).catch(() => {});
      if (Math.random() < 0.3) await p.evaluate(() => document.querySelectorAll('.cookmode, .trainer, .moment, .scanner').forEach((x) => (x.closest('#overlay-root > *') || x).remove()));
    }
  }
});

await browser.close(); server.close();
for (const r of results) console.log(r[0] === 'ok' ? '  ✓' : '  ✗', r[1], r[2] ? `— ${r[2]}` : '');
const failed = results.filter((r) => r[0] !== 'ok').length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

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
  for (let i = 0; i < 8 && await p.$('#ob-next'); i++) {
    if (await p.$('[data-pr="0"]')) await p.click('[data-pr="0"]');
    if (await p.$('#ob-ack')) await p.check('#ob-ack');
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

await test('Chinese translates every main screen', async (p) => {
  await ready(p, { locale: 'zh' });
  for (const h of ['today', 'cook', 'train', 'track', 'me']) {
    await go(p, h);
    const left = await p.evaluate(() => { const out = []; const w = document.createTreeWalker(document.querySelector('#screen'), NodeFilter.SHOW_TEXT); while (w.nextNode()) { const t = w.currentNode.nodeValue.trim(); if (/[A-Za-z]{4}/.test(t) && !/Revive|Wajid|Supabase|iPhone|Windows|OLED|ISNA|UTC|PHQ|XP/.test(t)) out.push(t); } return out; });
    assert.deepEqual(left, [], `${h} still has English`);
  }
});

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

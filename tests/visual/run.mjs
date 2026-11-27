// Visual regression: screenshots of every screen and the main sheets, at phone and desktop
// width, in English, Chinese and Urdu, compared pixel by pixel with committed baselines.
//   npm run test:visual            compare; writes diffs to tests/visual/out/ and exits 1 on change
//   npm run test:visual -- --update  accept the current rendering as the new baselines
//
// Rendering must not depend on the machine. The clock, the data and Math.random are fixed,
// motion is off, and the browser gets its own font configuration (fonts.conf): only the Noto
// fonts, with fixed anti-aliasing and no hinting. Install the same Debian/Ubuntu packages CI
// installs: fonts-noto-cjk, fonts-noto-core and fonts-noto-color-emoji.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BASE_DIR = fileURLToPath(new URL('./baseline/', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('./out/', import.meta.url));
const UPDATE = process.argv.includes('--update');
// A pixel counts as changed past pixelmatch's colour threshold; a screen fails when more than
// this share of its pixels changed. Anti-aliasing noise stays far below it; a moved button or a
// colour change does not.
const MAX_CHANGED = 0.002;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  if (path.startsWith('..')) { res.writeHead(403); res.end(); return; }
  try { const body = await readFile(join(ROOT, path)); res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const SCREENS = ['today', 'cook', 'cook/delivery', 'cook/pantry', 'cook/plan', 'cook/shop', 'cook/r/egg_paratha', 'train', 'track',
  'me', 'me/medical', 'me/prayer', 'me/settings', 'me/summary', 'me/reminders'];
const DESKTOP_SCREENS = ['today', 'cook', 'train', 'track', 'me'];
const SHEETS = [['today', '[data-logmeal]'], ['today', '[data-search]'], ['cook', '[data-filters]']];
const LOCALES = ['en', 'zh', 'ur'];

const FREEZE_CSS = `
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  /* Toasts come and go on timers (milestones, undo), so they are never part of a screenshot. */
  #toast-root, .toast { display: none !important; }
  html[lang="en"] body { font-family: "Inter", "Noto Sans", sans-serif !important; }
  html[lang="zh"] body { font-family: "Inter", "Noto Sans CJK SC", sans-serif !important; }
  html[lang="ur"] body, html[lang="ur"] button, html[lang="ur"] input { font-family: "Noto Nastaliq Urdu", "Noto Sans Arabic", sans-serif !important; }
`;

async function settle(p) {
  await p.addStyleTag({ content: FREEZE_CSS });
  await p.evaluate(() => document.querySelectorAll('.toast').forEach((e) => e.remove()));
  await p.evaluate(() => /** @type {HTMLElement} */ (document.activeElement)?.blur?.());
  // Wait for fonts and for every image that is in view.
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every((i) => {
    const r = i.getBoundingClientRect(); const inView = r.bottom > 0 && r.top < innerHeight && r.width > 0;
    return !inView || i.complete;
  }), null, { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(150);
}

async function open(browser, vp, locale) {
  const ctx = await browser.newContext({ ...vp, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: 'en-GB', timezoneId: 'Asia/Shanghai' });
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-11-24T13:20:00+08:00') });
  await p.addInitScript(() => {
    // Same "random" picks on every machine and every run.
    let s = 42; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  });
  await p.goto(BASE); await p.waitForFunction(() => window.__revive);
  await p.evaluate((loc) => {
    const S = window.__revive.S; const st = S.get();
    Object.assign(st, { onboarded: true, createdAt: Date.now() - 20 * 864e5, lastExportAt: Date.now() });
    st.profile.name = 'Wajid'; st.settings.locale = loc;
    st.game.reviewed = S.weekKey(); st.game.recapSeen = '9999-01';
    st.weights = [{ date: '2026-10-20', kg: 62 }, { date: '2026-11-03', kg: 62.6 }, { date: '2026-11-17', kg: 63.1 }];
    const d = S.day(); d.coffee = ['10:30']; d.waterMl = 1000; d.checks.breakfast = true; d.sleep = { bed: '02:40', wake: '10:05' };
    d.meals.push({ id: 'v1', slot: 'breakfast', name: 'Egg paratha', kcal: 620, protein: 28, time: '10:40' });
    st.prayer = { enabled: true, city: 'beijing' };
    S.saveNow();
  }, locale);
  return { ctx, p };
}

const results = []; let failed = 0;
async function check(name, png) {
  const file = join(BASE_DIR, name + '.png');
  if (UPDATE || !existsSync(file)) {
    await writeFile(file, png); results.push(['new', name]); return;
  }
  const a = PNG.sync.read(readFileSync(file)); const b = PNG.sync.read(png);
  if (a.width !== b.width || a.height !== b.height) {
    failed++; results.push(['FAIL', name, `size ${a.width}×${a.height} → ${b.width}×${b.height}`]);
    await writeFile(join(OUT_DIR, name + '.actual.png'), png); return;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  const share = n / (a.width * a.height);
  if (share > MAX_CHANGED) {
    failed++; results.push(['FAIL', name, `${(share * 100).toFixed(2)}% of pixels changed`]);
    await writeFile(join(OUT_DIR, name + '.actual.png'), png);
    await writeFile(join(OUT_DIR, name + '.diff.png'), PNG.sync.write(diff));
  } else results.push(['ok', name, n ? `${(share * 100).toFixed(3)}%` : '']);
}

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true }); await mkdir(BASE_DIR, { recursive: true });
const browser = await chromium.launch({
  env: { ...process.env, FONTCONFIG_FILE: fileURLToPath(new URL('./fonts.conf', import.meta.url)) },
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb', '--disable-gpu'],
});
for (const [width, vp, screens, sheets] of [['phone', devices['iPhone 13'], SCREENS, SHEETS], ['desktop', { viewport: { width: 1280, height: 860 } }, DESKTOP_SCREENS, []]]) {
  for (const locale of LOCALES) {
    const { ctx, p } = await open(browser, vp, locale);
    for (const route of screens) {
      await p.goto(BASE + '#' + route); await p.reload(); await p.waitForSelector('#screen');
      await p.evaluate(() => document.querySelectorAll('#overlay-root > *').forEach((e) => e.remove()));
      await settle(p);
      await check(`${width}-${locale}-${route.replace(/\//g, '_')}`, await p.screenshot());
    }
    for (const [route, sel] of sheets) {
      await p.goto(BASE + '#' + route); await p.reload(); await p.waitForSelector('#screen');
      await p.evaluate(() => document.querySelectorAll('#overlay-root > *').forEach((e) => e.remove()));
      await p.click(`#screen ${sel}`); await p.waitForSelector('.sheet');
      await settle(p);
      await check(`${width}-${locale}-${route}-sheet-${sel.replace(/\W/g, '')}`, await p.screenshot());
    }
    await ctx.close();
  }
}
await browser.close(); server.close();

for (const [s, n, info] of results) if (s !== 'ok' || info) console.log(`  ${s === 'ok' ? '✓' : s === 'new' ? '+' : '✗'} ${n}${info ? '  ' + info : ''}`);
console.log(`${results.length - failed}/${results.length} match${UPDATE ? ' (baselines updated)' : ''}`);
if (failed) console.log(`Diffs are in tests/visual/out/. If the change is intended, run: npm run test:visual -- --update`);
process.exit(failed ? 1 : 0);

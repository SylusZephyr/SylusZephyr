// Fast checks that run without a browser: data integrity, migrations and core maths.
// usage: npm test
import assert from 'node:assert/strict';

const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.window = { dispatchEvent() {}, addEventListener() {} };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });

const results = [];
const test = async (name, fn) => {
  try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name, e.message]); }
};

// Every module must parse — the views are not imported below, so check them directly.
{
  const { readdirSync, readFileSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const walk = (d) => readdirSync(new URL(d, import.meta.url), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'vendor' ? [] : walk(`${d}${e.name}/`)) : e.name.endsWith('.js') ? [`${d}${e.name}`] : []);
  await test('all modules parse', () => {
    for (const f of walk('../js/')) {
      try { execFileSync(process.execPath, ['--input-type=module', '--check'], { input: readFileSync(new URL(f, import.meta.url)), stdio: ['pipe', 'pipe', 'pipe'] }); }
      catch (e) { throw new Error(`${f}: ${String(e.stderr).split('\n').find((l) => l.includes('Error')) || 'syntax error'}`); }
    }
  });
}

const { RECIPES } = await import('../js/data/recipes.js');
const { ING } = await import('../js/data/ingredients.js');
const { TIPS, CHECKINS, scoreCheckin } = await import('../js/data/content.js');
const { FOODS } = await import('../js/data/foods.js');
const { PHOTOS } = await import('../js/data/photos.js');

await test('recipe ids are unique', () => assert.equal(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length));
await test('every recipe ingredient exists', () => {
  for (const r of RECIPES) for (const i of r.ing) assert.ok(ING[i.id], `${r.id} → ${i.id}`);
});
await test('recipes have sane nutrition and steps', () => {
  for (const r of RECIPES) {
    assert.ok(r.kcal > 50 && r.kcal < 1500, r.id + ' kcal');
    assert.ok(r.protein >= 0 && r.protein < 120, r.id + ' protein');
    assert.ok(r.steps.length > 0 && r.steps.every((s) => s.t), r.id + ' steps');
    assert.ok(['airfryer', 'nocook'].includes(r.method), r.id + ' method');
  }
});
await test('photo files are referenced correctly', async () => {
  const { existsSync } = await import('node:fs');
  for (const [id, p] of Object.entries(PHOTOS)) assert.ok(existsSync(new URL('../' + p.src, import.meta.url)), id);
});
await test('tips are well formed', () => {
  assert.equal(new Set(TIPS.map((t) => t.id)).size, TIPS.length);
  for (const t of TIPS) assert.ok(t.title && t.body && t.cat, t.id);
});
await test('food list values are plausible', () => {
  for (const f of FOODS) assert.ok(f.kcal100 >= 0 && f.kcal100 < 950 && f.portionG > 0, f.name);
});
await test('PHQ-4 scoring', () => {
  const s = scoreCheckin('mood', [3, 3, 0, 0]);
  assert.equal(s.total, 6); assert.equal(s.flag, true);
  assert.equal(scoreCheckin('mood', [0, 0, 0, 0]).level, 'None–minimal');
  assert.ok(CHECKINS.erection.qs.length === 5);
});

const S = await import('../js/store.js');
await test('migration repairs v1 data and keeps a backup', () => {
  mem['revive.v1'] = JSON.stringify({ version: 1, days: { '2026-10-01': { meals: [{ kcal: '500' }, null], waterMl: 'x' }, bad: {} }, weights: [{ date: 'x', kg: 1 }], game: { xp: 'NaN' } });
  const st = S.load();
  assert.equal(st.version, S.SCHEMA_VERSION);
  assert.deepEqual(Object.keys(st.days), ['2026-10-01']);
  assert.equal(st.days['2026-10-01'].meals.length, 1);
  assert.equal(st.days['2026-10-01'].waterMl, 0);
  assert.equal(st.weights.length, 0);
  assert.equal(st.game.xp, 0);
  assert.ok(mem['revive.v1.backup']);
});

const P = await import('../js/plan.js');
await test('sleep shift reaches the ideal bedtime gradually', () => {
  const st = S.get(); st.profile.wakeAnchor = '10:00'; st.profile.currentBedtime = '03:30'; st.profile.sleepNeedMin = 510; st.profile.bedShiftStartedOn = '2026-11-01';
  assert.equal(P.sleepTargets('2026-11-01').bed, '03:30');
  assert.equal(P.sleepTargets('2026-11-04').bed, '03:15');
  assert.equal(P.sleepTargets('2026-12-15').bed, '01:30');
});
await test('caffeine cutoff treats after-midnight as late', () => {
  S.get().profile.caffeineCutoff = '14:00';
  assert.equal(P.isAfterCutoff('01:00'), true);
  assert.equal(P.isAfterCutoff('13:59'), false);
  assert.equal(P.isAfterCutoff('14:00'), true);
});

const Caf = await import('../js/caffeine.js');
await test('caffeine halves every 5 hours and counts yesterday', () => {
  const k = '2026-03-02'; const st = S.get(); st.profile.cupMg = 100;
  st.days[S.addDays(k, -1)] = { coffee: ['23:00'], meals: [], checks: {} };
  st.days[k] = { coffee: ['08:00', '09:00@75'], meals: [], checks: {} };
  const t8 = Caf.clockToDayMin('08:00');
  const lvl = Caf.levelAt(k, t8 + 45 + 300) ;
  // 08:00 cup → 50 mg after absorb + 5 h; 09:00 espresso (75) a bit more; yesterday's 23:00 cup ≈ 7 mg
  assert.ok(lvl > 100 && lvl < 125, 'level ' + lvl);
  assert.equal(Caf.parse('09:00@75').mg, 75);
  assert.equal(Caf.parse('09:00').mg, 100);
  assert.equal(S.minutesOf('09:30@75'), 570);
  assert.equal(P.isAfterCutoff('15:00@40'), true);
});

const Pr = await import('../js/prayer.js');
await test('prayer times match published Beijing table (±3 min)', () => {
  S.get().prayer = { enabled: true, city: 'beijing', method: 'MWL', asr: 'standard' };
  const t = Pr.timesFor(new Date(2026, 10, 24));
  const near = (got, hhmm) => assert.ok(Math.abs(got - S.minutesOf(hhmm)) <= 3, `${S.fmtMin(got)} vs ${hhmm}`);
  near(t.sunrise, '07:10'); near(t.dhuhr, '12:01'); near(t.maghrib, '16:52');
  assert.ok(t.fajr < t.sunrise && t.asr > t.dhuhr && t.isha > t.maghrib);
});
await test('Ramadan detection and fasting window', () => {
  assert.equal(Pr.isRamadanDate(new Date(2027, 1, 20)), true);
  assert.equal(Pr.isRamadanDate(new Date(2026, 10, 24)), false);
  S.get().prayer = { enabled: true, city: 'beijing', ramadan: 'auto' };
  assert.equal(Pr.fasting(new Date(2027, 1, 20, 12)), true);
  const f = Pr.fastWindow(new Date(2027, 1, 20, 12));
  assert.equal(f.state, 'fasting'); assert.ok(f.toIftar > 0 && f.lengthMin > 600);
  S.get().prayer.ramadan = 'off';
  assert.equal(Pr.fasting(new Date(2027, 1, 20, 12)), false);
});

const { weightTrend } = await import('../js/views/track.js').catch(() => ({}));
await test('weight trend projects a goal date', () => {
  if (!weightTrend) return; // view needs a DOM in some runtimes
  const ws = [{ date: '2026-10-01', kg: 62 }, { date: '2026-10-08', kg: 62.3 }, { date: '2026-10-15', kg: 62.5 }, { date: '2026-10-22', kg: 62.8 }];
  const tr = weightTrend(ws, 66);
  assert.ok(tr.perWeek > 0.2 && tr.perWeek < 0.35, 'rate ' + tr.perWeek);
  assert.ok(tr.eta instanceof Date && tr.eta.getFullYear() === 2027);
  assert.equal(weightTrend([{ date: '2026-10-01', kg: 62 }], 66), null);
});

await test('pending alerts stay under the iOS limit of 64', async () => {
  const { reminderList } = await import('../js/ics.js');
  S.get().prayer = { enabled: true, notify: true, city: 'beijing', ramadan: 'on' };
  const repeating = 3; const timed = (reminderList().length - repeating) * 3; const prayer = Pr.upcomingAlerts(3, new Date()).length;
  assert.ok(repeating + timed + prayer <= 64, `${repeating} + ${timed} + ${prayer}`);
  assert.ok(reminderList().every((r) => !/\p{Extended_Pictographic}/u.test(r.title)), 'no emoji in titles');
});

await test('migration 2 → 3 drops retired coins, chests and quests', () => {
  const v2 = { version: 2, profile: {}, game: { xp: 120, coins: 40, lootOpened: { a: 1 } }, days: { '2026-01-01': { quests: [{ id: 'q' }], readTips: ['x'], meals: [], checks: { breakfast: true } } } };
  const out = S.migrate(v2);
  assert.equal(out.version, 3); assert.equal(out.game.xp, 120);
  assert.ok(!('coins' in out.game) && !('lootOpened' in out.game));
  assert.ok(!('quests' in out.days['2026-01-01']) && out.days['2026-01-01'].checks.breakfast);
});

await test('emergency numbers follow the region', async () => {
  const R = await import('../js/region.js');
  const st = S.get(); const keep = st.prayer;
  st.prayer = { city: 'lahore' }; assert.equal(R.region().ambulance, '1122');
  st.prayer = { city: 'hongkong' }; assert.equal(R.region().ambulance, '999');
  st.prayer = { city: 'beijing' }; assert.equal(R.region().ambulance, '120');
  st.prayer = { city: 'custom', tz: 5 }; assert.equal(R.regionCode(), 'PK');
  st.prayer = keep;
});

await test('app version matches package.json everywhere', async () => {
  const { readFileSync } = await import('node:fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  const desk = JSON.parse(readFileSync(new URL('../desktop/package.json', import.meta.url)));
  const { APP_VERSION } = await import('../js/config.js');
  assert.equal(APP_VERSION, pkg.version); assert.equal(desk.version, pkg.version);
});

const { merge } = await import('../js/sync.js');
await test('same day from two windows merges field by field', async () => {
  const { mergeDay } = await import('../js/sync.js');
  const a = { meals: [{ id: 'm1', name: 'Oats', kcal: 500 }], waterMl: 750, checks: { breakfast: true }, coffee: ['09:00'], removedMeals: [] };
  const b = { meals: [{ id: 'm1', name: 'Oats', kcal: 500 }, { id: 'm2', name: 'Wrap', kcal: 600 }, { id: 'm3', name: 'Gone', kcal: 1 }], waterMl: 500, checks: { lunch: true }, coffee: [], removedMeals: ['m3'], energy: 3 };
  const m = mergeDay(a, b);
  assert.deepEqual(m.meals.map((x) => x.id).sort(), ['m1', 'm2']);
  assert.equal(m.waterMl, 750); assert.deepEqual(m.checks, { lunch: true, breakfast: true });
  assert.equal(m.coffee.length, 1); assert.equal(m.energy, 3);
});

await test('sync merge never drops entries', () => {
  const a = { days: { d1: { xpToday: 10, meals: [], checks: {} } }, weights: [{ date: '2026-01-01', kg: 62 }], pf: { sessions: [{ date: 'd1', at: 1 }] }, game: { xp: 100, badges: { a: 1 } }, editedAt: 1 };
  const b = { days: { d2: { xpToday: 5, meals: [], checks: {} } }, weights: [{ date: '2026-01-08', kg: 62.3 }], pf: { sessions: [{ date: 'd2', at: 2 }] }, game: { xp: 80, badges: { b: 1 } }, editedAt: 2 };
  const m = merge(a, b);
  assert.deepEqual(Object.keys(m.days).sort(), ['d1', 'd2']);
  assert.equal(m.weights.length, 2);
  assert.equal(m.pf.sessions.length, 2);
  assert.equal(m.game.xp, 100);
  assert.deepEqual(Object.keys(m.game.badges).sort(), ['a', 'b']);
});

for (const r of results) console.log(r[0] === 'ok' ? '  ✓' : '  ✗', r[1], r[2] || '');
const failed = results.filter((r) => r[0] !== 'ok').length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

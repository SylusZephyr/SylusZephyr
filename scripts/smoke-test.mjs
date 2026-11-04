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

const { RECIPES } = await import('../js/data/recipes.js');
const { ING } = await import('../js/data/ingredients.js');
const { TIPS, STORIES, CHECKINS, scoreCheckin } = await import('../js/data/content.js');
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
await test('tips and stories are well formed', () => {
  assert.equal(new Set(TIPS.map((t) => t.id)).size, TIPS.length);
  for (const s of STORIES) assert.ok(s.slides === 'dynamic' || s.slides.length > 0, s.id);
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

const { merge } = await import('../js/sync.js');
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

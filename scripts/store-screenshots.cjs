// Generates store screenshots from the running app with demo data.
// usage: (serve the repo on :8765) node scripts/store-screenshots.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'store', 'screenshots');
const TARGETS = [
  { name: 'ios-6.9', viewport: { width: 440, height: 956 }, scale: 3, mobile: true },
  { name: 'android-phone', viewport: { width: 360, height: 800 }, scale: 3, mobile: true },
  { name: 'windows', viewport: { width: 1920, height: 1080 }, scale: 1, mobile: false },
];
const SHOTS = [
  ['01-today', 'today'], ['02-cook', 'cook'], ['03-recipe', 'cook/r/honey_salmon'],
  ['04-train', 'train'], ['05-track', 'track'], ['06-me', 'me'],
];

function seed() {
  const S = window.__revive.S; const st = S.get();
  st.onboarded = true; st.profile.name = 'Wajid'; st.createdAt = Date.now() - 24 * 864e5;
  st.programStart = S.addDays(S.dayKey(), -24); st.profile.bedShiftStartedOn = st.programStart; st.profile.currentBedtime = '02:30';
  st.weights = []; st.game.xp = 1460; st.game.coins = 240; st.game.bestStreak = 12; st.game.freezes = 2;
  st.favorites = ['egg_paratha', 'chicken_cheese_wrap', 'honey_salmon'];
  st.pantry = ['eggs', 'milk', 'yogurt', 'banana', 'shouzhuabing', 'tortilla', 'cooked_chicken', 'cheese', 'oats', 'peanut_butter', 'oil_spray', 'cumin_chili', 'ketchup', 'mayo', 'chicken_thigh', 'onion', 'tomato', 'curry_paste', 'garlic_ginger', 'honey', 'salmon', 'soy_sauce', 'broccoli', 'instant_rice', 'naan', 'bread', 'lemon', 'granola'];
  st.medical.questions = [{ id: 'q1', q: 'Can we check my heart (blood pressure, pulse, ECG)?', done: false }, { id: 'q2', q: 'Blood count, ferritin and thyroid tests?', done: false }];
  for (let i = 24; i >= 1; i--) {
    const k = S.addDays(S.dayKey(), -i); const d = S.day(k);
    ['breakfast', 'lunch', 'dinner', 'fluids', 'sleep', 'outdoors', 'caffeine'].forEach((e, j) => { if ((i + j) % 7 !== 0 || i < 10) d.checks[e] = true; });
    d.meals = [{ id: 'a' + i, slot: 'breakfast', time: '10:40', kcal: 560, protein: 22, name: 'Crispy Egg Paratha', recipeId: 'egg_paratha' },
      { id: 'b' + i, slot: 'lunch', time: '15:10', kcal: 680, protein: 42, name: 'Chicken-Cheese Crunch Wrap', recipeId: 'chicken_cheese_wrap' },
      { id: 'c' + i, slot: 'dinner', time: '20:00', kcal: 780, protein: 44, name: 'Air-Fryer Chicken Curry', recipeId: 'airfryer_chicken_curry' },
      { id: 's' + i, slot: 'snack', time: '17:30', kcal: 450, protein: 18, name: 'Banana PB shake' }];
    d.waterMl = 1750 + (i % 4) * 150; d.xpToday = 140 + (i % 5) * 25; d.coffee = ['11:30'];
    d.sleep = { bed: ['02:40', '02:20', '01:55', '01:45', '01:30'][Math.min(4, Math.floor((24 - i) / 5))], wake: ['10:10', '10:00', '09:55', '10:05', '10:00'][i % 5] };
    d.energy = 2 + (i % 3 === 0 ? 1 : 0) + (i < 8 ? 1 : 0); d.mood = 2 + (i % 2); d.pf = 2 + (i % 2);
    for (let n = 0; n < d.pf; n++) st.pf.sessions.push({ date: k, at: n, week: 3 });
    if (i % 7 === 3) st.weights.push({ date: k, kg: +(62 + (24 - i) * 0.035).toFixed(1) });
    const wk = S.weekKey(k);
    st.checkins[wk] = st.checkins[wk] || { erection: { answers: [2, 2, 2, 2, 2], score: { pct: 44 + (24 - i) } }, mood: { answers: [1, 1, 1, 1], score: { total: 7 - Math.floor((24 - i) / 7), anx: 3, dep: 3 } }, energy: { answers: [2, 2, 4, 2], score: { pct: 48 + (24 - i) } } };
  }
  const t = S.day(); t.checks = { breakfast: true, fluids: true, sleep: true }; t.waterMl = 1250; t.coffee = ['10:15'];
  t.sleep = { bed: '01:30', wake: '10:00' }; t.meals = [{ id: 't1', slot: 'breakfast', time: '10:35', kcal: 560, protein: 22, name: 'Crispy Egg Paratha', recipeId: 'egg_paratha' }]; t.pf = 1; t.energy = 3; t.mood = 3;
  st.game.reviewed = S.weekKey(); st.game.lootOpened = {};
  S.saveNow(); window.__revive.G.updateBestStreak(); window.__revive.G.checkBadges(); S.saveNow();
}

(async () => {
  const b = await chromium.launch();
  for (const tgt of TARGETS) {
    const dir = path.join(OUT, tgt.name); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: tgt.viewport, deviceScaleFactor: tgt.scale, isMobile: tgt.mobile, hasTouch: tgt.mobile,
      userAgent: tgt.mobile ? 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' : undefined });
    await ctx.clock.install({ time: new Date('2026-11-04T11:20:00') });
    const p = await ctx.newPage();
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400);
    await p.evaluate(seed);
    for (const [file, hash] of SHOTS) {
      await p.goto('http://localhost:8765/#' + hash); await p.waitForTimeout(400);
      await p.evaluate(() => document.querySelectorAll('#overlay-root > *, .toast, .nudge').forEach((e) => e.remove()));
      await p.clock.runFor(4000); await p.waitForTimeout(300);
      await p.evaluate(() => document.querySelectorAll('#overlay-root > *, .toast, .xp-pop').forEach((e) => e.remove()));
      await p.screenshot({ path: path.join(dir, file + '.png') });
    }
    await ctx.close();
    console.log('done', tgt.name);
  }
  await b.close();
})();

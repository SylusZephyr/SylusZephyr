// Offline-first service worker. Bump VERSION on every release.
const VERSION = 'revive-d76e1be159d6';
const ASSETS = [
  './',
  'css/app.css',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'img/food/airfryer_chicken_curry.webp',
  'img/food/aloo_tikki.webp',
  'img/food/avocado_egg_toast.webp',
  'img/food/chapli_patties.webp',
  'img/food/chicken_cheese_wrap.webp',
  'img/food/chickpea_chaat.webp',
  'img/food/d_dapanji.webp',
  'img/food/d_indian.webp',
  'img/food/d_kebab.webp',
  'img/food/d_polo.webp',
  'img/food/d_samsa.webp',
  'img/food/d_shawarma.webp',
  'img/food/egg_mayo_sandwich.webp',
  'img/food/egg_paratha.webp',
  'img/food/french_toast.webp',
  'img/food/honey_salmon.webp',
  'img/food/hummus_wrap.webp',
  'img/food/kebab_naan.webp',
  'img/food/kofta_tray.webp',
  'img/food/lamb_skewers_rice.webp',
  'img/food/mango_lassi.webp',
  'img/food/masala_fish.webp',
  'img/food/naan_egg_cheese.webp',
  'img/food/nugget_wrap.webp',
  'img/food/overnight_oats.webp',
  'img/food/paneer_tikka.webp',
  'img/food/pb_banana_toast.webp',
  'img/food/protein_milk_dates.webp',
  'img/food/samosa_plate.webp',
  'img/food/shaker_smoothie.webp',
  'img/food/shawarma_bowl.webp',
  'img/food/sweet_potato_loaded.webp',
  'img/food/tikka_wrap.webp',
  'img/food/tray_bake.webp',
  'img/food/tuna_melt.webp',
  'img/food/wings.webp',
  'img/food/yogurt_bowl.webp',
  'index.html',
  'js/a11y.js',
  'js/app.js',
  'js/charts.js',
  'js/cloud.js',
  'js/config.js',
  'js/content.js',
  'js/data/content.js',
  'js/data/foods.js',
  'js/data/ingredients.js',
  'js/data/photos.js',
  'js/data/recipes-more.js',
  'js/data/recipes.js',
  'js/gamify.js',
  'js/ics.js',
  'js/lock.js',
  'js/native.js',
  'js/nutrition.js',
  'js/plan.js',
  'js/sharecard.js',
  'js/store.js',
  'js/sync.js',
  'js/ui.js',
  'js/vendor/supabase.js',
  'js/views/cook.js',
  'js/views/me.js',
  'js/views/onboard.js',
  'js/views/search.js',
  'js/views/shared.js',
  'js/views/today.js',
  'js/views/track.js',
  'js/views/train.js',
  'manifest.webmanifest',
  'privacy.html',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Stale-while-revalidate: instant from cache, refresh in background.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (cached) { e.waitUntil(net); return cached; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') return cache.match('index.html');
    return new Response('', { status: 504 });
  }));
});

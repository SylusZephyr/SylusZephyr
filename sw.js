// Offline-first service worker. Bump VERSION on every release.
const VERSION = 'revive-v1.14.0';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/store.js', 'js/ui.js', 'js/gamify.js', 'js/plan.js', 'js/lock.js', 'js/ics.js', 'js/charts.js',
  'js/data/ingredients.js', 'js/data/recipes.js', 'js/data/content.js',
  'js/native.js', 'js/cloud.js', 'js/sync.js', 'js/config.js', 'js/content.js', 'js/nutrition.js', 'js/data/foods.js', 'js/data/photos.js', 'js/sharecard.js', 'js/views/today.js', 'js/views/cook.js', 'js/views/train.js', 'js/views/track.js', 'js/views/me.js', 'js/views/onboard.js', 'js/views/shared.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
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

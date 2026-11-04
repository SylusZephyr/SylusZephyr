// Renders the app icon and splash screens for every platform from one SVG mark.
// Usage: node scripts/render-assets.cjs   (requires playwright)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const MARK = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="1" x2="0.4" y2="0"><stop offset="0" stop-color="#ff6b6b"/><stop offset="1" stop-color="#ffb547"/></linearGradient></defs>
  <path d="M50 5 C58 25 78 35 78 60 A28 28 0 0 1 22 60 C22 45 32 38 36 28 C40 40 46 42 48 44 C52 32 50 18 50 5Z" fill="url(#g)"/>
  <path d="M50 52 C55 60 62 63 62 72 A12 12 0 0 1 38 72 C38 65 44 62 50 52Z" fill="#fff3d6" opacity=".92"/></svg>`;

const page = (w, h, markScale, withName) => `<html><body style="margin:0">
  <div style="width:${w}px;height:${h}px;background:radial-gradient(circle at 50% 32%,#2a2350,#0b0f1a 72%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(w * 0.02)}px">
    <div style="width:${Math.round(Math.min(w, h) * markScale)}px;height:${Math.round(Math.min(w, h) * markScale)}px">${MARK}</div>
    ${withName ? `<div style="font:800 ${Math.round(Math.min(w, h) * 0.06)}px -apple-system,Segoe UI,Roboto,sans-serif;color:#eef1f8;letter-spacing:-0.02em">Revive</div>` : ''}
  </div></body></html>`;

const out = (...p) => { const f = path.join(__dirname, '..', ...p); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; };

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const shot = async (w, h, scale, name, file) => {
    await p.setViewportSize({ width: w, height: h }); await p.setContent(page(w, h, scale, name));
    await p.screenshot({ path: file, omitBackground: false });
  };
  // Web / PWA
  await shot(512, 512, 0.62, false, out('icons', 'icon-512.png'));
  await shot(192, 192, 0.62, false, out('icons', 'icon-192.png'));
  await shot(180, 180, 0.62, false, out('icons', 'apple-touch-icon.png'));
  // iOS: single 1024 icon (opaque) + universal splash
  await shot(1024, 1024, 0.62, false, out('ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png'));
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await shot(2732, 2732, 0.16, true, out('ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset', f));
  }
  // Source images for Android / Windows generators
  await shot(1024, 1024, 0.62, false, out('resources', 'icon.png'));
  await shot(1024, 1024, 0.5, false, out('resources', 'icon-foreground-pad.png'));
  await shot(2732, 2732, 0.16, true, out('resources', 'splash.png'));
  await b.close();
  console.log('assets rendered');
})();

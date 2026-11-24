// Renders the app icon and splash screens for every platform from one SVG mark.
// Usage: node scripts/render-assets.cjs   (requires playwright)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// The mark: one ascending arc that ends in a point of light — progress that keeps rising.
const MARK = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="a" x1="0.15" y1="0.95" x2="0.85" y2="0.1"><stop offset="0" stop-color="#ff5a36"/><stop offset=".55" stop-color="#ff8a4c"/><stop offset="1" stop-color="#ffc58a"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff4e6"/><stop offset=".45" stop-color="#ffd2a3" stop-opacity=".55"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="50" cy="50" r="34" fill="none" stroke="#ffffff" stroke-opacity=".06" stroke-width="11"/>
  <path d="M26 74 A34 34 0 1 1 74 26" fill="none" stroke="url(#a)" stroke-width="11" stroke-linecap="round"/>
  <circle cx="74" cy="26" r="13" fill="url(#glow)"/>
  <circle cx="74" cy="26" r="4.2" fill="#fff8ef"/>
</svg>`;

const BG = 'radial-gradient(120% 90% at 50% 0%, #22252d 0%, #121318 48%, #0b0c0e 100%)';
const page = (w, h, markScale, withName) => `<html><body style="margin:0">
  <div style="width:${w}px;height:${h}px;background:${BG};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(Math.min(w, h) * 0.035)}px">
    <div style="width:${Math.round(Math.min(w, h) * markScale)}px;height:${Math.round(Math.min(w, h) * markScale)}px">${MARK}</div>
    ${withName ? `<div style="font:600 ${Math.round(Math.min(w, h) * 0.042)}px -apple-system,'SF Pro Display','Segoe UI',Roboto,sans-serif;color:#f3f4f6;letter-spacing:-0.02em">Revive</div>` : ''}
  </div></body></html>`;

const out = (...p) => { const f = path.join(__dirname, '..', ...p); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; };

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const shot = async (w, h, scale, name, file) => {
    await p.setViewportSize({ width: w, height: h }); await p.setContent(page(w, h, scale, name));
    await p.screenshot({ path: file, omitBackground: false });
  };
  // Web / PWA
  await shot(512, 512, 0.6, false, out('icons', 'icon-512.png'));
  await shot(192, 192, 0.6, false, out('icons', 'icon-192.png'));
  await shot(180, 180, 0.6, false, out('icons', 'apple-touch-icon.png'));
  // iOS: single 1024 icon (opaque) + universal splash
  await shot(1024, 1024, 0.6, false, out('ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png'));
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await shot(2732, 2732, 0.16, true, out('ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset', f));
  }
  // Source images for Android / Windows generators
  await shot(1024, 1024, 0.6, false, out('resources', 'icon.png'));
  // Adaptive-icon foreground: mark only, transparent, inside the 66% safe zone
  await p.setViewportSize({ width: 1024, height: 1024 });
  await p.setContent(`<html><body style="margin:0;background:transparent"><div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center"><div style="width:470px;height:470px">${MARK}</div></div></body></html>`);
  await p.screenshot({ path: out('resources', 'icon-foreground.png'), omitBackground: true });
  // Adaptive-icon background layer and a mark-only SVG for the web
  await p.setContent(`<html><body style="margin:0"><div style="width:1024px;height:1024px;background:${BG}"></div></body></html>`);
  await p.screenshot({ path: out('resources', 'icon-background.png') });
  fs.writeFileSync(out('icons', 'mark.svg'), MARK);
  await shot(2732, 2732, 0.16, true, out('resources', 'splash.png'));
  await b.close();
  console.log('assets rendered');
})();

// Sets the app version everywhere it lives.  usage: node scripts/bump-version.mjs 7.2.0
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('usage: node scripts/bump-version.mjs X.Y.Z'); process.exit(2); }

const json = (file, edit) => {
  const p = join(root, file); const data = JSON.parse(readFileSync(p, 'utf8'));
  edit(data); writeFileSync(p, JSON.stringify(data, null, 2) + '\n'); console.log('updated', file);
};
for (const dir of ['', 'desktop/']) {
  json(`${dir}package.json`, (d) => { d.version = v; });
  json(`${dir}package-lock.json`, (d) => { d.version = v; if (d.packages?.['']) d.packages[''].version = v; });
}
const cfg = join(root, 'js/config.js');
const src = readFileSync(cfg, 'utf8');
if (!/APP_VERSION = '[^']+'/.test(src)) { console.error('APP_VERSION not found in js/config.js'); process.exit(1); }
writeFileSync(cfg, src.replace(/APP_VERSION = '[^']+'/, `APP_VERSION = '${v}'`)); console.log('updated js/config.js');

// iOS shows MARKETING_VERSION in TestFlight and the App Store.
const pbx = join(root, 'ios/App/App.xcodeproj/project.pbxproj');
if (existsSync(pbx)) { writeFileSync(pbx, readFileSync(pbx, 'utf8').replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${v};`)); console.log('updated ios project'); }

// The offline cache key hashes app files, so it changes with the version.
await import('./gen-sw.mjs');

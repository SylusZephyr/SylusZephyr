// Copies the web app into www/ for the native iOS build (Capacitor webDir).
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
const out = 'www';
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out);
for (const f of ['index.html', 'manifest.webmanifest', 'privacy.html', 'css', 'js', 'icons']) {
  if (existsSync(f)) cpSync(f, `${out}/${f}`, { recursive: true });
}
console.log('www/ built');

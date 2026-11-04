// Copies the web app into www/ (Capacitor webDir, also used by the desktop shell).
// Paths are resolved from the repository root so it works from any working directory.
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out);
for (const f of ['index.html', 'manifest.webmanifest', 'privacy.html', 'css', 'js', 'icons', 'img']) {
  const src = join(root, f);
  if (existsSync(src)) cpSync(src, join(out, f), { recursive: true });
}
console.log('www/ built');

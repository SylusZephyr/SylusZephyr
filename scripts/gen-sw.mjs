// Regenerates the precache list and cache version in sw.js from the files on disk.
// The version is a hash of every cached file, so any real change ships a fresh cache.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (dir) => readdirSync(join(root, dir)).flatMap((f) => {
  const p = join(dir, f);
  return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
});
const files = ['index.html', 'manifest.webmanifest', 'privacy.html', ...walk('css'), ...walk('js'), ...walk('icons'), ...walk('img')]
  .map((f) => f.split('\\').join('/')).sort();
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(readFileSync(join(root, f)));
const version = 'revive-' + hash.digest('hex').slice(0, 12);

const swPath = join(root, 'sw.js');
let sw = readFileSync(swPath, 'utf8');
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
sw = sw.replace(/const ASSETS = \[[\s\S]*?\];/, `const ASSETS = [\n  './',\n${files.map((f) => `  '${f}',`).join('\n')}\n];`);
writeFileSync(swPath, sw);
console.log(`sw.js: ${files.length} files, ${version}`);

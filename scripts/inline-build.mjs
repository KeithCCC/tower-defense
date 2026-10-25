import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const asset = name => {
  const path = resolve(dist, name.replace(/^\//, ''));
  if (!path.startsWith(dist + sep)) throw new Error(`Asset outside build directory: ${name}`);
  return readFileSync(path, 'utf8');
};

let html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const scripts = [];
html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (_tag, src) => {
  scripts.push(asset(src).replace(/<\/script/gi, '<\\/script'));
  return '';
});
if (scripts.length !== 1) throw new Error(`Expected one bundled entry script, got ${scripts.length}`);
html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_tag, href) =>
  `<style>${asset(href).replace(/<\/style/gi, '<\\/style')}</style>`);
// Classic scripts must run after #app exists; Vite's original module tag was deferred.
html = html.replace('</body>', () => `<script>${scripts[0]}</script>\n  </body>`);
writeFileSync(resolve(dist, 'index.html'), html);
writeFileSync(resolve(dist, 'waypoint.html'), html);
console.log('Single-file HTML: dist/waypoint.html (no external scripts or styles)');

import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const root = fs.existsSync(path.join(cwd, 'app'))
  ? path.join(cwd, 'app')
  : path.join(cwd, 'apps/web/app');
const pages = [];

// 1) запретные директории — ломаем сборку, если найдены
const forbidden = [
  path.join(root, 'project'),
  path.join(root, 'projects'),
  path.join(root, 'app') // вложенный app/*
];

const bad = forbidden.filter((p) => fs.existsSync(p));
if (bad.length) {
  console.error('[check-app-routes] Forbidden directories exist:\n  ' + bad.join('\n  '));
  process.exit(1);
}

// 2) обычная проверка коллизий страниц (инфо/варнинг)
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/^page\.tsx?$/.test(f.name)) {
      const url =
        p.replace(root, '').replace(/\/\([^)]*\)/g, '').replace(/\/page\.tsx?$/, '') || '/';
      pages.push({ file: p, url });
    }
  }
}
if (fs.existsSync(root)) walk(root);

const map = new Map();
for (const p of pages) {
  const arr = map.get(p.url) ?? [];
  arr.push(p.file);
  map.set(p.url, arr);
}

const conflicts = [...map.entries()].filter(([, files]) => files.length > 1);
if (conflicts.length) {
  const msg = conflicts.map(([u, files]) => `  ${u}\n    ${files.join('\n    ')}`).join('\n');
  console.warn('[check-app-routes] WARNING — route collisions detected:\n' + msg);
  // не падаем на предупреждении: падение только по forbidden dirs выше
} else {
  console.log('[check-app-routes] OK — no collisions');
}

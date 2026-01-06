import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(new URL('../', import.meta.url)));
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.next', '.turbo', '.vercel']);

const wipFiles = new Set();
const pageFiles = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) {
      continue;
    }
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath);
    } else if (stats.isFile()) {
      const rel = relative(rootDir, fullPath);
      if (rel.includes('_wip') || rel.includes('__drafts__')) {
        wipFiles.add(fullPath);
      }
      if (entry === 'page.tsx' && !rel.includes('_wip') && !rel.includes('__drafts__')) {
        pageFiles.push(fullPath);
      }
    }
  }
}

walk(rootDir);

const protectedWipFiles = new Set();
const errors = [];

const importPattern = /['"]([^'"\n]*?_wip\/[^'"\n]+)['"]/gu;

for (const pageFile of pageFiles) {
  const content = readFileSync(pageFile, 'utf8');
  if (content.includes('_wip/')) {
    const hasFeatureFlag =
      /process\.env\.NEXT_PUBLIC_FEATURE_[A-Z0-9_]*\s*===\s*'1'/u.test(content) ||
      /\bfeatureFlags\.[A-Za-z0-9_]+/u.test(content) ||
      /\bisFeatureEnabled\(['"][^'"]+['"]\)/u.test(content);
    const hasComingSoon = content.includes('FeatureComingSoon');
    if (!hasFeatureFlag || !hasComingSoon) {
      errors.push(`Файл ${relative(rootDir, pageFile)} использует _wip, но не содержит проверку флага и/или заглушку`);
    }

    for (const match of content.matchAll(importPattern)) {
      const specifier = match[1];
      if (!specifier.includes('_wip/')) {
        continue;
      }
      let resolvedPath;
      if (specifier.startsWith('.')) {
        resolvedPath = resolve(dirname(pageFile), specifier);
      } else {
        resolvedPath = resolve(rootDir, specifier);
      }

      const extension = extname(resolvedPath);
      const candidates = [];
      if (extension) {
        candidates.push(resolvedPath);
      } else {
        candidates.push(`${resolvedPath}.tsx`, `${resolvedPath}.ts`, `${resolvedPath}/page.tsx`);
      }

      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          protectedWipFiles.add(candidate);
          break;
        }
      }
    }
  }
}

for (const filePath of wipFiles) {
  if (!protectedWipFiles.has(filePath)) {
    errors.push(`Файл ${relative(rootDir, filePath)} находится в _wip/__drafts__, но для него не найден защищающий page.tsx`);
  }
}

if (errors.length > 0) {
  console.error('\u274c verify:preflight — найдены проблемы:\n');
  for (const message of errors) {
    console.error(` - ${message}`);
  }
  process.exit(1);
}

console.log('\u2705 verify:preflight — все _wip/__drafts__ защищены фич-флагами.');

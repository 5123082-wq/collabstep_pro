#!/usr/bin/env node

import { rmSync } from 'fs';
import { join } from 'path';

const projectRoot = new URL('.', import.meta.url).pathname.replace('/scripts/clean-all.mjs', '');

const dirsToRemove = [
  join(projectRoot, '.next'),
  join(projectRoot, 'node_modules', '.cache'),
];

console.log('[clean-all] Removing build artifacts...');

for (const dir of dirsToRemove) {
  try {
    rmSync(dir, { recursive: true, force: true });
    console.log(`[clean-all] ✓ Removed ${dir}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[clean-all] ✗ Failed to remove ${dir}:`, error.message);
    }
  }
}

console.log('[clean-all] Done!');


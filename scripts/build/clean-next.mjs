#!/usr/bin/env node
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const target = resolve(cwd, '.next');

try {
  rmSync(target, { recursive: true, force: true });
  console.info(`[clean-next] removed ${target}`);
} catch (error) {
  console.warn('[clean-next] unable to remove .next directory', error);
  process.exitCode = 0;
}

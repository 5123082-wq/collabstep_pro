import { execSync } from 'node:child_process';

const raw = process.env.SKIP_VERCEL_BUILD ?? '';
const normalized = raw.toString().trim().toLowerCase();
const shouldSkip = normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';

if (shouldSkip) {
  console.log('[verify] SKIP_VERCEL_BUILD=1 — пропускаем локальный vercel build');
  process.exit(0);
}

try {
  execSync('node scripts/utils/flags-snapshot.mjs', { stdio: 'inherit', env: process.env });
  execSync('npx vercel build --prod', { stdio: 'inherit', env: process.env });
} catch (error) {
  const status = typeof error.status === 'number' ? error.status : 1;
  process.exit(status);
}

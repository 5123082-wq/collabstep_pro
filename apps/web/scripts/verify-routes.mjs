import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const appDir = path.resolve('apps/web/app');
const invalidEntries = [];

const ignoreNames = new Set(['.DS_Store']);

function sanitizeName(name) {
  const withoutGroup = name.replace(/^\((.*)\)$/u, '$1');
  const withoutSlot = withoutGroup.replace(/^@/, '');
  const withoutDynamic = withoutSlot.replace(/^\[(.*)\]$/u, '$1');
  return withoutDynamic;
}

function checkNode(targetPath, relative = '') {
  const entries = readdirSync(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoreNames.has(entry.name)) {
      continue;
    }

    const relativePath = path.join(relative, entry.name);
    const cleanName = sanitizeName(entry.isFile() ? entry.name.replace(/\.[^/.]+$/, '') : entry.name);

    // Skip case enforcement under API routes
    const isInApi = relativePath.startsWith('api' + path.sep) || relative.startsWith('api' + path.sep) || relative === 'api';

    if (!isInApi) {
      if (cleanName && cleanName !== cleanName.toLowerCase()) {
        invalidEntries.push(relativePath);
      }
    }

    if (entry.isDirectory()) {
      checkNode(path.join(targetPath, entry.name), relativePath);
    }
  }
}

checkNode(appDir);

const requiredFiles = [
  'apps/web/app/(marketing)/page.tsx',
  'apps/web/app/(app)/layout.tsx'
];

const requiredMissing = requiredFiles.filter((filePath) => !existsSync(filePath));

if (invalidEntries.length > 0 || requiredMissing.length > 0) {
  if (invalidEntries.length > 0) {
    console.error('[verify-routes] Нарушение регистра в сегментах:', invalidEntries);
  }
  if (requiredMissing.length > 0) {
    console.error('[verify-routes] Отсутствуют критичные файлы:', requiredMissing);
  }
  process.exit(1);
}

if (!existsSync('apps/web/app/(project)/[id]/layout.tsx') && existsSync('apps/web/app/(project)/project/[id]/layout.tsx')) {
  console.warn('[verify-routes] Используется путь apps/web/app/(project)/project/[id]/layout.tsx. Убедитесь, что E2E и маршруты ожидают этот сегмент.');
}

console.log('[verify-routes] Маршруты проверены успешно');

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const serverAppDir = path.resolve('.next/server/app');
const sourceManifest = path.join(serverAppDir, 'page_client-reference-manifest.js');
const marketingDir = path.join(serverAppDir, '(marketing)');
const marketingManifest = path.join(marketingDir, 'page_client-reference-manifest.js');

if (!existsSync(sourceManifest)) {
  console.warn('[fix-manifests] Базовый манифест не найден, пропуск.');
  process.exit(0);
}

if (!existsSync(marketingDir)) {
  console.warn('[fix-manifests] Каталог (marketing) отсутствует, пропуск.');
  process.exit(0);
}

if (!existsSync(marketingManifest)) {
  mkdirSync(marketingDir, { recursive: true });
  const content = readFileSync(sourceManifest, 'utf8');
  const patched = content.replace('["/page"]', '["/(marketing)/page"]');

  if (patched === content) {
    console.warn('[fix-manifests] Не удалось найти ключ "/page" для замены. Файл не изменён.');
  } else {
    writeFileSync(marketingManifest, patched);
    console.log('[fix-manifests] Скопирован и обновлён page_client-reference-manifest.js для сегмента (marketing).');
  }
} else {
  console.log('[fix-manifests] Манифест для (marketing) уже существует.');
}

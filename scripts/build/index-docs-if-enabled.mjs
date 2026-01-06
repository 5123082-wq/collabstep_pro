#!/usr/bin/env node

/**
 * Скрипт для индексации документации AI ассистента во время build
 * Запускается только если:
 * 1. AI_ASSISTANT_API_KEY установлен
 * 2. NEXT_PUBLIC_FEATURE_AI_ASSISTANT=true
 * 3. Файл chunks.json не существует или устарел
 */

import { execSync } from 'child_process';
import { existsSync, statSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Корень репозитория: поднимаемся на 2 уровня вверх от scripts/build/
const repoRoot = join(__dirname, '..', '..');

const hasApiKey = !!process.env.AI_ASSISTANT_API_KEY;
const isFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_AI_ASSISTANT === 'true';

if (!hasApiKey || !isFeatureEnabled) {
  console.log('⏭️  Пропуск индексации документации:');
  if (!hasApiKey) {
    console.log('   • AI_ASSISTANT_API_KEY не установлен');
  }
  if (!isFeatureEnabled) {
    console.log('   • NEXT_PUBLIC_FEATURE_AI_ASSISTANT не включен');
  }
  process.exit(0);
}

// Проверяем существование файла индексации
// Используем корень репозитория для хранения индексации
const STORE_DIR = join(repoRoot, '.ai-assistant');
const STORE_FILE = join(STORE_DIR, 'chunks.json');

function shouldReindex() {
  // Если файла нет - нужно индексировать
  if (!existsSync(STORE_FILE)) {
    console.log('📚 Файл индексации не найден, требуется индексация');
    return true;
  }

  try {
    // Проверяем содержимое файла
    const storeContent = readFileSync(STORE_FILE, 'utf-8');
    const store = JSON.parse(storeContent);
    
    // Если файл пустой или поврежден - переиндексируем
    if (!store.chunks || store.chunks.length === 0) {
      console.log('📚 Файл индексации пустой, требуется индексация');
      return true;
    }

    // Проверяем дату последней индексации
    const indexedAt = store.indexedAt ? new Date(store.indexedAt) : null;
    const now = new Date();
    
    // Проверяем, что дата валидна (не Invalid Date)
    if (indexedAt && isNaN(indexedAt.getTime())) {
      console.log('📚 Дата индексации повреждена, требуется переиндексация');
      return true;
    }
    
    if (indexedAt) {
      const daysSinceIndex = (now - indexedAt) / (1000 * 60 * 60 * 24);
      
      // Если индексация старше 7 дней - переиндексируем
      if (daysSinceIndex > 7) {
        console.log(`📚 Индексация устарела (${Math.floor(daysSinceIndex)} дней назад), требуется обновление`);
        return true;
      }
      
      // Проверяем, изменилась ли документация (по git hash)
      try {
        const docsHash = execSync('git ls-files -s docs/ | git hash-object --stdin', {
          encoding: 'utf-8',
          cwd: repoRoot,
          shell: '/bin/sh',
        }).trim();
        
        // Сохраняем hash в файле индексации для сравнения
        if (store.docsHash && store.docsHash === docsHash) {
          console.log('✅ Индексация актуальна, пропускаем');
          return false;
        }
        
        console.log('📚 Документация изменилась, требуется переиндексация');
        return true;
      } catch (gitError) {
        // Если git команда не работает (например, на Vercel без git), проверяем только по дате
        console.log('⚠️  Не удалось проверить изменения в git, используем проверку по дате');
        return false; // Если файл свежий (меньше 7 дней), не переиндексируем
      }
    }
    
    // Если нет даты индексации, но файл есть - переиндексируем для безопасности
    console.log('📚 Дата индексации не найдена, требуется переиндексация');
    return true;
  } catch (error) {
    // Если файл поврежден - переиндексируем
    console.log('📚 Файл индексации поврежден, требуется переиндексация');
    return true;
  }
}

if (!shouldReindex()) {
  console.log('✅ Индексация уже выполнена и актуальна');
  process.exit(0);
}

console.log('📚 Запуск индексации документации для AI ассистента...');

try {
  // Проверяем, что скрипт индексации существует (относительно корня репозитория)
  const indexScript = join(repoRoot, 'scripts', 'build', 'index-assistant-docs.ts');
  if (!existsSync(indexScript)) {
    console.log('⚠️  Скрипт индексации не найден, пропускаем');
    process.exit(0);
  }

  // Запускаем индексацию
  // Используем npx tsx напрямую, чтобы гарантировать работу на Vercel
  // Путь относительно корня репозитория
  execSync('npx tsx scripts/build/index-assistant-docs.ts', {
    stdio: 'inherit',
    cwd: repoRoot,
    env: { ...process.env },
  });
  
  console.log('✅ Индексация завершена успешно');
} catch (error) {
  console.error('⚠️  Ошибка при индексации (продолжаем сборку):', error.message);
  // Не падаем, если индексация не удалась - сборка должна продолжиться
  process.exit(0);
}


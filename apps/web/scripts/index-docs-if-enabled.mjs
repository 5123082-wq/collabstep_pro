#!/usr/bin/env node

/**
 * Скрипт для индексации документации AI ассистента во время build
 * Запускается только если:
 * 1. AI_ASSISTANT_API_KEY установлен
 * 2. NEXT_PUBLIC_FEATURE_AI_ASSISTANT=true
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

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

console.log('📚 Запуск индексации документации для AI ассистента...');

try {
  // Проверяем, что скрипт индексации существует
  const indexScript = join(process.cwd(), 'scripts', 'index-assistant-docs.ts');
  if (!existsSync(indexScript)) {
    console.log('⚠️  Скрипт индексации не найден, пропускаем');
    process.exit(0);
  }

  // Запускаем индексацию
  // Используем npx tsx напрямую, чтобы гарантировать работу на Vercel
  execSync('npx tsx scripts/index-assistant-docs.ts', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env },
  });
  
  console.log('✅ Индексация завершена успешно');
} catch (error) {
  console.error('⚠️  Ошибка при индексации (продолжаем сборку):', error.message);
  // Не падаем, если индексация не удалась - сборка должна продолжиться
  process.exit(0);
}


#!/usr/bin/env node

/**
 * Скрипт для проверки ссылок в markdown файлах
 * 
 * Использование:
 *   pnpm docs:links              # Проверка без OpenAI ссылок (по умолчанию)
 *   MLC_CHECK_OPENAI=true pnpm docs:links  # Проверка с OpenAI ссылками
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const configPath = join(rootDir, '.mlc.config.json');
const backupPath = join(rootDir, '.mlc.config.json.backup');

// Проверяем, нужно ли проверять OpenAI ссылки
const checkOpenAI = process.env.MLC_CHECK_OPENAI === 'true';

try {
  // Читаем конфигурацию
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  
  // Создаем резервную копию
  writeFileSync(backupPath, JSON.stringify(config, null, 2));
  
  // Удаляем или добавляем паттерн для OpenAI
  if (checkOpenAI) {
    // Удаляем паттерн OpenAI из ignorePatterns
    config.ignorePatterns = config.ignorePatterns.filter(
      pattern => !pattern.pattern.includes('platform.openai.com')
    );
    console.log('✅ Проверка OpenAI ссылок включена');
  } else {
    // Убеждаемся, что паттерн OpenAI есть в ignorePatterns
    const hasOpenAIPattern = config.ignorePatterns.some(
      pattern => pattern.pattern.includes('platform.openai.com')
    );
    if (!hasOpenAIPattern) {
      config.ignorePatterns.push({
        pattern: "^https://platform\\.openai\\.com",
        description: "OpenAI links require authentication. Set MLC_CHECK_OPENAI=true to enable checking."
      });
    }
    console.log('ℹ️  Проверка OpenAI ссылок отключена (по умолчанию)');
    console.log('   Для включения используйте: MLC_CHECK_OPENAI=true pnpm docs:links');
  }
  
  // Сохраняем измененную конфигурацию
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Запускаем проверку ссылок
  console.log('\n🔍 Запуск проверки ссылок...\n');
  execSync(
    'find . -name "*.md" -not -path "./node_modules/*" -not -path "./apps/*/node_modules/*" -print0 | xargs -0 -n1 markdown-link-check -c .mlc.config.json',
    { 
      stdio: 'inherit',
      cwd: rootDir 
    }
  );
  
} catch (error) {
  console.error('❌ Ошибка при проверке ссылок:', error.message);
  process.exit(1);
} finally {
  // Восстанавливаем оригинальную конфигурацию из резервной копии
  try {
    if (existsSync(backupPath)) {
      const originalConfig = JSON.parse(readFileSync(backupPath, 'utf-8'));
      writeFileSync(configPath, JSON.stringify(originalConfig, null, 2));
      unlinkSync(backupPath);
    }
  } catch (e) {
    // Игнорируем ошибки восстановления
  }
}


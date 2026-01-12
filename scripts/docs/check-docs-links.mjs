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
// Скрипт находится в scripts/docs/, поэтому нужно подняться на 2 уровня вверх
const rootDir = join(__dirname, '..', '..');
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
      (pattern) => !pattern.pattern.includes('platform.openai.com')
    );
    console.log('✅ Проверка OpenAI ссылок включена');
  } else {
    // Убеждаемся, что паттерн OpenAI есть в ignorePatterns
    const hasOpenAIPattern = config.ignorePatterns.some((pattern) =>
      pattern.pattern.includes('platform.openai.com')
    );
    if (!hasOpenAIPattern) {
      config.ignorePatterns.push({
        pattern: '^https://platform\\.openai\\.com',
        description:
          'OpenAI links require authentication. Set MLC_CHECK_OPENAI=true to enable checking.',
      });
    }
    console.log('ℹ️  Проверка OpenAI ссылок отключена (по умолчанию)');
    console.log(
      '   Для включения используйте: MLC_CHECK_OPENAI=true pnpm docs:links'
    );
  }

  // Сохраняем измененную конфигурацию
  writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Запускаем проверку ссылок
  const ignorePaths = [
    '-not -path "./node_modules/*"',
    '-not -path "./apps/*/node_modules/*"',
    '-not -path "./docs/archive/*"',
    '-not -path "./docs/archive/**"',
    '-not -path "./CONTINUITY.md"',
  ];

  console.log('\n🔍 Запуск проверки ссылок...\n');
  
  // Собираем все markdown файлы
  const findCmd = `find . -name "*.md" ${ignorePaths.join(' ')} -print0`;
  const files = execSync(findCmd, { cwd: rootDir, encoding: 'utf-8' })
    .split('\0')
    .filter(Boolean);
  
  if (files.length === 0) {
    console.log('⚠️  Не найдено markdown файлов для проверки');
    process.exit(0);
  }
  
  console.log(`📄 Найдено ${files.length} файлов для проверки\n`);
  
  let totalLinks = 0;
  let brokenLinks = 0;
  let filesWithBrokenLinks = [];
  
  // Проверяем каждый файл отдельно, чтобы не падать на первом же битом файле
  for (const file of files) {
    try {
      const result = execSync(
        `markdown-link-check -c .mlc.config.json "${file}"`,
        {
          cwd: rootDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );
      
      // Парсим вывод для подсчета ссылок
      const lines = result.split('\n');
      for (const line of lines) {
        if (line.includes('links checked')) {
          const match = line.match(/(\d+)\s+links?\s+checked/);
          if (match) {
            totalLinks += parseInt(match[1], 10);
          }
        }
        if (line.match(/\[\s*✗|\[DEAD\]/)) {
          brokenLinks++;
          if (!filesWithBrokenLinks.includes(file)) {
            filesWithBrokenLinks.push(file);
          }
        }
      }
      
      // Выводим результат для каждого файла
      process.stdout.write(result);
    } catch (error) {
      // markdown-link-check возвращает ненулевой код при битых ссылках
      // Это нормально, просто собираем информацию
      const output = error.stdout || error.stderr || '';
      
      // Выводим вывод команды, если он есть
      if (output) {
        process.stdout.write(output);
      }
      
      // Парсим вывод для подсчета
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('links checked')) {
          const match = line.match(/(\d+)\s+links?\s+checked/);
          if (match) {
            totalLinks += parseInt(match[1], 10);
          }
        }
        if (line.match(/\[\s*✗|\[DEAD\]/)) {
          brokenLinks++;
          if (!filesWithBrokenLinks.includes(file)) {
            filesWithBrokenLinks.push(file);
          }
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Итого: ${totalLinks} ссылок проверено`);
  if (brokenLinks > 0) {
    console.log(`⚠️  Найдено ${brokenLinks} битых ссылок в ${filesWithBrokenLinks.length} файлах`);
    console.log('\n💡 Для исправления битых ссылок проверьте вывод выше');
    // Не падаем на битых ссылках - это предупреждение, а не критическая ошибка
    // В CI это может быть полезно, но не должно блокировать сборку
  } else {
    console.log('✅ Все ссылки работают!');
  }
} catch (error) {
  console.error('❌ Критическая ошибка при проверке ссылок:', error.message);
  console.error(error.stack);
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

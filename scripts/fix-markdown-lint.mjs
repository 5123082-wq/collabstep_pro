#!/usr/bin/env node

/**
 * Скрипт для автоматического исправления ошибок markdownlint
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

function getAllMarkdownFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && !file.startsWith('.')) {
        getAllMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function fixMarkdownFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  const lines = content.split('\n');

  // MD040: Добавить язык к блокам кода без языка (``` -> ```text)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '```' && i > 0 && !lines[i-1].includes('```')) {
      // Проверяем, что следующий блок не является закрывающим
      if (i < lines.length - 1 && lines[i+1].trim() !== '' && !lines[i+1].startsWith('```')) {
        lines[i] = '```text';
        modified = true;
      }
    }
  }

  // MD022: Добавить пустые строки вокруг заголовков
  const newLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = /^#{1,6}\s+.+/.test(line);
    
    if (isHeading) {
      // Добавить пустую строку перед заголовком
      if (i > 0 && newLines[newLines.length - 1] !== '') {
        newLines.push('');
      }
      newLines.push(line);
      // Добавить пустую строку после заголовка
      if (i < lines.length - 1 && lines[i + 1] !== '' && !lines[i + 1].match(/^#{1,6}\s+/)) {
        newLines.push('');
      }
    } else {
      newLines.push(line);
    }
  }

  // MD026: Убрать знаки препинания из конца заголовков
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    if (/^#{1,6}\s+.+/.test(line)) {
      const newLine = line.replace(/([:!?]+)\s*$/, '');
      if (newLine !== line) {
        newLines[i] = newLine;
        modified = true;
      }
    }
  }

  if (modified) {
    writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    return true;
  }
  return false;
}

function main() {
  const rootDir = process.cwd();
  const files = getAllMarkdownFiles(rootDir);
  
  let fixedCount = 0;
  for (const file of files) {
    try {
      if (fixMarkdownFile(file)) {
        fixedCount++;
        console.log(`Fixed: ${relative(rootDir, file)}`);
      }
    } catch (error) {
      console.error(`Error fixing ${file}:`, error.message);
    }
  }
  
  console.log(`\nFixed ${fixedCount} files out of ${files.length}`);
}

main().catch(console.error);

#!/usr/bin/env node

/**
 * Скрипт для исправления MD022 - добавление пустых строк вокруг заголовков
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

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

function fixMD022(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const newLines = [];
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = /^#{1,6}\s+.+/.test(line);
    
    if (isHeading) {
      // Добавить пустую строку перед заголовком, если её нет
      if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
        newLines.push('');
        modified = true;
      }
      
      newLines.push(line);
      
      // Добавить пустую строку после заголовка, если её нет
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1];
        // Если следующая строка не пустая и не заголовок и не начало блока кода
        if (nextLine.trim() !== '' && 
            !/^#{1,6}\s+/.test(nextLine) && 
            !nextLine.trim().startsWith('```')) {
          newLines.push('');
          modified = true;
        }
      }
    } else {
      newLines.push(line);
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
      if (fixMD022(file)) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`Error fixing ${file}:`, error.message);
    }
  }
  
  console.log(`Fixed MD022 in ${fixedCount} files`);
}

main();


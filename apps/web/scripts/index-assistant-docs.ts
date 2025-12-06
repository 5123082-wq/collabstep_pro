#!/usr/bin/env npx tsx

/**
 * AI Assistant Documentation Indexer
 * Индексирует документацию из папки docs/ для RAG системы
 * 
 * Использование:
 *   pnpm --filter @collabverse/web index-assistant-docs
 *   или
 *   cd apps/web && npx tsx scripts/index-assistant-docs.ts
 */

// Загрузка переменных окружения из .env.local
import { config } from 'dotenv';
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname, relative } from 'path';
import { createHash } from 'crypto';
import OpenAI from 'openai';

// Загружаем .env.local
config({ path: join(process.cwd(), '.env.local') });

const DOCS_DIR = join(process.cwd(), '..', '..', 'docs');
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

// Хранилище
const STORE_DIR = join(process.cwd(), '.ai-assistant');
const STORE_FILE = join(STORE_DIR, 'chunks.json');

// Интерфейс для чанка (упрощённый для скрипта)
interface DocumentationChunk {
  id: string;
  source: string;
  chunkText: string;
  embedding: number[];
  section: string | undefined;
  metadata: { title: string | undefined } | undefined;
}

// OpenAI клиент
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.AI_ASSISTANT_API_KEY;
    if (!apiKey) {
      throw new Error(
        'AI_ASSISTANT_API_KEY is not set.\n' +
        'Please add it to your .env.local file:\n' +
        'AI_ASSISTANT_API_KEY=sk-proj-your-key'
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

async function createEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const model = process.env.AI_ASSISTANT_MODEL_EMBED || 'text-embedding-3-small';
  
  const response = await client.embeddings.create({
    model,
    input: text.trim(),
  });
  
  return response.data[0]?.embedding ?? [];
}

function extractSection(filePath: string): string | undefined {
  const relPath = relative(DOCS_DIR, filePath);
  const parts = relPath.split('/');
  if (parts.length > 1) {
    return parts[0];
  }
  return undefined;
}

function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  
  if (!text || text.length === 0) {
    return chunks;
  }
  
  // Для коротких текстов возвращаем как один чанк
  if (text.length <= chunkSize) {
    if (text.trim().length > 50) {
      chunks.push(text.trim());
    }
    return chunks;
  }
  
  let start = 0;
  const effectiveOverlap = Math.min(overlap, chunkSize - 1);
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    
    // Двигаемся вперёд, гарантируя прогресс
    const nextStart = end - effectiveOverlap;
    if (nextStart <= start) {
      start = end; // Принудительный прогресс
    } else {
      start = nextStart;
    }
    
    // Защита от слишком большого количества чанков
    if (chunks.length > 1000) {
      console.warn('   ⚠️  Слишком много чанков, обрезаем');
      break;
    }
  }
  
  return chunks;
}

function cleanMarkdown(content: string): string {
  return content
    .replace(/^#+\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Собираем все файлы для индексации
function collectFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.name.startsWith('.') || 
        entry.name === 'node_modules' ||
        entry.name === 'archive') {
      continue;
    }
    
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (entry.isFile() && ['.md', '.txt'].includes(extname(entry.name))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function main() {
  console.log('🚀 AI Assistant Documentation Indexer\n');
  console.log(`📁 Директория: ${DOCS_DIR}`);
  console.log(`📦 Размер чанка: ${CHUNK_SIZE} символов`);
  console.log(`🔗 Перекрытие: ${CHUNK_OVERLAP} символов\n`);
  
  if (!process.env.AI_ASSISTANT_API_KEY) {
    console.error('❌ AI_ASSISTANT_API_KEY не установлен!');
    console.error('   Добавьте его в apps/web/.env.local:');
    console.error('   AI_ASSISTANT_API_KEY=sk-proj-your-key\n');
    process.exit(1);
  }
  
  if (!existsSync(DOCS_DIR)) {
    console.error(`❌ Директория ${DOCS_DIR} не найдена!`);
    process.exit(1);
  }
  
  // Создаём директорию хранилища
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
  
  // Собираем файлы
  const files = collectFiles(DOCS_DIR);
  console.log(`📚 Найдено ${files.length} файлов для индексации\n`);
  
  if (files.length === 0) {
    console.log('⚠️  Не найдено файлов для индексации.');
    return;
  }
  
  const allChunks: DocumentationChunk[] = [];
  const startTime = Date.now();
  let processedFiles = 0;
  let totalChunks = 0;
  
  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8');
    const cleanText = cleanMarkdown(content);
    
    if (cleanText.length < 100) {
      console.log(`⏭️  Пропущен: ${relative(DOCS_DIR, filePath)} (короткий)`);
      continue;
    }
    
    const section = extractSection(filePath);
    const textChunks = splitIntoChunks(cleanText, CHUNK_SIZE, CHUNK_OVERLAP);
    const fileName = filePath.split('/').pop()?.replace(extname(filePath), '') || 'unknown';
    
    console.log(`📄 ${relative(DOCS_DIR, filePath)} (${textChunks.length} чанков)`);
    
    for (let i = 0; i < textChunks.length; i++) {
      const chunkText = textChunks[i];
      if (!chunkText) continue;
      
      const chunkId = createHash('sha256')
        .update(filePath + '|' + i)
        .digest('hex')
        .slice(0, 16);
      
      try {
        const embedding = await createEmbedding(chunkText);
        
        allChunks.push({
          id: chunkId,
          source: relative(join(process.cwd(), '..', '..'), filePath),
          chunkText,
          embedding,
          section,
          metadata: { title: fileName },
        });
        
        totalChunks++;
        
        // Rate limiting - пауза каждые 5 запросов
        if (totalChunks % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`   ❌ Ошибка чанка ${i}:`, error instanceof Error ? error.message : error);
      }
    }
    
    processedFiles++;
    
    // Сохраняем промежуточный результат каждые 10 файлов
    if (processedFiles % 10 === 0) {
      console.log(`\n💾 Промежуточное сохранение (${allChunks.length} чанков)...`);
      const store = {
        chunks: allChunks,
        indexedAt: new Date().toISOString(),
        version: 1,
      };
      writeFileSync(STORE_FILE, JSON.stringify(store), 'utf-8');
      console.log(`   Продолжаем...\n`);
    }
  }
  
  // Финальное сохранение
  console.log('\n💾 Финальное сохранение...');
  const store = {
    chunks: allChunks,
    indexedAt: new Date().toISOString(),
    version: 1,
  };
  writeFileSync(STORE_FILE, JSON.stringify(store), 'utf-8');
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Статистика
  console.log('\n' + '='.repeat(50));
  console.log('✅ Индексация завершена!');
  console.log(`📊 Статистика:`);
  console.log(`   • Файлов обработано: ${processedFiles}`);
  console.log(`   • Всего чанков: ${allChunks.length}`);
  console.log(`   • Время: ${duration}s`);
  console.log(`   • Хранилище: ${STORE_FILE}`);
  
  // Группируем по разделам
  const sectionCounts = allChunks.reduce<Record<string, number>>((acc, chunk) => {
    const section = chunk.section || 'root';
    acc[section] = (acc[section] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`\n📂 По разделам:`);
  Object.entries(sectionCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([section, count]) => {
      console.log(`   • ${section}: ${count} чанков`);
    });
  
  console.log('\n🎉 AI-ассистент готов к работе!\n');
}

main().catch((error) => {
  console.error('❌ Ошибка индексации:', error);
  process.exit(1);
});

/**
 * AI Assistant Vector Store
 * JSON-based хранилище для векторов документации
 * Данные хранятся в .ai-assistant/chunks.json в корне репозитория
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ChunkStore, DocumentationChunk, StoreStats } from './types';

/**
 * Определяет корень репозитория для хранения индекса
 * Синхронизировано с логикой в index-assistant-docs.ts и indexing-config.ts
 */
function getRepoRoot(): string {
  const cwd = process.cwd();

  // Проверяем, есть ли docs/ в текущей директории (значит мы в корне репо)
  if (existsSync(join(cwd, 'docs'))) {
    return cwd;
  }

  // Проверяем на 2 уровня выше (если cwd = apps/web)
  const twoUp = join(cwd, '..', '..');
  if (existsSync(join(twoUp, 'docs'))) {
    return twoUp;
  }

  // Fallback на cwd
  return cwd;
}

const REPO_ROOT = getRepoRoot();
const STORE_DIR = join(REPO_ROOT, '.ai-assistant');
const STORE_FILE = join(STORE_DIR, 'chunks.json');

/**
 * Убедиться, что директория хранилища существует
 */
function ensureStoreDir(): void {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
}

/**
 * Загрузить хранилище из файла
 */
function loadStore(): ChunkStore {
  ensureStoreDir();
  
  if (!existsSync(STORE_FILE)) {
    return {
      chunks: [],
      indexedAt: new Date().toISOString(),
      version: 1,
    };
  }
  
  try {
    const content = readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(content) as ChunkStore;
  } catch (error) {
    console.error('Failed to load vector store:', error);
    return {
      chunks: [],
      indexedAt: new Date().toISOString(),
      version: 1,
    };
  }
}

/**
 * Сохранить хранилище в файл
 */
function saveStore(store: ChunkStore): void {
  ensureStoreDir();
  
  try {
    writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save vector store:', error);
    throw error;
  }
}

/**
 * Сохранить чанк (upsert - обновит если уже существует)
 */
export function saveChunk(chunk: DocumentationChunk): void {
  const store = loadStore();
  
  // Удаляем существующий чанк с таким же ID (upsert)
  store.chunks = store.chunks.filter(c => c.id !== chunk.id);
  
  // Добавляем новый
  store.chunks.push(chunk);
  store.indexedAt = new Date().toISOString();
  
  saveStore(store);
}

/**
 * Сохранить несколько чанков за раз (batch upsert)
 */
export function saveChunks(chunks: DocumentationChunk[]): void {
  const store = loadStore();
  
  // Создаём Map для быстрого поиска новых чанков по ID
  const newChunksMap = new Map(chunks.map(c => [c.id, c]));
  
  // Фильтруем существующие чанки, исключая те, что будут заменены
  store.chunks = store.chunks.filter(c => !newChunksMap.has(c.id));
  
  // Добавляем все новые чанки
  store.chunks.push(...chunks);
  store.indexedAt = new Date().toISOString();
  
  saveStore(store);
}

/**
 * Получить все чанки
 */
export function getAllChunks(): DocumentationChunk[] {
  const store = loadStore();
  return store.chunks;
}

/**
 * Очистить все чанки
 */
export function clearAllChunks(): void {
  const store: ChunkStore = {
    chunks: [],
    indexedAt: new Date().toISOString(),
    version: 1,
  };
  saveStore(store);
}

/**
 * Получить чанки по разделу
 */
export function getChunksBySection(section: string): DocumentationChunk[] {
  const store = loadStore();
  return store.chunks.filter(chunk => chunk.section === section);
}

/**
 * Получить статистику хранилища
 */
export function getStoreStats(): StoreStats {
  const store = loadStore();
  return {
    totalChunks: store.chunks.length,
    indexedAt: store.indexedAt,
  };
}

/**
 * Проверить, существует ли хранилище
 */
export function storeExists(): boolean {
  return existsSync(STORE_FILE);
}

/**
 * Получить путь к директории хранилища
 */
export function getStorePath(): string {
  return STORE_DIR;
}


# 🤖 План внедрения AI-ассистента для изучения платформы

> **Версия:** 1.0  
> **Дата создания:** 2025-01-27  
> **Статус:** 📋 Готов к реализации

---

## 📋 Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Архитектура решения](#архитектура-решения)
3. [Этап 0: Подготовка (ручная настройка)](#этап-0-подготовка-ручная-настройка)
4. [Этап 1: Настройка RAG системы и бэкенда](#этап-1-настройка-rag-системы-и-бэкенда)
5. [Этап 2: Скрипт индексации документации](#этап-2-скрипт-индексации-документации)
6. [Этап 3: Реализация поиска и ответов](#этап-3-реализация-поиска-и-ответов)
7. [Этап 4: Интеграция с поиском в AppTopbar](#этап-4-интеграция-с-поиском-в-apptopbar)
8. [Этап 5: Управление ассистентами в админ-панели](#этап-5-управление-ассистентами-в-админ-панели)
9. [Этап 6: Расширение функционала](#этап-6-расширение-функционала)
10. [Ответы на вопросы](#ответы-на-вопросы)

---

## 🎯 Обзор проекта

### Цель

Реализовать AI-ассистента, который:
- Помогает пользователям изучать платформу через контекстные подсказки
- Интегрирован с окном поиска и подстраивается под текущую вкладку
- Управляется администраторами через отдельную вкладку в админ-панели
- Использует **отдельный API ключ OpenAI** для изоляции затрат
- В будущем сможет создавать проекты и задачи за пользователя

### Особенности платформы

- **Monorepo структура**: `apps/api` (бэкенд), `apps/web` (Next.js фронтенд)
- **База данных**: PostgreSQL через Drizzle ORM (НЕ SQLite)
- **Существующая AI инфраструктура**: OpenAI/Yandex клиенты, endpoints `/api/ai/*`
- **Система поиска**: `AppTopbar` с полем поиска, `CommandPalette`, `deepSearch.ts`
- **Админ-панель**: `/admin` с вкладками, страница `/admin/ai-agents` (заглушка)
- **Документация**: `docs/` с markdown файлами
- **Feature flags**: система флагов в `lib/flags.ts`

---

## 🏗️ Архитектура решения

```
┌─────────────────────────────────────────────────────────┐
│              Frontend (apps/web/)                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  AppTopbar (окно поиска)                       │    │
│  │  - Определение текущей вкладки                 │    │
│  │  - Контекстные подсказки AI                    │    │
│  └──────────────┬─────────────────────────────────┘    │
│                 │                                        │
│  ┌──────────────▼─────────────────────────────────┐    │
│  │  AdminPanel (/admin/ai-assistants)             │    │
│  │  - Управление ассистентами                     │    │
│  │  - Настройка API ключей                        │    │
│  └──────────────┬─────────────────────────────────┘    │
└─────────────────┼────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│           API Routes (apps/web/app/api/)                 │
│                                                          │
│  POST /api/ai-assistant/ask                              │
│  POST /api/ai-assistant/suggestions                      │
│  POST /api/admin/ai-assistants (CRUD)                    │
│  POST /api/admin/ai-assistants/index-docs                │
└─────────────────┬────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│        AI Services (apps/web/lib/ai-assistant/)          │
│                                                          │
│  - rag-search.ts (поиск по документации)                │
│  - assistant-service.ts (логика ассистента)              │
│  - context-detector.ts (определение контекста)           │
│  - embeddings.ts (работа с OpenAI embeddings)            │
└─────────────────┬────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│      Vector Store (JSON файл / PostgreSQL)               │
│                                                          │
│  - Документация из docs/                                 │
│  - Чанки с embeddings                                    │
│  - Метаданные (источник, раздел)                         │
└─────────────────┬────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│              OpenAI API (AI_ASSISTANT_API_KEY)           │
│                                                          │
│  - text-embedding-3-small (embeddings)                   │
│  - gpt-5-nano (чат, дешевая модель)                     │
└──────────────────────────────────────────────────────────┘
```

---

## 📝 Этап 0: Подготовка (ручная настройка)

### Задачи для разработчика

1. **Создать API ключ для ассистента** (отдельный от существующего)
   - Открыть https://platform.openai.com/api-keys
   - Создать новый ключ специально для ассистента (например, `sk-proj-...`)
   - Сохранить ключ (он показывается только один раз!)

2. **Добавить переменные окружения**
   
   В файл `apps/web/.env.local` добавить:
   
   ```bash
   # AI Assistant отдельный ключ (НЕ конфликтует с OPENAI_API_KEY)
   AI_ASSISTANT_API_KEY=sk-proj-ваш-ключ-для-ассистента
   
   # Модели для ассистента (опционально)
   AI_ASSISTANT_MODEL_CHAT=gpt-5-nano
   AI_ASSISTANT_MODEL_EMBED=text-embedding-3-small
   
   # Feature flag для ассистента
   NEXT_PUBLIC_FEATURE_AI_ASSISTANT=true
   FEATURE_AI_ASSISTANT=true
   ```

   ⚠️ **Важно**: `AI_ASSISTANT_API_KEY` - это **отдельный ключ**, не конфликтующий с существующим `OPENAI_API_KEY`, который используется для других AI функций платформы.

3. **Проверить .gitignore**
   
   Убедиться, что `.env.local` в `.gitignore`:
   
   ```bash
   # В корне проекта или apps/web/
   .env.local
   .env*.local
   ```

4. **Установить зависимости**
   
   ```bash
   cd apps/web
   pnpm add openai
   ```

---

## 🔧 Этап 1: Настройка RAG системы и бэкенда

### 1.1 Создать структуру папок

```
apps/web/
├── lib/
│   └── ai-assistant/
│       ├── rag-search.ts          # Поиск по векторной БД
│       ├── assistant-service.ts   # Основная логика ассистента
│       ├── context-detector.ts    # Определение контекста страницы
│       ├── embeddings.ts          # Работа с embeddings
│       ├── vector-store.ts        # Хранилище векторов (JSON)
│       └── types.ts               # Типы для ассистента
├── app/
│   └── api/
│       ├── ai-assistant/
│       │   ├── ask/route.ts       # Основной endpoint для вопросов
│       │   └── suggestions/route.ts # Контекстные подсказки
│       └── admin/
│           └── ai-assistants/
│               ├── route.ts       # CRUD ассистентов
│               └── index-docs/route.ts # Переиндексация
└── scripts/
    └── index-assistant-docs.ts    # Скрипт индексации
```

### 1.2 Создать типы

**Файл:** `apps/web/lib/ai-assistant/types.ts`

```typescript
export interface DocumentationChunk {
  id: string;
  source: string; // Путь к файлу
  chunkText: string;
  embedding: number[];
  section?: string; // Раздел из пути (например, 'getting-started')
  metadata?: {
    title?: string;
    lastModified?: string;
  };
}

export interface AssistantConfig {
  id: string;
  name: string;
  description: string;
  apiKey: string; // Отдельный ключ для ассистента
  modelChat: string;
  modelEmbed: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantQuestion {
  message: string;
  context?: {
    currentPath?: string;
    section?: string;
    userId?: string;
  };
  sessionId?: string;
}

export interface AssistantResponse {
  answer: string;
  sources?: string[]; // Источники документации
  suggestions?: string[]; // Следующие вопросы
}

export interface ContextualSuggestion {
  id: string;
  text: string;
  description?: string;
  icon?: string;
}
```

### 1.3 Создать модуль для работы с OpenAI (ассистент)

**Файл:** `apps/web/lib/ai-assistant/embeddings.ts`

```typescript
import OpenAI from 'openai';

let assistantOpenAI: OpenAI | null = null;

function getAssistantOpenAIClient(): OpenAI {
  if (!assistantOpenAI) {
    // Используем ОТДЕЛЬНЫЙ ключ для ассистента
    const apiKey = process.env.AI_ASSISTANT_API_KEY;
    if (!apiKey) {
      throw new Error(
        'AI_ASSISTANT_API_KEY is not set. Please add it to your .env.local file.\n' +
        'Это отдельный ключ от OPENAI_API_KEY, который используется для других AI функций.'
      );
    }
    assistantOpenAI = new OpenAI({ apiKey });
  }
  return assistantOpenAI;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const client = getAssistantOpenAIClient();
  const model = process.env.AI_ASSISTANT_MODEL_EMBED || 'text-embedding-3-small';
  
  const response = await client.embeddings.create({
    model,
    input: text.trim(),
  });
  
  return response.data[0].embedding;
}

export async function generateChatResponse(
  systemPrompt: string,
  userMessage: string,
  contextChunks: Array<{ text: string; source: string }>
): Promise<string> {
  const client = getAssistantOpenAIClient();
  // Используем gpt-5-nano как указано (если модель недоступна, будет ошибка от API)
  const model = process.env.AI_ASSISTANT_MODEL_CHAT || 'gpt-5-nano';
  
  // Формируем контекст из найденных чанков
  const contextText = contextChunks
    .map((chunk, idx) => `[Источник ${idx + 1}: ${chunk.source}]\n${chunk.text}`)
    .join('\n\n---\n\n');
  
  const messages = [
    {
      role: 'system' as const,
      content: systemPrompt,
    },
    {
      role: 'user' as const,
      content: `Контекст из документации:\n\n${contextText}\n\n---\n\nВопрос пользователя: ${userMessage}\n\nОтветь кратко (2-4 предложения) на основе предоставленной документации. Если ответа нет в документации, честно скажи об этом.`,
    },
  ];
  
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 300, // Ограничение для краткости
  });
  
  return response.choices[0]?.message?.content || 'Извините, не удалось сформировать ответ.';
}
```

### 1.4 Создать векторное хранилище (JSON файл)

**Важно**: Поскольку основная БД - PostgreSQL, а не SQLite, мы используем JSON файл для простоты. В будущем можно мигрировать на PostgreSQL с расширением pgvector.

**Файл:** `apps/web/lib/ai-assistant/vector-store.ts`

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { DocumentationChunk } from './types';

const STORE_DIR = join(process.cwd(), '.ai-assistant');
const STORE_FILE = join(STORE_DIR, 'chunks.json');

// Убедиться, что директория существует
if (!existsSync(STORE_DIR)) {
  mkdirSync(STORE_DIR, { recursive: true });
}

interface ChunkStore {
  chunks: DocumentationChunk[];
  indexedAt: string;
  version: number;
}

function loadStore(): ChunkStore {
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

function saveStore(store: ChunkStore): void {
  try {
    writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save vector store:', error);
    throw error;
  }
}

export function saveChunk(chunk: DocumentationChunk): void {
  const store = loadStore();
  
  // Удаляем существующий чанк с таким же ID (upsert)
  store.chunks = store.chunks.filter(c => c.id !== chunk.id);
  
  // Добавляем новый
  store.chunks.push(chunk);
  store.indexedAt = new Date().toISOString();
  
  saveStore(store);
}

export function getAllChunks(): DocumentationChunk[] {
  const store = loadStore();
  return store.chunks;
}

export function clearAllChunks(): void {
  const store: ChunkStore = {
    chunks: [],
    indexedAt: new Date().toISOString(),
    version: 1,
  };
  saveStore(store);
}

export function getChunksBySection(section: string): DocumentationChunk[] {
  const store = loadStore();
  return store.chunks.filter(chunk => chunk.section === section);
}

export function getStoreStats(): { totalChunks: number; indexedAt: string } {
  const store = loadStore();
  return {
    totalChunks: store.chunks.length,
    indexedAt: store.indexedAt,
  };
}
```

### 1.5 Добавить .ai-assistant в .gitignore

**Файл:** `.gitignore` (в корне проекта или `apps/web/.gitignore`)

Добавить:
```
.ai-assistant/
```

---

## 📚 Этап 2: Скрипт индексации документации

### 2.1 Создать скрипт индексации

**Файл:** `apps/web/scripts/index-assistant-docs.ts`

```typescript
#!/usr/bin/env ts-node

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';
import { createEmbedding } from '../lib/ai-assistant/embeddings';
import { saveChunk, clearAllChunks, getAllChunks, getStoreStats } from '../lib/ai-assistant/vector-store';
import { createHash } from 'crypto';

const DOCS_DIR = join(process.cwd(), '..', '..', 'docs');
const CHUNK_SIZE = 800; // Символов на чанк
const CHUNK_OVERLAP = 100; // Перекрытие между чанками

function extractSection(filePath: string): string | undefined {
  const relPath = relative(DOCS_DIR, filePath);
  const parts = relPath.split('/');
  
  // Извлекаем первую часть пути как раздел
  if (parts.length > 1 && parts[0] !== 'docs') {
    return parts[0];
  }
  return undefined;
}

function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }
  
  return chunks.filter(chunk => chunk.length > 50); // Игнорируем слишком короткие
}

async function indexFile(filePath: string): Promise<void> {
  const content = readFileSync(filePath, 'utf-8');
  
  // Простой парсинг markdown: удаляем markdown синтаксис для чистого текста
  const cleanText = content
    .replace(/^#+\s+/gm, '') // Заголовки
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Ссылки
    .replace(/`([^`]+)`/g, '$1') // Инлайн код
    .replace(/```[\s\S]*?```/g, '') // Блоки кода
    .replace(/\*\*([^\*]+)\*\*/g, '$1') // Жирный текст
    .replace(/\*([^\*]+)\*/g, '$1') // Курсив
    .trim();
  
  if (cleanText.length < 100) {
    console.log(`⏭️  Пропущен ${filePath} (слишком короткий)`);
    return;
  }
  
  const section = extractSection(filePath);
  const chunks = splitIntoChunks(cleanText, CHUNK_SIZE, CHUNK_OVERLAP);
  
  console.log(`📄 Индексирую ${filePath} (${chunks.length} чанков, раздел: ${section || 'none'})`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const chunkId = createHash('sha256')
      .update(filePath + '|' + i)
      .digest('hex');
    
    try {
      const embedding = await createEmbedding(chunkText);
      
      saveChunk({
        id: chunkId,
        source: relative(process.cwd(), filePath),
        chunkText,
        embedding,
        section,
        metadata: {
          title: filePath.split('/').pop()?.replace(extname(filePath), ''),
        },
      });
      
      // Небольшая задержка чтобы не превысить rate limits
      if ((i + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Ошибка при индексации чанка ${i} из ${filePath}:`, error);
    }
  }
}

async function indexDirectory(dir: string): Promise<void> {
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    // Пропускаем скрытые файлы и node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    
    if (entry.isDirectory()) {
      await indexDirectory(fullPath);
    } else if (entry.isFile() && ['.md', '.txt'].includes(extname(entry.name))) {
      await indexFile(fullPath);
    }
  }
}

async function main() {
  console.log('🚀 Начинаю индексацию документации...\n');
  
  if (!existsSync(DOCS_DIR)) {
    console.error(`❌ Директория ${DOCS_DIR} не найдена!`);
    process.exit(1);
  }
  
  // Очищаем старые данные (опционально, можно сделать upsert)
  console.log('🧹 Очищаю старые данные...');
  clearAllChunks();
  
  // Индексируем
  await indexDirectory(DOCS_DIR);
  
  // Проверяем результат
  const stats = getStoreStats();
  console.log(`\n✅ Индексация завершена! Всего чанков: ${stats.totalChunks}`);
  console.log(`📅 Дата индексации: ${stats.indexedAt}`);
}

// Запуск
main().catch(console.error);
```

### 2.2 Добавить скрипт в package.json

**Файл:** `apps/web/package.json`

Добавить в секцию `scripts`:

```json
{
  "scripts": {
    "index-assistant-docs": "ts-node scripts/index-assistant-docs.ts"
  }
}
```

---

## 🔍 Этап 3: Реализация поиска и ответов

### 3.1 Создать модуль поиска по векторной БД

**Файл:** `apps/web/lib/ai-assistant/rag-search.ts`

```typescript
import { getAllChunks, getChunksBySection } from './vector-store';
import { createEmbedding } from './embeddings';
import type { DocumentationChunk } from './types';

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function findRelevantChunks(
  question: string,
  section?: string,
  topK: number = 5
): Promise<Array<{ chunk: DocumentationChunk; similarity: number }>> {
  const questionEmbedding = await createEmbedding(question);
  
  // Получаем чанки: либо из конкретного раздела, либо все
  const allChunks = section
    ? getChunksBySection(section)
    : getAllChunks();
  
  // Вычисляем схожесть
  const withSimilarity = allChunks.map(chunk => ({
    chunk,
    similarity: cosineSimilarity(questionEmbedding, chunk.embedding),
  }));
  
  // Сортируем и берем топ
  return withSimilarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .filter(item => item.similarity > 0.3); // Минимальный порог схожести
}
```

### 3.2 Создать основной сервис ассистента

**Файл:** `apps/web/lib/ai-assistant/assistant-service.ts`

```typescript
import { findRelevantChunks } from './rag-search';
import { generateChatResponse } from './embeddings';
import type { AssistantQuestion, AssistantResponse } from './types';

const SYSTEM_PROMPT = `Ты - полезный AI-ассистент платформы Collabverse. 
Твоя задача - помогать пользователям понимать, как использовать платформу.

Правила:
- Отвечай кратко (2-4 предложения)
- Используй только информацию из предоставленной документации
- Если ответа нет в документации, честно скажи об этом
- Пиши дружелюбно и по-русски
- Предлагай конкретные действия, когда это возможно`;

export async function answerQuestion(
  question: AssistantQuestion
): Promise<AssistantResponse> {
  // Находим релевантные чанки
  const relevantChunks = await findRelevantChunks(
    question.message,
    question.context?.section,
    5
  );
  
  if (relevantChunks.length === 0) {
    return {
      answer: 'К сожалению, я не нашел релевантной информации в документации. Попробуйте переформулировать вопрос или обратитесь в поддержку.',
      sources: [],
    };
  }
  
  // Формируем контекст для LLM
  const contextChunks = relevantChunks.map(item => ({
    text: item.chunk.chunkText,
    source: item.chunk.source,
  }));
  
  // Генерируем ответ
  const answer = await generateChatResponse(
    SYSTEM_PROMPT,
    question.message,
    contextChunks
  );
  
  // Извлекаем уникальные источники
  const sources = Array.from(
    new Set(contextChunks.map(chunk => chunk.source))
  );
  
  return {
    answer,
    sources,
  };
}
```

### 3.3 Создать API endpoint для вопросов

**Файл:** `apps/web/app/api/ai-assistant/ask/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/ai-assistant/assistant-service';
import { flags } from '@/lib/flags';

export async function POST(req: NextRequest) {
  // Проверка feature flag
  if (!flags.AI_ASSISTANT) {
    return NextResponse.json(
      { error: 'AI Assistant is not enabled' },
      { status: 403 }
    );
  }
  
  try {
    const body = await req.json();
    const { message, context, sessionId } = body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    const response = await answerQuestion({
      message: message.trim(),
      context,
      sessionId,
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}
```

---

## 🔗 Этап 4: Интеграция с поиском в AppTopbar

### 4.1 Создать модуль определения контекста

**Файл:** `apps/web/lib/ai-assistant/context-detector.ts`

```typescript
export interface PageContext {
  section?: string;
  page?: string;
  suggestions: string[];
}

const SECTION_MAPPING: Record<string, string> = {
  '/pm': 'projects',
  '/finance': 'finance',
  '/docs': 'docs',
  '/community': 'community',
  '/market': 'marketplace',
  '/org': 'organization',
  '/admin': 'admin',
  '/support': 'support',
};

const CONTEXTUAL_SUGGESTIONS: Record<string, string[]> = {
  projects: [
    'Как создать новый проект?',
    'Как добавить задачу в проект?',
    'Как назначить исполнителя?',
  ],
  finance: [
    'Как добавить расход?',
    'Как создать счёт?',
    'Как настроить бюджет проекта?',
  ],
  docs: [
    'Как загрузить документ?',
    'Как поделиться документом?',
    'Где найти бренд-репозиторий?',
  ],
  community: [
    'Как создать событие?',
    'Как присоединиться к комнате?',
    'Как работает рейтинг?',
  ],
  // ... остальные разделы
};

export function detectContext(pathname: string): PageContext {
  // Определяем раздел
  let section: string | undefined;
  for (const [pathPrefix, sectionName] of Object.entries(SECTION_MAPPING)) {
    if (pathname.startsWith(pathPrefix)) {
      section = sectionName;
      break;
    }
  }
  
  // Получаем контекстные подсказки
  const suggestions = section
    ? CONTEXTUAL_SUGGESTIONS[section] || []
    : [
        'Как начать работу с платформой?',
        'Где найти документацию?',
        'Как получить помощь?',
      ];
  
  return {
    section,
    page: pathname,
    suggestions,
  };
}
```

### 4.2 Создать endpoint для контекстных подсказок

**Файл:** `apps/web/app/api/ai-assistant/suggestions/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { detectContext } from '@/lib/ai-assistant/context-detector';
import { flags } from '@/lib/flags';

export async function GET(req: NextRequest) {
  if (!flags.AI_ASSISTANT) {
    return NextResponse.json({ suggestions: [] });
  }
  
  const pathname = req.nextUrl.searchParams.get('pathname') || '/';
  const context = detectContext(pathname);
  
  return NextResponse.json({
    suggestions: context.suggestions.map((text, index) => ({
      id: `suggestion-${index}`,
      text,
    })),
    section: context.section,
  });
}
```

### 4.3 Обновить AppTopbar для интеграции

**Файл:** `apps/web/components/app/AppTopbar.tsx`

Добавить интеграцию с AI ассистентом (пример кода см. в разделе "Интеграция с UI").

### 4.4 Добавить feature flag

**Файл:** `apps/web/lib/flags.ts`

Добавить:
```typescript
AI_ASSISTANT: resolveLegacyBooleanFlag(['NEXT_PUBLIC_FEATURE_AI_ASSISTANT', 'FEATURE_AI_ASSISTANT']),
```

---

## ⚙️ Этап 5: Управление ассистентами в админ-панели

### 5.1 Обновить страницу админ-панели

**Файл:** `apps/web/app/(app)/admin/ai-agents/page.tsx`

Реализовать полноценное управление ассистентами (CRUD операции, настройка API ключей, переиндексация документации).

### 5.2 Добавить API endpoints для админа

**Файл:** `apps/web/app/api/admin/ai-assistants/route.ts`

Создать endpoints для:
- `GET /api/admin/ai-assistants` - список ассистентов
- `POST /api/admin/ai-assistants` - создание/обновление
- `DELETE /api/admin/ai-assistants/:id` - удаление
- `POST /api/admin/ai-assistants/index-docs` - запуск переиндексации

---

## 🚀 Этап 6: Расширение функционала

### Планы на будущее

1. **Создание проектов через AI**
   - Интеграция с `/api/pm/projects`
   - Генерация структуры проекта на основе описания

2. **Создание задач через AI**
   - Интеграция с `/api/pm/tasks`
   - Автоматическое разбиение на подзадачи

3. **Улучшения UX**
   - История диалогов
   - Избранные ответы
   - Обратная связь (👍/👎)

---

## ❓ Ответы на вопросы

### 1. У нас на платформе реализовано хранение именно SQLite?

**Ответ**: Нет, на платформе используется **PostgreSQL** через Drizzle ORM. В плане используется **JSON файл** для векторного хранилища по следующим причинам:

- **Простота**: Не требует настройки расширений PostgreSQL (pgvector)
- **Изоляция**: Данные векторов хранятся отдельно от основной БД
- **Портативность**: Легко бэкапить и перемещать
- **Быстрый старт**: Можно начать работать сразу без миграций

В будущем можно мигрировать на PostgreSQL с расширением `pgvector` для лучшей производительности и масштабируемости.

### 2. В качестве модели я буду использовать gpt-5-nano

**Ответ**: Обновлено в плане. Используется `gpt-5-nano` как указано:

```typescript
const model = process.env.AI_ASSISTANT_MODEL_CHAT || 'gpt-5-nano';
```

**Примечание**: Если модель `gpt-5-nano` ещё недоступна в OpenAI API, можно временно использовать `gpt-4o-mini` или другую доступную модель, изменив значение в `.env.local`:

```bash
AI_ASSISTANT_MODEL_CHAT=gpt-4o-mini  # Временно, если gpt-5-nano недоступна
```

### 3. OPENAI_API_KEY не будут конфликтовать между собой?

**Ответ**: Нет конфликтов. В плане используется **отдельный ключ** `AI_ASSISTANT_API_KEY`:

- **Существующий ключ** (`OPENAI_API_KEY`) используется для других AI функций:
  - Генерация описания задач (`/api/ai/generate-description`)
  - Генерация подзадач (`/api/ai/generate-subtasks`)
  - Суммирование комментариев (`/api/ai/summarize-comments`)
  - И другие AI функции в `lib/ai/client.ts`

- **Новый ключ** (`AI_ASSISTANT_API_KEY`) используется **только** для:
  - AI ассистента изучения платформы
  - Индексации документации
  - Ответов на вопросы пользователей

Это позволяет:
- ✅ Отдельно отслеживать затраты на ассистента
- ✅ Управлять доступом независимо
- ✅ Не конфликтовать с существующим функционалом
- ✅ Использовать разные модели и лимиты для разных целей

---

## ⚠️ Известные ограничения и будущие улучшения

### Текущие ограничения

1. **JSON файл для векторов**: Подходит для небольших объёмов. Для продакшена рассмотреть PostgreSQL с pgvector или специализированные решения (Pinecone, Weaviate, Qdrant).

2. **Базовый парсинг Markdown**: Текущая реализация удаляет форматирование. Можно улучшить с помощью библиотек типа `remark`.

3. **Нет кэширования**: Каждый запрос вызывает OpenAI API. Добавить кэш для частых вопросов.

4. **Отсутствие мониторинга**: Нет логирования использования и затрат. Добавить analytics.

### Рекомендации по улучшению

1. **Rate limiting**: Ограничить количество запросов на пользователя
2. **Cost tracking**: Отслеживать затраты на API
3. **A/B тестирование**: Тестировать разные модели и промпты
4. **Feedback loop**: Собирать обратную связь для улучшения ответов

---

## 📝 Чеклист реализации

- [ ] Этап 0: Настройка API ключа и переменных окружения
- [ ] Этап 1: Создание структуры файлов и базовых модулей
- [ ] Этап 2: Реализация скрипта индексации
- [ ] Этап 3: Реализация RAG поиска и ответов
- [ ] Этап 4: Интеграция с поиском
- [ ] Этап 5: Админ-панель управления
- [ ] Этап 6: Тестирование и багфиксы
- [ ] Документация для пользователей

---

**Готово к реализации!** 🎉

Начните с Этапа 0, затем последовательно реализуйте каждый этап. При возникновении вопросов обращайтесь к существующей документации AI в `docs/ai/`.


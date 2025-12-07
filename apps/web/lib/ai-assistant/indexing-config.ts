/**
 * AI Assistant Indexing Configuration
 * Конфигурация списка документов для индексации
 */

export interface DocumentIndexConfig {
  path: string; // Путь относительно docs/
  enabled: boolean;
  priority?: number; // Приоритет (для сортировки в UI)
  description?: string;
  lastIndexed?: string; // ISO дата последней индексации
}

export interface IndexingConfig {
  documents: DocumentIndexConfig[];
  autoReindex: boolean; // Автоматическая переиндексация при изменениях
  indexOnBuild: boolean; // Индексировать при build на Vercel
  maxFileSize: number; // Максимальный размер файла в байтах
  excludePatterns: string[]; // Паттерны для исключения (glob)
}

// Конфигурация по умолчанию
export const DEFAULT_INDEXING_CONFIG: IndexingConfig = {
  autoReindex: false,
  indexOnBuild: true,
  maxFileSize: 1024 * 1024, // 1MB
  excludePatterns: ['**/archive/**', '**/node_modules/**', '**/.git/**'],
  documents: [
    // Начало работы
    {
      path: 'getting-started/quick-start.md',
      enabled: true,
      priority: 1,
      description: 'Быстрый старт - основы работы с платформой',
    },
    {
      path: 'getting-started/setup.md',
      enabled: true,
      priority: 2,
      description: 'Настройка окружения и установка',
    },
    {
      path: 'getting-started/QUICK_SETUP_GUIDE.md',
      enabled: true,
      priority: 3,
      description: 'Краткое руководство по настройке',
    },
    {
      path: 'getting-started/CHEAT_SHEET.md',
      enabled: true,
      priority: 4,
      description: 'Шпаргалка по основным командам',
    },
    
    // AI функциональность
    {
      path: 'ai/AI_QUICK_START.md',
      enabled: true,
      priority: 5,
      description: 'Быстрый старт с AI функциями',
    },
    {
      path: 'ai/AI_ASSISTANT_USER_GUIDE.md',
      enabled: true,
      priority: 6,
      description: 'Руководство пользователя по AI ассистенту',
    },
    {
      path: 'ai/AI_IMPLEMENTATION_GUIDE.md',
      enabled: false,
      priority: 7,
      description: 'Техническое руководство по имплементации AI (для разработчиков)',
    },
    
    // Архитектура
    {
      path: 'architecture/system-analysis.md',
      enabled: true,
      priority: 8,
      description: 'Системный анализ и архитектура платформы',
    },
    
    // Разработка
    {
      path: 'development/projects-master-guide.md',
      enabled: true,
      priority: 9,
      description: 'Полное руководство по работе с проектами',
    },
    {
      path: 'development/komanda.md',
      enabled: true,
      priority: 10,
      description: 'Работа с командой и участниками',
    },
    
    // Финансы
    {
      path: 'finance/README_FINANCE.md',
      enabled: true,
      priority: 11,
      description: 'Финансовая система и управление бюджетом',
    },
    
    // Компоненты UI
    {
      path: 'components/ui/button.md',
      enabled: false,
      priority: 20,
      description: 'Документация по компоненту Button',
    },
    {
      path: 'components/ui/form.md',
      enabled: false,
      priority: 21,
      description: 'Документация по компоненту Form',
    },
    
    // Основная документация
    {
      path: 'README.md',
      enabled: true,
      priority: 0,
      description: 'Главная страница документации',
    },
  ],
};

// Путь к файлу конфигурации (хранится локально)
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const CONFIG_DIR = join(process.cwd(), '.ai-assistant');
const CONFIG_FILE = join(CONFIG_DIR, 'indexing-config.json');

/**
 * Нормализует путь к единому формату (forward slashes)
 * Решает проблему с разными разделителями на Windows и Unix
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Загрузить конфигурацию индексации
 */
export function loadIndexingConfig(): IndexingConfig {
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_INDEXING_CONFIG;
  }
  
  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content) as IndexingConfig;
    
    // Мержим с дефолтной конфигурацией для обратной совместимости
    return {
      ...DEFAULT_INDEXING_CONFIG,
      ...config,
      documents: config.documents || DEFAULT_INDEXING_CONFIG.documents,
    };
  } catch (error) {
    console.error('Failed to load indexing config:', error);
    return DEFAULT_INDEXING_CONFIG;
  }
}

/**
 * Сохранить конфигурацию индексации
 */
export function saveIndexingConfig(config: IndexingConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save indexing config:', error);
    throw error;
  }
}

/**
 * Получить список включенных документов
 */
export function getEnabledDocuments(config?: IndexingConfig): DocumentIndexConfig[] {
  const cfg = config || loadIndexingConfig();
  return cfg.documents
    .filter(doc => doc.enabled)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
}

/**
 * Обновить статус документа (включить/выключить)
 */
export function toggleDocument(path: string, enabled: boolean): void {
  const config = loadIndexingConfig();
  const normalizedPath = normalizePath(path);
  const doc = config.documents.find(d => d.path === normalizedPath);
  
  if (doc) {
    doc.enabled = enabled;
  } else {
    // Добавляем новый документ
    config.documents.push({
      path: normalizedPath,
      enabled,
      priority: config.documents.length,
    });
  }
  
  saveIndexingConfig(config);
}

/**
 * Обновить дату индексации документа
 */
export function updateDocumentIndexDate(path: string, date: string): void {
  const config = loadIndexingConfig();
  const normalizedPath = normalizePath(path);
  const doc = config.documents.find(d => d.path === normalizedPath);
  
  if (doc) {
    doc.lastIndexed = date;
    saveIndexingConfig(config);
  }
}

/**
 * Добавить новый документ в конфигурацию
 */
export function addDocument(doc: DocumentIndexConfig): void {
  const config = loadIndexingConfig();
  const normalizedPath = normalizePath(doc.path);
  
  // Проверяем, нет ли уже такого документа
  const existing = config.documents.find(d => d.path === normalizedPath);
  if (existing) {
    throw new Error(`Document ${normalizedPath} already exists in config`);
  }
  
  config.documents.push({
    ...doc,
    path: normalizedPath,
  });
  saveIndexingConfig(config);
}

/**
 * Удалить документ из конфигурации
 */
export function removeDocument(path: string): void {
  const config = loadIndexingConfig();
  const normalizedPath = normalizePath(path);
  config.documents = config.documents.filter(d => d.path !== normalizedPath);
  saveIndexingConfig(config);
}


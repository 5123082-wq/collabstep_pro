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
  excludePatterns: ['**/archive/**', '**/node_modules/**', '**/.git/**', '**/research/**'],
  documents: [
    // Основная документация
    {
      path: 'README.md',
      enabled: true,
      priority: 0,
      description: 'Главная страница документации',
    },
    {
      path: 'INDEX.md',
      enabled: true,
      priority: 1,
      description: 'Индекс документации',
    },

    // Платформа (общая информация)
    {
      path: 'platform/overview.md',
      enabled: true,
      priority: 2,
      description: 'Обзор платформы',
    },
    {
      path: 'platform/getting-started.md',
      enabled: true,
      priority: 3,
      description: 'Начало работы с платформой',
    },
    {
      path: 'platform/roles-permissions.md',
      enabled: true,
      priority: 4,
      description: 'Роли и разрешения',
    },
    {
      path: 'platform/glossary.md',
      enabled: true,
      priority: 5,
      description: 'Глоссарий терминов',
    },

    // Начало работы (для разработчиков)
    {
      path: 'getting-started/setup.md',
      enabled: true,
      priority: 10,
      description: 'Настройка окружения и установка',
    },
    {
      path: 'getting-started/QUICK_SETUP_GUIDE.md',
      enabled: true,
      priority: 11,
      description: 'Краткое руководство по настройке',
    },
    {
      path: 'getting-started/CHEAT_SHEET.md',
      enabled: true,
      priority: 12,
      description: 'Шпаргалка по основным командам',
    },
    {
      path: 'getting-started/local-testing.md',
      enabled: true,
      priority: 13,
      description: 'Локальное тестирование',
    },

    // Модули - AI Hub
    {
      path: 'modules/ai-hub/ai-hub-overview.md',
      enabled: true,
      priority: 20,
      description: 'AI Hub - обзор модуля',
    },
    {
      path: 'modules/ai-hub/ai-hub-quick-start.md',
      enabled: true,
      priority: 21,
      description: 'AI Hub - быстрый старт',
    },
    {
      path: 'modules/ai-hub/ai-hub-assistant.md',
      enabled: true,
      priority: 22,
      description: 'AI Ассистент',
    },
    {
      path: 'modules/ai-hub/ai-hub-agents.md',
      enabled: true,
      priority: 23,
      description: 'AI Агенты',
    },

    // Модули - Проекты и задачи
    {
      path: 'modules/projects-tasks/projects-tasks-overview.md',
      enabled: true,
      priority: 30,
      description: 'Проекты и задачи - обзор',
    },
    {
      path: 'modules/projects-tasks/projects-tasks-projects.md',
      enabled: true,
      priority: 31,
      description: 'Управление проектами',
    },
    {
      path: 'modules/projects-tasks/projects-tasks-tasks.md',
      enabled: true,
      priority: 32,
      description: 'Управление задачами',
    },
    {
      path: 'modules/projects-tasks/projects-tasks-kanban.md',
      enabled: true,
      priority: 33,
      description: 'Канбан-доска',
    },
    {
      path: 'modules/projects-tasks/projects-tasks-teams.md',
      enabled: true,
      priority: 34,
      description: 'Команды проектов',
    },

    // Модули - Организации
    {
      path: 'modules/organization/organization-overview.md',
      enabled: true,
      priority: 40,
      description: 'Организации - обзор',
    },

    // Модули - Маркетплейс
    {
      path: 'modules/marketplace/marketplace-overview.md',
      enabled: true,
      priority: 50,
      description: 'Маркетплейс - обзор',
    },

    // Модули - Документы
    {
      path: 'modules/docs/docs-overview.md',
      enabled: true,
      priority: 60,
      description: 'Документы - обзор',
    },
    {
      path: 'modules/docs/docs-brand-repo.md',
      enabled: true,
      priority: 61,
      description: 'Бренд-репозиторий',
    },

    // Модули - Финансы
    {
      path: 'modules/finance/finance-overview.md',
      enabled: true,
      priority: 70,
      description: 'Финансы - обзор',
    },

    // Модули - Исполнители
    {
      path: 'modules/performers/performers-overview.md',
      enabled: true,
      priority: 80,
      description: 'Исполнители - обзор',
    },

    // Архитектура
    {
      path: 'architecture/system-analysis.md',
      enabled: true,
      priority: 90,
      description: 'Системный анализ и архитектура платформы',
    },
    {
      path: 'architecture/database-architecture.md',
      enabled: true,
      priority: 91,
      description: 'Архитектура базы данных',
    },

    // Компоненты UI (отключены по умолчанию)
    {
      path: 'components/ui/button.md',
      enabled: false,
      priority: 100,
      description: 'Документация по компоненту Button',
    },
    {
      path: 'components/ui/form.md',
      enabled: false,
      priority: 101,
      description: 'Документация по компоненту Form',
    },
    {
      path: 'components/modal-windows-reference.md',
      enabled: false,
      priority: 102,
      description: 'Справочник по модальным окнам',
    },
  ],
};

// Путь к файлу конфигурации (хранится локально)
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

// Определяем корень репозитория
// В runtime (Next.js) используем process.cwd()
// В build-скриптах путь определяется от места файла
function getRepoRoot(): string {
  // Если запущено из Next.js, process.cwd() будет apps/web
  // Если запущено из корня репозитория, process.cwd() будет корень
  const cwd = process.cwd();

  // Проверяем, есть ли docs/ в текущей директории
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
const CONFIG_DIR = join(REPO_ROOT, '.ai-assistant');
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


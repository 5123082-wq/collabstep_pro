/**
 * AI Assistant Context Detector
 * Определение контекста страницы для контекстных подсказок
 */

export interface PageContext {
  section: string | undefined;
  page: string | undefined;
  suggestions: string[];
  placeholder: string;
}

// Маппинг путей к разделам
const SECTION_MAPPING: Record<string, string> = {
  '/pm': 'projects',
  '/finance': 'finance',
  '/docs': 'docs',
  '/community': 'community',
  '/market': 'marketplace',
  '/marketplace': 'marketplace',
  '/org': 'organization',
  '/admin': 'admin',
  '/support': 'support',
  '/ai-hub': 'ai',
};

// Контекстные подсказки по разделам
const CONTEXTUAL_SUGGESTIONS: Record<string, string[]> = {
  projects: [
    'Как создать новый проект?',
    'Как добавить задачу в проект?',
    'Как назначить исполнителя?',
    'Как настроить канбан-доску?',
  ],
  finance: [
    'Как добавить расход?',
    'Как создать счёт?',
    'Как настроить бюджет проекта?',
    'Как отслеживать финансы?',
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
  marketplace: [
    'Как разместить вакансию?',
    'Как найти специалиста?',
    'Как работает система контрактов?',
  ],
  organization: [
    'Как создать организацию?',
    'Как пригласить участника?',
    'Как настроить роли?',
  ],
  admin: [
    'Как управлять пользователями?',
    'Как настроить feature flags?',
    'Как посмотреть статистику?',
  ],
  support: [
    'Как создать тикет?',
    'Где посмотреть статус обращения?',
    'Как связаться с поддержкой?',
  ],
  ai: [
    'Как работают AI-агенты?',
    'Как создать AI-агента?',
    'Какие модели доступны?',
  ],
};

// Плейсхолдеры для поиска по разделам
const SECTION_PLACEHOLDERS: Record<string, string> = {
  projects: 'Спросите об управлении проектами...',
  finance: 'Спросите о финансах и бюджете...',
  docs: 'Спросите о документах...',
  community: 'Спросите о сообществе...',
  marketplace: 'Спросите о маркетплейсе...',
  organization: 'Спросите об организации...',
  admin: 'Спросите об администрировании...',
  support: 'Спросите о поддержке...',
  ai: 'Спросите об AI-функциях...',
};

const DEFAULT_SUGGESTIONS = [
  'Как начать работу с платформой?',
  'Где найти документацию?',
  'Как получить помощь?',
  'Какие функции доступны?',
];

const DEFAULT_PLACEHOLDER = 'Задайте вопрос AI-ассистенту...';

/**
 * Определить контекст страницы по pathname
 */
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
    ? CONTEXTUAL_SUGGESTIONS[section] || DEFAULT_SUGGESTIONS
    : DEFAULT_SUGGESTIONS;
  
  // Получаем плейсхолдер
  const placeholder = section
    ? SECTION_PLACEHOLDERS[section] || DEFAULT_PLACEHOLDER
    : DEFAULT_PLACEHOLDER;
  
  return {
    section,
    page: pathname,
    suggestions,
    placeholder,
  };
}

/**
 * Получить раздел документации для поиска
 */
export function getDocumentationSection(pathname: string): string | undefined {
  const context = detectContext(pathname);
  
  // Маппинг разделов UI к разделам документации
  const docSectionMapping: Record<string, string> = {
    projects: 'development',
    finance: 'finance',
    admin: 'admin',
    ai: 'ai',
  };
  
  return context.section ? docSectionMapping[context.section] : undefined;
}


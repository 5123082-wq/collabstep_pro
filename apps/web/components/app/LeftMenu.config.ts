export type LeftMenuIcon =
  | 'dashboard'
  | 'projects'
  | 'marketplace'
  | 'marketing'
  | 'ai'
  | 'community'
  | 'finance'
  | 'docs'
  | 'messages'
  | 'notifications'
  | 'profile'
  | 'org'
  | 'support'
  | 'admin'
  | 'performers';

type LeftMenuBaseRoles = (
  | 'FOUNDER'
  | 'SPECIALIST'
  | 'CONTRACTOR'
  | 'PM'
  | 'ADMIN'
  | 'MODERATOR'
  | 'OBSERVER'
)[];

export type LeftMenuChild =
  | {
    id: string;
    label: string;
    href: string;
    description?: string;
    roles?: LeftMenuBaseRoles;
    type?: 'link';
  }
  | {
    id: string;
    type: 'divider';
    roles?: LeftMenuBaseRoles;
  };

export type LeftMenuSection = {
  id: string;
  label: string;
  icon: LeftMenuIcon;
  href?: string;
  roles?: LeftMenuChild['roles'];
  children?: LeftMenuChild[];
};

export const PROJECTS_HUB_PATH = '/projects';
export const PM_HUB_PATH = '/pm';
export const MARKETING_HUB_PATH = '/marketing';
export const PM_MENU_SECTION: LeftMenuSection = {
  id: 'pm',
  label: 'Проекты и задачи',
  icon: 'projects',
  href: PM_HUB_PATH,
  children: [
    { id: 'pm-projects', label: 'Проекты', href: `${PM_HUB_PATH}/projects` },
    { id: 'pm-tasks', label: 'Задачи', href: `${PM_HUB_PATH}/tasks` },
    { id: 'pm-dashboard', label: 'Метрики', href: PM_HUB_PATH },
    { id: 'pm-archive', label: 'Архив', href: `${PM_HUB_PATH}/archive` }
  ]
};
export const PROJECTS_MENU_SECTION: LeftMenuSection = {
  id: 'projects',
  label: 'Проекты',
  icon: 'projects',
  href: PROJECTS_HUB_PATH
};

const baseLeftMenuConfig: LeftMenuSection[] = [
  {
    id: 'dashboard',
    label: 'Рабочий стол',
    icon: 'dashboard',
    href: '/app/dashboard'
  },
  PM_MENU_SECTION,
  {
    id: 'marketplace',
    label: 'Маркетплейс',
    icon: 'marketplace',
    href: '/market/templates',
    children: [
      { id: 'marketplace-templates', label: 'Каталог шаблонов', href: '/market/templates' },
      { id: 'marketplace-projects', label: 'Готовые проекты', href: '/market/projects' },
      { id: 'marketplace-services', label: 'Пакеты услуг', href: '/market/services' },
      { id: 'marketplace-categories', label: 'Категории и подборки', href: '/market/categories' },
      { id: 'marketplace-favorites', label: 'Избранное', href: '/market/favorites' },
      { id: 'marketplace-cart', label: 'Корзина', href: '/market/cart' },
      { id: 'marketplace-orders', label: 'Мои заказы', href: '/market/orders' },
      { id: 'marketplace-divider', type: 'divider' },
      { id: 'marketplace-publish', label: 'Опубликовать', href: '/market/publish' },
      { id: 'marketplace-seller', label: 'Мои продажи', href: '/market/seller' }
    ]
  },
  {
    id: 'performers',
    label: 'Исполнители',
    icon: 'performers',
    href: '/performers/specialists',
    children: [
      { id: 'performers-specialists', label: 'Специалисты', href: '/performers/specialists' },
      { id: 'performers-teams', label: 'Команды и подрядчики', href: '/performers/teams' },
      { id: 'performers-vacancies', label: 'Вакансии и задачи', href: '/performers/vacancies' },
      { id: 'performers-my-vacancies', label: 'Мои вакансии', href: '/performers/my-vacancies' },
      { id: 'performers-responses', label: 'Отклики и приглашения', href: '/performers/responses' }
    ]
  },
  {
    id: 'marketing',
    label: 'Маркетинг',
    icon: 'marketing',
    href: `${MARKETING_HUB_PATH}/overview`,
    children: [
      { id: 'marketing-overview', label: 'Обзор', href: `${MARKETING_HUB_PATH}/overview` },
      { id: 'marketing-campaigns', label: 'Кампании & Реклама', href: `${MARKETING_HUB_PATH}/campaigns` },
      { id: 'marketing-research', label: 'Исследования', href: `${MARKETING_HUB_PATH}/research` },
      { id: 'marketing-content-seo', label: 'Контент & SEO', href: `${MARKETING_HUB_PATH}/content-seo` },
      { id: 'marketing-analytics', label: 'Аналитика & Интеграции', href: `${MARKETING_HUB_PATH}/analytics` }
    ]
  },
  {
    id: 'ai-hub',
    label: 'AI-хаб',
    icon: 'ai',
    href: '/ai-hub/generations',
    children: [
      { id: 'ai-generations', label: 'Генерации', href: '/ai-hub/generations' },
      { id: 'ai-history', label: 'История', href: '/ai-hub/history' },
      { id: 'ai-prompts', label: 'Промпты', href: '/ai-hub/prompts' },
      { id: 'ai-agents', label: 'Агенты', href: '/ai-hub/agents' }
    ]
  },
  {
    id: 'community',
    label: 'Комьюнити',
    icon: 'community',
    href: '/community/pitch',
    children: [
      { id: 'community-pitch', label: 'Питч', href: '/community/pitch' },
      { id: 'community-rooms', label: 'Комнаты', href: '/community/rooms' },
      { id: 'community-events', label: 'События', href: '/community/events' },
      { id: 'community-rating', label: 'Рейтинг', href: '/community/rating' }
    ]
  },
  {
    id: 'finance',
    label: 'Финансы',
    icon: 'finance',
    roles: ['FOUNDER', 'PM', 'ADMIN'],
    href: '/finance/expenses',
    children: [
      { id: 'finance-expenses', label: 'Расходы', href: '/finance/expenses', roles: ['FOUNDER', 'PM', 'ADMIN'] },
      { id: 'finance-wallet', label: 'Кошелёк', href: '/finance/wallet', roles: ['FOUNDER', 'PM', 'ADMIN'] },
      { id: 'finance-escrow', label: 'Эскроу', href: '/finance/escrow', roles: ['FOUNDER', 'PM', 'ADMIN'] },
      { id: 'finance-invoices', label: 'Счета', href: '/finance/invoices', roles: ['FOUNDER', 'PM', 'ADMIN'] },
      { id: 'finance-plans', label: 'Тарифы', href: '/finance/plans', roles: ['FOUNDER', 'PM', 'ADMIN'] },
      { id: 'finance-disputes', label: 'Споры', href: '/finance/disputes', roles: ['FOUNDER', 'PM', 'ADMIN'] }
    ]
  },
  {
    id: 'docs',
    label: 'Документы',
    icon: 'docs',
    href: '/docs/files',
    children: [
      { id: 'docs-files', label: 'Файлы', href: '/docs/files' },
      { id: 'docs-contracts', label: 'Контракты', href: '/docs/contracts' },
      { id: 'docs-brand', label: 'Бренд-репозиторий', href: '/docs/brand-repo' }
    ]
  },
  {
    id: 'org',
    label: 'Организация',
    icon: 'org',
    href: '/org/team',
    children: [
      { id: 'org-team', label: 'Команда', href: '/org/team' },
      { id: 'org-settings', label: 'Настройки', href: '/org/settings' },
      { id: 'org-finance', label: 'Финансы', href: '/org/finance' }
    ]
  },
  {
    id: 'support',
    label: 'Поддержка',
    icon: 'support',
    href: '/support/help',
    children: [
      { id: 'support-help', label: 'База знаний', href: '/support/help' },
      { id: 'support-tickets', label: 'Тикеты', href: '/support/tickets' },
      { id: 'support-chat', label: 'Чат', href: '/support/chat' }
    ]
  },
  {
    id: 'admin',
    label: 'Админка',
    icon: 'admin',
    roles: ['ADMIN', 'MODERATOR'],
    href: '/admin',
    children: [
      { id: 'admin-overview', label: 'Обзор', href: '/admin' },
      { id: 'admin-features', label: 'Фичи & Разделы', href: '/admin/features' },
      { id: 'admin-users', label: 'Пользователи', href: '/admin/users' },
      { id: 'admin-roles', label: 'Роли & Разрешения', href: '/admin/roles' },
      { id: 'admin-segments', label: 'Сегменты', href: '/admin/segments' },
      { id: 'admin-audit', label: 'Аудит', href: '/admin/audit' },
      { id: 'admin-releases', label: 'Релизы', href: '/admin/releases' },
      { id: 'admin-ai-agents', label: 'AI-агенты', href: '/admin/ai-agents' },
      { id: 'admin-ai-indexing', label: 'Индексация AI', href: '/admin/ai-assistant-indexing' },
      { id: 'admin-support', label: 'Support Tools', href: '/admin/support' }
    ]
  }
];

export const leftMenuConfig: LeftMenuSection[] = baseLeftMenuConfig;

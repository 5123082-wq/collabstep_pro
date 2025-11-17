export type FeatureFlagKey =
  | 'projectsCore'
  | 'financeGlobal'
  | 'projectsOverview'
  | 'projectCreateWizard'
  | 'projectDashboard'
  | 'budgetLimits'
  | 'tasksWorkspace'
  | 'financeAutomations'
  | 'projectActivityAudit'
  | 'taskTimeTracking'
  | 'pmNavProjectsAndTasks'
  | 'pmProjectsList'
  | 'pmProjectCard'
  | 'pmTasksBoard'
  | 'pmTasksList'
  | 'pmTasksCalendar'
  | 'pmDashboard'
  | 'pmArchive';

export type FeatureFlagDefinition = {
  env: string;
  stage: number;
  description: string;
  default: boolean;
};

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on', 'enabled']);
const FALSY_VALUES = new Set(['0', 'false', 'no', 'off', 'disabled']);

export const featureFlagRegistry = {
  projectsCore: {
    env: 'FEATURE_PROJECTS_V1',
    stage: 0,
    description: 'Ядро CRM проектов и совместимость с легаси-маршрутами.',
    default: true
  },
  financeGlobal: {
    env: 'NEXT_PUBLIC_FEATURE_FINANCE_GLOBAL',
    stage: 1,
    description: 'Глобальный раздел «Финансы → Расходы».',
    default: true
  },
  projectsOverview: {
    env: 'NEXT_PUBLIC_FEATURE_PROJECTS_OVERVIEW',
    stage: 2,
    description: 'Обзор проектов /app/projects (Stage 2: табы, фильтры, пресеты).',
    default: true
  },
  projectCreateWizard: {
    env: 'NEXT_PUBLIC_FEATURE_CREATE_WIZARD',
    stage: 3,
    description: 'Мастер создания проекта из трёх шагов.',
    default: true
  },
  projectDashboard: {
    env: 'NEXT_PUBLIC_FEATURE_PROJECT_DASHBOARD',
    stage: 4,
    description: 'Дашборд проекта с виджетами прогресса и рисков.',
    default: true
  },
  budgetLimits: {
    env: 'NEXT_PUBLIC_FEATURE_BUDGET_LIMITS',
    stage: 5,
    description: 'Управление бюджетом, лимитами и предупреждениями.',
    default: true
  },
  tasksWorkspace: {
    env: 'NEXT_PUBLIC_FEATURE_TASKS_WORKSPACE',
    stage: 6,
    description: 'Рабочее пространство задач (список и канбан).',
    default: false
  },
  financeAutomations: {
    env: 'NEXT_PUBLIC_FEATURE_FINANCE_AUTOMATIONS',
    stage: 8,
    description: 'Автоматизации финансов и журнал срабатываний.',
    default: true
  },
  projectActivityAudit: {
    env: 'NEXT_PUBLIC_FEATURE_PROJECT_ACTIVITY_AUDIT',
    stage: 4,
    description: 'Лента активности проекта и задач.',
    default: true
  },
  taskTimeTracking: {
    env: 'NEXT_PUBLIC_FEATURE_TASK_TIME_TRACKING',
    stage: 4,
    description: 'Учёт и трекинг времени по задачам.',
    default: true
  },
  pmNavProjectsAndTasks: {
    env: 'NEXT_PUBLIC_FEATURE_PM_NAV_PROJECTS_AND_TASKS',
    stage: 0,
    description: 'Навигация раздела «Проекты и задачи».',
    default: true
  },
  pmProjectsList: {
    env: 'NEXT_PUBLIC_FEATURE_PM_PROJECTS_LIST',
    stage: 1,
    description: 'Список проектов с фильтрами и сортировками.',
    default: true
  },
  pmProjectCard: {
    env: 'NEXT_PUBLIC_FEATURE_PM_PROJECT_CARD',
    stage: 1,
    description: 'Карточка проекта с KPI и связками.',
    default: true
  },
  pmTasksBoard: {
    env: 'NEXT_PUBLIC_FEATURE_PM_TASKS_BOARD',
    stage: 2,
    description: 'Kanban доска для задач.',
    default: true
  },
  pmTasksList: {
    env: 'NEXT_PUBLIC_FEATURE_PM_TASKS_LIST',
    stage: 2,
    description: 'Список задач (Excel-подобный) с инлайн-редактированием.',
    default: true
  },
  pmTasksCalendar: {
    env: 'NEXT_PUBLIC_FEATURE_PM_TASKS_CALENDAR',
    stage: 2,
    description: 'Календарное представление задач.',
    default: true
  },
  pmDashboard: {
    env: 'NEXT_PUBLIC_FEATURE_PM_DASHBOARD',
    stage: 3,
    description: 'Дашборд с виджетами: Пульс, Прогресс, Нагрузка, Финансы.',
    default: true
  },
  pmArchive: {
    env: 'NEXT_PUBLIC_FEATURE_PM_ARCHIVE',
    stage: 4,
    description: 'Архив проектов с возможностью восстановления.',
    default: true
  }
} as const satisfies Record<FeatureFlagKey, FeatureFlagDefinition>;

export type FeatureFlagRegistry = typeof featureFlagRegistry;

export const featureFlagEntries = Object.freeze(
  Object.entries(featureFlagRegistry) as [FeatureFlagKey, FeatureFlagDefinition][]
);

export function resolveFlagValue(
  rawValue: string | undefined,
  fallback: boolean
): boolean {
  if (rawValue === undefined) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (TRUTHY_VALUES.has(normalized)) {
    return true;
  }

  if (FALSY_VALUES.has(normalized)) {
    return false;
  }

  return fallback;
}

export function getFeatureFlagSnapshot(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): Record<FeatureFlagKey, boolean> {
  return featureFlagEntries.reduce<Record<FeatureFlagKey, boolean>>((acc, [key, definition]) => {
    acc[key] = resolveFlagValue(env?.[definition.env], definition.default);
    return acc;
  }, {} as Record<FeatureFlagKey, boolean>);
}

export function isFeatureEnabled(
  flag: FeatureFlagKey,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): boolean {
  const definition = featureFlagRegistry[flag];
  return resolveFlagValue(env?.[definition.env], definition.default);
}

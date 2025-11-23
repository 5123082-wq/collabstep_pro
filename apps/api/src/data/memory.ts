import type {
  Account,
  AccountMember,
  AuditLogEntry,
  DomainEvent,
  Expense,
  ExpenseAttachment,
  Iteration,
  Attachment,
  Document,
  DocumentVersion,
  FileObject,
  TaskComment,
  ProjectChatMessage,
  Project,
  ProjectBudget,
  ProjectBudgetSnapshot,
  ProjectMember,
  ProjectTemplate,
  ProjectVisibility,
  ProjectWorkflow,
  Task,
  TaskDependency,
  Workspace,
  WorkspaceMember,
  WorkspaceUser,
  PlatformModule,
  PlatformUserControl,
  Notification
} from '../types';

// Предсказуемые UUID для тестовых пользователей (для стабильности тестирования)
export const TEST_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000002';
export const TEST_FINANCE_USER_ID = '00000000-0000-0000-0000-000000000003';
export const TEST_DESIGNER_USER_ID = '00000000-0000-0000-0000-000000000004';

// Константы для обратной совместимости
export const DEFAULT_WORKSPACE_USER_ID = TEST_ADMIN_USER_ID;
export const DEFAULT_ACCOUNT_ID = 'acct-collabverse';
export const DEFAULT_WORKSPACE_ID = 'ws-collabverse-core';

/**
 * Checks if a user ID belongs to the admin user
 */
export function isAdminUserId(userId: string): boolean {
  return userId === TEST_ADMIN_USER_ID || userId === DEFAULT_WORKSPACE_USER_ID;
}

// Test project IDs (using UUID format for consistency)
export const TEST_PROJECT_DEMO_ID = '550e8400-e29b-41d4-a716-446655440001';
export const TEST_PROJECT_2_ID = '550e8400-e29b-41d4-a716-446655440002';

export const WORKSPACE_USERS: WorkspaceUser[] = [
  {
    id: TEST_ADMIN_USER_ID,
    name: 'Алина Админ',
    email: 'admin.demo@collabverse.test',
    title: 'Руководитель продукта',
    department: 'Продукт',
    location: 'Москва'
  }
];

type GlobalMemoryScope = typeof globalThis & {
  __collabverseFinanceIdempotencyKeys__?: Map<string, string>;
  __collabverseMemory__?: {
    PROJECTS: Project[];
    TASKS: Task[];
    WORKSPACE_USERS: WorkspaceUser[];
    [key: string]: any;
  };
};

const globalMemoryScope = globalThis as GlobalMemoryScope;
const globalIdempotencyKeys =
  globalMemoryScope.__collabverseFinanceIdempotencyKeys__ ?? new Map<string, string>();

globalMemoryScope.__collabverseFinanceIdempotencyKeys__ = globalIdempotencyKeys;

// Используем глобальную память для разделения между процессами Next.js
// Это гарантирует, что проекты сохраняются между запросами
const getOrCreateGlobalMemory = () => {
  if (globalMemoryScope.__collabverseMemory__) {
    // Если глобальная память уже существует, убеждаемся, что WORKSPACE_USERS инициализирован
    if (!globalMemoryScope.__collabverseMemory__.WORKSPACE_USERS) {
      globalMemoryScope.__collabverseMemory__.WORKSPACE_USERS = [...WORKSPACE_USERS];
    }
    return globalMemoryScope.__collabverseMemory__;
  }
  
  const mem = {
    PROJECTS: [] as Project[],
    TASKS: [] as Task[],
    TASK_DEPENDENCIES: [] as TaskDependency[],
    PROJECT_MEMBERS: {} as Record<string, ProjectMember[]>,
    EXPENSES: [] as Expense[],
    EXPENSE_ATTACHMENTS: [] as ExpenseAttachment[],
    PROJECT_BUDGETS: [] as (ProjectBudget | ProjectBudgetSnapshot)[],
    AUDIT_LOG: [] as AuditLogEntry[],
    EVENTS: [] as DomainEvent[],
    MARKETPLACE_LISTINGS: [] as Array<{
      id: string;
      projectId: string;
      workspaceId: string;
      title: string;
      description?: string;
      state: 'draft' | 'published' | 'rejected';
      createdAt: string;
      updatedAt: string;
    }>,
    NOTIFICATIONS: [] as Notification[],
    PROJECT_CHAT_MESSAGES: [] as ProjectChatMessage[],
    WORKSPACE_USERS: [...WORKSPACE_USERS] as WorkspaceUser[]
  };
  
  globalMemoryScope.__collabverseMemory__ = mem;
  return mem;
};

const globalMemory = getOrCreateGlobalMemory();

export const memory = {
  get WORKSPACE_USERS() { 
    if (!globalMemory.WORKSPACE_USERS) {
      globalMemory.WORKSPACE_USERS = [...WORKSPACE_USERS];
    }
    return globalMemory.WORKSPACE_USERS; 
  },
  set WORKSPACE_USERS(value: WorkspaceUser[]) { globalMemory.WORKSPACE_USERS = value; },
  ACCOUNTS: [
    {
      id: DEFAULT_ACCOUNT_ID,
      name: 'Collabverse Demo Org',
      ownerId: TEST_ADMIN_USER_ID,
      createdAt: '2024-01-10T08:00:00.000Z',
      updatedAt: '2024-06-01T10:00:00.000Z'
    }
  ] as Account[],
  ACCOUNT_MEMBERS: [
    { accountId: DEFAULT_ACCOUNT_ID, userId: TEST_ADMIN_USER_ID, role: 'owner' },
    { accountId: DEFAULT_ACCOUNT_ID, userId: TEST_USER_ID, role: 'admin' },
    { accountId: DEFAULT_ACCOUNT_ID, userId: TEST_FINANCE_USER_ID, role: 'member' },
    { accountId: DEFAULT_ACCOUNT_ID, userId: TEST_DESIGNER_USER_ID, role: 'viewer' }
  ] as AccountMember[],
  WORKSPACES: [
    {
      id: DEFAULT_WORKSPACE_ID,
      accountId: DEFAULT_ACCOUNT_ID,
      name: 'Core Product Team',
      description: 'Рабочее пространство основной продуктовой команды.',
      visibility: 'private' as ProjectVisibility,
      archived: false,
      createdAt: '2024-01-15T09:00:00.000Z',
      updatedAt: '2024-06-01T10:00:00.000Z'
    },
    {
      id: 'ws-marketing',
      accountId: DEFAULT_ACCOUNT_ID,
      name: 'Маркетинг и бренд',
      description: 'Команда продвижения, контента и событий.',
      visibility: 'public' as ProjectVisibility,
      archived: false,
      createdAt: '2024-02-01T09:00:00.000Z',
      updatedAt: '2024-05-25T11:00:00.000Z'
    }
  ] as Workspace[],
  WORKSPACE_MEMBERS: {
    [DEFAULT_WORKSPACE_ID]: [
      { workspaceId: DEFAULT_WORKSPACE_ID, userId: TEST_ADMIN_USER_ID, role: 'owner' },
      { workspaceId: DEFAULT_WORKSPACE_ID, userId: TEST_USER_ID, role: 'admin' },
      { workspaceId: DEFAULT_WORKSPACE_ID, userId: TEST_FINANCE_USER_ID, role: 'member' }
    ],
    'ws-marketing': [
      { workspaceId: 'ws-marketing', userId: TEST_ADMIN_USER_ID, role: 'admin' },
      { workspaceId: 'ws-marketing', userId: TEST_DESIGNER_USER_ID, role: 'member' }
    ]
  } as Record<string, WorkspaceMember[]>,
  FILES: [
    {
      id: 'file-team-brief',
      uploaderId: TEST_ADMIN_USER_ID,
      filename: 'Командный бриф.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 248_123,
      storageUrl: '/mock/files/team-brief.pdf',
      uploadedAt: '2024-05-04T09:00:00.000Z'
    },
    {
      id: 'file-design-assets',
      uploaderId: TEST_DESIGNER_USER_ID,
      filename: 'design-assets.zip',
      mimeType: 'application/zip',
      sizeBytes: 1_024_512,
      storageUrl: '/mock/files/design-assets.zip',
      uploadedAt: '2024-05-15T10:15:00.000Z'
    }
  ] as FileObject[],
  ATTACHMENTS: [] as Attachment[],
  DOCUMENTS: [] as Document[],
  DOCUMENT_VERSIONS: [] as DocumentVersion[],
  TASK_COMMENTS: [] as TaskComment[],
  get PROJECTS() { return globalMemory.PROJECTS; },
  set PROJECTS(value: Project[]) { globalMemory.PROJECTS = value; },
  get TASKS() { return globalMemory.TASKS; },
  set TASKS(value: Task[]) { globalMemory.TASKS = value; },
  get TASK_DEPENDENCIES() { return globalMemory.TASK_DEPENDENCIES; },
  set TASK_DEPENDENCIES(value: TaskDependency[]) { globalMemory.TASK_DEPENDENCIES = value; },
  WORKFLOWS: {} as Record<string, ProjectWorkflow>,
  ITERATIONS: [] as Iteration[],
  TEMPLATES: [
    {
      id: 'tpl-admin-discovery',
      title: 'Админский discovery',
      kind: 'product',
      summary: 'Скрипты интервью, CJM и гипотезы для старта команды.'
    },
    { id: 'tpl-brand', title: 'Бренд-пакет', kind: 'brand', summary: 'Нейминг, айдентика, гайд' },
    { id: 'tpl-landing', title: 'Лендинг', kind: 'landing', summary: 'Одностраничник с формой' },
    { id: 'tpl-mkt', title: 'Маркетинг', kind: 'marketing', summary: 'Кампания + контент-план' },
    { id: 'tpl-product', title: 'Digital-продукт', kind: 'product', summary: 'MVP флоу + бэклог' }
  ] as ProjectTemplate[],
  get PROJECT_MEMBERS() { return globalMemory.PROJECT_MEMBERS; },
  set PROJECT_MEMBERS(value: Record<string, ProjectMember[]>) { globalMemory.PROJECT_MEMBERS = value; },
  get EXPENSES() { return globalMemory.EXPENSES; },
  set EXPENSES(value: Expense[]) { globalMemory.EXPENSES = value; },
  get EXPENSE_ATTACHMENTS() { return globalMemory.EXPENSE_ATTACHMENTS; },
  set EXPENSE_ATTACHMENTS(value: ExpenseAttachment[]) { globalMemory.EXPENSE_ATTACHMENTS = value; },
  get PROJECT_BUDGETS() { return globalMemory.PROJECT_BUDGETS; },
  set PROJECT_BUDGETS(value: (ProjectBudget | ProjectBudgetSnapshot)[]) { globalMemory.PROJECT_BUDGETS = value; },
  get AUDIT_LOG() { return globalMemory.AUDIT_LOG; },
  set AUDIT_LOG(value: AuditLogEntry[]) { globalMemory.AUDIT_LOG = value; },
  get EVENTS() { return globalMemory.EVENTS; },
  set EVENTS(value: DomainEvent[]) { globalMemory.EVENTS = value; },
  IDEMPOTENCY_KEYS: globalIdempotencyKeys,
  get MARKETPLACE_LISTINGS() { return globalMemory.MARKETPLACE_LISTINGS; },
  set MARKETPLACE_LISTINGS(value: Array<{
    id: string;
    projectId: string;
    workspaceId: string;
    title: string;
    description?: string;
    state: 'draft' | 'published' | 'rejected';
    createdAt: string;
    updatedAt: string;
  }>) { globalMemory.MARKETPLACE_LISTINGS = value; },
  ADMIN_PLATFORM_MODULES: [
    {
      id: 'module-core-dashboard',
      parentId: null,
      code: 'dashboard',
      label: 'Обзор платформы',
      summary: 'Доступ к главному дашборду после входа в приложение.',
      path: '/app/dashboard',
      status: 'enabled',
      defaultAudience: 'everyone',
      testers: [],
      tags: ['core'],
      sortOrder: 10,
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      id: 'module-marketing',
      parentId: null,
      code: 'marketing',
      label: 'Маркетинг',
      summary: 'Раздел маркетинга: кампании, исследования, аналитика.',
      path: '/app/marketing',
      status: 'enabled',
      defaultAudience: 'everyone',
      testers: [],
      tags: ['marketing'],
      sortOrder: 20,
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      id: 'module-marketing-research',
      parentId: 'module-marketing',
      code: 'marketing.research',
      label: 'Маркетинг — Исследования',
      summary: 'Подраздел, отвечающий за исследования и пользовательские интервью.',
      path: '/app/marketing/research',
      status: 'enabled',
      defaultAudience: 'beta',
      testers: [TEST_DESIGNER_USER_ID],
      tags: ['marketing', 'research'],
      sortOrder: 21,
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      id: 'module-docs',
      parentId: null,
      code: 'documents',
      label: 'Документы',
      summary: 'Документы, контракты и бренд-репозиторий.',
      path: '/app/docs',
      status: 'enabled',
      defaultAudience: 'everyone',
      testers: [],
      tags: ['documents'],
      sortOrder: 30,
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      id: 'module-docs-brand',
      parentId: 'module-docs',
      code: 'documents.brand',
      label: 'Документы — Бренд-репозиторий',
      summary: 'Файлы брендбука, ассеты и гайды.',
      path: '/app/docs/brand-repo',
      status: 'enabled',
      defaultAudience: 'beta',
      testers: [TEST_DESIGNER_USER_ID],
      tags: ['documents', 'brand'],
      sortOrder: 31,
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      id: 'module-finance',
      parentId: null,
      code: 'finance',
      label: 'Финансы',
      summary: 'Финансовые отчёты, расходы, тарифы.',
      path: '/app/finance',
      status: 'enabled',
      defaultAudience: 'admins',
      testers: [TEST_FINANCE_USER_ID],
      tags: ['finance'],
      sortOrder: 40,
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      id: 'module-finance-automations',
      parentId: 'module-finance',
      code: 'finance.automations',
      label: 'Финансы — Автоматизации',
      summary: 'Экспериментальные сценарии автоматизации платежей.',
      path: '/app/finance/automations',
      status: 'disabled',
      defaultAudience: 'beta',
      testers: [TEST_FINANCE_USER_ID],
      tags: ['finance', 'beta'],
      sortOrder: 41,
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      id: 'module-community',
      parentId: null,
      code: 'community',
      label: 'Комьюнити',
      summary: 'Комнаты, события и рейтинг сообщества.',
      path: '/app/community',
      status: 'enabled',
      defaultAudience: 'everyone',
      testers: [],
      tags: ['community'],
      sortOrder: 50,
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      id: 'module-ai',
      parentId: null,
      code: 'aiHub',
      label: 'AI-хаб',
      summary: 'AI-агенты, генерации и промпты.',
      path: '/app/ai-hub',
      status: 'enabled',
      defaultAudience: 'beta',
      testers: [TEST_DESIGNER_USER_ID],
      tags: ['ai'],
      sortOrder: 60,
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    }
  ] as PlatformModule[],
  ADMIN_USER_CONTROLS: [
    {
      userId: TEST_ADMIN_USER_ID,
      status: 'active',
      roles: ['productAdmin', 'featureAdmin'],
      testerAccess: ['module-ai', 'module-marketing-research', 'module-docs-brand'],
      notes: 'Главный администратор демо-окружения.',
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      userId: TEST_USER_ID,
      status: 'active',
      roles: ['viewer'],
      testerAccess: ['module-community'],
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      userId: TEST_FINANCE_USER_ID,
      status: 'active',
      roles: ['financeAdmin', 'betaTester'],
      testerAccess: ['module-finance', 'module-finance-automations'],
      notes: 'Ответственный за финансовые автоматизации.',
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    },
    {
      userId: TEST_DESIGNER_USER_ID,
      status: 'invited',
      roles: ['betaTester'],
      testerAccess: ['module-marketing-research', 'module-docs-brand', 'module-ai'],
      notes: 'UI/UX тестирование новых разделов.',
      updatedAt: '2024-06-10T12:00:00.000Z',
      updatedBy: TEST_ADMIN_USER_ID
    }
  ] as PlatformUserControl[],
  get NOTIFICATIONS() { return globalMemory.NOTIFICATIONS; },
  set NOTIFICATIONS(value: Notification[]) { globalMemory.NOTIFICATIONS = value; },
  get PROJECT_CHAT_MESSAGES() { return globalMemory.PROJECT_CHAT_MESSAGES; },
  set PROJECT_CHAT_MESSAGES(value: ProjectChatMessage[]) { globalMemory.PROJECT_CHAT_MESSAGES = value; }
};

export function resetFinanceMemory(): void {
  memory.EXPENSES = [];
  memory.EXPENSE_ATTACHMENTS = [];
  memory.PROJECT_BUDGETS = [];
  memory.AUDIT_LOG = [];
  memory.EVENTS = [];
  const freshKeys = new Map<string, string>();
  memory.IDEMPOTENCY_KEYS = freshKeys;
  globalMemoryScope.__collabverseFinanceIdempotencyKeys__ = freshKeys;
}

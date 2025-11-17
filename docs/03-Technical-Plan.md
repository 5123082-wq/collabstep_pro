# Technical Plan

<!-- BEGIN PM-IA-ROUTES -->

### Information Architecture (PM)

- Главное меню: **Проекты и задачи** → `/pm` (Дашборд)
- Вкладки раздела:
  - Дашборд → `/pm`
  - Проекты → `/pm/projects`
  - Задачи → `/pm/tasks?view=board|list|calendar`
  - Архив → `/pm/archive`
- Деталка проекта:
  - Обзор → `/pm/projects/:id`
  - Задачи → `/pm/projects/:id/tasks?view=board|list|calendar`
  - Команда → `/pm/projects/:id/team`
  - Финансы → `/pm/projects/:id/finance`
  - Настройки → `/pm/projects/:id/settings`

### Routes & URL‑state

- Все фильтры/сортировки/представления кодируются в query params и восстанавливаются при загрузке.
- Поддержка пресетов фильтров с сохранением под именем пользователя.

### Feature Flags

- `pm.nav.projects_and_tasks`
- `pm.projects.list`
- `pm.project.card`
- `pm.tasks.board`, `pm.tasks.list`, `pm.tasks.calendar`
- `pm.dashboard`
- `pm.archive`
<!-- END PM-IA-ROUTES -->

<!-- BEGIN PM-DATA-CONTRACTS -->

### Data Contracts (TypeScript)

```ts
export type ProjectStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'ARCHIVED';

export interface ProjectMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'CONTRACTOR' | 'GUEST';
}

export interface Project {
  id: string;
  name: string;
  key: string;
  status: ProjectStatus;
  startDate?: string;
  dueDate?: string;
  ownerId: string;
  members: ProjectMember[];
  metrics?: {
    total: number;
    inProgress: number;
    overdue: number;
    progressPct: number;
    budgetUsed?: number;
    budgetLimit?: number;
    activity7d: number;
  };
  marketplace?: {
    listingId?: string;
    state: 'none' | 'draft' | 'published' | 'rejected';
  };
}

export interface Task {
  id: string;
  projectId: string;
  number: number;
  title: string;
  status: string;
  priority?: 'low' | 'med' | 'high' | 'urgent';
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
  estimate?: number;
  timeSpent?: number;
  labels?: string[];
  deps?: string[];
  customFields?: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}
```

### Status Model

- Стандартные статусы задач: Backlog → In Progress → Review → Done.
- Пользовательские статусы разрешены (конфиг проекта), колонки Kanban = статусы.
<!-- END PM-DATA-CONTRACTS -->

<!-- BEGIN PM-ANALYTICS -->

### Analytics Events

- Навигация: `pm_nav_opened`, `pm_tab_changed {tab}`
- Проекты: `pm_project_created/viewed/updated/archived/restored`, `pm_invite_link_created`
- Обзор проектов (Stage 2): `projects_overview_viewed`, `projects_overview_filter_applied`, `projects_overview_quick_action`, `projects_overview_preset_saved`, `projects_overview_preset_applied`, `projects_overview_preset_updated`, `projects_overview_preset_deleted`
- Задачи: `pm_task_created/updated/completed`, `pm_task_moved_board`, `pm_task_bulk_updated`, `pm_task_due_changed`
- Представления: `pm_view_changed {view}`, `pm_filter_applied`, `pm_preset_saved`
- Финансы: `pm_expense_created`, `pm_expense_limit_breached`
- Маркетплейс: `pm_publish_started/completed/failed`

**Общие поля:** `{ workspaceId, projectId?, taskId?, userId, view?, status?, labels?, amount?, currency?, source }`

<!-- END PM-ANALYTICS -->

<!-- BEGIN PM-QA-GATE -->

### Quality Gate & Testing

- E2E (Playwright): навигация; создание проекта; создание задачи; DnD в Kanban; перенос в Calendar; инвайт; архив/восстановление.
- Производительность: виртуализация списков, серверная пагинация, компактные payload'ы.
- QA-фокус Stage 2: сквозной сценарий `/app/projects → (deeplink) → /pm/tasks`, проверка сохранения/применения пресетов, smoke `/api/pm/projects` и `/api/pm/tasks`.
<!-- END PM-QA-GATE -->

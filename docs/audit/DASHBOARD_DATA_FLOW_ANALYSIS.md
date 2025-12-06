# Анализ потоков данных дашбордов

## Дата: 2025-12-06

## Обнаруженная проблема

Пользователь сообщает, что на дашборде отображается неактуальная информация: виджеты показывают нулевые значения или пустое состояние, хотя в системе есть проект с задачами.

## Архитектура: Две параллельные системы дашбордов

### 1. **Workspace Dashboard** (Рабочий стол)

**Роут**: `/app/dashboard`

**Компоненты**:
- `apps/web/app/(app)/app/dashboard/page.tsx`
- `apps/web/components/dashboard/DashboardShell.tsx`
- `apps/web/components/dashboard/widgets/index.tsx`

**API Endpoints**:
- `/api/dashboard/data` - получение данных виджетов
- `/api/dashboard/layout` - сохранение/загрузка layout

**Логика получения данных**:
```typescript
// apps/web/lib/dashboard/api.ts
export async function fetchDashboardData(widgets: WidgetType[]): Promise<...> {
  const response = await fetch(`/api/dashboard/data?widgets=${...}`);
  return payload.data.widgets;
}
```

**Виджеты**:
- `ProjectsTasksWidget` - показывает просрочки, дедлайны, блокеры
- `AiAgentsWidget`
- `MarketplaceReactionsWidget`
- `FinanceWidget`
- `MarketingWidget`
- И другие...

**Источник данных для ProjectsTasksWidget**:
```typescript
// apps/web/app/api/dashboard/data/route.ts
async function buildProjectsTasksData(userId: string, email: string) {
  const allProjects = projectsRepository.list();
  
  // Проверка доступа для каждого проекта
  const isAdmin = isAdminUserId(userId) || isDemoAdminEmail(email);
  
  if (isAdmin) {
    accessibleProjects.push(...allProjects);
  } else {
    for (const project of allProjects) {
      const hasAccess = await projectsRepository.hasAccess(project.id, userId);
      if (hasAccess) {
        accessibleProjects.push(project);
      }
    }
  }
  
  // Если нет доступных проектов - возвращает empty state
  if (accessibleProjects.length === 0) {
    return { state: 'empty', ... };
  }
}
```

**Флаг**: `WORKSPACE_DASHBOARD` (из `flags.WORKSPACE_DASHBOARD`)

---

### 2. **PM Dashboard** (Дашборд PM)

**Роут**: `/pm`

**Компоненты**:
- `apps/web/app/(app)/pm/page.tsx` (PMDashboardPage)
- `apps/web/components/pm/PulseWidget.tsx`
- `apps/web/components/pm/ProgressWidget.tsx`
- `apps/web/components/pm/WorkloadWidget.tsx`
- `apps/web/components/pm/FinanceWidget.tsx`

**API Endpoints**:
- `/api/pm/dashboard` - единый endpoint для всех данных PM дашборда

**Логика получения данных**:
```typescript
// apps/web/app/(app)/pm/page.tsx
useEffect(() => {
  async function loadDashboard() {
    const response = await fetch('/api/pm/dashboard');
    const result = await response.json();
    setData(result.data);
  }
  void loadDashboard();
}, []);
```

**Виджеты**:
- `PulseWidget` - активные проекты, черновики, открытые задачи, просрочки, дедлайны
- `ProgressWidget` - burnup/burndown графики
- `WorkloadWidget` - нагрузка по исполнителям
- `FinanceWidget` - бюджеты проектов

**Источник данных**:
```typescript
// apps/web/app/api/pm/dashboard/route.ts
export async function GET(_req: NextRequest) {
  // Получаем ТОЛЬКО проекты пользователя (ownerId === currentUserId)
  const allProjects = projectsRepository.list();
  const userProjects = allProjects.filter((project) => 
    project.ownerId === currentUserId
  );
  
  // Не проверяет hasAccess для проектов, где пользователь участник!
  // Это может быть причиной проблемы
}
```

**Флаг**: `PM_NAV_PROJECTS_AND_TASKS` (из `flags.PM_NAV_PROJECTS_AND_TASKS`)

---

## Ключевые различия

| Аспект | Workspace Dashboard | PM Dashboard |
|--------|-------------------|--------------|
| **Роут** | `/app/dashboard` | `/pm` |
| **API** | `/api/dashboard/data` | `/api/pm/dashboard` |
| **Проверка доступа** | ✅ Проверяет `hasAccess()` | ❌ Только `ownerId === userId` |
| **Флаг** | `WORKSPACE_DASHBOARD` | `PM_NAV_PROJECTS_AND_TASKS` |
| **Виджеты** | Модульные, настраиваемые | Фиксированный набор |

---

## Причина проблемы

### PM Dashboard (`/pm`)

**Проблема**: Фильтрует проекты только по `ownerId`:

```typescript
const userProjects = allProjects.filter((project) => 
  project.ownerId === currentUserId
);
```

**Следствие**: Если пользователь является участником проекта, но не владельцем, проект не попадает в список `userProjects`, и виджет показывает пустое состояние.

### Workspace Dashboard (`/app/dashboard`)

**Правильная логика**: Проверяет доступ через `hasAccess()`:

```typescript
for (const project of allProjects) {
  const hasAccess = await projectsRepository.hasAccess(project.id, userId);
  if (hasAccess) {
    accessibleProjects.push(project);
  }
}
```

**Метод `hasAccess()`**:
```typescript
// apps/api/src/repositories/projects-repository.ts
async hasAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await this.findById(projectId);
  
  // Public projects
  if (project.visibility === 'public') {
    return true;
  }
  
  // Private projects
  if (project.visibility === 'private') {
    const isOwner = project.ownerId === userId;
    const isMember = this.getMember(projectId, userId) !== null;
    return isOwner || isMember; // ✅ Правильная проверка
  }
  
  return false;
}
```

---

## Рекомендации по исправлению

### 1. Исправить `/api/pm/dashboard` (Критично)

**Файл**: `apps/web/app/api/pm/dashboard/route.ts`

**Изменение**: Использовать ту же логику проверки доступа, что и в workspace dashboard.

```typescript
// ❌ Старый код
const allProjects = projectsRepository.list();
const userProjects = allProjects.filter((project) => 
  project.ownerId === currentUserId
);

// ✅ Новый код
const allProjects = projectsRepository.list();
const isAdmin = isAdminUserId(currentUserId) || isDemoAdminEmail(auth.email);

const accessibleProjects: typeof allProjects = [];
if (isAdmin) {
  accessibleProjects.push(...allProjects);
} else {
  for (const project of allProjects) {
    const hasAccess = await projectsRepository.hasAccess(project.id, currentUserId);
    if (hasAccess) {
      accessibleProjects.push(project);
    }
  }
}
```

### 2. Унифицировать логику доступа (Рекомендуется)

Создать общую функцию для фильтрации доступных проектов:

**Файл**: `apps/web/lib/api/project-access.ts` (новый файл)

```typescript
import { projectsRepository, isAdminUserId } from '@collabverse/api';
import { isDemoAdminEmail } from '@/lib/auth/demo-session';
import type { Project } from '@collabverse/api';

export async function getAccessibleProjects(
  userId: string,
  email: string,
  options?: { archived?: boolean | null; workspaceId?: string | null }
): Promise<Project[]> {
  const allProjects = projectsRepository.list(options);
  const isAdmin = isAdminUserId(userId) || isDemoAdminEmail(email);
  
  if (isAdmin) {
    return allProjects;
  }
  
  const accessible: Project[] = [];
  for (const project of allProjects) {
    const hasAccess = await projectsRepository.hasAccess(project.id, userId);
    if (hasAccess) {
      accessible.push(project);
    }
  }
  
  return accessible;
}
```

Использовать в обоих endpoints:
- `/api/dashboard/data/route.ts`
- `/api/pm/dashboard/route.ts`

### 3. Дополнительно: Добавить логирование (Для отладки)

В обоих API endpoints добавить детальное логирование:

```typescript
console.log('[dashboard] User access check:', {
  userId: currentUserId,
  email: auth.email,
  isAdmin,
  allProjectsCount: allProjects.length,
  accessibleProjectsCount: accessibleProjects.length,
  projectIds: accessibleProjects.map(p => ({ id: p.id, title: p.title }))
});
```

---

## Проверка после исправления

1. Авторизоваться под пользователем, который является **участником** проекта (не владельцем)
2. Открыть `/pm` (PM Dashboard)
3. Убедиться, что виджеты показывают данные проекта
4. Открыть `/app/dashboard` (Workspace Dashboard)
5. Убедиться, что виджет "Проекты и задачи" показывает те же данные

---

## Дополнительные замечания

### Флаги feature flags

- `PM_NAV_PROJECTS_AND_TASKS` - контролирует доступ к PM разделу
- `WORKSPACE_DASHBOARD` - контролирует доступ к Workspace Dashboard
- Убедиться, что оба флага включены в `.env.local`

### Производительность

Метод `hasAccess()` вызывается для каждого проекта, что может быть медленно при большом количестве проектов. Рассмотреть возможность:
- Батч-проверки доступа
- Кэширования результатов
- Оптимизации запросов к БД

### Консистентность данных

Обе системы дашбордов должны показывать одинаковые данные для одного и того же пользователя. Рекомендуется:
- Использовать общую функцию `getAccessibleProjects()`
- Добавить E2E тесты для проверки консистентности
- Рассмотреть объединение двух дашбордов в один

---

## Заключение

**Основная проблема**: PM Dashboard фильтрует проекты только по `ownerId`, игнорируя участников проекта.

**Решение**: Использовать метод `projectsRepository.hasAccess()` для проверки доступа, как это делается в Workspace Dashboard.

**Приоритет**: Критичный - напрямую влияет на UX и корректность отображаемых данных.


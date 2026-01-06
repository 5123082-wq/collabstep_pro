# Логическая цепочка: Проекты → Задачи → Файлы

Документ описывает логическую цепочку создания проектов, задач и добавления файлов, а также требования к наличию организации у пользователя.

## Общая логическая цепочка

```
Пользователь → Организация → Проект → Задача → Файлы
```

## 1. Создание организации

### API Endpoint
- **POST** `/api/organizations`

### Требования
- Пользователь должен быть авторизован (иметь активную сессию)
- Обязательные поля:
  - `name` (string) - название организации
- Опциональные поля:
  - `description` (string) - описание
  - `type` ('open' | 'closed') - тип организации (по умолчанию 'closed')
  - `isPublicInDirectory` (boolean) - публичность в каталоге

### Результат
- Создается организация, владельцем которой становится текущий пользователь
- Пользователь автоматически становится участником организации с ролью 'owner'

### Код реализации
```12:24:apps/web/app/api/organizations/route.ts
export async function GET() {
    const user = await getCurrentUser();
    const userId = user?.id ?? null;
    if (!userId) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const organizations = await organizationsRepository.listForUser(userId);
        return jsonOk({ organizations });
    } catch (error) {
        console.error('[Organizations] Error listing:', error);
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.error('[Organizations] Error details:', { message, stack, userId });
        return jsonError('INTERNAL_ERROR', { status: 500, details: message });
    }
}
```

## 2. Создание проекта

### API Endpoint
- **POST** `/api/projects`

### Требования
- Пользователь должен быть авторизован
- **ОБЯЗАТЕЛЬНО**: у пользователя должна быть организация
- Обязательные поля в запросе:
  - `name` (string) - название проекта
  - `organizationId` (string) - ID организации
- Опциональные поля:
  - `description` (string) - описание проекта
  - `stage` (string) - стадия проекта
  - `visibility` (string) - видимость (по умолчанию 'organization')

### Важные моменты
1. **`organizationId` является обязательным полем** - без него проект создать нельзя
2. В схеме БД (`apps/api/src/db/schema.ts`) поле `organizationId` nullable, но API требует его наличие
3. При создании проекта владелец автоматически становится участником проекта с ролью 'owner'

### Код реализации
```24:55:apps/web/app/api/projects/route.ts
export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const body = await request.json();
        
        if (!body.name || !body.organizationId) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Name and Organization ID required' });
        }

        // TODO: Check if user is member of organization (and has permissions)
        // For now relying on repo logic or assuming if they can see org they can create (simplified)

        const project = await dbProjectsRepository.create({
            organizationId: body.organizationId,
            ownerId: user.id,
            name: body.name,
            description: body.description,
            stage: body.stage,
            visibility: 'organization' // Default
        });

        return jsonOk({ project });

    } catch (error) {
        console.error('[Projects] Error creating:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}
```

### Схема БД
```218:219:apps/api/src/db/schema.ts
        organizationId: text("organization_id")
            .references(() => organizations.id, { onDelete: "cascade" }), // Nullable for now if we want to support personal projects, but plan said belongs to org
```

**Примечание**: В комментарии к схеме указано, что поле nullable, но в текущей реализации API требует его наличие.

## 3. Создание задачи

### API Endpoint
- **POST** `/api/pm/tasks`

### Требования
- Пользователь должен быть авторизован
- Проект должен существовать
- Пользователь должен иметь доступ к проекту (проверка через `projectsRepository.hasAccess`)
- Обязательные поля:
  - `projectId` (string) - ID проекта
  - `title` (string) - название задачи
  - `status` (TaskStatus) - статус задачи
- Опциональные поля:
  - `assigneeId` (string) - ID назначенного пользователя
  - `priority` (string) - приоритет
  - `startDate` / `startAt` (string) - дата начала
  - `dueAt` (string) - срок выполнения
  - `labels` (string[]) - метки
  - `description` (string) - описание
  - `estimatedTime` (number) - оценка времени
  - `storyPoints` (number) - story points
  - `parentId` (string | null) - ID родительской задачи

### Важные моменты
1. Задача создается через `tasksRepository.create()` и требует только `projectId`
2. Не требуется прямой проверки наличия организации у проекта
3. Но поскольку проект требует организацию (см. п.2), косвенно задача также зависит от организации

### Код реализации
```351:400:apps/web/app/api/pm/tasks/route.ts
export async function POST(request: Request) {
  if (!flags.PM_TASKS_BOARD && !flags.PM_TASKS_LIST && !flags.PM_TASKS_CALENDAR) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, title, status, ...rest } = body;

    if (!projectId || !title || !status) {
      return jsonError('Missing required fields: projectId, title, status', { status: 400 });
    }

    // Проверяем доступ к проекту
    if (!projectsRepository.hasAccess(projectId, auth.userId)) {
      return jsonError('No access to project', { status: 403 });
    }

    const task = tasksRepository.create({
      projectId,
      title: String(title).trim(),
      status: status as TaskStatus,
      ...(rest.assigneeId ? { assigneeId: rest.assigneeId } : {}),
      ...(rest.priority ? { priority: rest.priority } : {}),
      ...(rest.startDate || rest.startAt ? { startDate: rest.startDate || rest.startAt } : {}),
      ...(rest.dueAt ? { dueAt: rest.dueAt } : {}),
      ...(rest.labels ? { labels: Array.isArray(rest.labels) ? rest.labels : [] } : {}),
      ...(rest.description ? { description: rest.description } : {}),
      ...(rest.estimatedTime !== undefined ? { estimatedTime: rest.estimatedTime } : {}),
      ...(rest.storyPoints !== undefined ? { storyPoints: rest.storyPoints } : {}),
      ...(rest.parentId !== undefined ? { parentId: rest.parentId || null } : {})
    });

    // Генерируем уведомление при назначении задачи
    if (rest.assigneeId && rest.assigneeId !== auth.userId) {
      await notifyTaskAssigned(task.id, rest.assigneeId, projectId);

      // Если назначен AI-агент, обработать назначение
      const agent = await aiAgentsRepository.findById(rest.assigneeId);
      if (agent) {
        handleAgentTaskAssignment(task.id, rest.assigneeId).catch((error) => {
          console.error('Error handling agent task assignment:', error);
        });
      }
```

## 4. Добавление файлов

### API Endpoint
- **POST** `/api/files`

### Требования
- Пользователь должен быть авторизован
- Проект должен существовать
- **КРИТИЧЕСКИ ВАЖНО**: У проекта должен быть `organizationId` (не null)
- Пользователь должен иметь доступ к проекту (роль не 'viewer')
- Обязательные поля:
  - `projectId` (string) - ID проекта
  - Файл должен быть загружен (multipart/form-data)
- Опциональные поля:
  - `entityType` ('project' | 'task' | 'comment' | 'document' | 'project_chat') - тип сущности
  - `entityId` (string) - ID сущности (если entityType указан)

### Важные моменты
1. **Прямая проверка наличия организации**: API проверяет, что у проекта есть `organizationId`
2. Если у проекта нет организации, возвращается ошибка `PROJECT_HAS_NO_ORGANIZATION`
3. Файлы хранятся в Vercel Blob Storage
4. Проверяются лимиты организации (размер файла, общий объем хранилища)
5. Файлы могут быть привязаны к проекту или к задаче

### Код реализации
```140:150:apps/web/app/api/files/route.ts
    const [dbProject] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!dbProject || !dbProject.organizationId) {
      return jsonError('PROJECT_HAS_NO_ORGANIZATION', { status: 400 });
    }

    const organizationId = dbProject.organizationId;
```

## Главный вопрос: Что если у пользователя нет организации?

### Ответ: Пользователь НЕ сможет создать проект и добавить файлы

### Детальное объяснение

#### 1. Создание проекта
- ❌ **Невозможно**: API `/api/projects` POST требует обязательное поле `organizationId`
- ❌ Если пользователь не передаст `organizationId`, получит ошибку: `INVALID_REQUEST` с деталями "Name and Organization ID required"
- ✅ **Решение**: Пользователь должен сначала создать организацию через `/api/organizations` POST

#### 2. Создание задачи
- ❌ **Невозможно косвенно**: Для создания задачи нужен `projectId` существующего проекта
- ❌ Поскольку проект требует организацию (п.1), без организации нельзя создать проект
- ❌ Без проекта нельзя создать задачу

#### 3. Добавление файлов
- ❌ **Невозможно**: API `/api/files` POST проверяет наличие `organizationId` у проекта
- ❌ Если у проекта нет организации, возвращается ошибка: `PROJECT_HAS_NO_ORGANIZATION`
- ❌ Поскольку проект требует организацию при создании, файлы можно добавлять только к проектам с организацией

### Логическая цепочка ограничений

```
Нет организации
    ↓
Нельзя создать проект (API требует organizationId)
    ↓
Нет проекта
    ↓
Нельзя создать задачу (нужен projectId)
    ↓
Нельзя добавить файлы (нужен projectId + organizationId у проекта)
```

### Что может сделать пользователь без организации?

1. ✅ **Создать организацию** через `/api/organizations` POST
   - После создания организации пользователь становится её владельцем
   - Теперь можно создать проект

2. ✅ **Получить список своих организаций** через `/api/organizations` GET
   - Если пользователь является участником организаций, они будут в списке

### Рекомендуемый workflow для нового пользователя

```
1. Регистрация/авторизация
   ↓
2. Создать организацию (POST /api/organizations)
   ↓
3. Создать проект в организации (POST /api/projects с organizationId)
   ↓
4. Создать задачу в проекте (POST /api/pm/tasks с projectId)
   ↓
5. Добавить файлы к проекту/задаче (POST /api/files с projectId)
```

## Выводы

1. **Организация является обязательным элементом** для работы с проектами, задачами и файлами
2. **Проект не может существовать без организации** (требование API, даже если схема БД позволяет nullable)
3. **Файлы можно добавлять только к проектам с организацией** (прямая проверка в API)
4. **Пользователь должен сначала создать организацию**, прежде чем создавать проекты
5. **Текущая архитектура предполагает, что все проекты принадлежат организациям**

## Потенциальные улучшения

1. **Автоматическое создание организации** при регистрации пользователя
2. **Поддержка личных проектов** без организации (требует изменений в API и логике файлов)
3. **Улучшение ошибок** - более понятные сообщения о необходимости организации
4. **Валидация членства** в организации перед созданием проекта (сейчас есть TODO в коде)

## Связанные файлы

- `apps/web/app/api/organizations/route.ts` - API организаций
- `apps/web/app/api/projects/route.ts` - API проектов
- `apps/web/app/api/pm/tasks/route.ts` - API задач
- `apps/web/app/api/files/route.ts` - API файлов
- `apps/api/src/repositories/db-projects-repository.ts` - Репозиторий проектов
- `apps/api/src/db/schema.ts` - Схема БД


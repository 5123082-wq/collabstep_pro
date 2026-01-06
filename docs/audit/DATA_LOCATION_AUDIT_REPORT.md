# Отчет о расположении данных в системе

**Дата аудита:** 2026-01-05  
**Скрипт:** `scripts/comprehensive-data-audit.ts`  
**Дополнительные скрипты:** `scripts/audit-users.ts`

## Контекст: Архитектура хранения данных

### 1. Пользователи (Users)

#### Что такое пользователь

Пользователь — это сущность, которая представляет человека в системе. Пользователь имеет:

- **ID**: UUID (`00000000-0000-0000-0000-000000000001` для администратора)
- **Email**: уникальный идентификатор (`admin.demo@collabverse.test`)
- **Имя**: отображаемое имя (`Алина Админ`)
- **Дополнительные поля**: title, department, location, passwordHash

#### Где хранятся данные пользователя

**Основное хранилище: БД (таблица `user`)**

Таблица создается через Drizzle миграцию `0000_lying_mauler.sql` и `0001_chemical_lake.sql`:

```sql
CREATE TABLE "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text UNIQUE,
  "emailVerified" timestamp,
  "image" text,
  "passwordHash" text,
  "title" text,
  "department" text,
  "location" text,
  "timezone" text,
  "createdAt" timestamp DEFAULT now(),
  "updatedAt" timestamp DEFAULT now()
);
```

**Дополнительное хранилище: Память (`memory.WORKSPACE_USERS`)**

Память используется для быстрого доступа и кэширования. Инициализируется в `apps/api/src/data/memory.ts`:

```typescript
export const WORKSPACE_USERS: WorkspaceUser[] = [
  {
    id: TEST_ADMIN_USER_ID, // '00000000-0000-0000-0000-000000000001'
    name: 'Алина Админ',
    email: 'admin.demo@collabverse.test',
    title: 'Руководитель продукта',
    department: 'Продукт',
    location: 'Москва',
  },
];
```

#### Как создается пользователь

1. **Регистрация через API** (`/api/auth/register`):
   - Создается через `usersRepository.create()`
   - Записывается в БД через Drizzle (`users` таблица)
   - Добавляется в память (`memory.WORKSPACE_USERS`)

2. **Инициализация демо-аккаунтов**:
   - При первом запуске создается администратор
   - ID: `00000000-0000-0000-0000-000000000001`
   - Email: `admin.demo@collabverse.test`

#### Результаты аудита пользователей

| ID                                     | Email                         | Имя           | Расположение    | Таблица БД | Ключ памяти              | Источник                 |
| -------------------------------------- | ----------------------------- | ------------- | --------------- | ---------- | ------------------------ | ------------------------ |
| `00000000-0000-0000-0000-000000000001` | `admin.demo@collabverse.test` | `Алина Админ` | **БД + Память** | `user`     | `memory.WORKSPACE_USERS` | Drizzle ORM + Direct SQL |

**Статус:** ✅ Пользователь синхронизирован между БД и памятью

### 2. Организации (Organizations)

#### Что такое организация

Организация — это группа пользователей, которая владеет проектами. Организация имеет:

- **ID**: текстовый идентификатор (`acct-collabverse`)
- **Owner ID**: ID пользователя-владельца
- **Название**: имя организации
- **Тип**: `closed` или `open`
- **Статус**: `active`, `archived`, `deleted`

#### Где хранятся данные организации

**Основное хранилище: БД (таблица `organization`)**

Таблица создается через Drizzle миграцию `0001_chemical_lake.sql`:

```sql
CREATE TABLE "organization" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_id" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "type" "organization_type" DEFAULT 'closed' NOT NULL,
  "is_public_in_directory" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

**Дополнительное хранилище: Память (`memory.ORGANIZATIONS`)**

Память используется для быстрого доступа. Инициализируется в `apps/api/src/data/memory.ts`.

#### Как создается организация

1. **Создание через API** (`POST /api/organizations`):

   ```typescript
   // apps/web/app/api/organizations/route.ts
   const organization = await organizationsRepository.create({
     ownerId: userId,
     name: body.name,
     description: body.description,
     type: body.type === 'open' ? 'open' : 'closed',
     isPublicInDirectory: body.isPublicInDirectory ?? body.type === 'open',
   });
   ```

2. **Процесс создания** (`organizationsRepository.create()`):
   - Создается запись в таблице `organization` через Drizzle
   - Создается запись в таблице `organization_member` (владелец становится участником)
   - Устанавливается `isPrimary = true` для первой организации пользователя
   - Добавляется в память (`memory.ORGANIZATIONS`)

3. **Проверка лимитов**:
   - Проверяется подписка пользователя (`getUserSubscription()`)
   - Проверяется количество организаций (`getOwnedOrganizationsCount()`)
   - Free план: максимум 1 организация
   - Pro/Max план: неограниченно

#### Проблема с текущей организацией

Организация `acct-collabverse` существует **только в памяти**, но не в БД. Это происходит потому что:

- Организация создана при инициализации демо-данных
- Не была синхронизирована с БД при первом запуске
- При перезапуске сервера организация "исчезает"

### 3. Проекты (Projects)

#### Что такое проект

Проект — это контейнер для задач, принадлежащий организации. Проект имеет:

- **ID**: UUID (генерируется через `crypto.randomUUID()`)
- **Owner ID**: ID пользователя-владельца (берется из сессии аутентификации)
- **Organization ID**: ID организации (обязательно для проектов из шаблонов)
- **Workspace ID**: ID рабочего пространства (`ws-collabverse-core`)
- **Key**: уникальный ключ проекта в рамках workspace (например, "TP1", "TP2")
- **Title**: название проекта
- **Visibility**: `private` или `public`

#### Где хранятся данные проекта

**ПРОБЛЕМА: Два пути хранения проектов**

##### Путь 1: Таблица `project` (Drizzle схема)

Создается через миграцию `0001_chemical_lake.sql`:

```sql
CREATE TABLE "project" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text,
  "owner_id" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "stage" text,
  "visibility" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

**Статус:** ❌ **НЕ ИСПОЛЬЗУЕТСЯ** - в таблице 0 проектов

##### Путь 2: Таблица `pm_projects` (SQL схема)

Создается динамически через `ensurePmTables()` в `pm-pg-adapter.ts`:

```sql
CREATE TABLE IF NOT EXISTS pm_projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL,
  visibility TEXT NOT NULL,
  budget_planned NUMERIC,
  budget_spent NUMERIC,
  workflow_id TEXT,
  archived BOOLEAN DEFAULT FALSE,
  stage TEXT,
  deadline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Статус:** ✅ **ИСПОЛЬЗУЕТСЯ** - в таблице 48 проектов

**Память:** `memory.PROJECTS` - **0 проектов** (не загружены)

#### Почему существуют два пути хранения

**Исторические причины:**

1. **Таблица `project` (Drizzle)**:
   - Создана в ранних миграциях для основной схемы БД
   - Предназначена для хранения проектов через Drizzle ORM
   - Имеет связь с `organization` через `organization_id`
   - **НЕ ИСПОЛЬЗУЕТСЯ** в текущей реализации

2. **Таблица `pm_projects` (SQL)**:
   - Создана позже для модуля Project Management (PM)
   - Используется для хранения проектов через прямой SQL
   - Имеет дополнительные поля (`workspace_id`, `key`, `budget_planned`, и т.д.)
   - **ИСПОЛЬЗУЕТСЯ** в текущей реализации

**Причина разрозненности:**

- Проекты создаются через `upsertOrganizationProject()` в `project-template-service.ts`
- Эта функция записывает напрямую в `pm_projects` через SQL
- НЕ синхронизируется с таблицей `project` (Drizzle)
- НЕ загружается в память автоматически

#### Как создается проект

**Процесс создания проекта из шаблона:**

1. **Валидация** (`project-template-service.ts`):

   ```typescript
   // 1. Проверка существования шаблона
   const template = templatesRepository.findById(templateId);

   // 2. Проверка существования организации (ДОБАВЛЕНО В ИСПРАВЛЕНИИ)
   const organization = await organizationsRepository.findById(organizationId);

   // 3. Валидация selectedTaskIds (ДОБАВЛЕНО В ИСПРАВЛЕНИИ)
   // Проверка происходит ДО создания проекта
   ```

2. **Создание проекта в памяти**:

   ```typescript
   // projectsRepository.create() создает проект в памяти
   project = projectsRepository.create({
     title: projectTitle,
     ownerId: params.ownerId, // Из сессии аутентификации
     workspaceId: DEFAULT_WORKSPACE_ID,
     visibility: visibility,
   });
   // ID генерируется: crypto.randomUUID()
   // Key генерируется: generateProjectKey(workspaceId, key, title)
   // OwnerNumber: getNextOwnerProjectNumber(ownerId)
   ```

3. **Запись в БД** (`upsertOrganizationProject()`):

   ```typescript
   // Записывается напрямую в pm_projects через SQL
   await db.insert(projectsTable).values({
     id: project.id,
     organizationId: organizationId,
     ownerId: ownerId,
     name: title,
     // ...
   }).onConflictDoUpdate({ ... });
   ```

4. **Создание задач**:
   ```typescript
   // Задачи создаются из шаблона
   const created = tasksRepository.create({
     projectId: project.id,
     title: task.title,
     status: task.defaultStatus,
     // ...
   });
   // ID задачи: crypto.randomUUID() или input.id
   ```

#### Откуда берется ownerId

**Owner ID берется из сессии аутентификации:**

1. **API Route** (`/api/projects/from-template`):

   ```typescript
   const auth = getAuthFromRequest(request);
   // auth.userId - это ID пользователя из сессии
   ```

2. **Передача в сервис**:

   ```typescript
   await projectTemplateService.createProjectFromTemplate({
     ownerId: auth.userId, // ID из сессии
     organizationId: parsed.data.organizationId,
     // ...
   });
   ```

3. **Использование в репозитории**:
   ```typescript
   projectsRepository.create({
     ownerId: params.ownerId, // Используется для проекта
     // ...
   });
   ```

#### Как присваиваются ID

**Проекты:**

- **ID проекта**: `crypto.randomUUID()` - генерируется в `projectsRepository.create()`
- **Key проекта**: `generateProjectKey(workspaceId, key, title)` - уникальный ключ в рамках workspace
- **Owner Number**: `getNextOwnerProjectNumber(ownerId)` - последовательный номер для владельца

**Задачи:**

- **ID задачи**: `crypto.randomUUID()` или `input.id` (если передан) - генерируется в `tasksRepository.create()`
- **Number задачи**: `getNextTaskNumber(projectId)` - последовательный номер в рамках проекта

**Организации:**

- **ID организации**: Генерируется в `organizationsRepository.create()` через `crypto.randomUUID()` или переданный ID

### 4. Задачи (Tasks)

#### Что такое задача

Задача — это единица работы в проекте. Задача имеет:

- **ID**: UUID (генерируется через `crypto.randomUUID()`)
- **Project ID**: ID проекта, к которому принадлежит задача
- **Number**: последовательный номер в рамках проекта
- **Title**: название задачи
- **Status**: `new`, `in_progress`, `done`, и т.д.
- **Parent ID**: ID родительской задачи (для иерархии)

#### Где хранятся данные задачи

**Основное хранилище: БД (таблица `pm_tasks`)**

Таблица создается динамически через `ensurePmTables()` в `pm-pg-adapter.ts`:

```sql
CREATE TABLE IF NOT EXISTS pm_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  parent_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  iteration_id TEXT,
  assignee_id TEXT,
  start_at TEXT,
  start_date TEXT,
  due_at TEXT,
  priority TEXT,
  labels JSONB,
  estimated_time INTEGER,
  story_points INTEGER,
  logged_time INTEGER,
  price TEXT,
  currency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Память:** `memory.TASKS` - **0 задач** (не загружены)

#### Как создается задача

1. **Создание в памяти** (`tasksRepository.create()`):

   ```typescript
   const task: Task = {
     id: input.id ?? crypto.randomUUID(),
     projectId: input.projectId,
     number: input.number ?? this.getNextTaskNumber(input.projectId),
     title: input.title,
     status: input.status,
     // ...
   };
   memory.TASKS.push(task);
   ```

2. **Запись в БД** (`persistTaskToPg()`):

   ```typescript
   // Асинхронно записывается в pm_tasks
   if (isPmDbEnabled()) {
     void persistTaskToPg(task).catch((error) =>
       console.error('[TasksRepository] Failed to persist task', error)
     );
   }
   ```

3. **При создании из шаблона**:
   ```typescript
   // В project-template-service.ts
   const created = tasksRepository.create({
     projectId: project.id,
     title: task.title,
     status: task.defaultStatus,
     // ...
   });
   ```

## Резюме

Аудит данных показал следующее распределение:

| Тип данных      | Всего найдено | Только в БД | Только в памяти | В БД и памяти |
| --------------- | ------------- | ----------- | --------------- | ------------- |
| **Организации** | 1             | 0           | 1               | 0             |
| **Проекты**     | 48            | 48          | 0               | 0             |
| **Задачи**      | 38            | 38          | 0               | 0             |
| **ИТОГО**       | **87**        | **86**      | **1**           | **0**         |

## Детальный анализ

### 1. Организации

#### Найдено: 1 организация

| ID                 | Название             | Расположение        | Таблица БД | Ключ памяти            | Источник | Как попало                          |
| ------------------ | -------------------- | ------------------- | ---------- | ---------------------- | -------- | ----------------------------------- |
| `acct-collabverse` | Collabverse Demo Org | **Только в памяти** | N/A        | `memory.ORGANIZATIONS` | Memory   | Инициализация при старте приложения |

**Проблема:** Организация существует только в памяти, но не в БД. Это может быть причиной того, что организация "исчезает" при перезапуске сервера.

**Пути хранения:**

- ✅ Память: `memory.ORGANIZATIONS[0]`
- ❌ БД (Drizzle): таблица `organization` - **НЕ НАЙДЕНО**
- ❌ БД (SQL): таблица `organization` - **НЕ НАЙДЕНО**
- ✅ Репозиторий: `organizationsRepository.listForUser()` - **НАЙДЕНО**

### 2. Проекты

#### Найдено: 48 проектов

**Расположение:** Все проекты находятся **только в БД** (таблица `pm_projects`)

**Пути хранения:**

- ✅ БД (SQL): таблица `pm_projects` - **48 проектов**
- ❌ БД (Drizzle): таблица `project` - **0 проектов** (не синхронизированы)
- ❌ Память: `memory.PROJECTS` - **0 проектов** (не загружены в память)
- ❌ Репозиторий: `projectsRepository.list()` - **0 проектов** (работает с памятью)

**Как попало в БД:**

- Проекты создаются через `upsertOrganizationProject()` в `project-template-service.ts`
- Записываются напрямую в таблицу `pm_projects` через SQL
- НЕ синхронизируются с Drizzle схемой `project`
- НЕ загружаются в память автоматически

**Примеры проектов:**

- `Бренд-пакет` (319c987a-155f-4064-acf0-912211e812cd) - создан из шаблона
- 47 проектов `Test Project` - тестовые проекты, созданные при разработке

### 3. Задачи

#### Найдено: 38 задач

**Расположение:** Все задачи находятся **только в БД** (таблица `pm_tasks`)

**Пути хранения:**

- ✅ БД (SQL): таблица `pm_tasks` - **38 задач**
- ❌ Память: `memory.TASKS` - **0 задач** (не загружены в память)
- ❌ Репозиторий: `tasksRepository.list()` - **0 задач** (работает с памятью)

**Как попало в БД:**

- Задачи создаются через `tasksRepository.create()`
- Записываются в БД через `persistTaskToPg()` в `pm-pg-adapter.ts`
- НЕ загружаются в память автоматически при старте

**Типы задач:**

- 16 задач из шаблона "Бренд-пакет" (исследование, разработка логотипа, документация и т.д.)
- 22 задачи "Test Task" - тестовые задачи

## Проблемы и несоответствия

### Критические проблемы

1. **Организация только в памяти**
   - Организация `acct-collabverse` существует только в памяти
   - При перезапуске сервера организация "исчезает"
   - Нужно синхронизировать с БД

2. **Проекты не синхронизированы**
   - 48 проектов в БД (`pm_projects`), но 0 в памяти
   - Репозиторий `projectsRepository.list()` возвращает пустой список
   - Проекты создаются напрямую в БД, минуя память

3. **Задачи не синхронизированы**
   - 38 задач в БД (`pm_tasks`), но 0 в памяти
   - Репозиторий `tasksRepository.list()` возвращает пустой список
   - Задачи создаются в БД, но не загружаются в память

### Архитектурные несоответствия

1. **Два пути хранения проектов:**
   - Drizzle схема `project` (таблица `project`) - **не используется**
   - Прямой SQL `pm_projects` - **используется**
   - Нет синхронизации между ними

2. **Память не синхронизирована с БД:**
   - Данные создаются в БД, но не загружаются в память
   - Репозитории работают с памятью, но память пуста
   - Нужна гидратация памяти из БД при старте

## Рекомендации

### Немедленные действия

1. **Синхронизировать организацию с БД:**

   ```typescript
   // Создать организацию в БД через Drizzle
   await db.insert(organizations).values({
     id: 'acct-collabverse',
     name: 'Collabverse Demo Org',
     ownerId: '00000000-0000-0000-0000-000000000001',
     // ... другие поля
   });
   ```

2. **Загрузить проекты в память:**

   ```typescript
   // Использовать pmPgHydration для загрузки проектов из БД
   await pmPgHydration;
   ```

3. **Загрузить задачи в память:**
   ```typescript
   // Задачи должны загружаться через pmPgHydration
   ```

### Долгосрочные улучшения

1. **Унифицировать хранение проектов:**
   - Использовать только Drizzle схему `project`
   - Или мигрировать все проекты из `pm_projects` в `project`

2. **Обеспечить синхронизацию памяти и БД:**
   - Автоматическая гидратация при старте приложения
   - Синхронизация при создании/обновлении данных

3. **Документировать архитектуру хранения:**
   - Где какие данные хранятся
   - Как происходит синхронизация
   - Когда использовать память, когда БД

## Таблица путей хранения

| Тип данных       | БД (Drizzle)       | БД (SQL)           | Память                       | Репозиторий                   | Статус              |
| ---------------- | ------------------ | ------------------ | ---------------------------- | ----------------------------- | ------------------- |
| **Пользователи** | `user` (1)         | `user` (1)         | `memory.WORKSPACE_USERS` (1) | `usersRepository` (1)         | ✅ Синхронизировано |
| **Организации**  | `organization` (0) | `organization` (0) | `memory.ORGANIZATIONS` (1)   | `organizationsRepository` (1) | ⚠️ Только память    |
| **Проекты**      | `project` (0)      | `pm_projects` (48) | `memory.PROJECTS` (0)        | `projectsRepository` (0)      | ⚠️ Только БД        |
| **Задачи**       | N/A                | `pm_tasks` (38)    | `memory.TASKS` (0)           | `tasksRepository` (0)         | ⚠️ Только БД        |

**Легенда:**

- ✅ Работает корректно
- ⚠️ Есть проблемы синхронизации
- ❌ Не используется/не найдено

## Причины разрозненного хранения данных

### Исторические причины

1. **Эволюция архитектуры:**
   - Изначально использовалась таблица `project` (Drizzle)
   - Позже добавлен модуль PM с таблицей `pm_projects` (SQL)
   - Обе таблицы существуют параллельно, но используются разные

2. **Разные системы хранения:**
   - **Drizzle схемы** (`project`, `organization`) - для основной схемы БД
   - **SQL таблицы** (`pm_projects`, `pm_tasks`) - для модуля Project Management
   - Нет единой точки синхронизации

3. **Память как кэш:**
   - Память (`memory.*`) используется для быстрого доступа
   - Данные должны загружаться из БД при старте через `pmPgHydration`
   - Но гидратация не происходит автоматически

### Технические причины

1. **Разные репозитории:**
   - `projectsRepository.create()` - создает в памяти, затем асинхронно в БД
   - `upsertOrganizationProject()` - создает напрямую в БД (`pm_projects`)
   - Нет единого пути создания проектов

2. **Асинхронная запись:**
   - Запись в БД происходит асинхронно (`void persistTaskToPg()`)
   - Если сервер перезапускается до записи, данные теряются
   - Память не синхронизируется с БД автоматически

3. **Отсутствие гидратации:**
   - `pmPgHydration` существует, но не вызывается автоматически
   - Данные в БД не загружаются в память при старте
   - Репозитории работают с памятью, но память пуста

## Выводы

1. **Пользователи синхронизированы** ✅ - данные в БД и памяти совпадают
2. **Данные разрознены** ⚠️ - проекты и задачи в БД, но не в памяти
3. **Организация в памяти** ⚠️ - может "исчезать" при перезапуске
4. **Репозитории не работают** ⚠️ - возвращают пустые списки, т.к. память пуста
5. **Два пути хранения проектов** ⚠️ - `project` (не используется) и `pm_projects` (используется)
6. **Нужна синхронизация** ⚠️ - между БД и памятью при старте приложения

## Следующие шаги

1. Запустить `pmPgHydration` для загрузки данных из БД в память
2. Создать организацию в БД через Drizzle
3. Проверить, что репозитории возвращают данные после гидратации
4. Убедиться, что новые данные синхронизируются между БД и памятью

## Полная таблица данных

| Тип              | ID                                     | Название                  | Расположение | Таблица БД    | Ключ памяти              | Источник      | Как попало                                     |
| ---------------- | -------------------------------------- | ------------------------- | ------------ | ------------- | ------------------------ | ------------- | ---------------------------------------------- |
| **Пользователь** | `00000000-0000-0000-0000-000000000001` | Алина Админ               | БД + Память  | `user`        | `memory.WORKSPACE_USERS` | Drizzle + SQL | Регистрация/инициализация                      |
| **Организация**  | `acct-collabverse`                     | Collabverse Demo Org      | Память       | N/A           | `memory.ORGANIZATIONS`   | Memory        | Инициализация демо-данных                      |
| **Проект**       | `319c987a-...`                         | Бренд-пакет               | БД           | `pm_projects` | N/A                      | Direct SQL    | Из шаблона через `upsertOrganizationProject()` |
| **Проект**       | `b0abeeae-...`                         | Test Project              | БД           | `pm_projects` | N/A                      | Direct SQL    | Тестовое создание                              |
| ...              | ...                                    | ... (46 проектов)         | БД           | `pm_projects` | N/A                      | Direct SQL    | Тестовое создание                              |
| **Задача**       | `9ab10a5f-...`                         | Исследование рынка...     | БД           | `pm_tasks`    | N/A                      | Direct SQL    | Из шаблона через `tasksRepository.create()`    |
| **Задача**       | `873e2e8b-...`                         | Разработка иконографии... | БД           | `pm_tasks`    | N/A                      | Direct SQL    | Из шаблона через `tasksRepository.create()`    |
| ...              | ...                                    | ... (36 задач)            | БД           | `pm_tasks`    | N/A                      | Direct SQL    | Из шаблона/тестовые                            |

## Архитектурная схема

```
ПОЛЬЗОВАТЕЛЬ
├── БД: таблица `user` (Drizzle) ✅
├── Память: `memory.WORKSPACE_USERS` ✅
└── Репозиторий: `usersRepository` ✅
    └── Синхронизация: ✅ Работает

ОРГАНИЗАЦИЯ
├── БД: таблица `organization` (Drizzle) ❌ НЕТ ДАННЫХ
├── Память: `memory.ORGANIZATIONS` ✅
└── Репозиторий: `organizationsRepository` ✅
    └── Синхронизация: ⚠️ Только память

ПРОЕКТ
├── БД: таблица `project` (Drizzle) ❌ НЕ ИСПОЛЬЗУЕТСЯ
├── БД: таблица `pm_projects` (SQL) ✅ ИСПОЛЬЗУЕТСЯ
├── Память: `memory.PROJECTS` ❌ ПУСТО
└── Репозиторий: `projectsRepository` ⚠️ Работает с памятью (пусто)
    └── Синхронизация: ⚠️ Нет синхронизации

ЗАДАЧА
├── БД: таблица `pm_tasks` (SQL) ✅ ИСПОЛЬЗУЕТСЯ
├── Память: `memory.TASKS` ❌ ПУСТО
└── Репозиторий: `tasksRepository` ⚠️ Работает с памятью (пусто)
    └── Синхронизация: ⚠️ Нет синхронизации
```

## Процесс создания данных

### Создание организации

```
1. POST /api/organizations
   ↓
2. organizationsRepository.create()
   ↓
3. db.insert(organizations).values({ ... })  ← Drizzle
   ↓
4. db.insert(organizationMembers).values({ ... })  ← Drizzle
   ↓
5. memory.ORGANIZATIONS.push(org)  ← Память
```

**Проблема:** Текущая организация создана только в памяти, не в БД

### Создание проекта из шаблона

```
1. POST /api/projects/from-template
   ↓
2. Валидация организации (ДОБАВЛЕНО)
   ↓
3. Валидация selectedTaskIds (ДОБАВЛЕНО)
   ↓
4. projectsRepository.create()
   ├── Генерация ID: crypto.randomUUID()
   ├── Генерация Key: generateProjectKey()
   ├── Owner Number: getNextOwnerProjectNumber()
   └── memory.PROJECTS.push(project)  ← Память
   ↓
5. upsertOrganizationProject()
   └── db.insert(pm_projects).values({ ... })  ← SQL (pm_projects)
   ↓
6. tasksRepository.create() для каждой задачи
   ├── Генерация ID: crypto.randomUUID()
   ├── Number: getNextTaskNumber()
   ├── memory.TASKS.push(task)  ← Память
   └── persistTaskToPg(task)  ← SQL (pm_tasks) - асинхронно
```

**Проблема:** Проекты создаются в `pm_projects`, но не в `project` (Drizzle)

## Рекомендации по исправлению

### Немедленные действия

1. **Синхронизировать организацию с БД:**

   ```typescript
   await db.insert(organizations).values({
     id: 'acct-collabverse',
     name: 'Collabverse Demo Org',
     ownerId: '00000000-0000-0000-0000-000000000001',
     type: 'closed',
     isPublicInDirectory: false,
   });
   ```

2. **Загрузить данные в память:**

   ```typescript
   // Вызвать гидратацию при старте приложения
   await pmPgHydration;
   ```

3. **Унифицировать хранение проектов:**
   - Решить: использовать `project` (Drizzle) или `pm_projects` (SQL)
   - Мигрировать данные из одного хранилища в другое
   - Обновить код создания проектов для использования единого пути

### Долгосрочные улучшения

1. **Единая точка создания проектов:**
   - Использовать только `projectsRepository.create()`
   - Убрать `upsertOrganizationProject()` или сделать его оберткой над репозиторием

2. **Автоматическая синхронизация:**
   - Вызывать `pmPgHydration` при старте приложения
   - Синхронизировать память и БД при создании/обновлении данных

3. **Документировать архитектуру:**
   - Где какие данные хранятся
   - Как происходит синхронизация
   - Когда использовать память, когда БД

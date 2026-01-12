# Проекты и задачи — Проекты

**Статус:** stable  
**Владелец:** product  
**Создан:** 2026-01-06  
**Последнее обновление:** 2026-01-06

## Введение

Проект — основная единица работы в PM Core. Проект принадлежит workspace (организации) и содержит задачи, файлы, документы, команду участников. Проекты могут быть созданы из шаблонов или с нуля, имеют настраиваемые workflow, бюджеты и интеграции с другими модулями.

## Структура проекта

### Поля проекта

```typescript
interface Project {
  id: ID;
  workspaceId: ID;
  key: string; // Уникальный ключ проекта в workspace (например, "PROJ", "ABC")
  title: string;
  description?: string;
  ownerId: ID;
  ownerNumber?: number; // Последовательный номер для владельца
  status: ProjectStatus; // active, on_hold, completed, archived
  deadline?: string;
  stage?: ProjectStage; // discovery, design, build, launch, support
  type?: ProjectType; // product, marketing, operations, service, internal
  visibility: ProjectVisibility; // private, workspace, public
  budgetPlanned: number | null;
  budgetSpent: number | null;
  workflowId?: ID;
  archived: boolean; // Legacy поле
  createdAt: string;
  updatedAt: string;
}
```

### Статусы проекта

- **`active`** — активный проект, работа продолжается
- **`on_hold`** — проект приостановлен
- **`completed`** — проект завершён
- **`archived`** — проект архивирован (read-only)

### Типы проектов

- **`product`** — продуктовый проект
- **`marketing`** — маркетинговый проект
- **`operations`** — операционный проект
- **`service`** — сервисный проект
- **`internal`** — внутренний проект

### Стадии проекта

- **`discovery`** — исследование и планирование
- **`design`** — дизайн
- **`build`** — разработка
- **`launch`** — запуск
- **`support`** — поддержка

### Видимость проекта

- **`private`** — только участники проекта
- **`workspace`** — виден всем участникам workspace
- **`public`** — виден всем авторизованным пользователям

## Создание проекта

### Создание с нуля

1. Пользователь открывает форму создания проекта
2. Заполняет обязательные поля: название, организация
3. Опционально: описание, тип, стадия, дедлайн, видимость
4. Нажимает "Создать проект"
5. Проект создаётся, владелец автоматически становится участником с ролью `owner`

**API endpoint:**
- `POST /api/pm/projects`

**Обязательные поля:**
- `name` (string) — название проекта
- `organizationId` (string) — ID организации

**Опциональные поля:**
- `description` (string) — описание
- `type` (ProjectType) — тип проекта
- `stage` (ProjectStage) — стадия проекта
- `deadline` (ISO date) — дедлайн
- `visibility` (ProjectVisibility) — видимость (по умолчанию `private`)

### Создание из шаблона

1. Пользователь выбирает шаблон проекта
2. Выбирает задачи из шаблона (можно выбрать все или часть)
3. Настраивает параметры проекта (название, описание, видимость)
4. Нажимает "Создать проект"
5. Проект создаётся с выбранными задачами из шаблона

**API endpoint:**
- `POST /api/projects/from-template`

**Параметры:**
- `templateId` (string) — ID шаблона
- `selectedTaskIds` (string[]) — массив ID задач для включения
- `projectName` (string) — название проекта
- `projectDescription` (string) — описание проекта
- `visibility` (ProjectVisibility) — видимость проекта

**Источники:**
- Шаблоны проектов: [`../marketplace/marketplace-overview.md`](../marketplace/marketplace-overview.md)
- План создания: [`../../development/plans/project-creation-implementation-plan.md`](../../development/plans/project-creation-implementation-plan.md)

## Управление проектом

### Редактирование проекта

**API endpoint:**
- `PATCH /api/pm/projects/[id]`

**Доступные поля для редактирования:**
- `title` — название проекта
- `description` — описание
- `status` — статус проекта
- `deadline` — дедлайн
- `stage` — стадия проекта
- `type` — тип проекта
- `visibility` — видимость

**Права доступа:**
- `owner` — полный доступ
- `manager` — может редактировать все поля кроме удаления
- `contributor` — только просмотр
- `viewer` — только просмотр

### Архивирование проекта

**API endpoint:**
- `POST /api/pm/projects/[id]/archive`

**Действия:**
- Проект переводится в статус `archived`
- Все задачи проекта становятся read-only
- Проект скрывается из основного списка (доступен в `/pm/archive`)

**Права доступа:**
- `owner` — может архивировать
- `manager` — может архивировать
- `contributor` — не может архивировать
- `viewer` — не может архивировать

### Удаление проекта

**API endpoint:**
- `DELETE /api/pm/projects/[id]`

**Действия:**
- Проект удаляется из базы данных
- Все связанные данные (задачи, комментарии, файлы) удаляются каскадно
- **Внимание:** операция необратима

**Права доступа:**
- Только `owner` проекта может удалить проект

### Восстановление проекта

**API endpoint:**
- `POST /api/pm/projects/[id]/restore`

**Действия:**
- Проект восстанавливается из архива
- Статус меняется с `archived` на `active`
- Проект снова появляется в основном списке

**Права доступа:**
- `owner` — может восстанавливать
- `manager` — может восстанавливать

## Команда проекта

### Участники проекта

**API endpoint:**
- `GET /api/pm/projects/[id]/members` — получить список участников
- `POST /api/pm/projects/[id]/members` — добавить участника (планируется)
- `DELETE /api/pm/projects/[id]/members/[userId]` — удалить участника

**Роли участников:**
- **`owner`** — владелец проекта. Полный контроль
- **`manager`** — менеджер проекта. Управление задачами и командой
- **`contributor`** — участник. Создание и редактирование задач
- **`viewer`** — наблюдатель. Только просмотр

**См. также:**
- [`access.md`](./projects-tasks-access.md) — модель доступа к проектам
- [`teams.md`](./projects-tasks-teams.md) — команды проектов

### Приглашения в проект

**API endpoint:**
- `GET /api/pm/projects/[id]/invites` — получить список приглашений
- `POST /api/pm/projects/[id]/invites` — создать приглашение (планируется)

**Способы приглашения:**
1. **По ссылке** — генерация пригласительной ссылки с TTL и лимитом использований
2. **По email** — отправка приглашения на email

**Процесс:**
- Если пользователь не зарегистрирован → форма регистрации → автоматическое добавление в проект
- Если пользователь зарегистрирован → уведомление → принятие приглашения

## Страница проекта

Страница проекта (`/pm/projects/[id]`) содержит следующие вкладки:

### 1. Обзор

Основная информация о проекте:
- KPI метрики проекта (прогресс, бюджет, сроки)
- Быстрые действия (создать задачу, пригласить участника, создать трату, опубликовать в маркетплейс)
- Секция задач проекта с возможностью открытия детального просмотра
- Команда проекта и ссылки
- Журнал событий бюджета (лимиты)
- Журнал автоматизаций (если включен флаг)
- Активность проекта (последние события)

### 2. Чат

Командный чат проекта для общения участников.

**См. также:**
- [`chat.md`](./projects-tasks-chat.md) — документация по чату проекта

### 3. Файлы

Файловый каталог проекта для хранения и управления файлами.

**См. также:**
- [`files.md`](./projects-tasks-files.md) — документация по файловому менеджеру

### 4. Гант

Диаграмма Ганта для визуализации задач проекта по срокам.

**См. также:**
- [`tasks.md`](./projects-tasks-tasks.md#gantt-view) — документация по диаграмме Ганта

### 5. AI-агенты

Управление AI-агентами проекта (настройка и мониторинг).

**См. также:**
- [`../ai-hub/ai-hub-assistant.md`](../ai-hub/ai-hub-assistant.md) — гайд по AI-ассистенту

**Доступность вкладок:**
- "Чат" и "Файлы" — только для участников проекта (owner/admin/member)
- "Гант" и "AI-агенты" — для всех авторизованных пользователей с доступом к проекту

## Интеграции

### Финансы

Проект может иметь бюджет с лимитами по категориям расходов.

**API endpoints:**
- `GET /api/pm/projects/[id]/budget` — получить бюджет проекта
- `PATCH /api/pm/projects/[id]/budget` — обновить бюджет
- `GET /api/pm/projects/[id]/budget-settings` — настройки бюджета

**Интеграция:**
- Создание расходов привязано к проекту
- Отслеживание потраченных сумм по категориям
- Предупреждения при превышении лимитов

**См. также:**
- [`../../modules/finance/finance-overview.md`](../../modules/finance/finance-overview.md) — документация по финансам

### Маркетплейс

Проект может быть опубликован в маркетплейс как шаблон или продукт.

**API endpoint:**
- `GET /api/pm/projects/[id]/listings` — получить публикации проекта
- `POST /api/pm/projects/[id]/listings` — опубликовать проект (планируется)

**Процесс публикации:**
1. Владелец проекта открывает мастер публикации
2. Заполняет информацию о продукте/услуге
3. Настраивает цену и доступность
4. Публикует в маркетплейс

**См. также:**
- [`../marketplace/marketplace-overview.md`](../marketplace/marketplace-overview.md) — документация по маркетплейсу

### AI Hub

Проект может иметь AI-агентов для автоматизации задач.

**API endpoint:**
- `GET /api/pm/projects/[id]/ai-agents` — получить список AI-агентов проекта
- `POST /api/pm/projects/[id]/ai-agents` — добавить AI-агента
- `DELETE /api/pm/projects/[id]/ai-agents/[agentId]` — удалить AI-агента

**См. также:**
- [`../ai-hub/ai-hub-overview.md`](../ai-hub/ai-hub-overview.md) — документация по AI Hub

## API endpoints

### Основные операции

- `GET /api/pm/projects` — список проектов пользователя
- `POST /api/pm/projects` — создать проект
- `GET /api/pm/projects/[id]` — получить проект
- `PATCH /api/pm/projects/[id]` — обновить проект
- `DELETE /api/pm/projects/[id]` — удалить проект

### Управление проектом

- `POST /api/pm/projects/[id]/archive` — архивировать проект
- `POST /api/pm/projects/[id]/restore` — восстановить проект
- `GET /api/pm/projects/[id]/activity` — активность проекта

### Команда

- `GET /api/pm/projects/[id]/members` — участники проекта
- `GET /api/pm/projects/[id]/invites` — приглашения

### Интеграции

- `GET /api/pm/projects/[id]/budget` — бюджет проекта
- `GET /api/pm/projects/[id]/listings` — публикации в маркетплейсе
- `GET /api/pm/projects/[id]/ai-agents` — AI-агенты проекта

**См. также:**
- [`../../architecture/system-analysis.md`](../../architecture/system-analysis.md) — системный анализ API

## Связанные документы

- [`_module.md`](./projects-tasks-overview.md) — обзор модуля PM Core
- [`tasks.md`](./projects-tasks-tasks.md) — документация по задачам
- [`access.md`](./projects-tasks-access.md) — модель доступа к проектам
- [`teams.md`](./projects-tasks-teams.md) — команды проектов
- [`../../archive/2026-01-07-pm-core-migration/guides/projects-master-guide.md`](../../archive/2026-01-07-pm-core-migration/guides/projects-master-guide.md) — мастер-документ по проектам (архив)
- [`../../archive/2026-01-07-platform-migration/02-Platforma-Opisanie.md`](../../archive/2026-01-07-platform-migration/02-Platforma-Opisanie.md) — UX потоки проектов (архив)

---

**Последнее обновление:** 2026-01-06
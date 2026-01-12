status: active
last_reviewed: 2025-01-XX
owner: docs

# Системный обзор Collabverse

## Содержание

- [Текущая клиентская архитектура и навигация](#текущая-клиентская-архитектура-и-навигация)
  - [Маркетинговый слой](#маркетинговый-слой)
  - [Приложение после логина](#приложение-после-логина)
- [Состояние и используемые библиотеки](#состояние-и-используемые-библиотеки)
- [Текущее API (Next.js route handlers)](#текущее-api-nextjs-route-handlers)
  - [Аутентификация](#аутентификация)
  - [Проекты и задачи (флаг PM_NAV_PROJECTS_AND_TASKS)](#проекты-и-задачи-флаг-pm_nav_projects_and_tasks)
- [Доменные сущности и связи](#доменные-сущности-и-связи)
  - [Предлагаемая реляционная модель](#предлагаемая-реляционная-модель)
  - [Ключевые связи](#ключевые-связи)
- [API контракты для бэкенда (предложение)](#api-контракты-для-бэкенда-предложение)
- [Авторизация и мультиаккаунт](#авторизация-и-мультиаккаунт)

## Текущая клиентская архитектура и навигация

### Маркетинговый слой

- Layout маркетинговых страниц подключает шапку, футер и тосты только когда флаг `NAV_V1` активен, иначе отдаёт контент без навигации.【F:apps/web/app/(marketing)/layout.tsx†L1-L32】【F:apps/web/lib/feature-flags.ts†L1-L3】
- Мегаменю и мобильное меню строятся на базе конфигурации `marketingMenu` с вложенными элементами и CTA, что определяет маршруты `/product/*`, `/audience`, `/projects`, `/specialists`, `/pricing`, `/blog` и авторизацию.【F:apps/web/config/MarketingMenu.config.ts†L1-L121】

### Приложение после логина

- Сегмент `(app)` проверяет наличие demo-сессии в cookie `cv_session` и редиректит на `/login` при отсутствии токена.【F:apps/web/app/(app)/layout.tsx†L1-L14】【F:apps/web/lib/auth/demo-session.ts†L3-L68】
- Клиентский layout собирает топбар, левое меню, контентную область, правую панель или hover-rail и управляет логаутом через вызов `/api/auth/logout`, используя roles, полученные из demo-сессии.【F:apps/web/components/app/AppLayoutClient.tsx†L29-L126】【F:apps/web/lib/auth/roles.ts†L3-L65】【F:apps/web/app/api/auth/logout/route.ts†L1-L15】
- Левое меню построено на конфигурации `LeftMenu.config` с множеством разделов (проекты, маркетплейс, AI-хаб, документы, финансы и т.д.) и фильтрацией по ролям, а `Sidebar` управляет раскрытием групп через Zustand-хранилище с персистом в `localStorage`.【F:apps/web/components/app/LeftMenu.config.ts†L1-L200】【F:apps/web/lib/nav/menu-builder.ts†L1-L19】【F:apps/web/components/app/Sidebar.tsx†L1-L125】【F:apps/web/lib/state/ui-store.ts†L1-L76】
- Быстрые действия в hover-rail используют моковую конфигурацию с экшенами (новый проект, задача, приглашение) и бейджами, зависящими от состояния UI-store.【F:apps/web/mocks/rail.ts†L1-L53】【F:apps/web/types/quickActions.ts†L1-L15】【F:apps/web/stores/ui.ts†L1-L40】

## Состояние и используемые библиотеки

- Глобальный UI-store (`useUiStore`) хранит пресет фона, раскрытые группы меню и последний проект; данные персистятся через `zustand/middleware` с in-memory fallback на сервере.【F:apps/web/lib/state/ui-store.ts†L1-L76】
- Клиентский `useUI` управляет состояниями правых панелей, диалогов и счётчиков уведомлений/чатов для hover-rail и drawers.【F:apps/web/stores/ui.ts†L1-L40】【F:apps/web/components/right-rail/CommunicationDrawer.tsx†L9-L40】
- Магазин маркетплейса (`useMarketplaceStore`) реализует корзину, избранное и сигнал сброса фильтров, работая на Zustand без персиста.【F:apps/web/lib/marketplace/store.ts†L1-L67】
- Основной стек фронтенда: Next.js 14, React 18, Zustand, Zod, TailwindCSS, Lucide icons, Fuse.js для поиска.【F:apps/web/package.json†L1-L32】

## Текущее API (Next.js route handlers)

API реализовано в `app/api` и работает поверх in-memory хранилища из `apps/api/src/data/memory.ts`.

### Аутентификация

- `POST /api/auth/login` — проверка демо-аккаунтов из ENV и установка cookie `cv_session` (base64 JSON).【F:apps/web/app/api/auth/login/route.ts†L1-L83】【F:apps/web/lib/auth/session-cookie.ts†L1-L34】
- `POST /api/auth/register` — dev-регистрация: валидация payload, установка сессии с ролью `user` и редирект на `/app/dashboard`.【F:apps/web/app/api/auth/register/route.ts†L1-L39】
- `POST /api/auth/logout` — очищение cookie и редирект (JSON/303).【F:apps/web/app/api/auth/logout/route.ts†L1-L15】

### Проекты и задачи (флаг `PM_NAV_PROJECTS_AND_TASKS`)

API endpoints для проектов и задач находятся в `/api/pm/projects` и используют репозитории из `apps/api/src/repositories/`.

- `GET/POST /api/pm/projects` — список проектов с пагинацией и фильтрацией, создание проекта.【F:apps/web/app/api/pm/projects/route.ts†L1-L113】
- `GET/PATCH/DELETE /api/pm/projects/:id` — чтение, частичное обновление и удаление проекта.【F:apps/web/app/api/pm/projects/[id]/route.ts】
- `POST /api/pm/projects/:id/archive` и `/restore` — архивирование и восстановление проекта.【F:apps/web/app/api/pm/projects/[id]/archive/route.ts】【F:apps/web/app/api/pm/projects/[id]/restore/route.ts】
- `GET /api/pm/tasks` — список задач с фильтрацией.【F:apps/web/app/api/pm/tasks/route.ts】
- `POST /api/pm/tasks/bulk` — массовые операции с задачами.【F:apps/web/app/api/pm/tasks/bulk/route.ts】
- `GET /api/templates` — список проектных шаблонов из каталога.【F:apps/web/app/api/templates/route.ts†L1-L11】【F:apps/api/src/data/memory.ts†L379-L390】

## Доменные сущности и связи

Текущие типы домена охватывают проекты, задачи, workflow, итерации и участников.【F:apps/api/src/types.ts】 На основе существующего UI и roadmap предлагается следующая схема.

### Предлагаемая реляционная модель

**NEEDS_CONFIRMATION:** Эта модель описывает целевое состояние. Текущее состояние:
- `organizations` и `organization_member` реализованы в БД
- `pm_projects` использует `workspace_id` (текстовое поле) без FK на отдельную таблицу workspaces
- Таблицы `accounts` и `user_accounts` в этой модели относятся к целевой реализации workspaces
- См. [ADR-0005](../architecture/adr/0005-multi-account-model.md) для деталей текущего vs целевого состояния

| Таблица                  | Ключевые поля                                                                                                                             | Связи                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `users`                  | `id`, `email`, `password_hash`, `display_name`, `locale`                                                                                  | 1:N с `sessions`, `organization_members`, `project_members`, `task_assignments` |
| `organizations`          | `id`, `name`, `primary_owner_id`                                                                                                          | 1:N с `org_members` (реализовано), `workspaces` (целевое состояние)      |
| `org_members`            | `organization_id`, `user_id`, `role`                                                                                                      | Роли: owner/admin/member/viewer; для прав доступа (реализовано)          |
| `accounts`               | `id`, `organization_id`, `account_type` (`workspace`/`personal`), `label`                                                                 | Определяет «рабочие пространства» для мультиаккаунта (целевое состояние) |
| `user_accounts`          | `user_id`, `account_id`, `default_role`, `last_active_at`                                                                                 | Пользователь ↔ аккаунты, хранит роль в workspace (целевое состояние)     |
| `projects` (pm_projects) | `id`, `workspace_id`, `owner_id`, `title`, `description`, `stage`, `status`, `deadline`, `archived`, timestamps                             | `workspace_id` текстовое поле без FK (текущее состояние)                 |
| `project_members`        | `project_id`, `user_id`, `role` (`owner`/`admin`/`member`/`viewer`)                                                                       | Маппинг людей к проектам                                                 |
| `project_templates`      | `id`, `title`, `summary`, `kind`, `visibility`, `author_account_id`                                                                       | Источник для `project_template_tasks`                                    |
| `project_template_tasks` | `id`, `template_id`, `title`, `description`, `default_status`, `default_labels`, `offset_start_days`, `offset_due_days`                   | Переиспользуемые заготовки задач                                         |
| `project_workflows`      | `project_id`, `name`, `is_default`                                                                                                        | 1:N с `workflow_statuses`                                                |
| `workflow_statuses`      | `id`, `workflow_id`, `position`, `code`, `label`, `is_terminal`                                                                           | Определяет канбан-колонки                                                |
| `iterations`             | `id`, `project_id`, `title`, `start_at`, `end_at`                                                                                         | Привязка спринтов                                                        |
| `tasks`                  | `id`, `project_id`, `iteration_id`, `parent_task_id`, `title`, `description`, `status_code`, `priority`, `start_at`, `due_at`, timestamps | `status_code` FK на `workflow_statuses.code`                             |
| `task_assignments`       | `task_id`, `user_id`, `role` (`assignee`/`reviewer`)                                                                                      | Позволяет несколько исполнителей                                         |
| `task_labels`            | `id`, `project_id`, `code`, `label`, `color`                                                                                              | Набор меток                                                              |
| `task_label_links`       | `task_id`, `label_id`                                                                                                                     | M:N                                                                      |
| `documents`              | `id`, `project_id`, `title`, `type`, `status`, timestamps                                                                                 | Документы/договоры                                                       |
| `document_versions`      | `id`, `document_id`, `file_id`, `version`, `created_by`, timestamps                                                                       | Версионность документов                                                  |
| `files`                  | `id`, `uploader_id`, `filename`, `mime_type`, `size_bytes`, `storage_url`, `sha256`, `uploaded_at`                                        | Бинарные объекты                                                         |
| `project_files`          | `project_id`, `file_id`, `linked_entity` (`task`/`document`/`comment`), `entity_id`                                                       | Связь файлов с доменными сущностями                                      |
| `notifications`          | `id`, `user_id`, `type`, `payload`, `read_at`                                                                                             | Для счетчиков в UI                                                       |
| `messages`               | `id`, `conversation_id`, `author_id`, `body`, timestamps                                                                                  | Чаты (будущая интеграция)                                                |
| `conversations`          | `id`, `project_id`, `topic`, `last_message_at`                                                                                            | Источник данных для drawer «Чаты»                                        |

### Ключевые связи

**Текущее состояние:**
- Пользователь может состоять в нескольких организациях через `organization_member` (реализовано).
- Проект (`pm_projects`) использует `workspace_id` как текстовое поле без FK на отдельную таблицу workspaces.
- Workspaces хранятся in-memory через `WorkspacesRepository` (см. [`apps/api/src/repositories/workspaces-repository.ts`](../../apps/api/src/repositories/workspaces-repository.ts)).

**Целевое состояние:**
- Пользователь может состоять в нескольких организациях и workspace через `user_accounts`.
- Проект будет принадлежать workspace через FK на таблицу `workspaces`.
- См. [ADR-0005](../architecture/adr/0005-multi-account-model.md) для деталей.

**Общие связи:**
- Задачи (`pm_tasks`) поддерживают иерархию (`parent_task_id`), статусы из workflow и множественные назначения.
- Документы и файлы связаны через универсальную таблицу `project_files`, что покрывает секции «Документы и файлы» в меню.

## API контракты для бэкенда (предложение)

Ниже сводный контракт, расширяющий текущие Next.js endpoints.

| Метод и путь                        | Описание                                                                 | Тело запроса                                                     | Ответ                                              |
| ----------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------- |
| `POST /api/auth/login`              | E-mail + пароль, опционально `accountId` для моментального переключения  | `{ email, password, accountId? }`                                | 200 `{ sessionToken, user, accounts }` или 401/403 |
| `POST /api/auth/register`           | Регистрация пользователя + создание личного workspace                    | `{ name, email, password }`                                      | 201 `{ user, account }`                            |
| `POST /api/auth/logout`             | Завершение сессии                                                        | —                                                                | 204                                                |
| `POST /api/auth/switch`             | Переключение аккаунта в рамках одной сессии                              | `{ accountId }`                                                  | 200 `{ sessionToken, account }`                    |
| `GET /api/accounts`                 | Список доступных аккаунтов пользователя                                  | —                                                                | 200 `{ items: AccountSummary[] }`                  |
| `POST /api/accounts`                | Создание нового workspace                                                | `{ name, type }`                                                 | 201 `{ account }`                                  |
| `GET /api/pm/projects`              | Фильтрация по `workspaceId`, `archived`, `status`, `search` с пагинацией | Query                                                            | 200 `{ items, pagination }`                        |
| `POST /api/pm/projects`             | Создание проекта                                                         | `{ title, description?, stage?, deadline?, workspaceId, type? }` | 201 `{ project }`                                  |
| `GET /api/pm/projects/:id`          | Подробности проекта                                                      | —                                                                | 200 `{ project }`                                  |
| `PATCH /api/pm/projects/:id`        | Обновление полей                                                         | Partial Project                                                  | 200 `{ project }`                                  |
| `POST /api/pm/projects/:id/archive` | Архивирование                                                            | —                                                                | 200 `{ id, archivedAt }`                           |
| `POST /api/pm/projects/:id/restore` | Восстановление из архива                                                 | —                                                                | 200 `{ id }`                                       |
| `GET /api/pm/tasks`                 | Список задач с фильтрацией по проекту, статусу, исполнителю              | Query                                                            | 200 `{ items }`                                    |
| `POST /api/pm/tasks/bulk`           | Массовые операции с задачами                                             | `{ action, taskIds, payload? }`                                  | 200 `{ updated: number }`                          |
| `GET /api/templates`                | Каталог шаблонов проектов                                                | —                                                                | 200 `{ items }`                                    |
| `POST /api/documents/:id/files`     | Загрузка файла/версии                                                    | multipart                                                        | 201 `{ documentVersion }`                          |
| `GET /api/files/:id`                | Метаданные файла                                                         | —                                                                | 200 `{ file }`                                     |
| `POST /api/templates`               | Создание кастомного шаблона (будущая функциональность)                   | `{ title, summary, kind, tasks[] }`                              | 201 `{ template }`                                 |

### Планируемые endpoints (на будущее)

| Метод и путь                        | Описание                                                                                     | Тело запроса                                        | Ответ                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /api/pm/projects/:id/budget`   | Получение полной информации о бюджете проекта (валюта, лимиты, категории, потраченные суммы) | —                                                   | 200 `{ currency, total, spentTotal, remainingTotal, warnThreshold, categoriesUsage }` |
| `PUT /api/pm/projects/:id/budget`   | Обновление настроек бюджета проекта (валюта, лимиты по категориям, порог предупреждения)     | `{ currency, total?, warnThreshold?, categories? }` | 200 `{ budget }`                                                                      |
| `GET /api/pm/projects/:id/expenses` | Список расходов проекта (альтернатива фильтрации через `/api/expenses?projectId=...`)        | Query                                               | 200 `{ items, pagination }`                                                           |

**Примечание:** Эти endpoints планируются для реализации в будущем. Текущая реализация использует:

- `PATCH /api/pm/projects/:id/budget` — только для обновления `budgetPlanned` (число)
- `GET /api/expenses?projectId=...` — для получения расходов проекта

API сохраняет обратную совместимость с текущими фронтенд-хэндлерами и добавляет ресурсы для документов/файлов и мультиаккаунта.

## Авторизация и мультиаккаунт

### Текущее состояние

- Dev-режим использует cookie `cv_session` с base64 JSON `{ email, role, issuedAt }` и выставляет её через `withSessionCookie`, а очистка происходит в `logout` handler’е.【F:apps/web/lib/auth/demo-session.ts†L3-L68】【F:apps/web/lib/auth/session-cookie.ts†L1-L34】【F:apps/web/app/api/auth/login/route.ts†L19-L83】
- Роли восстанавливаются из demo-сессии и кэшируются в `localStorage` для контроля навигации и прав (финансы/админка).【F:apps/web/lib/auth/roles.ts†L26-L48】

### Предлагаемый формат

1. **Сессии и токены**
   - Заменить демо-формат на зашифрованный JWT/паспортный токен, подписанный server-side ключом; cookie `cv_session` оставить для совместимости, но payload расширить до `{ userId, activeAccountId, roles, issuedAt }`.
   - В Redis/БД хранить refresh-токены (`sessions`), что позволит отзыв сессий при выходе и переключении аккаунтов.

2. **Мультиаккаунты**
   - **Текущее состояние:** Переключение организаций реализовано через `OrganizationContext` и `OrganizationSwitcher`. Workspaces хранятся in-memory.
   - **Целевое состояние:** Ввести понятие «workspace» как отдельной таблицы в БД. Пользователь хранит список `user_accounts`; переключение workspace обновляет `activeWorkspaceId` в сессии.
   - Эндпоинт `POST /api/auth/switch` валидирует принадлежность пользователя к workspace, записывает событие в `sessions` и обновляет cookie.
   - UI может читать список workspace через `GET /api/workspaces` и синхронизировать выбор (например, через `localStorage`/Zustand).
   - См. [ADR-0005](../architecture/adr/0005-multi-account-model.md) для деталей текущего vs целевого состояния.

3. **Роли и разрешения**
   - Роль пользователя вычисляется как комбинация `org_members.role` и `project_members.role`, мапится на фронтовые `UserRole` для существующих проверок (`canAccessFinance`, `canAccessAdmin`).【F:apps/web/lib/auth/roles.ts†L86-L100】
   - Дополнительно включить в payload пермишены (например, `scopes: ['projects:write', 'documents:read']`), чтобы Sidebar мог скрывать разделы без обращения к API.

4. **Dev-режим**
   - Сохранить `AUTH_DEV` флаг: при `on` backend генерирует фиктивные учётки и session payload по текущей схеме, чтобы не ломать демо-флоу, но внутренне пользоваться тем же интерфейсом `AuthService`.

Такой формат позволит регистрировать пользователей, создавать несколько рабочих пространств и безопасно переключаться между ними, оставаясь совместимыми с текущим фронтенд-UI.

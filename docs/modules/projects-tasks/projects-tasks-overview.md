# Проекты и задачи — Обзор

**Статус:** draft  
**Владелец:** product  
**Создан:** 2026-01-06  
**Последнее обновление:** 2026-01-06

## 1) Purpose

PM Core (Project Management Core) — основной модуль управления проектами и задачами платформы Collabverse. Модуль предоставляет полный набор инструментов для управления рабочими пространствами, проектами, задачами, командной работой и коммуникациями.

**Роль в платформе:**

- Центральный модуль для управления проектами и задачами
- Основа для интеграции с другими модулями (Finance, Marketplace, AI Hub)
- Предоставляет представления задач: Kanban, List, Calendar, Gantt, Dashboard
- Обеспечивает командную работу через комментарии, уведомления, чат
- Управляет файлами проектов через интеграцию с Vercel Blob Storage
- Поддерживает real-time обновления через WebSocket

## 2) Key objects

Основные сущности модуля PM Core:

- **Project** — проект, принадлежащий workspace. Содержит задачи, файлы, документы, команду
- **Task** — задача в проекте. Поддерживает иерархию (родитель-ребенок), статусы, метки, назначения
- **TaskComment** — комментарий к задаче. Поддерживает упоминания, файлы, реакции, древовидную структуру
- **Notification** — уведомление пользователю. Создается при событиях в проектах/задачах
- **ProjectChatMessage** — сообщение в командном чате проекта
- **FileObject** — файл в проекте. Может быть привязан к задаче, документу, комментарию, чату
- **ProjectMember** — участник проекта с ролью (owner, manager, contributor, viewer)
- **Workflow** — набор статусов для проекта. Определяет колонки Kanban и возможные переходы
- **Iteration** — итерация (спринт) в проекте. Группирует задачи по временным периодам
- **TaskDependency** — зависимость между задачами. Используется в диаграмме Ганта
- **AIAgent** — AI-агент проекта. Автоматизирует задачи и отвечает в чате

**Связанные сущности:**

- **Organization** — организация (см. `../../platform/overview.md`)
- **Workspace** — рабочее пространство (синоним Account)
- **ProjectTemplate** — шаблон проекта (см. `../marketplace/marketplace-overview.md`)

## 3) Top user scenarios (E2E)

### Сценарий 1: Создание проекта и управление задачами

1. Пользователь создает проект из шаблона или с нуля
2. Настраивает workflow проекта (статусы задач)
3. Создает задачи с назначением исполнителей
4. Управляет задачами через Kanban доску (drag & drop)
5. Отслеживает прогресс через Dashboard

### Сценарий 2: Командная работа над задачей

1. Пользователь открывает задачу
2. Просматривает комментарии и добавляет новый с упоминанием участника (@mention)
3. Прикрепляет файлы к комментарию
4. Участник получает уведомление о комментарии
5. Участник отвечает в комментариях или чате проекта

### Сценарий 3: Планирование проекта через диаграмму Ганта

1. Пользователь открывает проект и переходит на вкладку "Гант"
2. Видит все задачи проекта на временной шкале
3. Создает зависимости между задачами (drag & drop)
4. Видит критический путь проекта (выделен красным)
5. Изменяет сроки задач через перетаскивание

### Сценарий 4: Real-time синхронизация

1. Два пользователя работают над одним проектом
2. Первый пользователь создает задачу
3. Второй пользователь видит задачу мгновенно через WebSocket
4. Первый пользователь перемещает задачу в Kanban
5. Второй пользователь видит изменение в реальном времени

### Сценарий 5: Управление файлами проекта

1. Пользователь загружает файлы в проект (вкладка "Файлы")
2. Прикрепляет файлы к задачам и комментариям
3. Организует файлы в папки
4. Создает публичные ссылки для доступа к файлам
5. Восстанавливает файлы из корзины

## 4) Functional catalog

| Feature       | What it does                                                                                            | Doc                                    | Status     |
| ------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------- |
| Projects      | Создание, редактирование, архивирование проектов. Управление командой проекта, публикация в маркетплейс | [projects.md](./projects-tasks-projects.md)           | ✅ stable  |
| Tasks         | Создание и управление задачами. Иерархия, статусы, метки, назначения, зависимости                       | [tasks.md](./projects-tasks-tasks.md)                 | ✅ stable  |
| Comments      | Комментарии к задачам с упоминаниями, файлами, реакциями. Древовидная структура                         | [comments.md](./projects-tasks-comments.md)           | ✅ stable  |
| Notifications | Система уведомлений о событиях в проектах. In-app уведомления с фильтрацией                             | [notifications.md](./projects-tasks-notifications.md) | ✅ 95%     |
| Chat          | Командный чат проекта для общения участников. Прикрепление файлов, упоминания                           | [chat.md](./projects-tasks-chat.md)                   | ✅ stable  |
| Files         | Файловый менеджер проекта. Загрузка, организация в папки, публичные ссылки, корзина                     | [files.md](./projects-tasks-files.md)                 | ✅ stable  |
| Kanban        | Kanban представление задач. Drag & drop, группировки, фильтры, массовые операции                        | [kanban.md](./projects-tasks-kanban.md)               | ✅ stable  |
| List          | Табличное представление задач (Excel-подобное). Настраиваемые колонки, инлайн-редактирование            | [tasks.md](./projects-tasks-tasks.md#list-view)       | ✅ stable  |
| Calendar      | Календарное представление задач. День/Неделя/Месяц, drag-to-reschedule                                  | [tasks.md](./projects-tasks-tasks.md#calendar-view)   | ✅ stable  |
| Gantt         | Диаграмма Ганта для визуализации задач по срокам. Зависимости, критический путь                         | [tasks.md](./projects-tasks-tasks.md#gantt-view)      | ✅ stable  |
| Dashboard     | Дашборд workspace с виджетами: Пульс, Прогресс, Нагрузка исполнителей, Финансы                          | [dashboard.md](./projects-tasks-metrics.md)         | ⚠️ partial |
| WebSocket     | Real-time обновления через WebSocket. Синхронизация состояния между клиентами                           | [websocket.md](./projects-tasks-websocket.md)         | ✅ 95%     |
| Access        | Модель доступа к проектам. Роли, права, приглашения, внешние участники                                  | [access.md](./projects-tasks-access.md)               | ✅ stable  |
| Teams         | Команды проектов и организаций. Участники, роли, приглашения                                            | [teams.md](./projects-tasks-teams.md)                 | ✅ stable  |

**Легенда статусов:**

- ✅ **stable** — полностью реализовано и протестировано
- ⚠️ **partial** — частично реализовано, есть оставшиеся задачи
- ⏳ **draft** — в разработке

## 5) Permissions

См. [`../../platform/roles-permissions.md`](../../platform/roles-permissions.md) для детальной матрицы прав доступа.

**Основные роли в проекте:**

- **owner** — владелец проекта. Полный контроль над проектом
- **manager** — менеджер проекта. Может управлять задачами, командой, но не удалять проект
- **contributor** — участник проекта. Может создавать и редактировать задачи, комментировать
- **viewer** — наблюдатель. Только просмотр задач и комментариев

**Проверка прав:**

- Backend: `projectsRepository.hasAccess(projectId, userId, permission)`
- Frontend: проверка роли через `getUserRoles()` и `canAccessProject()`

## 6) Analytics

См. [`../../platform/analytics-events.md`](../../platform/analytics-events.md) для полного списка событий аналитики.

**Основные события PM Core:**

- `project.created`, `project.updated`, `project.archived`
- `task.created`, `task.updated`, `task.status_changed`, `task.assigned`
- `comment.added`, `comment.updated`, `comment.deleted`
- `notification.created`, `notification.read`
- `chat.message.sent`
- `file.uploaded`, `file.downloaded`, `file.deleted`

## 7) Implementation status

См. [`_implementation-plan.md`](./projects-tasks-implementation-plan.md) для детального плана реализации.

**Краткий статус:**

- ✅ **Stage H** (Комментарии) — завершён
- ✅ **Stage I** (Уведомления) — 95% завершён
- ✅ **Stage J** (Чат и файлы) — завершён
- ✅ **Stage K** (Диаграмма Ганта) — завершён
- ✅ **Stage L** (WebSocket) — 95% завершён
- ✅ **Stage M** (AI-ассистент) — завершён
- ❌ **Stage N** (Расширенная AI) — не начат

**Общий прогресс:** ~85% выполнено (6 из 7 этапов)

## 8) Related documents

### Платформенные документы

- [`../../platform/overview.md`](../../platform/overview.md) — обзор платформы
- [`../../platform/glossary.md`](../../platform/glossary.md) — глоссарий терминов
- [`../../platform/roles-permissions.md`](../../platform/roles-permissions.md) — роли и права
- [`../../platform/analytics-events.md`](../../platform/analytics-events.md) — события аналитики

### Архитектурные документы

- [`../../architecture/system-analysis.md`](../../architecture/system-analysis.md) — системный анализ
- [`../../architecture/database-architecture.md`](../../architecture/database-architecture.md) — архитектура БД

### Документы разработки

- [`./projects.md`](./projects-tasks-projects.md) — мастер-документ по проектам
- [`../../archive/2026-01-07-pm-core-migration/plans/projects-implementation-plan.md`](../../archive/2026-01-07-pm-core-migration/plans/projects-implementation-plan.md) — план реализации (архив)
- [`../../ROADMAP.md`](../../ROADMAP.md) — долгосрочные планы

### UX и дизайн

- [`../../archive/2026-01-07-platform-migration/02-Platforma-Opisanie.md`](../../archive/2026-01-07-platform-migration/02-Platforma-Opisanie.md) — UX потоки проектов и задач (архив)

---

## TODO / Future improvements

Идеи и задачи на будущее, возникшие в процессе разработки:

| Идея                                     | Приоритет | Дата       | Контекст | Статус |
| ---------------------------------------- | --------- | ---------- | -------- | ------ |
| Email уведомления                        | P2        | 2024-XX-XX | Stage I  | ⏳     |
| Push уведомления                         | P2        | 2024-XX-XX | Stage I  | ⏳     |
| История версий файлов                    | P2        | 2024-XX-XX | Stage J  | ⏳     |
| Структурирование файлов по папкам        | P2        | 2024-XX-XX | Stage J  | ⏳     |
| Unit/E2E тесты для WebSocket             | P2        | 2024-XX-XX | Stage L  | ⏳     |
| POST endpoint для приглашения участников | P2        | 2024-XX-XX | Stage I  | ⏳     |
| Автоматическая проверка дедлайнов        | P2        | 2024-XX-XX | Stage I  | ⏳     |
| Расширенная AI функциональность          | P3        | 2024-XX-XX | Stage N  | ⏳     |

---

**Последнее обновление:** 2026-01-06
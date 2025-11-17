# Cursor Runbook — «Проекты и задачи» v1 (A–F)

> Цель: Один файл, который Cursor выполнит последовательно — обновит документацию (03-Technical-Plan.md, 02-Platforma-Opisanie.md, PLAN.md), создаст каркас раздела и подготовит серию PR по этапам A→F. Вставки даны текстом. Следуй шагам строго.

---

## 0) Общие правила и соглашения
- Изменения группируем **по этапам**: A (навигация) → B (проекты/карточка) → C (задачи) → D (дашборд) → E (архив) → F (интеграции).
- Каждому этапу — **отдельная ветка и PR**. Все новые части за **фичефлагами** (см. ниже).
- В документах вставки помечены HTML‑маркерами `<!-- BEGIN ... -->/<!-- END ... -->` для диффов.
- Ничего лишнего не менять: только то, что указано. Путь к файлам — корень репо `/docs` (если иное не указано).

Фичефлаги (использовать в коде и при проверке):
- `pm.nav.projects_and_tasks`
- `pm.projects.list`
- `pm.project.card`
- `projectsOverview`
- `pm.tasks.board`, `pm.tasks.list`, `pm.tasks.calendar`
- `pm.dashboard`
- `pm.archive`

---

## 1) Обновление документации (выполнить в Этапе A как часть одного PR)
Выполнить **в указанном порядке**.

### 1.1 Обновить 03-Technical-Plan.md — IA/роуты/контракты/аналитика/QA
**Действие:** открыть `03-Technical-Plan.md`, перейти в конец файла и **вставить блоки целиком** ниже.

#### Вставка — IA, роуты, фичефлаги
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

#### Вставка — Контракты данных (TypeScript)
<!-- BEGIN PM-DATA-CONTRACTS -->
### Data Contracts (TypeScript)
```ts
export type ProjectStatus = 'DRAFT'|'ACTIVE'|'ON_HOLD'|'COMPLETED'|'ARCHIVED';

export interface ProjectMember { userId: string; role: 'OWNER'|'ADMIN'|'MEMBER'|'CONTRACTOR'|'GUEST' }

export interface Project {
  id: string; name: string; key: string; status: ProjectStatus;
  startDate?: string; dueDate?: string;
  ownerId: string; members: ProjectMember[];
  metrics?: { total: number; inProgress: number; overdue: number; progressPct: number; budgetUsed?: number; budgetLimit?: number; activity7d: number };
  marketplace?: { listingId?: string; state: 'none'|'draft'|'published'|'rejected' };
}

export interface Task {
  id: string; projectId: string; number: number; title: string;
  status: string; priority?: 'low'|'med'|'high'|'urgent';
  assigneeId?: string; startDate?: string; dueDate?: string;
  estimate?: number; timeSpent?: number; labels?: string[];
  deps?: string[]; customFields?: Record<string, unknown>;
  updatedAt: string; createdAt: string;
}
```

### Status Model
- Стандартные статусы задач: Backlog → In Progress → Review → Done.
- Пользовательские статусы разрешены (конфиг проекта), колонки Kanban = статусы.
<!-- END PM-DATA-CONTRACTS -->

#### Вставка — Аналитика событий
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

#### Вставка — Quality Gate & Testing
<!-- BEGIN PM-QA-GATE -->
### Quality Gate & Testing
- DoD: зелёная сборка (Vercel), включение фич только через фичефлаги.
- E2E (Playwright): навигация; создание проекта; создание задачи; DnD в Kanban; перенос в Calendar; инвайт; архив/восстановление.
- Производительность: виртуализация списков, серверная пагинация, компактные payload’ы.
<!-- END PM-QA-GATE -->

---

### 1.2 Обновить 02-Platforma-Opisanie.md — UX‑потоки и сценарии
**Действие:** открыть `02-Platforma-Opisanie.md`, перейти в конец файла и **вставить блок целиком** ниже.

#### Вставка — UX потоки
<!-- BEGIN PM-UX-FLOWS -->
## UX потоки — «Проекты и задачи»

### Вкладки
1. **Дашборд (/pm)** — виджеты: Пульс, Прогресс, Нагрузка исполнителей, Финансы. Все кликабельны и ведут к дрилдаунам.
2. **Проекты (/pm/projects)** — список карточек проектов: фильтры (статус/участник/метки), сортировки, поиск, skeleton/empty states. Карточка проекта — центр связок.
3. **Задачи (/pm/tasks)** — кросс‑проектные представления: **Board/List/Calendar** с URL‑state и пресетами.
4. **Архив (/pm/archive)** — read‑only просмотр, восстановление проекта.

### Карточка проекта — сценарии
- Быстрый инвайт по ссылке (TTL/uses) + приглас по email; роли OWNER/ADMIN/MEMBER/CONTRACTOR/GUEST.
- Создать задачу (модалка) с автопривязкой к проекту.
- Создать трату (финансы) → если превышен лимит — показать баннер, отправить на согласование.
- Выставить в маркетплейс → черновик Product и мастер качества.
- Активность: последние события (задачи, комментарии, траты) за 7 дней.

### Задачи — режимы
- **Kanban:** колонки=статусы; DnD; swimlanes: assignee/priority; группировки: по статусу/активности/срокам; массовые операции.
- **List (Excel‑подобный):** настраиваемые колонки, инлайн‑редактирование, фильтры/сортировки на уровне колонок, пресеты, экспорт CSV.
- **Calendar:** День/Неделя/Месяц; drag‑to‑reschedule; переключатель «Только мои/Все».

### Состояния/Empty
- Нет проектов → CTA «Создать проект».
- Нет задач под фильтром → предложение сбросить фильтры/переключить представление.

### Доступность/Тема
- Светлая/тёмная темы; контраст ≥ WCAG AA; фокус‑ринги; удобные hit‑areas на мобильных.
<!-- END PM-UX-FLOWS -->

---

### 1.3 Обновить PLAN.md — дорожная карта A–F, DoD, метрики
**Действие:** открыть `PLAN.md`, найти устаревшие пункты по «Проектам» (если есть) — удалить. В конец файла **вставить блок целиком** ниже.

#### Вставка — Roadmap A–F
<!-- BEGIN PM-ROADMAP-AF -->
# Roadmap: «Проекты и задачи» (A–F)

## Этап A — Навигация и каркас
- Меню «Проекты и задачи», роуты `/pm`, `/pm/projects`, `/pm/tasks`, `/pm/archive`.
- Флаг `pm.nav.projects_and_tasks`. Пустой Дашборд (empty state + CTA).
**DoD:** переходы работают; URL‑state сохраняется; Playwright smoke.
**Метрики:** % кликов в раздел; bounce после первого захода.

## Этап B — Проекты (список + карточка)
- CRUD проектов; карточка: KPI/быстрые действия/связки (Маркетплейс, Маркетинг, Финансы, Инвайты).
**DoD:** инвайты (TTL/uses), ACL; e2e карточки; события аналитики.
**Метрики:** конверсия создания проекта; доля проектов с инвайтами.

## Этап C — Задачи (Board/List/Calendar)
- Кросс‑проектные представления + фильтры/пресеты; DnD; переносы дат.
**DoD:** виртуализация; серверная пагинация; e2e DnD/перенос; экспорт CSV.
**Метрики:** среднее время CRUD; использование представлений; % просрочек.

## Этап D — Дашборд
- Виджеты: Пульс, Прогресс, Нагрузка, Финансы; дрилдауны.
**DoD:** фильтры, кликабельность; корректные агрегации.
**Метрики:** частота посещений; CTR по виджетам.

## Этап E — Архив
- Архив/восстановление проекта; read‑only просмотр.
**DoD:** e2e архивации; события `archived/restored`.
**Метрики:** доля восстановленных проектов; время до восстановления.

## Этап F — Интеграции
- POST `/projects/:id/listings` (маркетплейс, черновик);
- POST `/finance/expenses` из карточки/задачи; лимиты и баннеры;
- Deeplink на маркетинг‑панели `?projectId=...`.
**DoD:** кнопки‑связки; журнал лимитов; e2e интеграций.
**Метрики:** создание трат из проекта; публикации в маркетплейс.
<!-- END PM-ROADMAP-AF -->

---

## 2) Реализация кода — этапы и PR (последовательно)

### Этап A — Навигация и каркас
**Задачи:**
- Переименовать пункт главного меню в **«Проекты и задачи»**; роут `/pm` (дашборд‑заглушка).
- Добавить левое меню раздела: Дашборд, Проекты, Задачи, Архив.
- Создать страницы: `/pm`, `/pm/projects`, `/pm/tasks`, `/pm/archive` (пустые шаблоны).
- Поведение правого рейла: в развороте — поверх контента; в свёрнутом — контент расположен между левым и свёрнутым рейлом (не «под» ним).
- Включить флаги: `pm.nav.projects_and_tasks` (остальные — по умолчанию off).
- Телеметрия навигации: `pm_nav_opened`, `pm_tab_changed`.

**QA/DoD:** переходы и URL‑state; Playwright smoke.

**Git:**
- Ветка: `pm/A-nav-skeleton`
- Коммит: `feat(pm): nav skeleton, routes, flags; docs: IA/UX/roadmap`
- PR: `Проекты и задачи — Этап A: навигация и каркас`

---

### Этап B — Проекты (список + карточка проекта)
**Список:**
- Фильтры: статус/владелец/участник/метки; поиск; сортировки (обновлён/дедлайн/прогресс).
- Карточки‑тайлы с мини‑метриками; виртуализация; skeleton/empty states.

**Карточка проекта (центр связок):**
- Шапка: name/key/status/dates/owner, прогресс %.
- KPI: всего/в работе/просрочено; бюджет (исп./лимит); активность 7д.
- Быстрые действия: «Новая задача», «Пригласить», «Создать трату», «Выставить в маркетплейс».
- Связи: Маркетплейс (статус публикации), Маркетинг (deeplink с `projectId`), Финансы (последние траты).
- Исполнители: роли OWNER/ADMIN/MEMBER/CONTRACTOR/GUEST, инвайт‑ссылка (TTL/uses) и приглас по email.
- Активность: лента изменений (задачи/комменты/траты).

**Флаги:** `pm.projects.list`, `pm.project.card`.

**Аналитика:** `pm_project_*`, `pm_invite_link_created`, переходы по связкам.

**QA/DoD:** CRUD проектов; инвайты и ACL; e2e карточки; события пишутся.

**Git:**
- Ветка: `pm/B-projects-card`
- Коммит: `feat(pm): projects list and project card with links; invites; analytics`
- PR: `Этап B: список проектов и карточка`

---

### Этап C — Задачи (Board/List/Calendar)
**Общее:** задача всегда принадлежит проекту; вкладка «Задачи» агрегирует кросс‑проектно. Фильтры: проект, assignee, статус, приоритет, сроки, метки; пресеты с именем.

**Board (Kanban):**
- Колонки = статусы (по умолчанию Backlog/In Progress/Review/Done; поддержка пользовательских).
- DnD карточек; swimlanes: `assignee`/`priority`.
- Режимы группировки: по статусу / по активности / по срокам.
- Массовые операции (изменить статус/исполнителя/метки).

**List (Excel‑подобный):**
- Настраиваемые колонки: id, номер, название, проект, статус, приоритет, assignee, due, estimate, labels, timeSpent, deps.
- Инлайн‑редактирование, фильтры/сортировки на уровне колонок, сохранение пресетов, экспорт CSV.

**Calendar:**
- День/Неделя/Месяц; перетаскивание меняет `start/due`; быстрые карточки; тумблер «Только мои/Все».

**Флаги:** `pm.tasks.board`, `pm.tasks.list`, `pm.tasks.calendar`.

**Аналитика:** `pm_task_*`, `pm_view_changed`, `pm_filter_applied`, `pm_preset_saved`.

**Производительность:** виртуализация списков; серверная пагинация.

**QA/DoD:** e2e создание/редактирование/массовые операции, DnD, перенос дат; CSV экспорт.

**Git:**
- Ветка: `pm/C-tasks-views`
- Коммит: `feat(pm): tasks Board/List/Calendar; presets; DnD; CSV export`
- PR: `Этап C: представления задач`

---

### Этап D — Дашборд
**Виджеты v1:**
- Пульс: активные проекты, мои открытые задачи, просрочки, ближайшие дедлайны.
- Прогресс: burnup/burndown lite.
- Нагрузка исполнителей: мини‑heatmap.
- Финансы: траты vs лимиты (по проектам).

**Флаг:** `pm.dashboard`.

**QA/DoD:** фильтры, кликабельные дрилдауны; корректные агрегации.

**Git:**
- Ветка: `pm/D-dashboard`
- Коммит: `feat(pm): dashboard widgets with drilldowns`
- PR: `Этап D: дашборд`

---

### Этап E — Архив
**Функционал:** архивирование/восстановление проекта, read‑only просмотр в архиве.

**Флаг:** `pm.archive`.

**Аналитика:** `pm_project_archived`, `pm_project_restored`.

**QA/DoD:** e2e архив/восстановление.

**Git:**
- Ветка: `pm/E-archive`
- Коммит: `feat(pm): project archive and restore`
- PR: `Этап E: архив`

---

### Этап F — Интеграции
**Маркетплейс:** `POST /projects/:id/listings` — создаёт черновик Product; статус на карточке проекта.  
**Финансы:** `POST /finance/expenses` из карточки проекта/задачи; правила лимитов, баннер «превышен лимит»; журнал срабатываний.  
**Маркетинг:** deeplink на панели с `?projectId=...`.

**QA/DoD:** кнопки‑связки работают; журнал лимитов; e2e интеграций.

**Git:**
- Ветка: `pm/F-integrations`
- Коммит: `feat(pm): marketplace/finance/marketing integrations; limits log`
- PR: `Этап F: интеграции`

---

## 3) Быстрые промпты для Cursor (скопировать и выполнить по очереди)

### Промпт 1 — Обновить 03-Technical-Plan.md
```
Открой 03-Technical-Plan.md. В самый конец файла вставь четыре блока из этого runbook’а:
[PM-IA-ROUTES], [PM-DATA-CONTRACTS], [PM-ANALYTICS], [PM-QA-GATE].
Ничего другого в файле не меняй.
```

### Промпт 2 — Обновить 02-Platforma-Opisanie.md
```
Открой 02-Platforma-Opisanie.md. В конец файла вставь раздел
[PM-UX-FLOWS] целиком из этого runbook’а.
```

### Промпт 3 — Обновить PLAN.md
```
Открой PLAN.md. Удали устаревшие пункты про «Проекты» (если есть).
В конец файла вставь раздел [PM-ROADMAP-AF] целиком из этого runbook’а.
```

### Промпт 4 — Этап A (код)
```
Создай ветку pm/A-nav-skeleton. Переименуй главный пункт меню в «Проекты и задачи».
Добавь страницы: /pm, /pm/projects, /pm/tasks, /pm/archive (пока пустые).
Проверь поведение правого рейла: в развороте — поверх контента; в свёрнутом — контент не залезает под него.
Включи флаг pm.nav.projects_and_tasks. Добавь аналитические события навигации.
Подготовь PR «Проекты и задачи — Этап A: навигация и каркас» с Playwright smoke-тестом переходов.
```

### Промпт 5 — Этап B (код)
```
Создай ветку pm/B-projects-card. Реализуй список проектов (фильтры/сортировки/виртуализация) и карточку проекта
(KPI, быстрые действия, связки: маркетплейс/маркетинг/финансы, активности 7д).
Сделай инвайт-ссылку (TTL/uses) и приглашения по email. Применяй ACL к действиям и видимости.
Добавь события pm_project_* и pm_invite_link_created. Подготовь PR «Этап B: список проектов и карточка».
```

### Промпт 6 — Этап C (код)
```
Создай ветку pm/C-tasks-views. Вкладка «Задачи»: Board/List/Calendar с URL-state, пресетами, DnD и переносом дат.
List: настраиваемые колонки, фильтры/сортировки на уровне колонок, инлайн-редактирование, экспорт CSV.
Настрой виртуализацию и серверную пагинацию. Добавь события pm_task_* и представлений.
Подготовь PR «Этап C: представления задач».
```

### Промпт 7 — Этап D (код)
```
Создай ветку pm/D-dashboard. Реализуй виджеты: Пульс, Прогресс, Нагрузка, Финансы.
Сделай фильтры и кликабельные дрилдауны. Подготовь PR «Этап D: дашборд».
```

### Промпт 8 — Этап E (код)
```
Создай ветку pm/E-archive. Реализуй архив/восстановление проектов и просмотр архива в read-only.
Добавь события archived/restored. Подготовь PR «Этап E: архив».
```

### Промпт 9 — Этап F (код)
```
Создай ветку pm/F-integrations. Добавь кнопки и вызовы API:
— POST /projects/:id/listings (маркетплейс, черновик),
— POST /finance/expenses (траты),
— Deeplink в маркетинг-панели с ?projectId=...
Сделай журнал лимитов. Подготовь PR «Этап F: интеграции».
```

---

## 4) Риски и допущения (для контроля)
- **Допущение:** дефолтный набор статусов задач — Backlog/In Progress/Review/Done; кастомизация позже.
- **Производительность:** длинные списки → виртуализация и серверная пагинация.
- **ACL:** синхронизация UI и API → единые e2e на роли, снапшоты UI.

---

## 5) Чек‑листы DoD (сводно)
- **A:** флаг активирует раздел; переходы/URL‑state; smoke e2e.
- **B:** CRUD проектов; карточка и связки; инвайты TTL/uses; ACL; аналитика.
- **C:** Board/List/Calendar; DnD и перенос дат; пресеты; виртуализация; CSV; e2e.
- **D:** 4 виджета; фильтры; дрилдауны; корректные агрегации.
- **E:** Архив/восстановление; e2e; события.
- **F:** Интеграции маркетплейс/финансы/маркетинг; журнал лимитов; e2e.

---

## 6) Rollout & Monitoring `projectsOverview`
- Подготовь дашборд и алерты по инструкции из `docs/monitoring/projects-overview.md`. Обязательные метрики: DAU (`projects_overview_viewed`), конверсия quick actions, ошибки `/api/pm/projects`.
- Перед включением флага на production пройди чек-лист (staging smoke, 10+ событий, алерты активированы).
- После включения мониторь алерты `projects_overview_zero_views`, `projects_overview_api_errors`; при срабатывании выполните откат (см. раздел «Откат» в документе).
- Зафиксируй статус rollout в `docs/STAGE_G_SUMMARY.md` или в Confluence.

---

## 7) Шаблоны коммитов и PR
- **A:** `feat(pm): nav skeleton, routes, flags; docs: IA/UX/roadmap` → PR `Проекты и задачи — Этап A: навигация и каркас`
- **B:** `feat(pm): projects list and project card with links; invites; analytics` → PR `Этап B: список проектов и карточка`
- **C:** `feat(pm): tasks Board/List/Calendar; presets; DnD; CSV export` → PR `Этап C: представления задач`
- **D:** `feat(pm): dashboard widgets with drilldowns` → PR `Этап D: дашборд`
- **E:** `feat(pm): project archive and restore` → PR `Этап E: архив`
- **F:** `feat(pm): marketplace/finance/marketing integrations; limits log` → PR `Этап F: интеграции`

---

**Готово. Выполняй шаги сверху вниз.**

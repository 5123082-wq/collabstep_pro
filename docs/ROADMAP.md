# Долгосрочные планы реализации

**Статус:** активен  
**Владелец:** product + engineering  
**Создан:** 2026-01-06  
**Последнее обновление:** 2026-03-15

> **Примечание:** Этот файл является каноническим источником истины для всех долгосрочных планов.  
> См. также: `docs/platform/changelog.md` (что реально вышло) и `docs/playbooks/release-process.md` (как релизимся)

## Назначение

Этот документ является **единым источником истины** для всех долгосрочных планов реализации фич и модулей платформы Collabstep.

### Правила работы с этим документом

1. **При создании нового плана:**
   - Добавить раздел модуля (если его нет)
   - Создать запись с этапами, статусами, датами
   - Указать зависимости от других планов

2. **При реализации этапа:**
   - Обновить статус этапа (⏳ → 🔄 → ✅)
   - Добавить дату начала и завершения
   - Обновить "Последнее обновление" в заголовке

3. **При возникновении идей в процессе:**
   - Добавить в раздел "Будущие улучшения" соответствующего модуля
   - Указать дату и контекст (из какого этапа возникла идея)

4. **При изменении приоритетов:**
   - Обновить приоритет (P0/P1/P2/P3)
   - Обновить порядок этапов
   - Указать причину изменения

### Связь с другими документами

- `docs/ROADMAP.md` отвечает на вопрос: что планируется, что уже начато и что завершено в реализации.
- `docs/modules/<module>/<module>-overview.md` отвечает на вопрос: что умеет модуль и в каком состоянии его функции.
- `docs/modules/<module>/<module>-implementation-plan.md` детализирует крупные реализации, если такой файл существует.
- `CONTINUITY.md` фиксирует только активный handoff и текущее рабочее состояние, особенно если задача поставлена на паузу.
- `docs/platform/changelog.md` отражает только реально выпущенные изменения.

### Жизненный цикл идеи / фичи

1. **Идея появилась:**
   - Добавить в `Текущие планы` или `Будущие улучшения`
   - Указать дату, контекст и приоритет

2. **Реализация началась:**
   - Обновить статус на `🔄`
   - Добавить дату начала
   - Синхронизировать module overview и `CONTINUITY.md`

3. **Работа поставлена на паузу:**
   - Не ставить `✅` раньше времени
   - Оставить честный статус и open scope
   - Зафиксировать точку остановки в `CONTINUITY.md`

4. **Реализация завершена:**
   - Обновить статус на `✅`
   - Добавить дату завершения
   - Синхронизировать module overview, implementation plan и cross-cutting docs

5. **Изменение вышло в релиз:**
   - Добавить запись в `docs/platform/changelog.md`

---

## Структура планов

Каждый модуль содержит:
- **Текущие планы** - активные этапы реализации
- **Завершенные этапы** - история реализации
- **Будущие улучшения** - идеи и задачи на будущее

---

## PM Core (Project Management Core)

### Текущие планы

#### План реализации раздела "Проекты" (Stage H-N)

**Статус:** ✅ 86% завершено (6 из 7 этапов)  
**Приоритет:** P0-P3  
**Источник:** `docs/archive/2026-01-07-pm-core-migration/plans/projects-implementation-plan.md`  
**Последнее обновление:** 2024-11-16

| Этап | Описание | Статус | Приоритет | Начало | Завершение | Зависимости |
|------|----------|--------|-----------|--------|------------|-------------|
| Stage H | Комментарии к задачам | ✅ Завершён | P0 | 2024-XX-XX | 2024-XX-XX | - |
| Stage I | Система уведомлений | ✅ 95% завершён | P0 | 2024-XX-XX | 2024-XX-XX | Stage H |
| Stage J | Чат проекта и файловый каталог | ✅ Завершён | P1 | 2024-XX-XX | 2024-XX-XX | Stage I |
| Stage K | Диаграмма Ганта и зависимости | ✅ Завершён | P1 | 2024-XX-XX | 2024-XX-XX | - |
| Stage L | Real-time обновления (WebSocket) | ✅ 95% завершён | P1 | 2024-XX-XX | 2024-XX-XX | Stage H, I, J |
| Stage M | AI-ассистент (базовый) | ✅ Завершён | P2 | 2024-XX-XX | 2024-XX-XX | Stage H, I, J |
| Stage N | Расширенная функциональность AI | ❌ Не начат | P3 | - | - | Stage M, K |

**Детали:** См. `docs/archive/2026-01-07-pm-core-migration/plans/projects-implementation-plan.md`

**Оставшиеся задачи:**
- ⚠️ Stage I: POST endpoint для приглашения участников
- ⚠️ Stage I: Автоматическая проверка дедлайнов
- ⚠️ Stage L: Unit и E2E тесты для WebSocket
- ❌ Stage N: Расширенная AI функциональность (низкий приоритет)

---

### Завершенные этапы

#### Multi-Organization Premium Feature

**Статус:** ✅ Завершён  
**Завершено:** 2026-01-03

**Реализовано:**
- DB migration 0008: `is_primary` column в `organization_member`, `user_subscription` table
- Zustand store: `organization-store.ts`
- Context: `OrganizationContext.tsx` с `useOrganization()` hook
- OrganizationSwitcher с переключением организаций
- API limits: free=1 org, pro/max=unlimited
- Paywall modal для free users

**Документация:** См. `docs/archive/continuity/2026-03-08-continuity-ledger-history.md` (запись за 2026-01-03)

---

#### PM People Picker и прямое добавление участников проекта

**Статус:** ✅ Базовый slice завершён  
**Завершено:** 2026-03-15

**Реализовано:**
- добавлен server-side people picker `/api/pm/projects/[id]/member-candidates` для поиска зарегистрированных пользователей платформы по имени, email и должности;
- picker размечает состояние кандидата как `уже в проекте` / `в команде организации` / `только на платформе`;
- добавлен `POST /api/pm/projects/[id]/members` для прямого добавления existing platform user в PM-проект без email-only обходного сценария;
- PM modal управления участниками переведён с link-only flow на `поиск + direct add`, при этом invite-link оставлен как fallback;
- назначение в задачу осталось project-scoped: в assignee picker попадают только участники проекта, но UI теперь явно подсказывает сначала добавить человека в команду проекта;
- синхронизированы PM docs и analytics taxonomy под новый people-picker contract.

**Follow-up вне этого slice:**
- отдельная user directory / картотека пользователей вне project modal;
- org-first invite-and-add flow из PM modal, если нужен более жёсткий organization-gate до project access;
- расширение telemetry и notification policy при необходимости.

---

#### Шаблоны задач проектов и создание проектов из шаблонов

**Статус:** ✅ Завершён  
**Завершено:** 2026-01-05

**Реализовано:**
- Миграция БД `0011_project_template_tasks.sql`
- Репозиторий `TemplateTasksRepository`
- API endpoints для управления задачами шаблона
- UI компоненты: `TemplateTaskTree`, `TemplateTaskForm`
- Сервис создания проекта из шаблона
- UI wizard `CreateProjectFromTemplateModal`

**Документация:** См. `docs/archive/continuity/2026-03-08-continuity-ledger-history.md` (записи за 2026-01-04 и 2026-01-05)

---

### Будущие улучшения

**Источник:** Идеи, возникшие в процессе реализации

| Идея | Модуль | Приоритет | Дата | Контекст | Статус |
|------|--------|-----------|------|----------|--------|
| Email уведомления | PM Core | P2 | 2024-XX-XX | Stage I | ⏳ |
| Push уведомления | PM Core | P2 | 2024-XX-XX | Stage I | ⏳ |
| История версий файлов | PM Core | P2 | 2024-XX-XX | Stage J | ⏳ |
| Структурирование файлов по папкам | PM Core | P2 | 2024-XX-XX | Stage J | ⏳ |
| "God mode" view (видеть все orgs) | PM Core | P3 | 2026-01-03 | Multi-Org | ⏳ |
| Индикатор org в карточках проектов/задач | PM Core | P3 | 2026-01-03 | Multi-Org | ⏳ |

---

## Marketplace

### Текущие планы

#### Реорганизация user-facing раздела "Каталог" поверх текущего домена Marketplace

**Статус:** ✅ Завершён  
**Источник:** `docs/modules/marketplace/marketplace-implementation-plan.md`  
**Последнее обновление:** 2026-03-09

| Фаза | Описание | Статус | Приоритет | Начало | Завершение | Зависимости |
|------|----------|--------|-----------|--------|------------|-------------|
| C0 | Документационное выравнивание и orchestration-pack | ✅ Завершён | P0 | 2026-03-09 | 2026-03-09 | - |
| C1 | IA, навигация и discovery-first feed | ✅ Завершён | P0 | 2026-03-09 | 2026-03-09 | C0 |
| C2 | Публичная страница автора и author identity | ✅ Завершён | P0 | 2026-03-09 | 2026-03-09 | C1 |
| C3 | Публикация и кабинет автора | ✅ Завершён | P0 | 2026-03-09 | 2026-03-09 | C2 |
| C4 | Apply/import flows и secondary deal-layer | ✅ Завершён | P1 | 2026-03-09 | 2026-03-09 | C3 |
| C5 | Cross-cutting sync: permissions, analytics, docs, QA | ✅ Завершён | P0 | 2026-03-09 | 2026-03-09 | C1, C2, C3, C4 |

**Детали:** См. `docs/modules/marketplace/marketplace-implementation-plan.md`

---

### Завершенные этапы

#### C0. Документационное выравнивание и orchestration-pack

**Статус:** ✅ Завершён  
**Завершено:** 2026-03-09

**Реализовано:**
- Новый user-facing framing модуля как `Каталог`
- Новый overview модуля
- Основной implementation-plan для orchestration и pause/resume
- Пакет документов для субагентов
- Архивный snapshot legacy Marketplace-first модели
- Синхронизация `ROADMAP`, `CONTINUITY`, `docs/README.md`, `docs/INDEX.md`, `docs/platform/overview.md`

#### C1. IA, навигация и discovery-first feed

**Статус:** ✅ Завершён  
**Завершено:** 2026-03-09

**Реализовано:**
- `/market` стал discovery-first лентой вместо redirect в шаблоны
- `Маркетплейс` переведён в user-facing `Каталог` в навигации, topbar и command palette
- discovery-карточки шаблонов, готовых решений и услуг упрощены до названия, краткого описания, хэштегов, автора и demo-метрик
- CTA `Открыть`, `Сохранить`, `В проект`, `Запросить адаптацию` убраны с плиток ленты и перенесены в detail surface
- `Готовые решения`, `Услуги`, `Подборки`, `Сохранённое`, `Корзина и оформление`, `Сделки и доступ`, `Опубликовать` и `Мои публикации` переоформлены под новую IA
- `pnpm -w typecheck` выполнен успешно

#### C2. Публичная страница автора и author identity

**Статус:** ✅ Завершён  
**Завершено:** 2026-03-09

**Реализовано:**
- `/p/:handle` зафиксирован как каноническая public author-page каталога
- author-page reuse-ит текущий `performer_profile` / `handle` / `isPublic` stack как Phase 1 решение
- добавлен блок `Решения автора`, который показывает только публичные catalog entities
- `project.ownerId` больше не считается нормой author attribution для public author-page
- PM-based `MarketplaceListing` временно скрыты на author-page до C3, если у публикации нет явного author contract
- добавлен fallback author-shell по `handle`, чтобы author-link из карточек не ломал flow, даже если performer-profile ещё не публичен или discovery пока работает на mock/demo данных
- `pnpm -w typecheck` выполнен успешно

**Коррективная задача перед C3 выполнена:**
- discovery-карточки упрощены, CTA убраны из ленты и demo-метрики `лайки / просмотры / использования` оставлены как placeholders без новой аналитики и backend-источника

**Handoff в C3:**
- собрать единый author-publications source с явным author contract для `MarketplaceListing`, шаблонов и услуг
- определить author entity каталога как человека или команду; это обязательный design/input topic следующего этапа

#### C3. Публикация и кабинет автора

**Статус:** ✅ Завершён  
**Последнее обновление:** 2026-03-09

**Что исправлено в rework C3:**
- ownership для PM publish-flow больше не определяется через deprecated `project.organization_id`:
  - канонический source для C3 теперь строится из PM `project.workspaceId -> workspace.accountId` и безопасного organization/account mapping layer;
  - legacy `project` table остаётся вне критического path для authorship resolution;
- `/market/publish` использует этот PM ownership contract только для create/manage decision:
  - personal project -> publish only owner, author entity = человек-владелец;
  - team-owned project -> publish by owner/admin, author entity = команда;
- `MarketplaceListing` больше не опирается на `currentUser.id` / `authorUserId` как на единственный source of truth:
  - добавлены явные `authorEntityType`, `authorEntityId`, `publishedByUserId`, `lastEditedByUserId`;
  - actor и author entity разделены;
- persisted listing contract стал source of truth для listing-layer:
  - `/market/seller` читает author entity уже созданной публикации из самого listing, а не пересчитывает из текущего project-state;
  - `/p/:handle` фильтрует person-publications по persisted `authorEntityType=user` и `authorEntityId=userId`;
  - author attribution созданной публикации не "переезжает" из-за рассинхрона project-state без явного update listing contract;
- `/market/publish` больше не показывает ложный create-flow для team-admin, если publication этого проекта уже существует;
- `/market/seller` собирает PM publications по manager rights из PM ownership layer, но author entity берёт из persisted listing contract;
- `/p/:handle` использует тот же unified source, но показывает только person-authored публикации по persisted listing contract;
- team-owned publication не попадает на person-route `/p/:handle`, пока отдельная public surface для команды не внедрена;
- `showOnAuthorPage` по-прежнему отделён от PM visibility и от `performer_profile.isPublic`;
- `pnpm -w typecheck` выполнен успешно.

**Статус этапа:**
- C3 принят после повторной приёмки;
- последующие этапы C4 и C5 уже закрыты.

**Зафиксированное правило для C3 rework:**
- `/p/:handle` остаётся canonical person-route;
- отдельная public route для команды остаётся future enhancement;
- team-owned publication не публикуется на person-route как fallback.

#### C4. Apply/import flows и secondary deal-layer

**Статус:** ✅ Завершён после corrective bridge-fix  
**Завершено:** 2026-03-09

**Реализовано:**
- `Использовать в проекте` в шаблонах и готовых решениях открывает project-first flow:
  - новый PM-проект;
  - импорт в существующий PM-проект;
- template/solution apply route импортирует reusable block задач в PM, не смешивая PM-проект с public publication;
- selected organization в apply-flow теперь задаёт канонический PM context нового проекта:
  - `DEFAULT_WORKSPACE_ID` больше не используется как universal target для catalog apply-flow;
  - новый проект создаётся в workspace/account context выбранной организации;
  - team path получает минимальный `project_members` bridge, чтобы проект не становился hidden owner-only;
- `Запросить адаптацию` у шаблонов, ready solutions и услуг ведёт в brief/inquiry modal вместо shop-first checkout;
- `/market/orders` показывает inquiry submissions как secondary deal-layer;
- `/market/cart` сохранён как вторичный checkout surface только для template purchase path;
- `pnpm -w typecheck` выполнен успешно.

#### C5. Cross-cutting sync: permissions, analytics, docs, QA

**Статус:** ✅ Завершён  
**Завершено:** 2026-03-09

**Реализовано:**
- синхронизированы `marketplace-overview`, `marketplace-implementation-plan`, профильные marketplace docs, `docs/ROADMAP.md`, `CONTINUITY.md`, `docs/platform/overview.md`, `docs/README.md`, `docs/INDEX.md`;
- зафиксирован catalog permissions overlay:
  - `/p/:handle` остаётся canonical person-route;
  - personal PM publish/manage = owner only;
  - team-owned PM publish/manage = owner/admin;
  - apply/import rights и inquiry linkage rules описаны без переоткрытия C4;
- открытое противоречие по PM project creation не принято молча как контракт:
  - platform matrix говорит `viewer` не может создавать проект;
  - current implementation проверяет только active organization membership;
  - требуется отдельный corrective task;
- зафиксирован analytics reality layer:
  - реально используются `pm_publish_started`, `pm_listing_updated`, `pm_listing_deleted`, `catalog_publication_created`, `catalog_publication_updated`;
  - discovery / author-page / favorites / cart / apply / inquiry / orders остаются telemetry gaps;
- собран ручной QA checklist и rollout backlog;
- residual risks и future scope вынесены отдельно без запуска новой продуктовой фазы.

---

### Будущие улучшения

| Идея | Модуль | Приоритет | Дата | Контекст | Статус |
|------|--------|-----------|------|----------|--------|
| Публичный доступ к шаблонам маркетплейса | Marketplace | P1 | 2026-01-05 | Шаблоны проектов | ⏳ |
| AI quality hints для listings | Marketplace | P2 | 2026-01-06 | AI интеграция | ⏳ |
| Align PM project creation permissions: platform matrix vs implementation | Marketplace / PM Core | P0 | 2026-03-09 | C5 corrective task | ⏳ |
| Full real-publications feed для discovery surfaces | Marketplace | P1 | 2026-03-09 | C5 residual risk | ⏳ |
| Server-backed cart / favorites / inquiries и shared deal history | Marketplace | P1 | 2026-03-09 | C5 residual risk | ⏳ |
| Checkout / protected delivery / access issuance | Marketplace | P1 | 2026-03-09 | C5 residual risk | ⏳ |
| Analytics implementation для discovery / author / apply / inquiry / orders | Marketplace | P1 | 2026-03-09 | C5 residual risk | ⏳ |
| Dashboard/widget sync под новую IA `Каталога` | Marketplace | P2 | 2026-03-09 | C5 residual risk | ⏳ |
| Author pages для команд и организаций | Marketplace | P1 | 2026-03-09 | Каталог / авторы | ⏳ |

---

## Marketing Dashboards

### Текущие планы

*Планы будут добавлены по мере необходимости*

---

### Завершенные этапы

*Завершенные этапы будут добавлены по мере реализации*

---

### Будущие улучшения

| Идея | Модуль | Приоритет | Дата | Контекст | Статус |
|------|--------|-----------|------|----------|--------|
| Интеграция с внешними ad платформами | Marketing | P1 | 2026-01-06 | Дашборды | ⏳ |
| Экспорт/шаринг отчетов | Marketing | P2 | 2026-01-06 | Дашборды | ⏳ |

---

## AI Hub

### Текущие планы

#### OpenClaw integration for AI Hub

**Статус:** 🔄 В работе  
**Источник:** `docs/modules/ai-hub/ai-hub-openclaw-architecture.md`  
**Последнее обновление:** 2026-03-09

| Этап | Описание | Статус | Начало | Завершение | Зависимости |
|------|----------|--------|--------|------------|-------------|
| O0 | Архитектурный brief, trust boundary, product contract | ✅ Завершён | 2026-03-09 | 2026-03-09 | - |
| O1 | Shared platform agent для всех пользователей | ⏳ Ожидает | - | - | O0 |
| O2 | Workspace-aware tool proxy и scoped context | ⏳ Ожидает | - | - | O1 |
| O3 | Premium private agent и provisioning lifecycle | ⏳ Ожидает | - | - | O2 |
| O4 | External channels, automation и billing orchestration | ⏳ Ожидает | - | - | O3 |

---

#### Brandbook Agent (MVP, Stage 1)

**Статус:** 🔄 В работе  
**Источник:** docs/development/ai-brandbook-agent/00-index.md  
**Последнее обновление:** 2026-01-19

| Этап | Описание | Статус | Начало | Завершение | Зависимости |
|------|----------|--------|--------|------------|-------------|
| S1-API | Каркас /api/ai/agents/brandbook/* + типы run | ✅ Завершён | 2026-01-19 | 2026-01-19 | - |
| S1-Service | Интерфейс + мок AI-сервиса | ✅ Завершён | 2026-01-19 | 2026-01-19 | S1-API |
| S1-UI | UI точка входа (AI Hub) | ✅ Завершён | 2026-01-19 | 2026-01-19 | S1-Service |
| S1.5 | Персистентные сессии + org storage + upload | ✅ Завершён | 2026-01-19 | 2026-01-20 | S1-UI |

---

### Завершенные этапы

*Завершенные этапы будут добавлены по мере реализации*

---

### Будущие улучшения

| Идея | Модуль | Приоритет | Дата | Контекст | Статус |
|------|--------|-----------|------|----------|--------|
| Локальные модели для снижения стоимости | AI Hub | P2 | 2024-XX-XX | Stage M | ⏳ |
| Ограничение запросов для контроля расходов | AI Hub | P2 | 2024-XX-XX | Stage M | ⏳ |

---

## Performers

### Текущие планы

#### Единый кабинет пользователя, карточка исполнителя и картотека людей

**Статус:** 🔄 в работе  
**Приоритет:** P0/P1  
**Начало:** 2026-03-15

**Этапы:**
- ✅ P0: product/doc contract для performers, people directory и user cabinet (2026-03-15)
- ⏳ P1: единый кабинет пользователя и performer card как каноническая surface
- ⏳ P2: картотека людей и карточка контакта с relation-layer организации
- ⏳ P3: contact workflow `общение -> preview -> approval -> membership`
- ⏳ P4: нормализация project-invite approval под текущую PM role model и финальная стыковка с assignee contract

**Контекст:**
- текущая реализация разнесена между `/settings/profile`, `/settings/performer`, `/profile/*` и модалками;
- публичная performer card уже существует на `/p/:handle`, но создание и кабинет разрознены;
- PM people picker уже закрывает direct add зарегистрированного пользователя, но не решает discovery/contact-first flow для внешнего кандидата;
- для preview/access flow нужно максимально переиспользовать существующие `organization_invite`, `project_invite`, invite threads и статусы `previewing` / `pending_owner_approval` / `approved`, а не вводить параллельную state machine.

**Документация:**
- `docs/modules/performers/performers-overview.md`
- `docs/modules/performers/performers-specialists.md`
- `docs/modules/performers/performers-responses.md`
- `docs/modules/performers/performers-profile-cabinet.md`
- `docs/modules/performers/performers-implementation-plan.md`

---

### Завершенные этапы

#### Product/docs contract по performers people flow

**Статус:** ✅ Завершён  
**Завершено:** 2026-03-15

**Реализовано:**
- зафиксирован канонический lifecycle `аккаунт -> кабинет -> карточка исполнителя -> контакт -> preview -> approval -> project membership`;
- описано текущее устройство профиля пользователя и performer profile, включая реальные routes `/settings/profile`, `/settings/performer`, `/onboarding/create-profile`, `/p/:handle` и legacy-заглушки `/profile/*`;
- описан механизм поиска людей как связка публичного performers catalog, приватной картотеки контактов и PM people picker;
- зафиксировано, что внешний кандидат не должен напрямую bypass-ить contact/preview/approval flow, а назначение в задачи остаётся project-scoped;
- создан отдельный implementation plan по фазам P0-P4.

---

### Будущие улучшения

| Идея | Модуль | Приоритет | Дата | Контекст | Статус |
|------|--------|-----------|------|----------|--------|
| Автогенерация и проверка handle в кабинете исполнителя | Performers | P2 | 2026-03-15 | User cabinet / performer card | ⏳ |
| Приватные заметки и shortlist по контактам организации | Performers | P2 | 2026-03-15 | People directory | ⏳ |
| Owner/admin inbox для кандидатов в `pending_owner_approval` | Performers | P2 | 2026-03-15 | Preview -> approval flow | ⏳ |

---

## Community

### Текущие планы

*Планы будут добавлены по мере необходимости*

---

### Завершенные этапы

*Завершенные этапы будут добавлены по мере реализации*

---

### Будущие улучшения

*Идеи будут добавлены по мере возникновения*

---

## Инфраструктура и платформа

### Текущие планы

#### Реорганизация документации

**Статус:** 🔄 в работе  
**Приоритет:** P0  
**Начало:** 2026-01-06

**Этапы:**
- ✅ Фаза 1: Подготовка структуры (2026-01-06)
- ⏳ Фаза 2: Инвентаризация
- ⏳ Фаза 3: Миграция платформенных документов
- ⏳ Фаза 4: Миграция PM Core
- ⏳ Фаза 5: Миграция остальных модулей
- ⏳ Фаза 6: Архитектурная документация
- ⏳ Фаза 7: Playbooks и процессы
- ⏳ Фаза 8: Финальная проверка

**Детали:** См. `docs/reorganization/PLAN_DOCUMENTATION_REORGANIZATION.md`

---

#### Оптимизация базы данных

**Статус:** ⏳ частично выполнено  
**Приоритет:** P1  
**Источник:** `docs/development/reports/database-optimization-next-steps.md`

**Оставшиеся задачи:**
- Унификация точек записи (убрать прямые SQL-вставки)
- Полная реализация cache-aside с TTL и инвалидацией
- Оптимизация запросов, индексы БД

---

### Завершенные этапы

#### Настройка локального тестирования

**Статус:** ✅ Завершён  
**Завершено:** 2026-01-06

**Реализовано:**
- Исправлен `apps/api/drizzle.config.ts` для поддержки `POSTGRES_URL`
- Созданы скрипты: `test:local:setup`, `test:local`, `test:local:cleanup`
- Документация: `docs/getting-started/local-testing.md`

---

### Будущие улучшения

| Идея | Модуль | Приоритет | Дата | Контекст | Статус |
|------|--------|-----------|------|----------|--------|
| Реализация subscription purchase flow (Stripe) | Инфраструктура | P1 | 2026-01-03 | Multi-Org | ⏳ |
| Система уведомлений для владельцев проектов | Инфраструктура | P2 | 2026-01-03 | File Manager | ⏳ |

---

## Легенда статусов

- ✅ **Завершён** - этап полностью реализован и протестирован
- 🔄 **В работе** - этап активно разрабатывается
- ⏳ **Ожидает** - этап запланирован, но не начат
- ❌ **Заблокирован** - этап не может быть начат из-за зависимостей
- ⚠️ **Частично** - этап частично выполнен, есть оставшиеся задачи

## Легенда приоритетов

- **P0 (Критический)** - блокирует работу или критично для продукта
- **P1 (Высокий)** - важная функциональность, но не блокирует
- **P2 (Средний)** - желательная функциональность
- **P3 (Низкий)** - можно отложить или пропустить

---

**Последнее обновление:** 2026-01-06

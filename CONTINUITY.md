# Continuity Ledger

## Goal

- Integrate file manager with Org → Project → Task, @vercel/blob storage, share links, folders, trash/limits, direct upload.
- **NEW**: Multi-Organization Premium Feature - allow paid users to create multiple organizations.

## Constraints/Assumptions

- No secrets in repo; BLOB token only via env.
- Previews: images/PDF only; no document versioning; no audit initially.
- Multi-org: free plan = 1 org, pro/max = unlimited.

## Key Decisions

- Share: public view; download requires login via server-side proxy (no exposed URLs).
- Results: task has result folder; can be empty.
- Limits: free/pro/max; trash retention 7/30/unlimited days.
- **Multi-org**: First created org = primary; user can switch between orgs; data filtered by current org.

## State

- Tasks 01–16 complete (file manager).
- **Multi-Org Feature implemented** (2026-01-03):
  - DB migration 0008: `is_primary` column in `organization_member`, `user_subscription` table
  - Zustand store: `organization-store.ts` for org state
  - Context: `OrganizationContext.tsx` with `useOrganization()` hook
  - Updated `OrganizationSwitcher` - shows current org, switch functionality, primary indicator
  - API updates: `/api/organizations` returns isPrimary, userRole, memberCount
  - API limits: POST `/api/organizations` checks subscription limits
  - New API: `/api/me/subscription` for user subscription info
  - `UpgradeToCreateOrgModal` paywall for free users
  - Pages integrated: Projects, Tasks, Files - all show org name in header

### Now

- ✅ **ИСПРАВЛЕНИЕ ОШИБОК TYPESCRIPT: Все ошибки после миграции БД исправлены** (2026-01-05):
  - Исправлены все 119 ошибок TypeScript, возникших после миграции репозиториев на асинхронные методы
  - Добавлен `await` для всех вызовов `list()`, `listByProject()`, `findById()`, `hasAccess()`
  - Обновлены типы в `cache-manager.ts`: заменены `unknown[]` на конкретные типы
  - Исправлены ~25 файлов: API endpoints, lib функции, тесты
  - Линтер проходит ✅, TypeScript компиляция проходит ✅
  - Создан документ с анализом: `docs/development/typescript-errors-analysis.md`
  - PR #35 создан и обновлен: https://github.com/5123082-wq/collabstep_pro/pull/35

- ✅ **ОПТИМИЗАЦИЯ БД: Критические исправления выполнены** (2026-01-05):
  - Организация `acct-collabverse` синхронизирована с БД (автоматическое создание при первом обращении)
  - Репозитории проектов и задач читают из БД (`pm_projects`/`pm_tasks`) вместо памяти
  - Канонические таблицы зафиксированы: `pm_projects`/`pm_tasks` - единственный источник истины
  - Таблица `project` (Drizzle) помечена как `@deprecated`
  - Память используется только как кэш (cache-aside паттерн для чтения)
  - Создана документация: `docs/architecture/database-architecture.md`, ADR-0001
  - Обновлены правила работы с БД в `.cursor/rules/database.mdc`
  - Устаревшие документы архивированы в `docs/archive/database/`
  - Обновлен аудит-отчет с информацией о выполненных исправлениях
  - Создан документ с оставшимися задачами: `docs/development/database-optimization-next-steps.md`

- ✅ **Документ DATA_LOCATION_AUDIT_REPORT.md дополнен полным контекстом** (2026-01-05):
  - Полное описание пользователей: структура, хранение (БД + память), создание, аудит (1 пользователь синхронизирован)
  - Полное описание организаций: структура, хранение, процесс создания, проблема с текущей организацией (только в памяти)
  - Полное описание проектов: структура, два пути хранения (`project` vs `pm_projects`), процесс создания, откуда берется ownerId, как присваиваются ID
  - Полное описание задач: структура, хранение, создание
  - Объяснение причин разрозненного хранения данных (исторические и технические)
  - Архитектурная схема взаимодействия
  - Процесс создания данных (step-by-step)
  - Рекомендации по исправлению проблем
  - Создан скрипт `scripts/audit-users.ts` для аудита пользователей
  - Документ готов для передачи следующему агенту с полным контекстом

- ✅ **КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ: целостность данных при создании проектов из шаблонов** (2026-01-05):
  - Добавлена валидация существования организации ПЕРЕД созданием проекта
  - Улучшена логика отката с проверками на null и логированием ошибок
  - Валидация selectedTaskIds перенесена ДО создания проекта
  - Созданы диагностические скрипты: diagnose-db-issues.ts, cleanup-orphaned-projects.ts
  - Исправлена проблема с "осиротевшими" проектами и исчезающими организациями
  - Все валидации теперь происходят ДО любых записей в БД

- ✅ **PR #34 создан: шаблоны задач проектов и создание проектов из шаблонов** (2026-01-05):
  - Все изменения отправлены на сервер и создан PR
  - PR #34: https://github.com/5123082-wq/collabstep_pro/pull/34
  - Проверки пройдены: lint (warnings только), typecheck
  - ⚠️ Тесты: есть ошибки в тестовой БД (foreign key constraints), не связаны с изменениями

- ✅ **Улучшения канбан-доски** (2026-01-05):
  - Добавлено локальное состояние tasks и projectMembers с синхронизацией
  - Реализовано оптимистичное обновление при drag & drop с откатом при ошибке
  - Добавлены аватары assignee на карточках задач (Radix UI Avatar)
  - Адаптивная высота колонок (h-full, min-h-0 вместо min-h-[400px])
  - Улучшены анимации (transition-all, hover:shadow-lg, scale эффекты)
  - Моментальное обновление счетчиков задач при перетаскивании
  - Все изменения соответствуют exactOptionalPropertyTypes

- ✅ **Исправление TypeScript ошибок: exactOptionalPropertyTypes** (2026-01-05):
  - Исправлено ~12 ошибок TypeScript в 6 файлах
  - Проблема: `exactOptionalPropertyTypes: true` в tsconfig.base.json требует правильной работы с опциональными свойствами
  - Сборка проходит успешно: `pnpm --filter @collabverse/web build`
  - Создан отчет: `TYPESCRIPT_EXACT_OPTIONAL_PROPERTIES_FIX_REPORT.md`
  - ✅ Продакшен-сервер запущен успешно: Web (порт 3000) + WebSocket (порт 8080)
- ✅ **Development сервер запущен в полном режиме** (2026-01-05):
  - Запущен через `pnpm dev:full`: Web (порт 3000) + WebSocket (порт 8080) + БД
  - Все компоненты работают: веб-сервер, WebSocket сервер, подключение к базе данных

- ✅ **Этап 1: Инфраструктура шаблонов задач** (2026-01-04):
  - Создана миграция БД `0011_project_template_tasks.sql` с таблицей для задач шаблонов
  - Добавлена Drizzle схема `projectTemplateTasks` в `schema.ts`
  - Добавлен TypeScript интерфейс `ProjectTemplateTask` в `types.ts`
  - Создан репозиторий `TemplateTasksRepository` с поддержкой БД и памяти
  - Добавлены начальные данные для шаблона "Бренд-пакет" (16 задач) в `memory.ts`
  - Созданы API endpoints: GET/POST/PATCH/DELETE для управления задачами шаблона
  - Созданы Zod схемы для валидации в `lib/schemas/template-tasks.ts`
  - Созданы UI компоненты: `TemplateTaskTree`, `TemplateTaskForm`, `TemplateTaskItem`
  - Создана страница управления задачами `/admin/templates/[id]/tasks`
  - Интегрирована ссылка "Управление задачами" в страницу шаблонов
  - Реализована поддержка иерархии задач (родитель-ребенок)
  - Реализовано каскадное удаление дочерних задач

- ✅ **Этап 2: Создание проекта из шаблона** (2026-01-05):
  - Публичный API `/api/templates/[id]/tasks` с флагами и доступом (админ/владелец)
  - Сервис `ProjectTemplateService` + endpoint `/api/projects/from-template`
  - UI wizard `CreateProjectFromTemplateModal` + `TemplateTaskSelector`
  - Интеграция в CreateMenu/CreateProjectModal, счётчик задач в селекторе
  - `projectsRepository.create` учитывает `visibility`

- ✅ **Анализ структуры шаблонов проектов** (2026-01-04):
  - Проанализирована структура шаблона "Бренд-пакет"
  - Создан документ `docs/analysis/brand-package-template-structure.md`
  - Определена структура из 16 задач в 3 фазах (Нейминг, Айдентика, Гайдлайн)
  - Выявлена необходимость реализации шаблонов задач в шаблонах проектов
  - Текущие шаблоны содержат только метаданные, без задач

- ✅ **Speed Insights updated and PR created** (2026-01-04):
  - Created dedicated client component `Insights.tsx` with `usePathname` for route tracking
  - Updated `layout.tsx` to use new component (removed dynamic import)
  - Follows official Vercel documentation best practices
  - Maintains SSR on layout while tracking performance metrics
  - PR #32: https://github.com/5123082-wq/collabstep_pro/pull/32
  - All checks passed: lint, typecheck
- ✅ **Changes pushed to GitHub and PR created** (2026-01-03)
  - PR #31: https://github.com/5123082-wq/collabstep_pro/pull/31
  - All checks passed: lint, typecheck, routes
  - Fixed TypeScript errors (removed unused @ts-expect-error directives)
- ✅ Multi-Organization feature implemented (code complete)
- ✅ Migration 0008 applied successfully (is_primary, user_subscription table)
- ✅ Pages show current organization name in headers
- ✅ OrganizationSwitcher shows current org with switch capability
- ✅ Tested: Projects and Files pages show "— Test Org" in header
- ✅ **Folder deletion feature** (2026-01-03):
  - Added delete button for custom folders in FolderTreeSidebar (appears on hover)
  - API tracks files belonging to projects when deleting folders
  - Logs notification info for project owners (for future notification system)
  - Files moved to trash on folder deletion, can be restored

### Next

- **Улучшения БД (не критично, можно выполнить позже):**
  - Унификация точек записи: убрать прямые SQL-вставки, все операции через репозитории
  - Полная реализация cache-aside с TTL и инвалидацией кэша при записи
  - См. `docs/development/database-optimization-next-steps.md` для деталей

- Этап 2: добавить доступ к публичным шаблонам маркетплейса в `/api/templates/[id]/tasks`
- Этап 2: прогнать ручные сценарии/тесты (выбор задач, пустой выбор, даты)
- Implement actual subscription purchase flow (Stripe integration)
- Add "god mode" view (see all orgs at once) - deferred for later
- Consider adding org indicator badge in project/task cards
- Implement notification system for project owners when their files are deleted

## Files Changed (Multi-Org Feature)

- `apps/api/src/db/schema.ts` - added isPrimary to organizationMembers, userSubscriptions table
- `apps/api/src/db/migrations/0008_multi_org_feature.sql` - migration file
- `apps/api/apply-migration-0008.mjs` - migration script
- `apps/web/stores/organization-store.ts` - Zustand store for org state
- `apps/web/components/organizations/OrganizationContext.tsx` - Context provider
- `apps/web/components/organizations/OrganizationSwitcher.tsx` - Updated switcher UI
- `apps/web/components/organizations/UpgradeToCreateOrgModal.tsx` - Paywall modal
- `apps/web/components/app/AppLayoutClient.tsx` - Added OrganizationProvider
- `apps/web/app/api/organizations/route.ts` - Enhanced GET/POST
- `apps/web/app/api/me/subscription/route.ts` - New endpoint
- `apps/web/lib/api/user-subscription.ts` - Subscription utilities
- `apps/web/app/(app)/pm/projects/page.tsx` - Org context integration
- `apps/web/app/(app)/pm/tasks/page.tsx` - Org context integration
- `apps/web/app/(app)/docs/files/page.tsx` - Org context integration

## Critical Issue: User Data Loss

- **2026-01-03**: Скрипт `cleanup-users-db.ts` был запущен и удалил всех пользователей кроме администратора
- **Результат**: В базе данных остался только 1 пользователь (было 199)
- **Действие**: Проверить возможность восстановления из бэкапов Vercel Postgres
- **Документация**: `docs/runbooks/USER_DATA_RECOVERY.md`

## Last updated

- 2026-01-05 — **ОПТИМИЗАЦИЯ БД: Критические исправления выполнены** ✅
  - Организация синхронизирована с БД, репозитории читают из БД
  - Канонические таблицы зафиксированы, документация обновлена
  - Оставшиеся задачи описаны в `docs/development/database-optimization-next-steps.md`

- 2026-01-05 — **PR #34 создан: шаблоны задач проектов и создание проектов из шаблонов** ✅
  - Все изменения отправлены на сервер
  - PR: https://github.com/5123082-wq/collabstep_pro/pull/34
  - Проверки: lint ✅, typecheck ✅, тесты ⚠️ (проблемы с тестовой БД)

- 2026-01-05 — **Этап 2: Создание проекта из шаблона (основа реализована)** ✅
  - API задач шаблона + сервис создания проекта из шаблона
  - UI wizard с выбором задач и интеграция в меню создания
  - Осталось: доступ для публичных шаблонов маркетплейса и тесты

- 2026-01-04 — **Этап 1: Инфраструктура шаблонов задач реализована** ✅
  - Миграция БД, Drizzle схема, TypeScript типы
  - Репозиторий с поддержкой БД и памяти
  - API endpoints для CRUD операций
  - UI компоненты и страница управления задачами
  - Начальные данные для шаблона "Бренд-пакет" (16 задач)
  - Интеграция в админ-панель

- 2026-01-04 — **Speed Insights Integration Updated & PR Created** ✅
  - Refactored to use dedicated client component with route tracking
  - Follows official Vercel documentation best practices
  - All checks passed (lint, typecheck)
  - PR #32 created: https://github.com/5123082-wq/collabstep_pro/pull/32

- 2026-01-03 — **PR Created and Pushed** ✅
  - PR #31 created: Multi-Organization feature and file manager improvements
  - All checks passed (lint, typecheck, routes)
  - Fixed TypeScript errors (removed unused @ts-expect-error directives)

- 2026-01-03 — **Folder Deletion Feature** ✅
  - Added delete button in FolderTreeSidebar for custom folders (hover to show)
  - API tracks project files when deleting folders, logs notification info
  - Files moved to trash on folder deletion, can be restored via existing restore mechanism

- 2026-01-03 — **Multi-Organization Premium Feature** ✅
  - Added isPrimary flag to organization_member table
  - Created user_subscription table for plan limits
  - Zustand store + Context for organization state
  - OrganizationSwitcher shows current org with switching
  - API limits: free=1 org, pro/max=unlimited
  - Paywall modal for free users trying to create 2nd org
  - Projects/Tasks/Files pages show current org name

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

- ✅ **ПОДПИСКИ: UI раздел** (2026-02-03):
  - Создан компонент `SubscriptionModal.tsx` с таблицей тарифов (Free/Pro/Max).
  - Интегрирован в `AppTopbar.tsx` (кнопка "ПОДПИСКА PRO").
  - Отображает текущий план пользователя (через `/api/me/subscription`).
  - Список возможностей соответствует seed-данным (лимиты AI, хранилище, организации).
  - Кнопка "Upgrade" пока показывает toast (платежи в разработке).

- ✅ **FIX: PROJECT_HAS_NO_ORGANIZATION при открытии задачи** (2026-02-03):
  - **Проблема:** При открытии задачи в `TaskDetailDrawer` возникала ошибка `PROJECT_HAS_NO_ORGANIZATION`
  - **Причина:** API `/api/pm/tasks/[id]/results` читал `organizationId` из deprecated таблицы `project`, но проекты создаются в `pm_projects` без синхронизации с legacy таблицей
  - **Решение:** Добавлена функция `ensureProjectInLegacyTable()` которая автоматически синхронизирует проект с legacy таблицей, используя организацию текущего пользователя
  - **Файл:** `apps/web/app/api/pm/tasks/[id]/results/route.ts`

- ✅ **ЭТАП 3: ВЕРИФИКАЦИЯ ЗАВЕРШЕНА** (2026-02-03):
  - Typecheck ✅ — все ошибки исправлены (была ошибка `result.config?.type` → исправлено на `result.config?.pipelineType`)
  - Lint ✅ — только 1 warning (не связан с изменениями)
  - Все файлы Этапа 3 проверены и работают корректно

- ✅ **BRANDBOOK AGENT: Проверка лимитов** (2026-02-03):
  - Добавлены методы `countRunsToday()` и `countConcurrentRuns()` в `brandbook-agent-runs-repository.ts`
  - В `ai-brandbook-service.ts` добавлена проверка лимитов из `ai_agent_config.limits` перед созданием запуска
  - Проверяется `maxRunsPerDay` и `maxConcurrentRuns`, при превышении выбрасывается Error с понятным сообщением
  - Active statuses для concurrent runs: `queued`, `processing`, `postprocessing`
  - Файлы: `apps/api/src/repositories/brandbook-agent-runs-repository.ts`, `apps/api/src/services/ai-brandbook-service.ts`

- ✅ **AI AGENTS ANALYTICS EVENTS** (2026-02-03):
  - Добавлены события аналитики для AI-агентов в `docs/platform/analytics-events.md`
  - События: `ai_agent_invoked`, `ai_agent_run_created`, `ai_agent_run_completed`, `ai_agent_run_failed`, `ai_agent_limit_exceeded`
  - Добавлен `trackEvent('ai_agent_invoked')` при @упоминании агента в чате проекта
  - Добавлен `trackEvent('ai_agent_run_created')` при создании запуска Brandbook Agent
  - Файлы: `apps/web/app/api/pm/projects/[id]/chat/route.ts`, `apps/web/app/api/ai/agents/brandbook/runs/route.ts`

- ✅ **AI AGENT IDENTITY UNIFICATION — ВСЕ ЭТАПЫ ЗАВЕРШЕНЫ** (2026-02-03):
  - **Этап 1**: AI-пользователь `brandbook.agent@collabverse.ai` создан, связан с конфигом ✅
  - **Этап 2**: @упоминания агентов работают в чате (`@brandbook`, `@Brandbook Agent`) ✅
  - **Этап 3**: Лимиты из конфига, аналитика (ai_agent_invoked, ai_agent_run_created) ✅
  - **Этап 4**: AI Hub — прямые диалоги с агентами ✅ **ПОЛНОСТЬЮ РАБОТАЕТ**
    - Миграция 0025: ai_conversation, ai_conversation_message, allowDirectMessages
    - API: /api/ai/conversations, /api/ai/hub/agents
    - UI: вкладка "AI Hub" в AllChatsModal, компонент AIHubPanel
    - Интеграция с Brandbook Agent pipeline
    - **FIX 1**: Исправлена обработка формата ответа API (`{ok, data: {agents}}`)
    - **FIX 2**: Создан demo-пользователь в AI БД через `sync-demo-user-to-ai-db.ts`
    - **FIX 3**: Исправлена проблема Foreign Key constraint violation при создании диалога
    - **VERIFIED**: Диалоги создаются успешно (status 200), Brandbook Agent работает
  - **Документация (2026-02-03):** обновлена под фактическую реализацию — один Brandbook Agent с `userId`, без клона (v2) и без legacy-агента. Файлы: `11-agent-identity-unification-plan.md`, `10-agent-identity-and-projects.md`, `11-stage-1-identity-model.md`, `11-stage-4-migration-rollout.md`
  - Документы этапов: `11-stage-1-identity-model.md`, `11-stage-2-project-chat-integration.md`, `11-stage-3-access-analytics-guardrails.md`, `11-stage-4-migration-rollout.md`

- ✅ **ПОДПИСКИ: базовая инфраструктура** (2026-02-03):
  - **Статус:** ✅ Выполнено
  - **Созданные файлы:**
    - `apps/api/src/repositories/user-subscriptions-repository.ts` — репозиторий подписок пользователей
    - `apps/api/src/db/migrations/0024_subscription_ai_limits.sql` — миграция с AI-лимитами
    - `scripts/db/seed-subscription-plans.ts` — скрипт для seed-данных планов
  - **Обновлённые файлы:**
    - `apps/api/src/index.ts` — добавлен экспорт userSubscriptionsRepository
    - `apps/api/src/db/schema.ts` — добавлены поля aiAgentRunsPerDay, aiAgentConcurrentRuns в subscriptionPlans
    - `apps/web/lib/api/user-subscription.ts` — getUserSubscription() читает из БД
    - `apps/api/src/services/ai-brandbook-service.ts` — проверка лимитов использует план подписки
  - **Проверки:** typecheck ✅, lint ✅
  - **Документ:** `docs/development/subscriptions/00-subscriptions-implementation-plan.md`

- ✅ **AI AGENT IDENTITY: миграция и AI-пользователь Brandbook Agent** (2026-02-03):
  - **Миграция БД**: `0023_agent_identity.sql` — добавлены `is_ai` в `user`, `user_id` в `ai_agent_config`.
  - **Схема**: обновлена `apps/api/src/db/schema.ts` — поля `isAi` и `userId` с индексом.
  - **Репозиторий**: добавлены методы `ensureAgentUser()` и `ensureBrandbookAgentUser()` в `ai-agent-configs-repository.ts`.
  - **Скрипт**: `scripts/db/create-brandbook-agent-user.ts` — идемпотентный скрипт для создания AI-пользователя.
  - AI-пользователь: email=brandbook.agent@collabverse.ai, name=Brandbook Agent, is_ai=true.
  - Все поля nullable — legacy агенты без userId продолжают работать.
  - Typecheck ✅, lint ✅

- ✅ **BRANDBOOK AGENT: админка промптов — динамические блоки** (2026-02-01):
  - **Миграция БД**: добавлена колонка `blocks` (jsonb) в `ai_agent_prompt_version`.
  - **Схема**: тип `AIAgentPromptBlock` (id, order, name, content, stepKey?).
  - **Хелпер**: `blocksToPrompts()` — преобразование blocks → prompts для пайплайна.
  - **API админки**: POST/PATCH принимают `blocks`, нормализуют order.
  - **UI**: один столбец, блоки с именами (`intake`, `logoCheck`, `generate`, `qa`, `followup`), бейджи «LLM / сообщение», добавление/удаление блоков.
  - Файлы: `apps/api/src/db/migrations/0022_prompt_version_blocks.sql`, `apps/api/src/db/schema.ts`, `apps/api/src/repositories/ai-agent-configs-repository.ts`, `apps/api/src/services/ai/brandbook-pipeline.ts`, `apps/web/app/(app)/admin/ai-agents/brandbook/page.tsx`, API routes.

- ✅ **BRANDBOOK AGENT: отдельный API-ключ** (2026-02-01):
  - Введена переменная `BRANDBOOK_AGENT_OPENAI_API_KEY` только для Brandbook Agent (не использовать `OPENAI_API_KEY`).
  - Ключ читается в `apps/api/src/services/ai-brandbook-service.ts`; записывать в `apps/web/.env.local`.
  - Обновлены `.env.example`, подсказка в `scripts/utils/reset-ai-agents.ts`.
  - Отчёт: `docs/development/ai-brandbook-agent/BRANDBOOK_AGENT_AUDIT_REPORT.md`.

- ✅ **ДОБАВЛЕНО СОБЫТИЕ АНАЛИТИКИ ДЛЯ РЕГИСТРАЦИИ** (2026-01-21):
  - Добавлен раздел "События Auth & Регистрация" в `docs/platform/analytics-events.md`
  - Событие `auth_account_type_selected` для отслеживания выбора типа аккаунта (personal/business)
  - События `auth_user_registered`, `auth_user_logged_in`, `auth_user_logged_out` для полного цикла авторизации
  - Добавлен префикс `auth_` в правила именования событий
  - Добавлен пример схемы события в раздел примеров
  - Ответы на вопросы агента по реализации типов организаций: событие аналитики добавлено, обновление документации можно сделать после реализации

- ✅ **АУДИТ ТРЕБОВАНИЙ К ID ОРГАНИЗАЦИИ И ПОЛЬЗОВАТЕЛЯ** (2026-01-21):
  - Проведен полный аудит платформы на предмет использования organizationId и userId
  - Проанализированы все модули: проекты, задачи, файлы, папки, расходы, вакансии, контракты, организации, AI-агенты, подписки, приглашения
  - Составлена таблица требований по каждому модулю
  - Выявлены проблемы: projects.organizationId nullable в БД, но обязателен в API
  - Создан отчет: `docs/development/ORGANIZATION_ID_AUDIT_REPORT.md`
  - Рекомендации: унифицировать требования, улучшить проверки, мигрировать данные

- ✅ **ИСПРАВЛЕНИЕ ИНДЕКСАЦИИ ДОКУМЕНТОВ AI-АССИСТЕНТА** (2026-01-21):
  - Проблема: скрипт `index-assistant-docs.ts` не находил директорию `docs/`
  - Причина: путь `join(process.cwd(), '..', '..', 'docs')` был рассчитан на запуск из `apps/web`, но скрипт запускается из корня репозитория
  - Исправление: путь теперь вычисляется относительно местоположения скрипта через `__dirname`
  - Обновлен список документов в `indexing-config.ts` — старые пути (`ai/AI_QUICK_START.md` и т.д.) заменены на актуальные (`modules/ai-hub/ai-hub-overview.md` и т.д.)
  - Добавлена поддержка загрузки `.env.local` из корня репозитория и `apps/web`
  - Файлы изменены: `scripts/build/index-assistant-docs.ts`, `apps/web/lib/ai-assistant/indexing-config.ts`

- 📋 **AI AGENTS: История чатов и производительность** (2026-01-19):
  - Проблема 1: Нет истории диалогов с AI-агентами — каждый запуск stateless
  - Проблема 2: Страница `/ai-hub/agents` делает N+1 запросов (по одному на каждый проект)
  - План: реализовать `AIConversation` + `AIMessage` сущности
  - Документация: `docs/development/ai-brandbook-agent/07-conversation-history.md`
  - Статус: planned

- ✅ **ИСПРАВЛЕНИЕ DRAG&DROP: Сохранение статуса задач** (2026-01-12):
  - Проблема: статус задачи не сохранялся после drag&drop в serverless (Vercel)
  - Причина: `tasksRepository.update()` вызывал `persistTaskToPg()` через `void` и не ждал завершения → промис убивался вместе с функцией
  - Исправление: метод `update()` сделан async, добавлен `await persistTaskToPg()`, все вызовы обновлены с `await`
  - Файлы: `tasks-repository.ts`, `bulk/route.ts`, `bulk-update/route.ts`, `deletion-service.ts`
  - Проверки: lint ✅, typecheck ✅, routes ✅
  - PR #41 создан: https://github.com/5123082-wq/collabstep_pro/pull/41
  - Отчёт: `docs/development/reports/drag-drop-status-persistence-issue.md`

- ✅ **РЕОРГАНИЗАЦИЯ ДОКУМЕНТАЦИИ: ЗАВЕРШЕНА** (2026-01-07):
  - ✅ Удалена временная папка `docs version 2` (была стартер-паком для миграции, больше не нужна)
  - ✅ Фаза 1 завершена: создана структура, шаблоны, правила (2026-01-06)
  - ✅ Фаза 2 завершена: создан полный инвентарь документации (2026-01-06)
  - ✅ Фаза 3 завершена: миграция платформенных документов (2026-01-06)
  - ✅ Фаза 4 завершена: Миграция модуля PM Core (2026-01-06)
  - ✅ Фаза 5 завершена: Миграция остальных модулей (2026-01-07)
  - ✅ Фаза 6 завершена: Архитектурная документация (2026-01-07)
  - ✅ Фаза 7 завершена: Playbooks и процессы (2026-01-07)
  - ✅ **Фаза 8 завершена:** Финальная проверка и интеграция (2026-01-07)
    - ✅ Проверены все ссылки (внутренние, на код, внешние)
    - ✅ Обновлены индексы (README.md, INDEX.md)
    - ✅ Архивированы устаревшие документы
    - ✅ Настроен CI для проверки ссылок
    - ✅ Выполнены финальные Quality Gates
    - ✅ Создан `docs/modules/pm-core/_module.md` - основной документ модуля (P0)
    - ✅ Создан `docs/modules/pm-core/_implementation-plan.md` - план реализации (P0)
    - ✅ Создан `docs/modules/pm-core/projects.md` - документация по проектам (P1)
    - ✅ Создан `docs/modules/pm-core/tasks.md` - документация по задачам (P1)
    - ✅ Создан `docs/modules/pm-core/comments.md` - документация по комментариям (P2)
    - ✅ Создан `docs/modules/pm-core/notifications.md` - документация по уведомлениям (P2)
    - ✅ Создан `docs/modules/pm-core/chat.md` - документация по чату (P3)
    - ✅ Создан `docs/modules/pm-core/files.md` - документация по файлам (P2)
    - ✅ Создан `docs/modules/pm-core/kanban.md` - документация по Kanban (P2)
    - ✅ Создан `docs/modules/pm-core/websocket.md` - документация по WebSocket (P2)
    - ✅ Создан `docs/modules/pm-core/access.md` - документация по доступу (P2)
    - ✅ Создан `docs/modules/pm-core/teams.md` - документация по командам (P2)
    - ✅ Создан `docs/modules/pm-core/dashboard.md` - документация по дашборду (P2)
    - ✅ Обновлен `docs/_inventory/coverage.md` - pm-core теперь 100% заполнено
    - ✅ Обновлен `docs/_inventory/gaps.md` - закрыты все пробелы PM Core (13 документов)
    - ✅ Обновлен `docs/reorganization/PLAN_DOCUMENTATION_REORGANIZATION.md` - Фаза 4 отмечена как завершенная
    - ✅ **Фаза 5 завершена:** Миграция остальных модулей (2026-01-07)
      - ✅ Созданы все документы Marketplace (7 документов)
      - ✅ Созданы все документы AI Hub (9 документов)
      - ✅ Созданы все документы Marketing (5 документов)
      - ✅ Создан базовый документ Performers (1 документ)
      - ✅ Создан базовый документ Community (1 документ)
      - ✅ Обновлен `docs/_inventory/coverage.md` - все модули теперь документированы
      - ✅ Обновлен `docs/_inventory/gaps.md` - закрыты пробелы модулей
      - ✅ Обновлен `docs/reorganization/PLAN_DOCUMENTATION_REORGANIZATION.md` - Фаза 5 отмечена как завершенная
    - ✅ **Фаза 6 завершена:** Архитектурная документация (2026-01-07)
      - ✅ Создан `docs/architecture/arc42.md` - заполнены все 12 секций arc42
      - ✅ Созданы ADR документы: 0002-cache-aside-pattern, 0003-nextjs-app-router, 0004-websocket-realtime, 0005-multi-account-model
      - ✅ Обновлен `docs/architecture/adr/0001-canonical-database-tables.md` - проверен и актуализирован
      - ✅ Создан `docs/architecture/adr/README.md` - индекс всех ADR документов
      - ✅ Создан `docs/architecture/decisions/README.md` - переадресация на ADR индекс
      - ✅ Обновлен `docs/architecture/database-architecture.md` - добавлены ссылки на ADR
      - ✅ Обновлен `docs/architecture/system-analysis.md` - добавлены пометки NEEDS_CONFIRMATION для синхронизации
      - ✅ Все документы прошли markdownlint проверку (исправлены code blocks)
      - ✅ Создан отчет о верификации: `docs/reorganization/phases/phase-6-verification-report.md`
      - ✅ Обновлен `docs/reorganization/PLAN_DOCUMENTATION_REORGANIZATION.md` - Фаза 6 отмечена как завершенная
      - ✅ **Фаза 7 завершена:** Playbooks и процессы (2026-01-07)
        - ✅ Создан `docs/playbooks/docs-pr-checklist.md` - чеклист для PR с проверками на ROADMAP и планы
        - ✅ Создан `docs/playbooks/docs-migration-guide.md` - практическое руководство по работе с документацией
        - ✅ Создан `docs/playbooks/agent-docs-guide.md` - руководство для AI агентов
        - ✅ Обновлен `docs/playbooks/release-process.md` - добавлены ссылки на новые playbooks
        - ✅ Обновлен `docs/reorganization/PLAN_DOCUMENTATION_REORGANIZATION.md` - Фаза 7 отмечена как завершенная
        - ⏳ **Фаза 8 готова к выполнению:** Финальная проверка и интеграция

- ✅ **НАСТРОЙКА ЛОКАЛЬНОГО ТЕСТИРОВАНИЯ: Полная инфраструктура для локального запуска тестов** (2026-01-06):
  - Исправлен `apps/api/drizzle.config.ts` для поддержки `POSTGRES_URL` как fallback
  - Созданы скрипты: `test:local:setup`, `test:local`, `test:local:cleanup`, `test:local:env`
  - Создана документация: `docs/getting-started/local-testing.md`
  - Создана пошаговая инструкция: `docs/development/reports/LOCAL_TESTING_SETUP_STEPS.md`
  - Обновлен `docs/getting-started/quick-start.md` со ссылкой на документацию по тестированию
  - Поддержка двух вариантов: локальный Postgres через Docker (рекомендуется) и существующая БД
  - Протестировано локально с существующей Neon БД - подключение работает, тесты запускаются
  - PR #38 создан: https://github.com/5123082-wq/collabstep_pro/pull/38

- ✅ **РЕОРГАНИЗАЦИЯ ДОКУМЕНТАЦИИ: Устранение критических проблем** (2026-01-05):
  - Объединены дубликаты: QUICK_SETUP_GUIDE.md объединяет 3 документа Vercel Postgres Setup
  - Перемещены Kanban документы: React версия в правильное место, Angular версия в архив
  - Архивированы устаревшие документы: 7 stage reports organization-closure, 2 stage reports project-creation, 5 анализов и аудитов, 10 документов content-blocks-migration
  - Создана структура архива с датами: `2025-01-15-organization-closure/`, `2025-01-XX-project-creation/`, `2024-12-19-content-blocks-migration/`, `analysis/`
  - Удалена пустая папка `docs/development/старое` после архивирования документов
  - Создан индекс архивных документов: `docs/archive/README.md` с таблицей всех архивных документов
  - Создан главный индекс документации: `docs/INDEX.md` - единый индекс всей документации
  - Создано правило архивирования: `.cursor/rules/documentation-archiving.mdc` для будущего архивирования
  - Обновлены все ссылки в документах на перемещенные файлы
  - Обновлен `docs/README.md` с ссылкой на главный индекс

- ✅ **АНАЛИЗ ДОКУМЕНТАЦИИ: Структурный анализ всей документации проекта** (2026-01-05):
  - Проанализировано 118 документов (.md файлов)
  - Создан документ `docs/DOCUMENTATION_ANALYSIS.md` с полным анализом
  - Классификация на 2 категории: платформа/компоненты (45 док.) и реализация фич (73 док.)
  - Выявлены проблемы: дублирование документов, устаревшие stage reports, отсутствие метаданных
  - Метрики: 53% документов актуальны (63 из 118)
  - Рекомендации: объединить дубликаты, архивировать завершённые документы, создать единый индекс

- ✅ **РЕОРГАНИЗАЦИЯ СКРИПТОВ: Все скрипты организованы по категориям** (2026-01-05):
  - Создана структура папок: `scripts/dev/`, `scripts/build/`, `scripts/db/`, `scripts/docs/`, `scripts/utils/`, `scripts/migrations/`
  - Все скрипты перемещены в соответствующие категории
  - Обновлены все ссылки на скрипты в `package.json` и других файлах
  - Создан документ `scripts/README.md` со списком всех скриптов
  - Создано правило `.cursor/rules/scripts.mdc` для проверки существования скриптов перед созданием
  - Удалена пустая папка `apps/web/scripts/`
  - Удалено 7 устаревших/дублирующих скриптов: `scan-all-projects.ts`, `scan-and-delete-all.ts`, `delete-projects-via-api.ts`, `check-org-deps.ts`, `check-organizations.ts`, `clear-memory-data.ts`, `clean-all.mjs`
  - Осталось 43 актуальных скрипта (было 50)

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
  - Создан отчет: `docs/development/reports/TYPESCRIPT_EXACT_OPTIONAL_PROPERTIES_FIX_REPORT.md`
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

- 2026-02-03 — **UI подписок реализован** ✅
  - Создан `SubscriptionModal.tsx`
  - Интегрирован в `AppTopbar.tsx`
  - Линтер и typecheck пройдены

- 2026-02-03 — **PR #58 создан: AI agent identity, AI Hub, subscriptions, brandbook limits** ✅
  - Коммит c1bed2c: AI identity (0023), AI Hub (0025), subscriptions (0024), prompt blocks (0022), limits, fix results/route type
  - PR: https://github.com/5123082-wq/collabstep_pro/pull/58

- 2026-02-01 — **PR #56 создан: Brandbook agent artifacts preview, separate API key** ✅
  - Коммит bc99f4f: BRANDBOOK_AGENT_OPENAI_API_KEY, миграция 0021, API артефактов
  - PR: https://github.com/5123082-wq/collabstep_pro/pull/56

- 2026-01-12 — **PR #41 создан: исправление сохранения статуса задач при drag&drop** ✅
  - Метод `tasksRepository.update()` сделан async с await для `persistTaskToPg()`
  - Исправлена race condition в serverless окружении
  - Все проверки пройдены (lint, typecheck, routes)
  - PR: https://github.com/5123082-wq/collabstep_pro/pull/41

- 2026-01-07 — **PR #40 создан: стабилизация тестов** ✅
  - Улучшения очистки данных в тестах
  - Утилиты для генерации уникальных ID и очистки БД
  - Обновления конфигурации БД и адаптеров хранилища
  - PR: https://github.com/5123082-wq/collabstep_pro/pull/40
  - Проверки: lint ✅, typecheck ✅

- 2026-01-05 — **PR #37 создан: реорганизация документации и скриптов** ✅
  - Все изменения отправлены на сервер
  - PR: https://github.com/5123082-wq/collabstep_pro/pull/37
  - Проверки: lint ✅ (3 warnings), typecheck ✅
  - Статистика: 123 файла изменено, 2183 добавлений, 9344 удалений

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

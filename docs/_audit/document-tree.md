# Иерархия документов Collabverse

**Создан:** 2026-01-07  
**Последнее обновление:** 2026-01-07  
**Версия:** 1.0

## Описание

Дерево документов показывает иерархию и связи между документами. Корневой документ — `platform/overview.md`.

## Легенда

- **(NEW)** — документ создан в новой структуре
- **(MIGRATED)** — документ мигрирован из старой структуры
- **(ARCHIVE)** — документ архивирован

---

## Дерево документов

### Platform Overview (`docs/platform/overview.md`) (MIGRATED)
Корневой документ платформы. Описывает общую архитектуру, модули и структуру.

- **Platform документация** (`docs/platform/`)
  - Overview (`docs/platform/overview.md`) (MIGRATED) — обзор платформы
  - Glossary (`docs/platform/glossary.md`) (MIGRATED) — глоссарий терминов
  - Roles & Permissions (`docs/platform/roles-permissions.md`) (MIGRATED) — роли и права доступа
  - Analytics Events (`docs/platform/analytics-events.md`) (MIGRATED) — события аналитики
  - Vision & Scope (`docs/platform/vision-scope.md`) (MIGRATED) — видение и границы
  - Getting Started (`docs/platform/getting-started.md`) (MIGRATED) — быстрый старт
  - Changelog (`docs/platform/changelog.md`) (NEW) — история изменений

- **PM Core** (`docs/modules/projects-tasks/`) (NEW)
  - Module (`docs/modules/projects-tasks/projects-tasks-overview.md`) (NEW) — основной документ модуля
  - Projects (`docs/modules/projects-tasks/projects-tasks-projects.md`) (MIGRATED) — управление проектами
  - Tasks (`docs/modules/projects-tasks/projects-tasks-tasks.md`) (MIGRATED) — управление задачами
  - Comments (`docs/modules/projects-tasks/projects-tasks-comments.md`) (NEW) — комментарии к задачам
  - Notifications (`docs/modules/projects-tasks/projects-tasks-notifications.md`) (NEW) — система уведомлений
  - Chat (`docs/modules/projects-tasks/projects-tasks-chat.md`) (NEW) — командный чат проекта
  - Files (`docs/modules/projects-tasks/projects-tasks-files.md`) (MIGRATED) — управление файлами
  - Kanban (`docs/modules/projects-tasks/projects-tasks-kanban.md`) (MIGRATED) — Kanban доски
  - WebSocket (`docs/modules/projects-tasks/projects-tasks-websocket.md`) (MIGRATED) — real-time обновления
  - Access (`docs/modules/projects-tasks/projects-tasks-access.md`) (MIGRATED) — модель доступа к проектам
  - Teams (`docs/modules/projects-tasks/projects-tasks-teams.md`) (MIGRATED) — команды и исполнители
  - Dashboard (`docs/modules/projects-tasks/projects-tasks-metrics.md`) (MIGRATED) — дашборд workspace
  - Implementation Plan (`docs/modules/projects-tasks/projects-tasks-implementation-plan.md`) (MIGRATED) — план реализации

- **Marketplace** (`docs/modules/marketplace/`) (NEW)
  - Module (`docs/modules/marketplace/marketplace-overview.md`) (NEW) — основной документ модуля
  - Templates (`docs/modules/marketplace/marketplace-templates.md`) (MIGRATED) — шаблоны проектов
  - Products (`docs/modules/marketplace/marketplace-ready-projects.md`) (NEW) — продукты маркетплейса
  - Services (`docs/modules/marketplace/marketplace-services.md`) (NEW) — услуги маркетплейса
  - Orders (`docs/modules/marketplace/marketplace-orders.md`) (NEW) — заказы маркетплейса
  - Checkout (`docs/modules/marketplace/marketplace-cart.md`) (NEW) — процесс оформления заказа
  - Catalog (`docs/modules/marketplace/marketplace-categories.md`) (NEW) — каталог маркетплейса

- **AI Hub** (`docs/modules/ai-hub/`) (NEW)
  - Module (`docs/modules/ai-hub/ai-hub-overview.md`) (NEW) — основной документ модуля
  - Integration (`docs/modules/ai-hub/ai-hub-integration.md`) (MIGRATED) — интеграция AI
  - Quick Start (`docs/modules/ai-hub/ai-hub-quick-start.md`) (MIGRATED) — быстрый старт
  - Setup (`docs/modules/ai-hub/ai-hub-setup.md`) (MIGRATED) — настройка ключей AI
  - Assistant (`docs/modules/ai-hub/ai-hub-assistant.md`) (MIGRATED) — AI ассистент
  - Agents (`docs/modules/ai-hub/ai-hub-agents.md`) (NEW) — AI агенты проектов
  - Generations (`docs/modules/ai-hub/ai-hub-generations.md`) (NEW) — генерация контента
  - Prompts (`docs/modules/ai-hub/ai-hub-prompts.md`) (NEW) — промпты для AI
  - Implementation Plan (`docs/modules/ai-hub/ai-hub-implementation-plan.md`) (MIGRATED) — план реализации

- **Marketing** (`docs/modules/marketing/`) (NEW)
  - Module (`docs/modules/marketing/marketing-overview.md`) (NEW) — основной документ модуля
  - Dashboards (`docs/modules/marketing/marketing-dashboards.md`) (NEW) — маркетинговые дашборды
  - Campaigns (`docs/modules/marketing/marketing-campaigns.md`) (NEW) — маркетинговые кампании
  - Analytics (`docs/modules/marketing/marketing-analytics.md`) (NEW) — маркетинговая аналитика
  - Integrations (`docs/modules/marketing/marketing-integrations.md`) (NEW) — интеграции с внешними платформами

- **Performers** (`docs/modules/performers/`) (NEW)
  - Module (`docs/modules/performers/performers-overview.md`) (NEW) — основной документ модуля

- **Community** (`docs/modules/community/`) (NEW)
  - Module (`docs/modules/community/community-overview.md`) (NEW) — основной документ модуля

- **Dashboard** (`docs/modules/dashboard/`) (NEW)
  - Overview (`docs/modules/dashboard/dashboard-overview.md`) (NEW) — рабочий стол

- **Documents** (`docs/modules/docs/`) (NEW)
  - Overview (`docs/modules/docs/docs-overview.md`) (NEW) — документы и договоры
  - Files (`docs/modules/docs/docs-files.md`) (NEW) — файлы документов
  - Contracts (`docs/modules/docs/docs-contracts.md`) (NEW) — контракты
  - Brand Repository (`docs/modules/docs/docs-brand-repo.md`) (NEW) — бренд‑репозиторий

- **Architecture** (`docs/architecture/`) (MIGRATED)
  - Arc42 (`docs/architecture/arc42.md`) (MIGRATED) — архитектурная документация по стандарту Arc42
  - System Analysis (`docs/architecture/system-analysis.md`) (MIGRATED) — обзор архитектуры, API, сущностей
  - Database Architecture (`docs/architecture/database-architecture.md`) (MIGRATED) — структура базы данных
  - ADR (`docs/architecture/adr/`)
    - README (`docs/architecture/adr/README.md`) (NEW) — индекс всех ADR документов
    - ADR-0001 (`docs/architecture/adr/0001-canonical-database-tables.md`) (NEW) — канонические таблицы
    - ADR-0002 (`docs/architecture/adr/0002-cache-aside-pattern.md`) (NEW) — cache-aside паттерн
    - ADR-0003 (`docs/architecture/adr/0003-nextjs-app-router.md`) (NEW) — Next.js App Router
    - ADR-0004 (`docs/architecture/adr/0004-websocket-realtime.md`) (NEW) — WebSocket real-time
    - ADR-0005 (`docs/architecture/adr/0005-multi-account-model.md`) (NEW) — multi-account модель
  - Decisions (`docs/architecture/decisions/`)
    - README (`docs/architecture/decisions/README.md`) (NEW) — переадресация на ADR индекс

- **Playbooks** (`docs/playbooks/`) (NEW)
  - Docs PR Checklist (`docs/playbooks/docs-pr-checklist.md`) (NEW) — чеклист для PR
  - Docs Migration Guide (`docs/playbooks/docs-migration-guide.md`) (NEW) — руководство по миграции
  - Agent Docs Guide (`docs/playbooks/agent-docs-guide.md`) (NEW) — правила для AI агентов
  - Release Process (`docs/playbooks/release-process.md`) (MIGRATED) — процесс релиза

- **Getting Started** (`docs/getting-started/`) (MIGRATED)
  - Setup (`docs/getting-started/setup.md`) (MIGRATED) — настройка окружения
  - Quick Start (`docs/getting-started/quick-start.md`) (MIGRATED) — быстрый старт
  - Local Testing (`docs/getting-started/local-testing.md`) (NEW) — локальное тестирование
  - Quick Setup Guide (`docs/getting-started/QUICK_SETUP_GUIDE.md`) (MIGRATED) — быстрое руководство по настройке Vercel Postgres
  - Vercel Postgres Setup (`docs/getting-started/vercel-postgres-setup.md`) (MIGRATED) — настройка Vercel Postgres
  - Vercel Postgres Setup Checklist (`docs/getting-started/VERCEL_POSTGRES_SETUP_CHECKLIST.md`) (NEW) — чеклист настройки
  - Verification Checklist (`docs/getting-started/VERIFICATION_CHECKLIST.md`) (NEW) — чеклист проверки
  - Cheat Sheet (`docs/getting-started/CHEAT_SHEET.md`) (NEW) — шпаргалка по командам
  - Quick Delete Guide (`docs/getting-started/QUICK_DELETE_GUIDE.md`) (NEW) — быстрое удаление данных

- **Development** (`docs/development/`) (NEW)
  - Plans (`docs/development/plans/`)
    - Organization Closure (`docs/development/plans/organization-closure-implementation-plan.md`) (NEW) — план закрытия организаций
    - Financial System (`docs/development/plans/financial-system-implementation-plan.md`) (NEW) — план финансовой системы
    - Project Creation (`docs/development/plans/project-creation-implementation-plan.md`) (ARCHIVED) — план улучшения формы создания проекта
    - Invites & Messaging (`docs/development/plans/invites-messaging-implementation-plan.md`) (ARCHIVED) — план приглашений и сообщений
  - Organization Closure (`docs/development/organization-closure/`)
    - API (`docs/development/organization-closure/organization-closure-api.md`) (NEW) — API документация
    - Examples (`docs/development/organization-closure/organization-closure-examples.md`) (NEW) — примеры реализации
    - Policy (`docs/development/organization-closure/organization-closure-policy.md`) (NEW) — политика закрытия
    - Specification (`docs/development/organization-closure/organization-closure-specification.md`) (NEW) — техническая спецификация
  - Features (`docs/development/features/`)
    - Archived Organizations (`docs/development/features/ARCHIVED_ORGANIZATIONS_FEATURE.md`) (NEW) — функция архивирования организаций
  - Guides (`docs/development/guides/`)
    - Playwright E2E Runbook (`docs/development/guides/playwright-e2e-triage-runbook.md`) (NEW) — runbook по E2E тестам
  - KANBAN (`docs/development/KANBAN/`)
    - Prototype (`docs/development/KANBAN/KANBAN_DRAG_DROP_PROTOTYPE.md`) (ARCHIVED) — прототип Kanban
  - Reports (`docs/development/reports/`)
    - TypeScript Errors Analysis (`docs/development/reports/typescript-errors-analysis.md`) (NEW) — анализ ошибок TypeScript
    - TypeScript Exact Optional Properties (`docs/development/reports/TYPESCRIPT_EXACT_OPTIONAL_PROPERTIES_FIX_REPORT.md`) (NEW) — отчёт об исправлениях
    - Database Optimization (`docs/development/reports/database-optimization-next-steps.md`) (NEW) — следующие шаги оптимизации БД
    - Project Creation Bugfix (`docs/development/reports/project-creation-bugfix-report.md`) (ARCHIVED) — отчёт об исправлении формы
    - Project Creation Final (`docs/development/reports/project-creation-final-report.md`) (ARCHIVED) — итоговый отчёт
    - Local Testing Setup (`docs/development/reports/LOCAL_TESTING_SETUP_STEPS.md`) (NEW) — пошаговая инструкция
    - CI Database Setup (`docs/development/reports/CI_DATABASE_SETUP_ANALYSIS.md`) (NEW) — анализ настройки БД в CI
    - CI Tests Database Fix (`docs/development/reports/CI_TESTS_DATABASE_FIX_RECOMMENDATIONS.md`) (NEW) — рекомендации по исправлению

- **Runbooks** (`docs/runbooks/`) (NEW)
  - Database Cleanup (`docs/runbooks/DATABASE_CLEANUP_GUIDE.md`) (NEW) — руководство по очистке БД
  - User Data Recovery (`docs/runbooks/USER_DATA_RECOVERY.md`) (NEW) — восстановление данных пользователей
  - Organization Data Integrity (`docs/runbooks/ORGANIZATION_DATA_INTEGRITY.md`) (NEW) — целостность данных организаций
  - Projects & Tasks (`docs/runbooks/cursor_runbook_projects_tasks_v1.md`) (NEW) — runbook для проектов и задач

- **Audit** (`docs/audit/`) (NEW)
  - Data Location Audit (`docs/audit/DATA_LOCATION_AUDIT_REPORT.md`) (NEW) — отчёт о расположении данных
  - Organization Project Relationship (`docs/audit/ORGANIZATION_PROJECT_RELATIONSHIP_ANALYSIS.md`) (NEW) — анализ связи организаций и проектов

- **Components** (`docs/components/`) (NEW)
  - UI (`docs/components/ui/`)
    - Alert (`docs/components/ui/alert.md`) (NEW) — Alert компонент
    - Button (`docs/components/ui/button.md`) (NEW) — Button компонент
    - Form (`docs/components/ui/form.md`) (NEW) — Form компонент
    - Input (`docs/components/ui/input.md`) (NEW) — Input компонент
    - Modal (`docs/components/ui/modal.md`) (NEW) — Modal компонент
  - Modal Windows Reference (`docs/components/modal-windows-reference.md`) (NEW) — справочник модальных окон

- **Other** (`docs/`)
  - README (`docs/README.md`) (MIGRATED) — обзор документации
  - INDEX (`docs/INDEX.md`) (NEW) — полный индекс документации
  - ROADMAP (`docs/ROADMAP.md`) (NEW) — долгосрочная дорожная карта
  - CHANGELOG (`docs/CHANGELOG.md`) (NEW) — история изменений документации
  - ENV Files Explanation (`docs/ENV_FILES_EXPLANATION.md`) (NEW) — объяснение env файлов
  - Continuity Usage (`docs/CONTINUITY_USAGE.md`) (NEW) — использование CONTINUITY.md
  - Typography System (`docs/typography-system.md`) (NEW) — система типографики
  - Admin (`docs/modules/admin/`)
    - Data Management (`docs/modules/admin/admin-data-management.md`) (NEW) — управление данными
  - Finance (`docs/modules/finance/`)
    - README (`docs/modules/finance/finance-overview.md`) (NEW) — финансовая система
  - Reorganization (`docs/reorganization/`)
    - Plan (`docs/reorganization/PLAN_DOCUMENTATION_REORGANIZATION.md`) (NEW) — план реорганизации
    - README (`docs/reorganization/README.md`) (NEW) — обзор процесса реорганизации
    - Setup Summary (`docs/reorganization/DOCUMENTATION_SETUP_SUMMARY.md`) (NEW) — сводка настройки
    - Improvements Summary (`docs/reorganization/DOCUMENTATION_IMPROVEMENTS_SUMMARY.md`) (NEW) — сводка улучшений
    - Handoff (`docs/reorganization/HANDOFF_TO_NEXT_AGENT.md`) (NEW) — передача контекста
    - Phases (`docs/reorganization/phases/`)
      - INDEX (`docs/reorganization/phases/INDEX.md`) (NEW) — индекс фаз
      - README (`docs/reorganization/phases/README.md`) (NEW) — описание фаз
      - Phase 2 Task (`docs/reorganization/phases/phase-2-task.md`) (NEW) — задание для фазы 2
      - Phase 2 Review (`docs/reorganization/phases/phase-2-review.md`) (NEW) — обзор выполнения фазы 2
      - Phase 3 Task (`docs/reorganization/phases/phase-3-task.md`) (NEW) — задание для фазы 3
      - Phase 4 Task (`docs/reorganization/phases/phase-4-task.md`) (NEW) — задание для фазы 4
      - Phase 5 Task (`docs/reorganization/phases/phase-5-task.md`) (NEW) — задание для фазы 5
      - Phase 6 Task (`docs/reorganization/phases/phase-6-task.md`) (NEW) — задание для фазы 6
      - Phase 6 Verification (`docs/reorganization/phases/phase-6-verification-report.md`) (NEW) — отчёт о верификации фазы 6
      - Phase 7 Task (`docs/reorganization/phases/phase-7-task.md`) (NEW) — задание для фазы 7
      - Phase 8 Task (`docs/reorganization/phases/phase-8-task.md`) (NEW) — задание для фазы 8
  - Inventory (`archive/reorganization/inventory/`) (ARCHIVED)
    - Inventory (`archive/reorganization/inventory/inventory.md`) (ARCHIVED) — инвентарь источников
    - Coverage (`archive/reorganization/inventory/coverage.md`) (ARCHIVED) — карта покрытия модулей
    - Gaps (`archive/reorganization/inventory/gaps.md`) (ARCHIVED) — список пробелов
    - Template Inventory (`archive/reorganization/inventory/_template-inventory.md`) (ARCHIVED) — шаблон инвентаря
    - Template Coverage (`archive/reorganization/inventory/_template-coverage.md`) (ARCHIVED) — шаблон покрытия
  - Templates (`docs/modules/`)
    - Template Module (`docs/modules/_template-module.md`) (NEW) — шаблон модуля
    - Template Implementation Plan (`docs/modules/_template-implementation-plan.md`) (NEW) — шаблон плана реализации

---

## Статистика

- **Всего документов:** 133
- **NEW:** 89 (67%)
- **MIGRATED:** 44 (33%)
- **ARCHIVED:** 3 (2%)

---

**Последнее обновление:** 2026-01-07

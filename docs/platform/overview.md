# Collabverse — Platform Overview

**Статус:** active  
**Владелец:** product  
**Последнее обновление:** 2026-01-06

## Что такое платформа

Collabverse (ранее Collabstep) — это мультимодульная платформа для управления проектами, маркетплейсом и маркетинговой аналитикой. Платформа объединяет:

- **PM Core** — управление рабочими пространствами, проектами, задачами и представлениями (Kanban, List, Calendar, Gantt)
- **Рабочий стол** — входная точка с виджетами по всем модулям
- **Marketplace** — каталог продуктов и услуг, корзина, публикация проектов как шаблонов
- **Marketing Dashboards** — аналитика ROI/CPC/CPA/CLV, интеграции с внешними платформами
- **AI Hub** — интеграция AI-ассистентов, генерация контента, промпты и агенты
- **Finance** — управление бюджетами проектов, расходами, финансовой отчетностью
- **Documents** — документы, договоры и бренд‑материалы
- **Community** — питчи, комнаты, взаимодействие с сообществом (планируется)
- **Performers** — специалисты, команды, вакансии (планируется)

## Архитектура платформы

### Клиентская архитектура

Платформа построена на **Next.js 14** (App Router) с использованием:
- **React 18** — компоненты и хуки
- **Zustand** — управление состоянием
- **Zod** — валидация схем
- **Tailwind CSS** — стилизация
- **Drizzle ORM** — работа с базой данных
- **NextAuth.js v5** — аутентификация

### Backend API

API реализовано через Next.js route handlers в `app/api`:
- Аутентификация через cookie `cv_session` (dev-режим)
- Репозитории в `apps/api/src/repositories/` для работы с данными
- Поддержка in-memory хранилища (dev) и PostgreSQL (production)
- WebSocket сервер для real-time обновлений

### База данных

- **Vercel Postgres** (PostgreSQL) — основное хранилище
- Канонические таблицы: `pm_projects`, `pm_tasks`, `organizations`, `users`
- Миграции через Drizzle ORM
- Cache-aside паттерн для оптимизации чтения

## Модули платформы

### PM Core

**Описание:** Основной модуль управления проектами и задачами.

**Документация:** [`../modules/projects-tasks/projects-tasks-overview.md`](../modules/projects-tasks/projects-tasks-overview.md)

**Статус реализации:** ✅ ядро (проекты/задачи/файлы/чат/kanban/gantt), ⚠️ дашборд частично

**Ключевые функции:**
- Рабочие пространства (workspaces) и проекты
- Задачи с поддержкой иерархии, статусов, меток
- Представления: Kanban, List, Calendar, Gantt, Dashboard
- Команды проектов с ролями (owner, admin, member, viewer)
- Комментарии, уведомления, чат
- Файловый менеджер с интеграцией Vercel Blob Storage
- WebSocket для real-time обновлений

**UX потоки:**
- Дашборд (`/pm`) — виджеты: Пульс, Прогресс, Нагрузка, Финансы
- Проекты (`/pm/projects`) — список карточек с фильтрами и поиском
- Задачи (`/pm/tasks`) — кросс-проектные представления (Board/List/Calendar)
- Архив (`/pm/archive`) — просмотр и восстановление проектов

### Рабочий стол

**Описание:** Главная точка входа, агрегирующая состояние платформы и быстрые действия.

**Документация:** [`../modules/dashboard/dashboard-overview.md`](../modules/dashboard/dashboard-overview.md)

**Статус реализации:** ⚠️ частично (UI и виджеты есть, данные частично мокируются)

**Ключевые функции:**
- Виджеты по ключевым доменам (проекты, AI, маркетплейс, финансы, документы, поддержка)
- Пресеты и настройка лэйаута
- Быстрые действия

**UX потоки:**
- Рабочий стол (`/app/dashboard`) — централизованный обзор статусов

### Marketplace

**Описание:** Маркетплейс продуктов и услуг, публикация проектов как шаблонов.

**Документация:** [`../modules/marketplace/marketplace-overview.md`](../modules/marketplace/marketplace-overview.md)

**Статус реализации:** ⚠️ частично (шаблоны и каталог), продукты/услуги/checkout — планируется

**Ключевые функции:**
- Каталог шаблонов проектов
- Публикация проектов как продуктов/услуг
- Корзина и checkout flow
- Заказы и управление заказами

**Источники:**
- Анализ структуры шаблонов (архив): [`../archive/2026-01-07-marketplace-migration/brand-package-template-structure.md`](../archive/2026-01-07-marketplace-migration/brand-package-template-structure.md)
- Текущее состояние шаблонов (архив): [`../archive/2026-01-07-marketplace-migration/project-templates-current-state.md`](../archive/2026-01-07-marketplace-migration/project-templates-current-state.md)

### Marketing Dashboards

**Описание:** Маркетинговая аналитика и интеграции с внешними платформами.

**Документация:** [`../modules/marketing/marketing-overview.md`](../modules/marketing/marketing-overview.md)

**Статус реализации:** ⚠️ UI‑разделы есть, интеграции и данные планируются

**Ключевые функции:**
- Дашборды ROI/CPC/CPA/CLV
- Интеграции с Google Ads, Facebook Ads (планируется)
- Экспорт и публикация отчетов
- Кампании и аналитика

### AI Hub

**Описание:** Интеграция AI-ассистентов, генерация контента, промпты и агенты.

**Документация:** [`../modules/ai-hub/ai-hub-overview.md`](../modules/ai-hub/ai-hub-overview.md)

**Статус реализации:** ⚠️ частично (генерации/ассистент/агенты проекта), расширенные сценарии — в разработке

**Ключевые функции:**
- AI-ассистент для проектов
- Генерация контента (тексты, изображения)
- Управление промптами
- AI-агенты для автоматизации

**Документация:**
- Интеграция: [`../modules/ai-hub/ai-hub-integration.md`](../modules/ai-hub/ai-hub-integration.md)
- Быстрый старт: [`../modules/ai-hub/ai-hub-quick-start.md`](../modules/ai-hub/ai-hub-quick-start.md)
- Настройка ключей: [`../modules/ai-hub/ai-hub-setup.md`](../modules/ai-hub/ai-hub-setup.md)
- Гайд по ассистенту: [`../modules/ai-hub/ai-hub-assistant.md`](../modules/ai-hub/ai-hub-assistant.md)

### Finance

**Описание:** Управление бюджетами проектов, расходами, финансовой отчетностью.

**Документация:** [`../modules/finance/finance-overview.md`](../modules/finance/finance-overview.md)

**Статус реализации:** ⚠️ частично (кошелёк/расходы/контракты), отчётность — в разработке

**Ключевые функции:**
- Бюджеты проектов с лимитами по категориям
- Учет расходов с привязкой к проектам
- Финансовая отчетность
- Интеграция с PM Core

### Документы

**Описание:** Документы, контракты и бренд‑репозиторий как общий слой хранения знаний и договоренностей.

**Документация:** [`../modules/docs/docs-overview.md`](../modules/docs/docs-overview.md)

**Статус реализации:** ⏳ планируется (модель данных и сервисы есть, UI не реализован)

**Ключевые функции:**
- Документы и версии документов
- Контракты и статусы согласования
- Бренд‑репозиторий и материалы

### Community

**Описание:** Питчи, комнаты, взаимодействие с сообществом.

**Документация:** [`../modules/community/community-overview.md`](../modules/community/community-overview.md)

**Статус реализации:** ⏳ планируется (UI‑заглушки, API отсутствует)

### Performers

**Описание:** Специалисты, команды, вакансии.

**Документация:** [`../modules/performers/performers-overview.md`](../modules/performers/performers-overview.md)

**Статус реализации:** ⚠️ частично (каталог специалистов и приглашения), команды/вакансии — в разработке

## Взаимодействия между разделами

- **Рабочий стол ↔ модули:** агрегирует виджеты по проектам, AI‑агентам, маркетплейсу, финансам, документам и поддержке. ([Рабочий стол](../modules/dashboard/dashboard-overview.md))
- **Проекты ↔ Маркетплейс:** проекты могут публиковаться как шаблоны/продукты. ([Проекты](../modules/projects-tasks/projects-tasks-projects.md), [Маркетплейс](../modules/marketplace/marketplace-overview.md))
- **Проекты ↔ Документы:** документы и файлы связываются через `project_files`, используются в задачах/проектах. ([Документы](../modules/docs/docs-overview.md), [Файлы проекта](../modules/projects-tasks/projects-tasks-files.md))
- **Контракты ↔ Финансы:** контракты управляют оплатами/эскроу и статусами выплат. ([Контракты](../modules/docs/docs-contracts.md), [Финансы](../modules/finance/finance-overview.md))
- **AI‑хаб ↔ Проекты/задачи:** ассистенты и генерации работают с проектами, задачами и комментариями. ([AI‑хаб](../modules/ai-hub/ai-hub-overview.md), [Проекты](../modules/projects-tasks/projects-tasks-projects.md))
- **Организация ↔ Документы:** документы учитываются при архивировании и закрытии организаций. ([Организация](../modules/organization/organization-overview.md), [Документы](../modules/docs/docs-overview.md))
## Канонические ссылки

- **Видение и scope** → [`./vision-scope.md`](./vision-scope.md)
- **Авторизация и регистрация** → [`./authentication.md`](./authentication.md)
- **Организации и workspace** → [`../modules/organization/organization-overview.md`](../modules/organization/organization-overview.md)
- **Глоссарий** → [`./glossary.md`](./glossary.md)
- **Роли и права** → [`./roles-permissions.md`](./roles-permissions.md)
- **События аналитики** → [`./analytics-events.md`](./analytics-events.md)
- **Быстрый старт** → [`./getting-started.md`](./getting-started.md)
- **Changelog** → [`./changelog.md`](./changelog.md)
- **Поддержка и обращения** → [`../modules/support/support-overview.md`](../modules/support/support-overview.md)
- **Рабочий стол** → [`../modules/dashboard/dashboard-overview.md`](../modules/dashboard/dashboard-overview.md)
- **Документы** → [`../modules/docs/docs-overview.md`](../modules/docs/docs-overview.md)

## Архитектура и интеграции (внутренние)

- **Системный анализ** → [`../architecture/system-analysis.md`](../architecture/system-analysis.md)
- **Архитектура БД** → [`../architecture/database-architecture.md`](../architecture/database-architecture.md)
- **ADR решения** → [`../architecture/adr/`](../architecture/adr/)

## Доменные сущности

### Основные сущности

- **Users** — пользователи платформы
- **Organizations** — организации (мультиаккаунт)
- **Accounts** — рабочие пространства (workspaces) внутри организаций
- **Projects** — проекты, принадлежащие workspace
- **Tasks** — задачи в проектах (с иерархией)
- **Project Templates** — шаблоны проектов для маркетплейса
- **Files** — файлы с интеграцией Vercel Blob Storage
- **Documents** — документы и договоры

### Связи

- Пользователь может состоять в нескольких организациях и аккаунтах (мультиаккаунт)
- Проект принадлежит аккаунту (workspace) и может ссылаться на шаблон/workflow
- Задачи поддерживают иерархию (`parent_task_id`), статусы из workflow и множественные назначения
- Документы и файлы связаны через универсальную таблицу `project_files`

Подробнее см. [`../architecture/system-analysis.md`](../architecture/system-analysis.md#доменные-сущности-и-связи)

## Feature Flags

Платформа использует feature flags для управления функциональностью:

- `NAV_V1` — навигация версии 1
- `AUTH_DEV` — dev-авторизация
- `FEATURE_PROJECTS_V1` — CRM "Проекты v1"
- `PM_NAV_PROJECTS_AND_TASKS` — навигация проектов и задач
- `FIN_EXPENSES_STORAGE` — драйвер хранения расходов (`memory` или `db`)
- `NEXT_PUBLIC_FEATURE_*` — UI-флаги второго поколения

Конфигурация: [`../../config/feature-flags.ts`](../../config/feature-flags.ts) и [`apps/web/lib/feature-flags.ts`](../../apps/web/lib/feature-flags.ts)

## Демо-аккаунты

Для быстрого тестирования доступны демо-аккаунты:

- **Администратор:**
  - Email: `admin.demo@collabverse.test`
  - Пароль: значение из `DEMO_ADMIN_PASSWORD`
  - Роли: `productAdmin`, `featureAdmin`

Подробнее см. [`./getting-started.md`](./getting-started.md#демо-аккаунт)

---

**Связанные документы:**
- [ROADMAP](../ROADMAP.md) — долгосрочные планы развития
- [INDEX](../INDEX.md) — главный индекс документации
- [CONTINUITY](../../CONTINUITY.md) — текущее состояние проекта

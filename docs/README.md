# Документация Collabverse

> **Последнее обновление:** 2026-03-15  
> **[Полный индекс документации](INDEX.md)** - навигация по всем документам

Добро пожаловать в документацию проекта Collabverse — платформы для управления проектами с AI-агентами и каталогом решений.

## 📚 Структура документации

Документация организована по модулям и типам документов:

### 👤 Пользовательская документация (левое меню)

Разделы упорядочены как в левом меню приложения. Полный список — в [индексе](INDEX.md#пользовательская-документация-левое-меню).

- **[Рабочий стол](modules/dashboard/dashboard-overview.md)** — сводные виджеты и быстрые действия
- **[Проекты и задачи](modules/projects-tasks/projects-tasks-overview.md)** — ключевые процессы управления работой
- **[Каталог](modules/marketplace/marketplace-overview.md)** — шаблоны, готовые решения, услуги, страницы авторов и reuse/publish flow
- **[Исполнители](modules/performers/performers-overview.md)** — специалисты, картотека людей, карточка исполнителя и вакансии
- **[Маркетинг](modules/marketing/marketing-overview.md)** — кампании и аналитика
- **[AI-хаб](modules/ai-hub/ai-hub-overview.md)** — AI инструменты и ассистент
- **[Комьюнити](modules/community/community-overview.md)** — сообщество и события (планируется)
- **[Финансы](modules/finance/finance-overview.md)** — финансовые процессы и статусы
- **[Документы](modules/docs/docs-overview.md)** — файлы, контракты и бренд‑репозиторий
- **[Организация](modules/organization/organization-overview.md)** — команда и настройки
- **[Поддержка](modules/support/support-overview.md)** — помощь и обращения
- **[Админка](modules/admin/admin-overview.md)** — инструменты администрирования

### 🏛️ Platform документация

Платформенные документы описывают общую архитектуру, терминологию и процессы:

- **[Обзор платформы](platform/overview.md)** — описание платформы, модули, архитектура
- **[Авторизация и регистрация](platform/authentication.md)** — вход, регистрация, сессии
- **[Организации и workspace](modules/organization/organization-overview.md)** — модель организаций и членства
- **[Глоссарий](platform/glossary.md)** — определения терминов платформы
- **[Роли и права доступа](platform/roles-permissions.md)** — матрица прав доступа, включая overlay `Каталога` после C5
- **[События аналитики](platform/analytics-events.md)** — каталог событий аналитики, включая текущий coverage/gaps `Каталога`
- **[Видение и scope](platform/vision-scope.md)** — видение платформы и границы
- **[Начало работы](platform/getting-started.md)** — быстрый старт и настройка
- **[История изменений](platform/changelog.md)** — changelog платформы

### 📦 Модульная документация

Документация по модулям платформы:

- **[Проекты и задачи](modules/projects-tasks/projects-tasks-overview.md)** — управление проектами, задачами, командами
- **[Каталог](modules/marketplace/marketplace-overview.md)** — user-facing слой решений внутри внутреннего домена Marketplace; C1-C5 sync закрыт, future scope вынесен отдельно
- **[AI-хаб](modules/ai-hub/ai-hub-overview.md)** — интеграция AI-ассистентов
- **[OpenClaw Architecture Brief](modules/ai-hub/ai-hub-openclaw-architecture.md)** — стартовая shared/private архитектура AI Hub на OpenClaw
- **[Маркетинг](modules/marketing/marketing-overview.md)** — маркетинговые дашборды и аналитика
- **[Исполнители](modules/performers/performers-overview.md)** — специалисты, картотека людей, карточка исполнителя и вакансии
- **[Комьюнити](modules/community/community-overview.md)** — сообщество и взаимодействие (планируется)
- **[Рабочий стол](modules/dashboard/dashboard-overview.md)** — сводные виджеты и быстрые действия
- **[Документы](modules/docs/docs-overview.md)** — документы, контракты и бренд‑материалы

### 🏗️ Архитектурная документация

- **[Arc42](architecture/arc42.md)** — архитектурная документация по стандарту Arc42
- **[Архитектура БД](architecture/database-architecture.md)** — структура базы данных
- **[ADR](architecture/adr/)** — архитектурные решения (Architecture Decision Records)
- **[Системный анализ](architecture/system-analysis.md)** — обзор архитектуры, доменных сущностей и API

### 📋 Playbooks и процессы

Процессы и чеклисты для работы с документацией:

- **[Чеклист для PR](playbooks/docs-pr-checklist.md)** — проверка документации перед PR
- **[Руководство по миграции](playbooks/docs-migration-guide.md)** — как работать с новой документацией
- **[Руководство для агентов](playbooks/agent-docs-guide.md)** — правила для AI агентов
- **[Процесс релиза](playbooks/release-process.md)** — процесс релиза и обновления документации

### 🚀 Начало работы

- **[Быстрый старт](platform/getting-started.md)** — начните работу за 5 минут
- **[Настройка окружения](getting-started/setup.md)** — подробное руководство по установке и конфигурации
- **[Локальное тестирование](getting-started/local-testing.md)** — настройка локального окружения для тестов

### 🧩 Ключевые разделы платформы (документация в работе)

- **Auth & регистрация** — [Авторизация и регистрация](platform/authentication.md)
- **Организации и workspace** — [Организации и workspace](modules/organization/organization-overview.md)
- **Администрирование** — [Администрирование платформы](modules/admin/admin-overview.md)
- **Финансы** — [Финансовая система](modules/finance/finance-overview.md)
- **Support/обращения** — [Поддержка и обращения](modules/support/support-overview.md)

### 🎨 Компоненты

#### UI компоненты

- **[Alert](components/ui/alert.md)** — статусные сообщения и уведомления
- **[Button](components/ui/button.md)** — кнопки и их состояния
- **[Form](components/ui/form.md)** — формы и валидация
- **[Input](components/ui/input.md)** — текстовые поля ввода
- **[Modal](components/ui/modal.md)** — модальные окна
- **[Справочник модальных окон](components/modal-windows-reference.md)** — полный список всех модальных окон, их размеры и места использования

## 🎯 Текущий статус проекта

**Статус:** Начальная стадия разработки

**Завершено:**

- ✅ Базовая инфраструктура (Stage 0)
- ✅ Система аутентификации (dev-режим)
- ✅ Маркетинговый слой и навигация
- ✅ CRM функционал (проекты, задачи, файлы)
- ✅ AI Hub (Агенты, чаты, аналитика)
- ✅ Мульти-организации и подписки

**В разработке:**

- 🚧 Финансовый модуль
- 🚧 Каталог (C1-C5 sync завершён; delivery / analytics / dashboard backlog остаётся)


## 🛠️ Технологический стек

### Frontend

- **Next.js 14** — React framework
- **React 18** — UI библиотека
- **TypeScript** — типизация
- **Tailwind CSS** — стили
- **Zustand** — управление состоянием
- **Zod** — валидация схем

### Backend

- **Next.js API Routes** — API endpoints
- **TypeScript** — типизация

### Инфраструктура

- **pnpm** — управление пакетами
- **Vercel** — deployment
- **Playwright** — E2E тестирование
- **Jest** — unit тестирование

## 📖 Соглашения

### Стиль кода

- Следуйте существующему стилю кода в проекте
- Используйте TypeScript для всех новых файлов
- Придерживайтесь правил ESLint и Prettier

### Коммиты

- Пишите понятные сообщения коммитов
- Используйте префиксы: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### Pull Requests

1. Создайте feature-ветку от `main`
2. Внесите изменения
3. Запустите `pnpm verify` перед созданием PR
4. Опишите изменения в PR

Подробнее см. [CONTRIBUTING.md](../CONTRIBUTING.md).

## 🔗 Полезные ссылки

- [Корневой README](../README.md) — общая информация о проекте
- [CONTRIBUTING.md](../CONTRIBUTING.md) — руководство для контрибьюторов

## 📝 Обновление документации

При внесении изменений в проект, пожалуйста, обновляйте соответствующую документацию:

- **Новые компоненты** → добавьте описание в `components/`
- **Новые модули** → создайте `modules/<section>/<section>-overview.md` (с префиксом раздела) и обновите `platform/overview.md`
- **Изменения API** → обновите `architecture/system-analysis.md` или соответствующий модуль
- **Изменения в настройке** → обновите `platform/getting-started.md`
- **Новые фичи** → обновите соответствующий модуль и `platform/changelog.md`

Подробнее см. [Руководство по миграции](playbooks/docs-migration-guide.md) и [Чеклист для PR](playbooks/docs-pr-checklist.md).

## 🔄 Реорганизация документации

Документация прошла процесс реорганизации в соответствии с планом `reorganization/PLAN_DOCUMENTATION_REORGANIZATION.md`.

**Статус реорганизации:**

- ✅ **Фаза 1:** Подготовка структуры (завершена 2026-01-06)
- ✅ **Фаза 2:** Инвентаризация (завершена 2026-01-06)
- ✅ **Фаза 3:** Миграция платформенных документов (завершена 2026-01-06)
- ✅ **Фаза 4:** Миграция модуля PM Core (завершена 2026-01-06)
- ✅ **Фаза 5:** Миграция остальных модулей (завершена 2026-01-07)
- ✅ **Фаза 6:** Архитектурная документация (завершена 2026-01-07)
- ✅ **Фаза 7:** Playbooks и процессы (завершена 2026-01-07)
- ✅ **Фаза 8:** Финальная проверка (завершена 2026-01-07)

**Реорганизация завершена!** Документация теперь организована по модулям и типам документов. Подробнее см. [План реорганизации](reorganization/PLAN_DOCUMENTATION_REORGANIZATION.md).

---

**Последнее обновление:** 2026-03-15  
**Версия документации:** 2.1  
**Статус реорганизации:** ✅ Завершена

---

## 📑 Навигация

- **[Полный индекс документации](INDEX.md)** — единый индекс всей документации проекта
- **[Архив документации](archive/README.md)** — индекс архивных документов
- **[План реорганизации](reorganization/PLAN_DOCUMENTATION_REORGANIZATION.md)** — план и статус реорганизации документации

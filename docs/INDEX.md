# Индекс документации Collabverse

> **Последнее обновление:** 2026-01-05  
> **Версия:** 1.0

Полный индекс всей документации проекта Collabverse. Используйте этот документ для быстрой навигации по всей документации.

---

## Быстрая навигация

### По категориям

- [Начало работы](#начало-работы)
- [Архитектура](#архитектура)
- [Компоненты](#компоненты)
- [Разработка](#разработка)
- [Операции](#операции)
- [AI функциональность](#ai-функциональность)
- [Справочники](#справочники)
- [Архив](#архив)

### По назначению

- [Для новых разработчиков](#для-новых-разработчиков)
- [Для архитекторов](#для-архитекторов)
- [Для разработчиков](#для-разработчиков)
- [Для операторов](#для-операторов)

---

## Начало работы

### Быстрый старт

- **[Быстрый старт](getting-started/quick-start.md)** - Начните работу за 5 минут
- **[Быстрое руководство по настройке Vercel Postgres](getting-started/QUICK_SETUP_GUIDE.md)** - Настройка БД за 5 минут

### Настройка окружения

- **[Настройка окружения](getting-started/setup.md)** - Подробное руководство по установке и конфигурации
- **[Настройка Vercel Postgres](getting-started/vercel-postgres-setup.md)** - Подробная инструкция по подключению БД
- **[Чеклист настройки Vercel Postgres](getting-started/VERCEL_POSTGRES_SETUP_CHECKLIST.md)** - Пошаговая проверка настройки БД

### Проверка и валидация

- **[Чеклист проверки](getting-started/VERIFICATION_CHECKLIST.md)** - Проверка корректности установки
- **[Шпаргалка](getting-started/CHEAT_SHEET.md)** - Быстрая справка по командам

### Утилиты

- **[Быстрое удаление](getting-started/QUICK_DELETE_GUIDE.md)** - Очистка данных проекта

---

## Архитектура

### Системный анализ

- **[Системный анализ](architecture/system-analysis.md)** - Полное описание архитектуры, API, доменных сущностей

### База данных

- **[Архитектура базы данных](architecture/database-architecture.md)** - Структура БД, канонические таблицы, паттерны работы
- **[ADR-0001: Канонические таблицы](architecture/adr/0001-canonical-database-tables.md)** - Архитектурное решение о таблицах БД

---

## Компоненты

### UI компоненты

- **[Alert](components/ui/alert.md)** - Статусные сообщения и уведомления
- **[Button](components/ui/button.md)** - Кнопки и их состояния
- **[Form](components/ui/form.md)** - Формы и валидация
- **[Input](components/ui/input.md)** - Текстовые поля ввода
- **[Modal](components/ui/modal.md)** - Модальные окна

### Справочники компонентов

- **[Справочник модальных окон](components/modal-windows-reference.md)** - Полный список всех модальных окон

### Дизайн система

- **[Система типографики](typography-system.md)** - Размеры шрифтов, правила использования

---

## Разработка

### Планы реализации

- **[План улучшения формы создания проекта](development/plans/project-creation-implementation-plan.md)** - План работ по улучшению формы
- **[План закрытия организаций](development/plans/organization-closure-implementation-plan.md)** - План реализации функционала закрытия
- **[План приглашений и сообщений](development/plans/invites-messaging-implementation-plan.md)** - План реализации системы приглашений
- **[План дашборда workspace](development/plans/workspace-dashboard-implementation-plan.md)** - План разработки дашборда
- **[План проектов](development/plans/projects-implementation-plan.md)** - План реализации модуля проектов
- **[План финансовой системы](development/plans/financial-system-implementation-plan.md)** - План разработки финансового модуля

### Руководства по разработке

- **[Мастер-гайд по проектам](development/guides/projects-master-guide.md)** - Полное руководство по модулю проектов
- **[Workflow проектов, задач, файлов](development/guides/PROJECT_TASK_FILE_WORKFLOW.md)** - Описание workflow между модулями
- **[Использование WebSocket](development/guides/websocket-usage.md)** - Руководство по работе с WebSocket
- **[Runbook по E2E тестам](development/guides/playwright-e2e-triage-runbook.md)** - Руководство по работе с E2E тестами
- **[Концепция команд и исполнителей](development/guides/komanda.md)** - Концептуальный документ о командах и исполнителях

### Технические отчёты

- **[Анализ ошибок TypeScript](development/reports/typescript-errors-analysis.md)** - Отчёт об исправлении TS ошибок
- **[Отчёт об исправлениях exactOptionalPropertyTypes](development/reports/TYPESCRIPT_EXACT_OPTIONAL_PROPERTIES_FIX_REPORT.md)** - Отчёт об исправлении TS ошибок exactOptionalPropertyTypes
- **[Следующие шаги оптимизации БД](development/reports/database-optimization-next-steps.md)** - План дальнейших улучшений БД
- **[Отчёт об исправлении формы создания проекта](development/reports/project-creation-bugfix-report.md)** - Отчёт об исправлении багов
- **[Итоговый отчёт: улучшение создания проекта](development/reports/project-creation-final-report.md)** - Итоговый отчёт по улучшению формы

### Реализованные функции

- **[Функция архивирования организаций](development/features/ARCHIVED_ORGANIZATIONS_FEATURE.md)** - Описание реализованной функции

### Закрытие организаций

- **[API документация: Закрытие организации](development/organization-closure/organization-closure-api.md)** - API документация для закрытия организаций
- **[Примеры реализации: Закрытие организации](development/organization-closure/organization-closure-examples.md)** - Примеры кода и компонентов
- **[Политика закрытия организации](development/organization-closure/organization-closure-policy.md)** - Бизнес-правила и классификация данных
- **[Техническая спецификация: Закрытие организации](development/organization-closure/organization-closure-specification.md)** - Архитектура и схема БД

### Kanban

- **[Быстрая справка Kanban (React)](development/KANBAN/KANBAN_QUICK_REFERENCE_REACT.md)** - Референс по использованию Канбана
- **[Адаптация drag & drop](development/KANBAN/KANBAN_DRAG_DROP_ADAPTED.md)** - Описание реализации DnD

### Модель доступа к проектам

- **[Главный план реализации](development/projects-access-model/main-implementation-plan.md)** - План системы прав доступа
- **[План UI модели доступа](development/projects-access-model/UI_IMPLEMENTATION_PLAN.md)** - План UI для системы доступа
- **[Руководство по верификации](development/projects-access-model/VERIFICATION_GUIDE.md)** - Инструкция по проверке модели доступа
- **[Резюме модели доступа](development/projects-access-model/SUMMARY_RU.md)** - Краткое резюме реализации
- **[Отчёт о завершении](development/projects-access-model/COMPLETION_REPORT.md)** - Отчёт о завершении реализации

### Анализ

- **[Структура шаблона "Бренд-пакет"](analysis/brand-package-template-structure.md)** - Анализ структуры шаблона
- **[Текущее состояние шаблонов](analysis/project-templates-current-state.md)** - Анализ шаблонов проектов

---

## Операции

### Runbooks

- **[Руководство по очистке БД](runbooks/DATABASE_CLEANUP_GUIDE.md)** - Пошаговая инструкция очистки БД
- **[Восстановление данных пользователей](runbooks/USER_DATA_RECOVERY.md)** - Процедура восстановления после потери данных
- **[Целостность данных организаций](runbooks/ORGANIZATION_DATA_INTEGRITY.md)** - Проверка и исправление данных организаций
- **[Runbook для проектов и задач](runbooks/cursor_runbook_projects_tasks_v1.md)** - Операционное руководство по работе с проектами

### Аудит

- **[Отчёт о расположении данных](audit/DATA_LOCATION_AUDIT_REPORT.md)** - Полный аудит хранения данных в системе
- **[Анализ связи организаций и проектов](audit/ORGANIZATION_PROJECT_RELATIONSHIP_ANALYSIS.md)** - Анализ отношений между сущностями

---

## AI функциональность

### Руководства

- **[Полное руководство по AI](ai/AI_IMPLEMENTATION_GUIDE.md)** - Архитектура, API, интеграция, настройка
- **[Быстрый старт AI](ai/AI_QUICK_START.md)** - Краткая инструкция для начала работы
- **[Настройка ключей AI](ai/AI_KEYS_SETUP.md)** - Инструкция по настройке API ключей
- **[Руководство пользователя AI](ai/AI_ASSISTANT_USER_GUIDE.md)** - Инструкция для пользователей

### Планы и контекст

- **[План реализации AI ассистента](ai/AI_ASSISTANT_IMPLEMENTATION_PLAN.md)** - План разработки AI ассистента
- **[Объяснение проекта для AI](ai/ПРОЕКТ_ОБЪЯСНЕНИЕ.md)** - Контекст для AI агентов

---

## Справочники

### Референсы

- **[ID тестовых пользователей](reference/TEST_USERS_IDS.md)** - Справочник ID для тестирования

### Руководства

- **[Руководство по исправлению TS ошибок](guides/TYPESCRIPT_ERRORS_FIX_GUIDE.md)** - Помощь при ошибках TypeScript

### Администрирование

- **[Управление данными](admin/data-management.md)** - Админские функции управления данными

### Финансы

- **[Финансовая система](finance/README_FINANCE.md)** - Описание финансового модуля

### Исследования

- **[Анализ пользователей](research/users/USERS_ANALYSIS.md)** - Полный анализ пользователей системы
- **[Краткая сводка анализа](research/users/USERS_ANALYSIS_SUMMARY.md)** - Краткое резюме анализа пользователей
- **[Полный анализ пользователей](research/users/USERS_FULL_ANALYSIS.md)** - Детальный анализ всех пользователей

### Другие документы

- **[Объяснение env файлов](ENV_FILES_EXPLANATION.md)** - Описание переменных окружения
- **[Использование CONTINUITY.md](CONTINUITY_USAGE.md)** - Инструкция по работе с CONTINUITY.md
- **[История изменений](CHANGELOG.md)** - История изменений документации
- **[Описание платформы](02-Platforma-Opisanie.md)** - UX потоки, сценарии использования

---

## Архив

- **[Индекс архивных документов](archive/README.md)** - Полный список всех архивных документов

---

## Для новых разработчиков

**Начните здесь:**

1. **[Быстрый старт](getting-started/quick-start.md)** - Начните работу за 5 минут
2. **[Настройка окружения](getting-started/setup.md)** - Подробное руководство по установке
3. **[Системный анализ](architecture/system-analysis.md)** - Поймите архитектуру системы
4. **[Шпаргалка](getting-started/CHEAT_SHEET.md)** - Быстрая справка по командам

---

## Для архитекторов

**Ключевые документы:**

1. **[Системный анализ](architecture/system-analysis.md)** - Полное описание архитектуры
2. **[Архитектура базы данных](architecture/database-architecture.md)** - Структура БД и паттерны
3. **[ADR-0001: Канонические таблицы](architecture/adr/0001-canonical-database-tables.md)** - Архитектурные решения
4. **[Отчёт о расположении данных](audit/DATA_LOCATION_AUDIT_REPORT.md)** - Аудит хранения данных

---

## Для разработчиков

**Основные ресурсы:**

1. **[Мастер-гайд по проектам](development/projects-master-guide.md)** - Работа с модулем проектов
2. **[Workflow проектов, задач, файлов](development/PROJECT_TASK_FILE_WORKFLOW.md)** - Понимание workflow
3. **[Руководство по исправлению TS ошибок](guides/TYPESCRIPT_ERRORS_FIX_GUIDE.md)** - Решение проблем TypeScript
4. **[Использование WebSocket](development/websocket-usage.md)** - Работа с WebSocket
5. **[Полное руководство по AI](ai/AI_IMPLEMENTATION_GUIDE.md)** - Интеграция AI функциональности

---

## Для операторов

**Операционные руководства:**

1. **[Руководство по очистке БД](runbooks/DATABASE_CLEANUP_GUIDE.md)** - Очистка базы данных
2. **[Восстановление данных пользователей](runbooks/USER_DATA_RECOVERY.md)** - Восстановление после потери данных
3. **[Целостность данных организаций](runbooks/ORGANIZATION_DATA_INTEGRITY.md)** - Проверка целостности данных
4. **[Runbook для проектов и задач](runbooks/cursor_runbook_projects_tasks_v1.md)** - Операции с проектами

---

## Поиск документации

### По теме

**База данных:**

- [Архитектура БД](architecture/database-architecture.md)
- [Настройка Vercel Postgres](getting-started/vercel-postgres-setup.md)
- [Очистка БД](runbooks/DATABASE_CLEANUP_GUIDE.md)
- [Оптимизация БД](development/database-optimization-next-steps.md)

**Проекты и задачи:**

- [Мастер-гайд по проектам](development/projects-master-guide.md)
- [Workflow проектов](development/PROJECT_TASK_FILE_WORKFLOW.md)
- [Runbook проектов](runbooks/cursor_runbook_projects_tasks_v1.md)

**AI функциональность:**

- [Полное руководство по AI](ai/AI_IMPLEMENTATION_GUIDE.md)
- [Быстрый старт AI](ai/AI_QUICK_START.md)
- [Настройка ключей AI](ai/AI_KEYS_SETUP.md)

**Компоненты:**

- [UI компоненты](components/ui/)
- [Справочник модальных окон](components/modal-windows-reference.md)
- [Система типографики](typography-system.md)

---

## Обновление индекса

Этот индекс обновляется при изменении структуры документации. При добавлении нового документа:

1. Добавьте его в соответствующую категорию
2. Добавьте краткое описание
3. Обновите дату "Последнее обновление"

---

**Связанные документы:**

- [README документации](README.md) - Обзор документации
- [Анализ документации](DOCUMENTATION_ANALYSIS.md) - Структурный анализ всей документации

# Архив документации

> **Последнее обновление:** 2026-03-09

Этот каталог содержит устаревшие документы, которые больше не актуальны, но сохранены для истории.

## Правила архивирования

Правила архивирования документов описаны в [`.cursor/rules/documentation-archiving.mdc`](../../.cursor/rules/documentation-archiving.mdc).

## Структура архива

Архив организован по датам реализации фич и категориям:

```
docs/archive/
├── development/
│   ├── 2025-01-15-organization-closure/  # Отчёты по этапам закрытия организаций
│   ├── 2025-01-XX-project-creation/     # Отчёты по этапам создания проектов
│   └── kanban/                           # Документация Kanban (устаревшие версии)
├── analysis/                             # Исторические анализы и аудиты
├── continuity/                           # Исторические снимки CONTINUITY.md
├── reference/                            # Справочные документы (неактуальные)
└── research/                             # Исследовательские документы (неактуальные)
```

## Индекс архивных документов

| Дата архивирования | Категория   | Название                           | Дата создания | Причина архивирования                                       | Путь                                                              |
| ------------------ | ----------- | ---------------------------------- | ------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| 2026-01-05         | development | organization-closure stage reports | 2025-01-15    | Завершены этапы реализации                                  | `development/2025-01-15-organization-closure/`                    |
| 2026-01-05         | development | project-creation stage reports     | 2025-01-XX    | Завершены этапы реализации                                  | `development/2025-01-XX-project-creation/`                        |
| 2026-01-05         | development | Kanban Quick Reference (Angular)   | 2025-01-15    | Проект использует React, Angular версия устарела            | `development/kanban/2025-01-15-KANBAN_QUICK_REFERENCE_ANGULAR.md` |
| 2026-01-05         | analysis    | project-creation-analysis          | 2024-XX-XX    | Исторический анализ, использован для реализации             | `analysis/2024-XX-XX-project-creation-analysis.md`                |
| 2026-01-05         | analysis    | projects-gap-analysis              | 2025-XX-XX    | Исторический анализ, использован для реализации             | `analysis/2025-XX-XX-projects-gap-analysis.md`                    |
| 2026-01-05         | analysis    | komanda-gap-analysis               | 2025-XX-XX    | Исторический анализ, использован для реализации             | `analysis/2025-XX-XX-komanda-gap-analysis.md`                     |
| 2026-01-05         | analysis    | modal-windows-audit                | 2025-XX-XX    | Аудит завершён, проблемы исправлены                         | `analysis/2025-XX-XX-modal-windows-audit.md`                      |
| 2026-01-05         | analysis    | font-sizes-audit                   | 2025-XX-XX    | Аудит завершён, проблемы исправлены                         | `analysis/2025-XX-XX-font-sizes-audit.md`                         |
| 2026-01-05         | development | content-blocks-migration           | 2024-12-19    | Миграция завершена (98.8%), документы больше не актуальны   | `development/2024-12-19-content-blocks-migration/`                |
| 2026-01-06         | reference   | TEST_USERS_IDS                     | 2025-11-30    | Документ больше не актуален                                 | `reference/TEST_USERS_IDS.md`                                     |
| 2026-01-06         | research    | users analysis documents           | 2025-11-30    | Исследовательские документы больше не актуальны             | `research/users/`                                                 |
| 2026-01-07         | development | PM Core migration documents        | unknown       | Мигрировано в `modules/projects-tasks/` в рамках реорганизации     | `2026-01-07-pm-core-migration/`                                   |
| 2026-01-07         | development | AI Hub migration documents         | unknown       | Мигрировано в `modules/ai-hub/` в рамках реорганизации      | `2026-01-07-ai-hub-migration/`                                    |
| 2026-01-07         | analysis    | Marketplace migration documents    | unknown       | Мигрировано в `modules/marketplace/` в рамках реорганизации | `2026-01-07-marketplace-migration/`                               |
| 2026-01-07         | platform    | Platform migration documents       | unknown       | Мигрировано в `platform/` в рамках реорганизации            | `2026-01-07-platform-migration/`                                  |
| 2026-03-08         | continuity  | continuity-ledger-history          | 2026-01-05    | `CONTINUITY.md` сокращён до активного контекста со `STOP LINE` | `continuity/2026-03-08-continuity-ledger-history.md`              |
| 2026-03-09         | development | legacy-marketplace-structure       | 2026-01-07    | Marketplace-first модель заменена user-facing разделом `Каталог` | `development/2026-03-09-catalog-reorganization/legacy-marketplace-structure.md` |

## Детализация по категориям

### Development

#### Organization Closure (2025-01-15)

Отчёты по этапам реализации функционала закрытия организаций:

- `stage-2-report.md` - Отчёт по этапу 2: Backend - Репозитории
- `stage-3-report.md` - Отчёт по этапу 3: Backend - Closure Checkers
- `stage-4-report.md` - Отчёт по этапу 4: Backend - Organization Closure Service
- `stage-5-report.md` - Отчёт по этапу 5: Backend - Archive Service
- `stage-6-report.md` - Отчёт по этапу 6: Backend - Delete Service
- `stage-7-report.md` - Отчёт по этапу 7: API Endpoints
- `stage-8-report.md` - Отчёт по этапу 8: Frontend Integration

#### Project Creation (2025-01-XX)

Отчёты по этапам улучшения формы создания проекта:

- `stage-1-report.md` - Отчёт по этапу 1: API и данные
- `stage-2-3-report.md` - Отчёт по этапам 2-3: UI создания

#### Kanban

- `2025-01-15-KANBAN_QUICK_REFERENCE_ANGULAR.md` - Быстрая справка по Kanban для Angular (устарела, проект использует React)

#### Content Blocks Migration (2024-12-19)

Документы по завершенной миграции блоков контента на единую систему стилей:

- `content-blocks-migration-roadmap.md` - Дорожная карта миграции
- `content-blocks-migration-audit-report.md` - Отчет аудита миграции
- `content-blocks-migration-audit-task.md` - Задача по аудиту
- `content-blocks-migration-estimate.md` - Оценка миграции
- `content-blocks-migration-final-task.md` - Финальная задача
- `content-blocks-migration-stage2-checklist.md` - Чеклист этапа 2
- `content-blocks-migration-stage3-task.md` - Задача этапа 3
- `content-blocks-migration-stage4-task.md` - Задача этапа 4
- `content-blocks-migration-stage5-task.md` - Задача этапа 5
- `content-blocks-migration-stage6-task.md` - Задача этапа 6

**Статус миграции:** ✅ Завершена (98.8% - 83/84 файла мигрировано)

#### PM Core Migration (2026-01-07)

Документы PM Core, мигрированные в новую модульную структуру:

- `guides/projects-master-guide.md` - Мастер-гайд по проектам (мигрировано в `modules/projects-tasks/projects-tasks-projects.md`)
- `guides/PROJECT_TASK_FILE_WORKFLOW.md` - Workflow проектов, задач, файлов (мигрировано в `modules/projects-tasks/projects-tasks-tasks.md`)
- `guides/websocket-usage.md` - Использование WebSocket (мигрировано в `modules/projects-tasks/projects-tasks-websocket.md`)
- `guides/komanda.md` - Концепция команд и исполнителей (мигрировано в `modules/projects-tasks/projects-tasks-teams.md`)
- `plans/projects-implementation-plan.md` - План реализации проектов (мигрировано в `modules/projects-tasks/projects-tasks-implementation-plan.md`)
- `plans/workspace-dashboard-implementation-plan.md` - План дашборда workspace (мигрировано в `modules/projects-tasks/projects-tasks-metrics.md`)
- `KANBAN/KANBAN_QUICK_REFERENCE_REACT.md` - Быстрая справка Kanban (мигрировано в `modules/projects-tasks/projects-tasks-kanban.md`)
- `KANBAN/KANBAN_DRAG_DROP_ADAPTED.md` - Адаптация drag & drop (мигрировано в `modules/projects-tasks/projects-tasks-kanban.md`)
- `file-manager-integration/notes_filemanager_integration_no_separate_service_v2_lead_agent.md` - Интеграция файлового менеджера (мигрировано в `modules/projects-tasks/projects-tasks-files.md`)
- `projects-access-model/*` - Модель доступа к проектам (мигрировано в `modules/projects-tasks/projects-tasks-access.md`)

#### AI Hub Migration (2026-01-07)

Документы AI Hub, мигрированные в новую модульную структуру:

- `AI_IMPLEMENTATION_GUIDE.md` - Полное руководство по AI (мигрировано в `modules/ai-hub/ai-hub-integration.md`)
- `AI_QUICK_START.md` - Быстрый старт AI (мигрировано в `modules/ai-hub/ai-hub-quick-start.md`)
- `AI_KEYS_SETUP.md` - Настройка ключей AI (мигрировано в `modules/ai-hub/ai-hub-setup.md`)
- `AI_ASSISTANT_USER_GUIDE.md` - Руководство пользователя AI (мигрировано в `modules/ai-hub/ai-hub-assistant.md`)
- `AI_ASSISTANT_IMPLEMENTATION_PLAN.md` - План реализации AI ассистента (мигрировано в `modules/ai-hub/ai-hub-implementation-plan.md`)

#### Marketplace Migration (2026-01-07)

Документы Marketplace, мигрированные в новую модульную структуру:

- `brand-package-template-structure.md` - Структура шаблона "Бренд-пакет" (мигрировано в `modules/marketplace/marketplace-templates.md`)
- `project-templates-current-state.md` - Текущее состояние шаблонов (мигрировано в `modules/marketplace/marketplace-templates.md`)

#### Catalog Reorganization (2026-03-09)

Документы legacy Marketplace-first модели, заархивированные после старта reorg user-facing раздела `Каталог`:

- `legacy-marketplace-structure.md` - архивный snapshot старой IA, терминов и магазинной framing-логики перед заменой на discovery-first модель

#### Platform Migration (2026-01-07)

Платформенные документы, мигрированные в новую структуру:

- `quick-start.md` - Быстрый старт (мигрировано в `platform/getting-started.md`)
- `02-Platforma-Opisanie.md` - Описание платформы (мигрировано в `platform/overview.md`)

**Примечание:** `docs/getting-started/setup.md` оставлен как shim на один релизный цикл, затем будет архивирован.

### Analysis

Исторические анализы и аудиты, которые были использованы для реализации фич:

- `2024-XX-XX-project-creation-analysis.md` - Анализ формы создания проекта
- `2025-XX-XX-projects-gap-analysis.md` - Gap анализ проектов
- `2025-XX-XX-komanda-gap-analysis.md` - Gap анализ команды
- `2025-XX-XX-modal-windows-audit.md` - Аудит модальных окон
- `2025-XX-XX-font-sizes-audit.md` - Аудит размеров шрифтов

### Reference

Справочные документы, которые больше не актуальны:

- `TEST_USERS_IDS.md` - Справочник ID тестовых пользователей (создан 2025-11-30)

### Research

Исследовательские документы, которые больше не актуальны:

#### Users Analysis (2025-11-30)

Документы по анализу пользователей системы:

- `users/USERS_ANALYSIS.md` - Полный анализ пользователей системы
- `users/USERS_ANALYSIS_SUMMARY.md` - Краткая сводка анализа пользователей
- `users/USERS_FULL_ANALYSIS.md` - Детальный анализ всех пользователей

### Continuity

Исторические снимки continuity ledger:

- `2026-03-08-continuity-ledger-history.md` - полный снимок старого `CONTINUITY.md` до перехода на компактный active-context формат

## Когда использовать архив

Архивные документы могут быть полезны для:

1. **Исторического контекста** - понимание того, как развивалась функциональность
2. **Справочной информации** - примеры реализации, которые могут быть полезны в будущем
3. **Анализа решений** - понимание причин принятых решений
4. **Истории continuity** - только если текущий `CONTINUITY.md` ссылается на архив или задаче нужен глобальный ретроспективный контекст

## Важно

- Архивные документы **не обновляются** и могут содержать устаревшую информацию
- Для актуальной документации используйте документы в основной папке `docs/`
- Архив continuity **не читается по умолчанию**; сначала используется компактный активный контекст из корневого `CONTINUITY.md`
- При ссылке на архивные документы указывайте, что это архивная информация

## Обновление индекса

Этот индекс обновляется при каждом архивировании документа. При добавлении нового документа в архив:

1. Добавьте запись в таблицу "Индекс архивных документов"
2. Укажите дату архивирования (сегодня)
3. Укажите дату создания (из документа или метаданных)
4. Укажите причину архивирования
5. Добавьте путь к документу
6. При необходимости добавьте описание в раздел "Детализация по категориям"

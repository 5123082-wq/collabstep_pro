# Пробелы и действия по документации Collabverse

**Создан:** 2026-01-07  
**Последнее обновление:** 2026-01-07  
**Версия:** 1.0

## Описание

Список проблем, пробелов и конкретных действий для улучшения документации с приоритетами P0/P1/P2.

---

## P0 (блокирует понимание платформы)

### P0-001: Отсутствие метаданных в документах

**Проблема:** Многие документы не имеют полных метаданных (Статус, Владелец, Создан, Последнее обновление)

**Где обнаружено:**

- `docs/getting-started/QUICK_SETUP_GUIDE.md` — нет метаданных
- `docs/getting-started/vercel-postgres-setup.md` — нет метаданных
- `docs/getting-started/VERCEL_POSTGRES_SETUP_CHECKLIST.md` — нет метаданных
- `docs/getting-started/VERIFICATION_CHECKLIST.md` — нет метаданных
- `docs/getting-started/CHEAT_SHEET.md` — нет метаданных
- `docs/getting-started/QUICK_DELETE_GUIDE.md` — нет метаданных
- `docs/development/plans/organization-closure-implementation-plan.md` — нет метаданных
- `docs/development/organization-closure/*` — нет метаданных
- `docs/runbooks/*` — нет метаданных
- `docs/components/ui/*` — нет метаданных
- `docs/modules/admin/admin-data-management.md` — нет метаданных
- `docs/modules/finance/finance-overview.md` — нет метаданных
- `docs/ENV_FILES_EXPLANATION.md` — нет метаданных
- `docs/CONTINUITY_USAGE.md` — нет метаданных
- `docs/typography-system.md` — нет метаданных
- `docs/CHANGELOG.md` — нет метаданных
- `docs/ROADMAP.md` — нет метаданных

**Что надо сделать:**

1. Добавить метаданные во все документы без них
2. Указать владельца для каждого документа
3. Указать дату создания (если известна) или `UNKNOWN`
4. Указать дату последнего обновления

**Какой документ обновить:**

- Все документы из списка выше

**Кому назначить:** product + engineering

---

### P0-002: Низкий confidence в документации Marketplace

**Проблема:** Документы Marketplace имеют низкий confidence (low), так как модуль ещё не полностью реализован

**Где обнаружено:**

- `docs/modules/marketplace/marketplace-ready-projects.md` — confidence: low
- `docs/modules/marketplace/marketplace-services.md` — confidence: low
- `docs/modules/marketplace/marketplace-orders.md` — confidence: low
- `docs/modules/marketplace/marketplace-cart.md` — confidence: low
- `docs/modules/marketplace/marketplace-categories.md` — confidence: low

**Что надо сделать:**

1. Проверить соответствие документации реальной реализации
2. Обновить документацию на основе кода
3. Пометить `NEEDS_CONFIRMATION` где функциональность ещё не реализована
4. Повысить confidence до `medium` или `high` после проверки

**Какой документ обновить:**

- Все документы Marketplace

**Кому назначить:** product

---

### P0-003: Низкий confidence в документации Marketing, Performers, Community

**Проблема:** Документы этих модулей имеют низкий confidence, так как модули ещё не реализованы

**Где обнаружено:**

- `docs/modules/marketing/*` — все документы имеют confidence: low
- `docs/modules/performers/performers-overview.md` — confidence: low
- `docs/modules/community/community-overview.md` — confidence: low

**Что надо сделать:**

1. Пометить все функции как `NEEDS_CONFIRMATION`
2. Указать, что модули планируются, но ещё не реализованы
3. Обновить confidence до `medium` после уточнения планов

**Какой документ обновить:**

- Все документы Marketing, Performers, Community

**Кому назначить:** product

---

## P1 (важно, но не блокирует)

### P1-001: Отсутствие дат создания в документах

**Проблема:** Многие документы имеют `UNKNOWN` в поле "Дата создания"

**Где обнаружено:**

- `docs/architecture/system-analysis.md` — дата создания: UNKNOWN
- `docs/getting-started/setup.md` — дата создания: UNKNOWN
- `docs/development/plans/*` — большинство документов имеют UNKNOWN
- `docs/runbooks/*` — все документы имеют UNKNOWN
- `docs/components/ui/*` — все документы имеют UNKNOWN

**Что надо сделать:**

1. Определить даты создания из истории Git
2. Обновить метаданные документов
3. Если дата неизвестна, оставить `UNKNOWN` и пометить `NEEDS_CONFIRMATION`

**Какой документ обновить:**

- Все документы с `UNKNOWN` в дате создания

**Кому назначить:** engineering

---

### P1-002: Отсутствие источников миграции

**Проблема:** Некоторые MIGRATED документы имеют `UNKNOWN` в поле "Источник миграции"

**Где обнаружено:**

- `docs/architecture/system-analysis.md` — источник миграции: UNKNOWN
- `docs/architecture/database-architecture.md` — источник миграции: UNKNOWN
- `docs/getting-started/setup.md` — источник миграции: UNKNOWN
- `docs/getting-started/quick-start.md` — источник миграции: UNKNOWN

**Что надо сделать:**

1. Найти источники миграции в архиве или истории Git
2. Обновить поле "Источник миграции" в реестре
3. Если источник не найден, оставить `UNKNOWN` и пометить `NEEDS_CONFIRMATION`

**Какой документ обновить:**

- `docs/_audit/document-register.md`

**Кому назначить:** engineering

---

### P1-003: Документы со статусом NEEDS_CONFIRMATION

**Проблема:** Многие документы содержат пометки `NEEDS_CONFIRMATION`, которые требуют уточнения

**Где обнаружено:**

- `docs/modules/marketplace/*` — все документы содержат `NEEDS_CONFIRMATION`
- `docs/modules/marketing/*` — все документы содержат `NEEDS_CONFIRMATION`
- `docs/modules/performers/performers-overview.md` — содержит `NEEDS_CONFIRMATION`
- `docs/modules/community/community-overview.md` — содержит `NEEDS_CONFIRMATION`
- `docs/platform/analytics-events.md` — содержит `NEEDS_CONFIRMATION`
- `docs/platform/glossary.md` — содержит `NEEDS_CONFIRMATION`
- `docs/platform/roles-permissions.md` — содержит `NEEDS_CONFIRMATION`

**Что надо сделать:**

1. Проверить соответствие документации реальной реализации
2. Убрать `NEEDS_CONFIRMATION` где информация подтверждена
3. Обновить документацию на основе кода
4. Пометить как `NEEDS_CONFIRMATION` только то, что действительно требует уточнения

**Какой документ обновить:**

- Все документы с `NEEDS_CONFIRMATION`

**Кому назначить:** product + engineering

---

### P1-004: Архивные документы без отражения в новой документации

**Проблема:** 28 архивных документов не отражены в новой документации (MISSING)

**Где обнаружено:**

- `archive/2026-01-07-ai-hub-migration/ПРОЕКТ_ОБЪЯСНЕНИЕ.md` — MISSING
- `archive/development/2025-01-XX-project-creation/*` — MISSING (2 документа)
- `archive/development/2024-12-19-content-blocks-migration/*` — MISSING (10 документов)
- `archive/reference/TEST_USERS_IDS.md` — MISSING
- `archive/research/users/*` — MISSING (3 документа)
- `archive/audit/CODE_AUDIT.md` — MISSING
- `archive/audit/FIXES_ACTION_PLAN.md` — MISSING
- `archive/database/migrations/*` — MISSING (2 документа)
- `archive/FIX_WEBPACK_CHUNK_ERROR.md` — MISSING
- `archive/WEBPACK_ERROR_RESOLUTION.md` — MISSING
- `archive/TEST_REPORT.md` — MISSING
- `archive/reports/*` — MISSING (3 документа)

**Что надо сделать:**

1. Проверить, реализована ли функциональность из архивных документов
2. Если реализована — создать документацию или обновить существующую
3. Если не реализована — пометить как `removed` в реестре архива
4. Если требует уточнения — пометить как `unknown` и назначить владельца

**Какой документ обновить:**

- `docs/_audit/archive-register.md`
- Создать или обновить документацию для реализованной функциональности

**Кому назначить:** product + engineering

---

### P1-005: Документы со статусом draft

**Проблема:** 25 документов имеют статус `draft`, что указывает на незавершённость

**Где обнаружено:**

- `docs/modules/projects-tasks/projects-tasks-overview.md` — статус: draft
- `docs/modules/marketplace/marketplace-overview.md` — статус: draft
- `docs/modules/marketplace/*` — все документы имеют статус: draft (6 документов)
- `docs/modules/ai-hub/ai-hub-overview.md` — статус: draft
- `docs/modules/ai-hub/ai-hub-agents.md` — статус: draft
- `docs/modules/ai-hub/ai-hub-generations.md` — статус: draft
- `docs/modules/ai-hub/ai-hub-prompts.md` — статус: draft
- `docs/modules/marketing/*` — все документы имеют статус: draft (5 документов)
- `docs/modules/performers/performers-overview.md` — статус: draft
- `docs/modules/community/community-overview.md` — статус: draft

**Что надо сделать:**

1. Проверить готовность документов
2. Обновить статус на `stable` или `active` где документы готовы
3. Завершить документы со статусом `draft`, если они критичны
4. Пометить как `draft` только документы, которые действительно в разработке

**Какой документ обновить:**

- Все документы со статусом `draft`

**Кому назначить:** product

---

## P2 (желательно)

### P2-001: Отсутствие владельцев в документах

**Проблема:** Некоторые документы не имеют владельца (NEEDS_OWNER)

**Где обнаружено:**

- Проверить все документы в реестре на наличие `NEEDS_OWNER`

**Что надо сделать:**

1. Назначить владельца для каждого документа
2. Обновить метаданные документов
3. Указать владельца в реестре

**Какой документ обновить:**

- Все документы без владельца
- `docs/_audit/document-register.md`

**Кому назначить:** product

---

### P2-002: Неполные ссылки между документами

**Проблема:** Некоторые документы имеют неполные или отсутствующие ссылки на связанные документы

**Где обнаружено:**

- Проверить все документы на наличие ссылок в поле "Links out"

**Что надо сделать:**

1. Добавить ссылки на связанные документы
2. Обновить поле "Links out" в реестре
3. Проверить работоспособность всех ссылок

**Какой документ обновить:**

- Все документы с неполными ссылками
- `docs/_audit/document-register.md`

**Кому назначить:** engineering

---

### P2-003: Отсутствие описания покрытия

**Проблема:** Некоторые документы не имеют описания покрытия (что именно покрывает документ)

**Где обнаружено:**

- Проверить все документы в реестре на наличие описания покрытия

**Что надо сделать:**

1. Добавить описание покрытия для каждого документа
2. Указать, что именно покрывает документ
3. Обновить поле "Покрытие" в реестре

**Какой документ обновить:**

- Все документы без описания покрытия
- `docs/_audit/document-register.md`

**Кому назначить:** product

---

### P2-004: Дублирование информации

**Проблема:** Возможное дублирование информации между документами

**Где обнаружено:**

- Требуется проверка всех документов на дублирование

**Что надо сделать:**

1. Найти дублирующуюся информацию
2. Определить "источник истины" для каждой темы
3. Удалить дубликаты или объединить документы
4. Обновить ссылки на "источник истины"

**Какой документ обновить:**

- Документы с дублирующейся информацией

**Кому назначить:** product + engineering

---

### P2-005: Устаревшие ссылки

**Проблема:** Возможные устаревшие ссылки на несуществующие документы

**Где обнаружено:**

- Требуется проверка всех ссылок в документах

**Что надо сделать:**

1. Проверить все ссылки в документах
2. Исправить битые ссылки
3. Обновить ссылки на архивированные документы
4. Настроить автоматическую проверку ссылок в CI

**Какой документ обновить:**

- Все документы с устаревшими ссылками

**Кому назначить:** engineering

---

## Статистика проблем

- **P0 (критичные):** 3 проблемы
- **P1 (важные):** 5 проблем
- **P2 (желательные):** 5 проблем
- **Всего:** 13 проблем

## Рекомендации по приоритизации

1. **Сначала P0:** Критичные проблемы блокируют понимание платформы
2. **Затем P1:** Важные проблемы влияют на качество документации
3. **Потом P2:** Желательные улучшения повышают удобство использования

## Следующие шаги

1. Создать задачи для каждой проблемы с приоритетом
2. Назначить владельцев для каждой задачи
3. Отслеживать прогресс в решении проблем
4. Обновлять реестр документов по мере решения проблем

---

**Последнее обновление:** 2026-01-07

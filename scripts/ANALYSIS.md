# Анализ скриптов для удаления

## Скрипты, которые можно удалить

### 1. Дубликаты сканирования проектов (удалить 2 из 4)

**Оставить:**
- `deep-scan-all-projects.ts` - самое полное сканирование (проверяет все источники)
- `scan-projects-from-api.ts` - сканирование через API (полезно когда сервер запущен)

**Удалить:**
- ❌ `scan-all-projects.ts` - дублирует функциональность `deep-scan-all-projects.ts`, но менее полное
- ❌ `scan-and-delete-all.ts` - комбинация сканирования + удаления, можно использовать `deep-scan` + `delete-all-projects` отдельно

**Причина:** `deep-scan-all-projects.ts` делает все то же самое, что `scan-all-projects.ts`, но более тщательно. `scan-and-delete-all.ts` - это просто комбинация двух операций.

### 2. Дубликаты удаления проектов (удалить 1 из 2)

**Оставить:**
- `delete-all-projects.ts` - универсальное удаление напрямую из репозиториев

**Удалить:**
- ❌ `delete-projects-via-api.ts` - удаление через API (менее надежно, требует запущенный сервер)

**Причина:** Прямое удаление через репозитории более надежно и не требует запущенного сервера.

### 3. Дубликаты проверки организаций (удалить 2 из 4)

**Оставить:**
- `check-organization-status.ts` - используется в документации и runbooks, проверяет статус организаций
- `analyze-organization-dependencies.ts` - полный анализ зависимостей организации перед удалением

**Удалить:**
- ❌ `check-org-deps.ts` - дублирует функциональность `analyze-organization-dependencies.ts`, но менее полное
- ❌ `check-organizations.ts` - базовая проверка организаций, дублирует `check-organization-status.ts`

**Причина:** `analyze-organization-dependencies.ts` делает все то же самое, что `check-org-deps.ts`, но более детально. `check-organizations.ts` - базовая версия того, что делает `check-organization-status.ts`.

### 4. Устаревший скрипт очистки памяти

**Удалить:**
- ❌ `clear-memory-data.ts` - очистка данных из памяти

**Причина:** После миграции на БД этот скрипт устарел. Данные теперь хранятся в БД, а не только в памяти. Для полной очистки используется `clear-all-data.ts`.

### 5. Устаревший скрипт сборки

**Удалить:**
- ❌ `clean-all.mjs` - очистка артефактов сборки

**Причина:** Дублирует функциональность `clean-next.mjs`, который уже используется в `prebuild`. `clean-all.mjs` не используется нигде в проекте.

## Итого можно удалить: 7 скриптов

1. `scripts/db/scan-all-projects.ts`
2. `scripts/db/scan-and-delete-all.ts`
3. `scripts/db/delete-projects-via-api.ts`
4. `scripts/db/check-org-deps.ts`
5. `scripts/db/check-organizations.ts`
6. `scripts/db/clear-memory-data.ts`
7. `scripts/build/clean-all.mjs`

## Скрипты, которые нужно оставить (актуальные)

### Активно используемые в package.json

- `dev-simple.sh`, `dev-full.sh` - запуск разработки
- `ensure-env.mjs` - проверка окружения
- `check-app-routes.mjs`, `verify-routes.mjs`, `verify-preflight.mjs` - проверка маршрутов
- `clean-next.mjs`, `fix-manifests.mjs`, `validate-env.mjs` - сборка
- `index-assistant-docs.ts`, `index-docs-if-enabled.mjs` - индексация документации
- `check-docs-links.mjs` - проверка ссылок в документации
- `reset-ai-agents.ts` - сброс AI агентов
- `flags-snapshot.mjs` - снимок feature flags
- `run-vercel-build.mjs` - симуляция Vercel сборки

### Полезные для работы с БД

- `comprehensive-data-audit.ts` - комплексный аудит
- `audit-users.ts` - аудит пользователей
- `check-organization-status.ts` - проверка статуса организаций (используется в runbooks)
- `analyze-organization-dependencies.ts` - анализ зависимостей
- `diagnose-db-issues.ts` - диагностика проблем БД
- `cleanup-orphaned-projects.ts` - очистка "осиротевших" проектов
- `sync-organization-to-db.ts` - синхронизация организации с БД
- `verify-db-sync.ts` - проверка синхронизации БД
- `find-user.ts` - поиск пользователя
- `deep-scan-all-projects.ts` - глубокое сканирование проектов
- `scan-projects-from-api.ts` - сканирование через API
- `delete-all-projects.ts` - удаление всех проектов
- `clear-all-data.ts` - полная очистка данных
- `cleanup-users-db.ts` - очистка пользователей (используется в setup guide)

### Миграции

- Все скрипты миграций нужно оставить (они могут понадобиться для отката или повторного применения)


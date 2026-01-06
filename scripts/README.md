# Scripts Directory

Этот документ содержит полный список всех скриптов проекта, организованных по категориям.

## Структура

Скрипты организованы по категориям в следующих папках:

- `dev/` - скрипты для разработки
- `build/` - скрипты сборки и проверки
- `db/` - скрипты для работы с базой данных
- `docs/` - скрипты для работы с документацией
- `utils/` - утилиты и вспомогательные скрипты
- `migrations/` - скрипты миграций базы данных

## Скрипты разработки (`dev/`)

### `dev-simple.sh`

Запуск простого режима разработки (только веб-сервер).

**Использование:**

```bash
pnpm dev:simple
```

### `dev-full.sh`

Запуск полного режима разработки (веб-сервер + WebSocket + БД).

**Использование:**

```bash
pnpm dev:full
```

### `start-production-full.sh`

Запуск продакшен-сервера в полном режиме.

**Использование:**

```bash
bash scripts/dev/start-production-full.sh
```

## Скрипты сборки (`build/`)

### `check-app-routes.mjs`

Проверка структуры маршрутов Next.js App Router.

**Использование:**

```bash
pnpm --filter @collabverse/web run check:routes
```

### `clean-next.mjs`

Очистка папки `.next` перед сборкой.

**Использование:**
Автоматически запускается в `prebuild`.

### `fix-manifests.mjs`

Исправление манифестов после сборки.

**Использование:**
Автоматически запускается в `build`.

### `index-assistant-docs.ts`

Индексация документации для AI ассистента.

**Использование:**

```bash
pnpm --filter @collabverse/web index-assistant-docs
# или
npx tsx scripts/build/index-assistant-docs.ts
```

### `index-docs-if-enabled.mjs`

Условная индексация документации (только если включена функция AI ассистента).

**Использование:**
Автоматически запускается в `prebuild`.

### `run-vercel-build.mjs`

Симуляция сборки Vercel для проверки.

**Использование:**

```bash
node scripts/build/run-vercel-build.mjs
```

### `validate-env.mjs`

Валидация переменных окружения перед сборкой.

**Использование:**
Автоматически запускается в `prebuild`.

### `verify-preflight.mjs`

Предварительная проверка перед сборкой (WIP файлы, структура страниц).

**Использование:**

```bash
pnpm verify:preflight
```

### `verify-routes.mjs`

Проверка маршрутов после сборки.

**Использование:**

```bash
pnpm verify:routes
```

## Скрипты базы данных (`db/`)

### `analyze-all-users.ts`

Анализ всех пользователей в системе.

**Использование:**

```bash
npx tsx scripts/db/analyze-all-users.ts
```

### `analyze-organization-dependencies.ts`

Анализ зависимостей организаций.

**Использование:**

```bash
npx tsx scripts/db/analyze-organization-dependencies.ts
```

### `audit-users.ts`

Аудит пользователей в базе данных.

**Использование:**

```bash
npx tsx scripts/db/audit-users.ts
```

### `check-admin.ts`

Проверка административных прав пользователей.

**Использование:**

```bash
npx tsx scripts/db/check-admin.ts
```

### `check-organization-status.ts`

Проверка статуса организаций в базе данных.

**Использование:**

```bash
npx tsx scripts/db/check-organization-status.ts
```

### `cleanup-orphaned-projects.ts`

Очистка "осиротевших" проектов (без организации).

**Использование:**

```bash
CONFIRM_DELETE=yes npx tsx scripts/db/cleanup-orphaned-projects.ts
```

### `cleanup-users-db.ts`

Очистка базы данных пользователей.

**Использование:**

```bash
npx tsx scripts/db/cleanup-users-db.ts
```

### `clear-all-data.ts`

Полная очистка всех данных из базы данных.

**Использование:**

```bash
npx tsx scripts/db/clear-all-data.ts
```

### `comprehensive-data-audit.ts`

Комплексный аудит расположения данных в системе.

**Использование:**

```bash
npx tsx scripts/db/comprehensive-data-audit.ts
```

### `count-stats.ts`

Подсчет статистики по данным.

**Использование:**

```bash
npx tsx scripts/db/count-stats.ts
```

### `deep-scan-all-projects.ts`

Глубокое сканирование всех проектов.

**Использование:**

```bash
npx tsx scripts/db/deep-scan-all-projects.ts
```

### `delete-all-organizations.ts`

Удаление всех организаций.

**Использование:**

```bash
npx tsx scripts/db/delete-all-organizations.ts
```

### `delete-all-projects.ts`

Удаление всех проектов.

**Использование:**

```bash
npx tsx scripts/db/delete-all-projects.ts
```

### `delete-orphaned-tasks.ts`

Удаление "осиротевших" задач (без проекта).

**Использование:**

```bash
npx tsx scripts/db/delete-orphaned-tasks.ts
```

### `diagnose-db-issues.ts`

Диагностика проблем базы данных.

**Использование:**

```bash
npx tsx scripts/db/diagnose-db-issues.ts
```

### `find-user.ts`

Поиск пользователя по email.

**Использование:**

```bash
npx tsx scripts/db/find-user.ts <email>
```

### `scan-projects-from-api.ts`

Сканирование проектов через API.

**Использование:**

```bash
npx tsx scripts/db/scan-projects-from-api.ts
```

### `set-user-passwords.ts`

Установка паролей пользователей.

**Использование:**

```bash
npx tsx scripts/db/set-user-passwords.ts
```

### `sync-organization-to-db.ts`

Синхронизация организации с базой данных.

**Использование:**

```bash
npx tsx scripts/db/sync-organization-to-db.ts
```

### `verify-db-sync.ts`

Проверка синхронизации базы данных.

**Использование:**

```bash
npx tsx scripts/db/verify-db-sync.ts
```

## Скрипты документации (`docs/`)

### `check-docs-links.mjs`

Проверка ссылок в документации.

**Использование:**

```bash
pnpm docs:links
```

### `fix-markdown-lint.mjs`

Исправление ошибок линтера Markdown.

**Использование:**

```bash
node scripts/docs/fix-markdown-lint.mjs
```

### `fix-md022.mjs`

Исправление ошибок MD022 в Markdown файлах.

**Использование:**

```bash
node scripts/docs/fix-md022.mjs
```

## Утилиты (`utils/`)

### `check-performance.sh`

Проверка производительности.

**Использование:**

```bash
pnpm check:performance
```

### `ensure-env.mjs`

Проверка и подготовка переменных окружения.

**Использование:**

```bash
pnpm ensure-env
```

### `flags-snapshot.mjs`

Создание снимка feature flags.

**Использование:**
Автоматически запускается в `run-vercel-build.mjs`.

### `reset-ai-agents.ts`

Сброс AI агентов.

**Использование:**

```bash
pnpm reset:ai-agents
```

## Миграции (`migrations/`)

### `apply-migration-0004.mjs`

Применение миграции 0004.

**Использование:**

```bash
node scripts/migrations/apply-migration-0004.mjs
```

### `apply-migration-0006.mjs`

Применение миграции 0006.

**Использование:**

```bash
node scripts/migrations/apply-migration-0006.mjs
```

### `apply-migration-0007.mjs`

Применение миграции 0007.

**Использование:**

```bash
node scripts/migrations/apply-migration-0007.mjs
```

### `apply-migration-0008.mjs`

Применение миграции 0008 (Multi-Organization Feature).

**Использование:**

```bash
node scripts/migrations/apply-migration-0008.mjs
```

## Правила создания новых скриптов

**ВАЖНО:** Перед созданием нового скрипта:

1. **Проверь существование** - убедись, что скрипт с похожей функциональностью уже не существует
2. **Выбери правильную категорию** - помести скрипт в соответствующую папку (`dev/`, `build/`, `db/`, `docs/`, `utils/`, `migrations/`)
3. **Обнови этот документ** - добавь описание нового скрипта в соответствующую секцию
4. **Обнови package.json** - если скрипт должен быть доступен через npm команды, добавь его в `package.json`

## Примечания

- Все TypeScript скрипты используют `tsx` для запуска
- Все скрипты должны быть исполняемыми и иметь правильные пути относительно корня проекта
- Скрипты в `build/` часто запускаются автоматически во время сборки
- Скрипты в `db/` требуют подключения к базе данных через переменные окружения

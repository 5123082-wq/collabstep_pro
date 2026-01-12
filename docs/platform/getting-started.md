# Быстрый старт

**Статус:** active  
**Владелец:** product  
**Последнее обновление:** 2026-01-06

Это руководство поможет вам быстро начать работу с Collabverse.

## Предварительные требования

- **Node.js 20** (см. `.nvmrc`)
- **pnpm 9+**

## Установка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd collabstep-new-3
```

### 2. Установка зависимостей

```bash
pnpm install --frozen-lockfile
```

### 3. Подготовка переменных окружения

```bash
pnpm ensure-env
```

Эта команда создаст файл `.env` с базовыми настройками.

## Запуск в режиме разработки

```bash
pnpm dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

### Полный режим разработки

Для запуска всех сервисов (Web + WebSocket + БД):

```bash
pnpm dev:full
```

Это запустит:

- Web-сервер на порту 3000
- WebSocket сервер на порту 8080
- Подключение к базе данных

## Тестирование

### Unit тесты

```bash
pnpm test
```

### E2E тесты

```bash
pnpm test:e2e
```

**Примечание:** Для E2E тестов требуется установка браузеров:

```bash
npx playwright install --with-deps
```

### Локальное тестирование с БД

Для запуска тестов с базой данных см. [Локальный запуск тестов](../getting-started/local-testing.md).

## Демо-аккаунт

Для быстрого тестирования доступен один демо-аккаунт администратора:

### Администратор

- **Email**: `admin.demo@collabverse.test`
- **Пароль**: `admin.demo` (или значение из переменной окружения `DEMO_ADMIN_PASSWORD`)
- **ID**: `00000000-0000-0000-0000-000000000001`
- **Роли**: `productAdmin`, `featureAdmin`

> **Важно:** В системе настроен только один демо-администратор. Все организации и проекты принадлежат этому администратору. Новые пользователи могут регистрироваться через форму регистрации на странице `/register`.

## Основные команды

| Команда             | Описание                                        |
| ------------------- | ----------------------------------------------- |
| `pnpm dev`          | Запуск в режиме разработки                      |
| `pnpm dev:full`     | Запуск всех сервисов (Web + WebSocket + БД)     |
| `pnpm build`        | Сборка для production                           |
| `pnpm start`        | Запуск production сборки                        |
| `pnpm test`         | Запуск юнит-тестов                              |
| `pnpm test:e2e`     | Запуск E2E тестов                               |
| `pnpm verify`       | Полная проверка (линт, typecheck, build, тесты) |
| `pnpm -w lint`      | Линтинг всего проекта                           |
| `pnpm -w typecheck` | Проверка типов всего проекта                    |

## Структура проекта

```text
collabstep-new-3/
├── apps/
│   ├── api/          # Backend API (репозитории, сервисы)
│   └── web/          # Frontend Next.js приложение
├── docs/             # Документация
│   ├── platform/     # Платформенная документация
│   ├── modules/      # Документация модулей
│   └── getting-started/ # Гайды по настройке
├── config/           # Общие конфигурации (feature flags)
├── scripts/          # Служебные скрипты
└── package.json      # Root package.json
```

## Регистрация новых пользователей

Новые пользователи могут зарегистрироваться через форму регистрации:

1. Перейдите на страницу `/register`
2. Заполните форму:
   - Имя (обязательно)
   - Email (обязательно, не может быть `admin.demo@collabverse.test`)
   - Пароль (минимум 6 символов)
   - Должность (опционально)
3. После регистрации пользователь будет создан в базе данных и сможет войти в систему

> **Примечание:** Все новые пользователи создаются со статусом `active` и пустыми ролями. Администратор может управлять правами пользователей через админ-панель.

## Переменные окружения

Основные переменные окружения:

- `NAV_V1` — флаг навигации (off/on)
- `APP_LOCALE` — локаль приложения (по умолчанию `ru`)
- `FEATURE_PROJECTS_V1` — включает CRM «Проекты v1» (0/1)
- `AUTH_DEV` — включает dev-авторизацию (on/off)
- `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` — данные демо-админа
- `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` — данные демо-пользователя
- `FIN_EXPENSES_STORAGE` — драйвер хранения расходов (`memory` или `db`)
- `NEXT_PUBLIC_FEATURE_*` — UI-флаги второго поколения

Подробнее см. [ENV_FILES_EXPLANATION.md](../ENV_FILES_EXPLANATION.md)

## Очистка базы данных

Если необходимо очистить базу данных и оставить только демо-администратора:

```bash
npx tsx scripts/db/cleanup-users-db.ts
```

Этот скрипт:

- Удаляет всех пользователей кроме `admin.demo@collabverse.test`
- Переназначает все организации и проекты на демо-администратора
- Настраивает права администратора

Подробнее см. [DATABASE_CLEANUP_GUIDE.md](../runbooks/DATABASE_CLEANUP_GUIDE.md)

## Проверка установки

### Полная проверка (verify)

Команда `pnpm verify` выполняет все проверки в правильном порядке:

1. `pnpm ensure-env` — проверка переменных окружения
2. `pnpm -w lint` — линтинг
3. `pnpm --filter @collabverse/web typecheck` — проверка типов
4. `pnpm --filter @collabverse/web build` — сборка
5. `pnpm --filter @collabverse/web run check:routes` — проверка маршрутов
6. `pnpm test` — unit тесты
7. `pnpm exec playwright install --with-deps` — установка браузеров
8. `pnpm test:e2e` — E2E тесты
9. `pnpm verify:routes` — дополнительная проверка маршрутов
10. `node scripts/build/run-vercel-build.mjs` — симуляция Vercel сборки

## Следующие шаги

- Прочитайте [полное руководство по настройке](../getting-started/setup.md)
- Настройте Vercel Postgres и Google OAuth по [подробной инструкции](../getting-started/vercel-postgres-setup.md)
- Ознакомьтесь с [обзором платформы](./overview.md)
- Изучите [архитектуру системы](../architecture/system-analysis.md)
- Прочитайте [ROADMAP](../ROADMAP.md) для понимания планов развития

## Возникли проблемы?

Если что-то не работает:

1. Убедитесь, что версии Node.js и pnpm соответствуют требованиям
2. Проверьте, что `.env` файл создан и содержит все необходимые переменные
3. Попробуйте очистить кэш: `rm -rf node_modules .next && pnpm install`
4. Обратитесь к [полному руководству по настройке](../getting-started/setup.md)

---

**Связанные документы:**

- [Обзор платформы](./overview.md)
- [Настройка окружения](../getting-started/setup.md)
- [Локальное тестирование](../getting-started/local-testing.md)
- [Vercel Postgres Setup](../getting-started/vercel-postgres-setup.md)

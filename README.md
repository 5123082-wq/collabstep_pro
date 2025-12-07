# Collabverse

> **Статус:** Начальная стадия разработки  
> **Последнее обновление:** 2025-01-XX

## Требования

- Node.js 20 (см. `.nvmrc`)
- pnpm 9+

## Установка и запуск

1. Установите зависимости: `pnpm install`
2. Подготовьте переменные окружения: `pnpm ensure-env`
   - Скрипт автоматически проверит наличие `AUTH_STORAGE=db` и `POSTGRES_URL`
   - При необходимости будут показаны предупреждения
3. Режим разработки: `pnpm dev` (откройте `http://localhost:3000/`)
   - Для работы с БД убедитесь, что `AUTH_STORAGE=db` и `POSTGRES_URL` установлены
4. Продакшен-сборка: `pnpm build && pnpm start`

> Подробное руководство: [docs/getting-started/setup.md](docs/getting-started/setup.md)

## Тесты

- Юнит-тесты: `pnpm test`
- E2E: `pnpm test:e2e`

## Документация

- **[Карта документации](docs/README.md)** — полный обзор всей документации
- **[Быстрый старт](docs/getting-started/quick-start.md)** — начните работу за 5 минут
- **[Настройка окружения](docs/getting-started/setup.md)** — подробное руководство
- **[Настройка AI (OpenAI)](docs/ai/AI_ADVANCED_FEATURES_README.md)** — подключение продвинутых AI-фич 🤖
- **[Архитектура](docs/architecture/system-analysis.md)** — системный обзор

## Ключевые документы

- **Запуск и проверка**: [QUICK_SETUP_GUIDE](docs/getting-started/QUICK_SETUP_GUIDE.md), [VERIFICATION_CHECKLIST](docs/getting-started/VERIFICATION_CHECKLIST.md), [VERCEL_POSTGRES_SETUP_CHECKLIST](docs/getting-started/VERCEL_POSTGRES_SETUP_CHECKLIST.md)
- **Качество и аудит**: [FIXES_ACTION_PLAN](docs/audit/FIXES_ACTION_PLAN.md), [CODE_AUDIT](docs/audit/CODE_AUDIT.md), [CLEANUP_SUMMARY](docs/audit/CLEANUP_SUMMARY.md)
- **Runbooks**: [DATABASE_CLEANUP_GUIDE](docs/runbooks/DATABASE_CLEANUP_GUIDE.md), [cursor projects/tasks runbook](docs/runbooks/cursor_runbook_projects_tasks_v1.md)
- **AI функциональность**: [AI Quick Start](docs/ai/AI_QUICK_START.md), [AI Advanced Features](docs/ai/AI_ADVANCED_FEATURES_README.md), [Проектное объяснение](docs/ai/ПРОЕКТ_ОБЪЯСНЕНИЕ.md)
- **Финансы**: [Finance System Progress](docs/finance/README_FINANCE.md)
- **Разработка**: [TypeScript errors fix guide](docs/guides/TYPESCRIPT_ERRORS_FIX_GUIDE.md), [Cheat Sheet](docs/getting-started/CHEAT_SHEET.md)
- **Исследования пользователей**: [Users analysis summary](docs/research/users/USERS_ANALYSIS_SUMMARY.md) + полный отчёт в той же директории
- **Справочник**: [Test users IDs](docs/reference/TEST_USERS_IDS.md), [Stage N AI completion](docs/archive/stages/STAGE_N_COMPLETION_REPORT.md)

## Переменные окружения

- `NAV_V1` — флаг навигации (off/on)
- `APP_LOCALE` — локаль приложения (по умолчанию ru)
- `FEATURE_PROJECTS_V1` — включает CRM «Проекты v1» (0/1)
- `AUTH_DEV` — включает dev-авторизацию (on/off)
- `AUTH_STORAGE` — хранилище пользователей (`memory` или `db`). Для работы с БД установите `db`.
- `POSTGRES_URL` — строка подключения к PostgreSQL (Vercel Postgres). Используется для подключения к БД.
- `DATABASE_URL` — альтернативная строка подключения к PostgreSQL (может быть установлена равной `$POSTGRES_URL`).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — ключи для Google OAuth.
- `AUTH_SECRET` — секретный ключ для NextAuth (сгенерировать: `openssl rand -base64 32`).
- `NEXTAUTH_URL` — URL приложения (например, `http://localhost:3000`).
- `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` — реквизиты демо-админа
- `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` — реквизиты демо-пользователя
- `FIN_EXPENSES_STORAGE` — выбирает драйвер хранилища расходов (`memory` или `db`).
- `NEXT_PUBLIC_FEATURE_*` — флаги второго поколения для UI.
- `NEXT_PUBLIC_WS_URL` — URL WebSocket сервера.
- `NEXT_PUBLIC_WS_ENABLED` — явное включение/отключение WebSocket.

Пример `.env`:

```env
NAV_V1=on
APP_LOCALE=ru
FEATURE_PROJECTS_V1=1
AUTH_DEV=on

# Auth & Database

AUTH_STORAGE=db
POSTGRES_URL=postgresql://...
DATABASE_URL=$POSTGRES_URL  # Опционально, для совместимости
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

FIN_EXPENSES_STORAGE=memory
DEMO_ADMIN_EMAIL=admin.demo@collabverse.test
DEMO_ADMIN_PASSWORD=demo-admin
DEMO_USER_EMAIL=user.demo@collabverse.test
DEMO_USER_PASSWORD=demo-user
```

### Database & Migrations

Для работы с базой данных используются следующие команды:

- `pnpm --filter @collabverse/api db:generate` — генерация SQL миграций на основе схемы.
- `pnpm --filter @collabverse/api db:push` — применение миграций к базе данных (локально или Vercel Postgres).

## Авторизация

Проект поддерживает гибридную систему авторизации:

1.  **Google OAuth** — основной способ входа для пользователей (требует настройки `GOOGLE_CLIENT_ID`/`SECRET`).
2.  **Email/Password** — вход по логину и паролю (хранятся в БД).
3.  **Демо-аккаунты** — для разработки и тестирования (работают через `AUTH_DEV=on`).

- Быстрый вход доступен на `/login` кнопками «Войти демо-пользователем» и «Войти демо-админом».
- Кнопка "Войти через Google" инициирует OAuth flow.
- Защищённые маршруты `/app/*` и `/admin/*` требуют авторизации (NextAuth сессия или демо-сессия).
- Раздел `/admin` доступен только пользователям с ролью `admin`.

## Этапы разработки

Проект находится на начальной стадии.

**Текущий статус:**

- ✅ Базовый каркас и инфраструктура
- ✅ Система аутентификации (dev-режим)
- ✅ Маркетинговый слой и навигация
- 🚧 CRM функционал в разработке

## 🚀 Развертывание на Vercel

### Быстрый старт

1. **Подключите репозиторий к Vercel:**
   - Зайдите на [vercel.com](https://vercel.com)
   - Нажмите "Add New Project"
   - Импортируйте репозиторий `5123082-wq/collabstep_pro`
   - Vercel автоматически определит Next.js проект

2. **Настройте проект:**
   - **Root Directory:** `apps/web` (важно для monorepo!)
   - **Framework Preset:** Next.js
   - **Build Command:** `pnpm vercel-build` (или оставьте по умолчанию)
   - **Install Command:** `pnpm install`
   - **Output Directory:** `.next` (по умолчанию)

3. **Установите переменные окружения:**

   **Обязательные:**

```text
   NAV_V1=on
   APP_LOCALE=ru
   AUTH_DEV=on
   FIN_EXPENSES_STORAGE=memory
   AUTH_SECRET=<generate with: openssl rand -base64 32>
```

**Демо-аккаунты:**

```text
   DEMO_ADMIN_EMAIL=admin.demo@collabverse.test
   DEMO_ADMIN_PASSWORD=demo-admin
   DEMO_USER_EMAIL=user.demo@collabverse.test
   DEMO_USER_PASSWORD=demo-user
```

**Для production/staging:**

```text
   FIN_EXPENSES_STORAGE=db
```

**Опциональные (WebSocket):**

```text
   NEXT_PUBLIC_WS_URL=wss://your-websocket-server.com
   NEXT_PUBLIC_WS_ENABLED=true
```

4. **Настройки Node.js и pnpm:**
   - Node.js Version: `20.x`
   - Package Manager: `pnpm` (Vercel автоматически определит из `packageManager` в `package.json`)

5. **Разверните:**
   - Нажмите "Deploy"
   - Vercel автоматически соберет и развернет проект

### Важные моменты

- ✅ Проект уже настроен для Vercel (есть `vercel.json`)
- ✅ Это monorepo, поэтому важно указать `Root Directory: apps/web`
- ✅ Для preview окружений используйте `FIN_EXPENSES_STORAGE=memory`
- ✅ Для production используйте `FIN_EXPENSES_STORAGE=db` (если настроена БД)

### Проверка развертывания

После развертывания проверьте:

- Главная страница загружается
- Авторизация работает (`/login`)
- Демо-аккаунты работают
- API routes отвечают

Подробнее в [docs/getting-started/setup.md](docs/getting-started/setup.md)

## 🔄 Работа с Git и Pull Requests

### Создание новой ветки для изменений

```bash

# Обновите main ветку

git checkout main
git pull origin main

# Создайте новую ветку для вашей работы

git checkout -b feature/название-функции

# или

git checkout -b fix/описание-бага

# или

git checkout -b docs/обновление-документации
```

### Коммит и отправка изменений

```bash

# Добавьте изменения

git add .

# Сделайте коммит с понятным сообщением

git commit -m "feat: добавить новую функцию X"

# или

git commit -m "fix: исправить баг с Y"

# или

git commit -m "docs: обновить README"

# Отправьте ветку на GitHub

git push -u origin feature/название-функции
```

### Создание Pull Request

1. Откройте репозиторий на GitHub: https://github.com/5123082-wq/collabstep_pro
2. Появится баннер "Compare & pull request" — нажмите на него
3. Заполните:
   - **Заголовок PR** — краткое описание изменений
   - **Описание** — детальное описание того, что было изменено и зачем
   - Укажите ревьюеров (если нужно)
4. Нажмите "Create pull request"

### После одобрения PR

```bash

# Вернитесь на main

git checkout main

# Обновите main с GitHub

git pull origin main

# Удалите локальную ветку (опционально)

git branch -d feature/название-функции
```

### Конвенция коммитов

Используйте префиксы для коммитов:

- `feat:` — новая функция
- `fix:` — исправление бага
- `docs:` — изменения в документации
- `style:` — форматирование кода
- `refactor:` — рефакторинг
- `test:` — добавление тестов
- `chore:` — обновление зависимостей и т.д.

# Настройка окружения Collabverse

> **Последнее обновление:** 2025-11-10

## Требования

- Node.js 20 (см. `.nvmrc`)
- pnpm 9+

## Шаги запуска

1. Установите зависимости: `pnpm install`
2. Синхронизируйте переменные окружения: `pnpm ensure-env`
3. Запустите режим разработки: `pnpm dev` и откройте `http://localhost:3000/`
4. Для продакшен-сборки выполните `pnpm build && pnpm start`

## Проверка установки

- Юнит-тесты: `pnpm test`
- E2E: `pnpm test:e2e`
- Полный прогон: `pnpm verify` (собирает снапшот фич-флагов, запускает линт, typecheck, build, тесты и симуляцию Vercel)

## Переменные окружения

- `NAV_V1` — флаг навигации (off/on)
- `APP_LOCALE` — локаль приложения (по умолчанию `ru`)
- `FEATURE_PROJECTS_V1` — включает CRM «Проекты v1» (0/1)
- `AUTH_DEV` — включает dev-авторизацию (on/off)
- `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` — данные демо-админа
- `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` — данные демо-пользователя
- `FIN_EXPENSES_STORAGE` — драйвер хранения расходов (`memory` или `db`); для dev оставьте `memory`, для staging/prod укажите `db`
- `NEXT_PUBLIC_FEATURE_*` — UI-флаги второго поколения; по умолчанию включены `NEXT_PUBLIC_FEATURE_FINANCE_GLOBAL=1`, `NEXT_PUBLIC_FEATURE_PROJECTS_OVERVIEW=1`, `NEXT_PUBLIC_FEATURE_CREATE_WIZARD=1`
- (опционально) `SKIP_VERCEL_BUILD=1` — пропускает локальную симуляцию `vercel build`

> Совет: для Vercel установите `NAV_V1=on`, `APP_LOCALE=ru`, `AUTH_DEV=on`, значения демо-аккаунтов и `FIN_EXPENSES_STORAGE` по окружению (`memory` для preview, `db` для staging/production).

## Пример `.env`

```env
NAV_V1=on
APP_LOCALE=ru
FEATURE_PROJECTS_V1=1
AUTH_DEV=on
FIN_EXPENSES_STORAGE=memory
DEMO_ADMIN_EMAIL=admin.demo@collabverse.test
DEMO_ADMIN_PASSWORD=demo-admin
DEMO_USER_EMAIL=user.demo@collabverse.test
DEMO_USER_PASSWORD=demo-user
```

## Finance Storage

Флаг `FIN_EXPENSES_STORAGE` переключает in-memory и DB-хранилище расходов. Dev окружение использует `memory`, staging/prod (включая Vercel с `VERCEL_ENV=staging|production`) — `db`. Если драйвер `db` недоступен, приложение логирует `console.warn` и возвращается к `memory`.

## Быстрая проверка доступа

- `/login` содержит кнопки входа демо-пользователем и демо-админом (данные из `DEMO_*`)
- Защищённые маршруты `/app/*` и `/project/*` требуют cookie `cv_session`
- Раздел `/app/admin` доступен только администратору

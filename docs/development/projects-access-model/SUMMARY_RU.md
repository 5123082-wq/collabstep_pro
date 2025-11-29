## 1. Обзор

В этом документе описаны результаты реализации новой модели доступа (Организации, Исполнители, Проекты) и инструкции по проверке функционала.

[Открыть подробную инструкцию по проверке (VERIFICATION_GUIDE.md)](./VERIFICATION_GUIDE.md)

## 2. Статус реализации

Все запланированные этапы бэкенд-разработки завершены:
- [x] Анализ требований
- [x] Схема базы данных (Drizzle Schema & Migrations)
- [x] Логика и Репозитории
- [x] API Endpoints
- [x] План интеграции

## 3. Где искать код

- **Схема БД**: `apps/api/src/db/schema.ts`
- **Репозитории**: `apps/api/src/repositories/`
  - `organizations-repository.ts`
  - `performer-profiles-repository.ts`
  - `invitations-repository.ts`
  - `db-projects-repository.ts`
- **API**: `apps/web/app/api/` (папки `organizations`, `performers`, `projects`)

## 4. Как запустить

1. Убедитесь, что база данных запущена.
2. Примените миграции (если еще не сделано):
   ```bash
   cd apps/api
   pnpm db:push
```text
3. Запустите веб-приложение:
   ```bash
   cd apps/web
   pnpm dev
```text
4. Используйте [VERIFICATION_GUIDE.md](./VERIFICATION_GUIDE.md) для тестирования API.


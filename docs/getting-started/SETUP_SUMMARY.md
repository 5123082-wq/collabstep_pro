# Итоговая сводка: что нужно для работы с Vercel Postgres

## ✅ Что уже сделано

1. ✅ База данных очищена (только `admin.demo@collabverse.test`)
2. ✅ Память очищена (только администратор)
3. ✅ Логика входа обновлена (блокирует удаленных пользователей)
4. ✅ Форма регистрации работает корректно
5. ✅ API маршруты проверены
6. ✅ `POSTGRES_URL` уже настроен в `.env.local`

## 🔧 Что нужно сделать сейчас

### 1. Установить AUTH_STORAGE=db

Добавьте в `apps/web/.env.local`:

```env
AUTH_STORAGE=db
```

Это переключит систему с памяти на базу данных.

### 2. Применить миграции базы данных

У вас уже есть `POSTGRES_URL`, теперь нужно применить миграции:

```bash
cd apps/api
pnpm db:push
```

Или через SQL редактор Vercel (если используете Neon/Vercel Postgres):
1. Откройте базу данных
2. Перейдите в **Query**
3. Выполните SQL из файлов по порядку:
   - `apps/api/src/db/migrations/0000_lying_mauler.sql`
   - `apps/api/src/db/migrations/0001_chemical_lake.sql`
   - `apps/api/src/db/migrations/0002_spicy_domino.sql`

### 3. Инициализировать администратора

После применения миграций запустите:

```bash
npx tsx scripts/cleanup-users-db.ts
```

Это создаст `admin.demo@collabverse.test` в базе данных с правильными правами.

### 4. Настроить переменные на Vercel (для production)

В настройках проекта на Vercel добавьте:

```env

# Обязательно

DATABASE_URL=$POSTGRES_URL
AUTH_STORAGE=db
AUTH_SECRET=<сгенерируйте: openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.vercel.app

# Демо-администратор

DEMO_ADMIN_EMAIL=admin.demo@collabverse.test
DEMO_ADMIN_PASSWORD=admin.demo
```

> ⚠️ **Важно:** Не добавляйте `DEMO_USER_EMAIL` и `DEMO_USER_PASSWORD` - эти пользователи удалены.

## 📋 Полный список переменных окружения

### Обязательные для работы с БД

```env

# Database

POSTGRES_URL=<ваш URL из Vercel/Neon>
DATABASE_URL=$POSTGRES_URL

# Auth Storage (критически важно!)

AUTH_STORAGE=db

# NextAuth

AUTH_SECRET=<сгенерируйте: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000  # или https://your-domain.vercel.app
```

### Рекомендуемые

```env

# Базовые настройки

NAV_V1=on
APP_LOCALE=ru
FEATURE_PROJECTS_V1=1
AUTH_DEV=on

# Finance Storage

FIN_EXPENSES_STORAGE=db

# Демо-администратор

DEMO_ADMIN_EMAIL=admin.demo@collabverse.test
DEMO_ADMIN_PASSWORD=admin.demo
```

### Опциональные (Google OAuth)

```env
GOOGLE_CLIENT_ID=<ваш Client ID>
GOOGLE_CLIENT_SECRET=<ваш Client Secret>
```

## 🚀 Быстрый старт

1. **Добавьте `AUTH_STORAGE=db` в `.env.local`**
2. **Примените миграции:** `cd apps/api && pnpm db:push`
3. **Инициализируйте администратора:** `npx tsx scripts/cleanup-users-db.ts`
4. **Перезапустите сервер:** `pnpm dev`
5. **Проверьте вход:** `admin.demo@collabverse.test` / `admin.demo`

## 📚 Документация

- **[QUICK_SETUP_GUIDE.md](./QUICK_SETUP_GUIDE.md)** - Быстрое руководство (5 минут)
- **[VERCEL_POSTGRES_SETUP_CHECKLIST.md](./VERCEL_POSTGRES_SETUP_CHECKLIST.md)** - Полный чеклист
- **[DATABASE_CLEANUP_GUIDE.md](./DATABASE_CLEANUP_GUIDE.md)** - Руководство по очистке БД
- **[docs/getting-started/vercel-postgres-setup.md](./docs/getting-started/vercel-postgres-setup.md)** - Подробная инструкция

## ⚠️ Критически важно

1. **AUTH_STORAGE=db** - без этого система будет использовать память вместо БД
2. **Миграции** - нужно применить один раз перед первым использованием
3. **Администратор** - должен быть создан в БД через скрипт `cleanup-users-db.ts`

## 🔍 Проверка работы

После настройки проверьте:

```sql
-- Проверка таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Проверка администратора
SELECT id, name, email, "passwordHash" IS NOT NULL as has_password
FROM "user" WHERE email = 'admin.demo@collabverse.test';

-- Проверка прав
SELECT roles FROM "userControl" 
WHERE "userId" = '00000000-0000-0000-0000-000000000001';
```

## ✅ Готово

После выполнения всех шагов система будет работать с Vercel Postgres, и все данные будут сохраняться в базе данных.


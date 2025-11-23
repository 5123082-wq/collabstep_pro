# Настройка Vercel Postgres

Это руководство описывает процесс настройки Vercel Postgres для работы с NextAuth.js и базой данных пользователей.

## Предварительные требования

- Проект развернут на Vercel
- Доступ к панели управления Vercel
- Google OAuth credentials (Client ID и Secret)

## Шаг 1: Создание базы данных Vercel Postgres

1. Откройте ваш проект на [vercel.com](https://vercel.com)
2. Перейдите в раздел **Storage**
3. Нажмите **Create Database**
4. Выберите **Postgres**
5. Выберите регион (рекомендуется тот же, что и для деплоя)
6. Нажмите **Create**

Vercel автоматически создаст следующие переменные окружения:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Шаг 2: Настройка переменных окружения

В настройках проекта на Vercel добавьте следующие переменные:

### Обязательные переменные

```env
# Database (автоматически добавляется при создании Postgres)
DATABASE_URL=$POSTGRES_URL

# Auth Storage
AUTH_STORAGE=db

# NextAuth
AUTH_SECRET=<сгенерируйте: openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.vercel.app

# Google OAuth
GOOGLE_CLIENT_ID=<ваш Google Client ID>
GOOGLE_CLIENT_SECRET=<ваш Google Client Secret>
```

### Рекомендуемые переменные

```env
# Базовые настройки
NAV_V1=on
APP_LOCALE=ru
FEATURE_PROJECTS_V1=1
AUTH_DEV=on

# Finance Storage
FIN_EXPENSES_STORAGE=db

# Демо-аккаунты (опционально)
DEMO_ADMIN_EMAIL=admin.demo@collabverse.test
DEMO_ADMIN_PASSWORD=demo-admin
DEMO_USER_EMAIL=user.demo@collabverse.test
DEMO_USER_PASSWORD=demo-user
```

> [!IMPORTANT]
> Убедитесь, что переменные применены ко всем окружениям (Production, Preview, Development) или выборочно, в зависимости от ваших требований.

## Шаг 3: Получение Google OAuth Credentials

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Настройте **OAuth consent screen**: выберите тип (External/Internal), заполните название приложения и email поддержки, добавьте тестовых пользователей, если не публикуете сразу
4. Перейдите в **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
5. Выберите тип приложения: **Web application**
6. Настройте **Authorized redirect URIs**:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google (для локальной разработки)
   ```
7. При появлении поля **Authorized JavaScript origins** укажите:
   ```
   https://your-domain.vercel.app
   http://localhost:3000
   ```
8. Скопируйте **Client ID** и **Client Secret**
9. Добавьте их в переменные окружения Vercel

## Шаг 4: Применение миграций

После настройки переменных окружения необходимо применить миграции к базе данных.

### Вариант A: Через Vercel CLI (рекомендуется)

```bash
# Установите Vercel CLI (если еще не установлен)
npm i -g vercel

# Войдите в Vercel
vercel login

# Подключитесь к проекту
vercel link

# Получите переменные окружения
vercel env pull .env.local

# Примените миграции
pnpm --filter @collabverse/api db:push
```

### Вариант B: Через локальное подключение

1. Скопируйте `POSTGRES_URL` из настроек Vercel
2. Создайте локальный `.env.local`:
   ```env
   DATABASE_URL=<ваш POSTGRES_URL>
   ```
3. Выполните команду:
   ```bash
   pnpm --filter @collabverse/api db:push
   ```

### Вариант C: Через SQL редактор Vercel

1. Откройте вашу базу данных в Vercel
2. Перейдите в раздел **Query**
3. Выполните SQL из файла миграции:
   ```bash
   cat apps/api/src/db/migrations/0000_*.sql
   ```
4. Скопируйте и выполните SQL в редакторе

## Шаг 5: Проверка настройки

### 5.1 Проверка таблиц

В SQL редакторе Vercel выполните:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Вы должны увидеть таблицы:
- `user`
- `account`
- `session`
- `verificationToken`
- `userControl`

### 5.2 Тестирование авторизации

1. Откройте ваше приложение на Vercel
2. Перейдите на `/login`
3. Попробуйте войти через Google
4. Проверьте, что сессия создается корректно

### 5.3 Проверка данных в БД

После успешного входа проверьте данные:

```sql
-- Проверка пользователей
SELECT id, name, email, "emailVerified", image 
FROM "user" 
LIMIT 10;

-- Проверка аккаунтов OAuth
SELECT "userId", provider, "providerAccountId" 
FROM account 
LIMIT 10;

-- Проверка сессий
SELECT "sessionToken", "userId", expires 
FROM session 
WHERE expires > NOW() 
LIMIT 10;
```

## Шаг 6: Настройка для разных окружений

### Production

```env
AUTH_STORAGE=db
FIN_EXPENSES_STORAGE=db
AUTH_DEV=off  # Отключите демо-аккаунты в продакшене
```

### Preview

```env
AUTH_STORAGE=db
FIN_EXPENSES_STORAGE=memory  # Или db, в зависимости от требований
AUTH_DEV=on  # Включите для тестирования
```

### Development (локально)

```env
AUTH_STORAGE=memory  # Или db с локальным Postgres
FIN_EXPENSES_STORAGE=memory
AUTH_DEV=on
```

## Устранение неполадок

### Ошибка подключения к БД

**Проблема:** `ECONNREFUSED` или `connection timeout`

**Решение:**
1. Проверьте, что `DATABASE_URL` установлен корректно
2. Убедитесь, что используете `POSTGRES_URL` (с пулингом), а не `POSTGRES_URL_NON_POOLING`
3. Проверьте, что база данных активна в панели Vercel

### Таблицы не созданы

**Проблема:** Ошибки типа `relation "user" does not exist`

**Решение:**
1. Убедитесь, что миграции применены (см. Шаг 4)
2. Проверьте логи деплоя на наличие ошибок
3. Вручную выполните SQL из файла миграции

### Google OAuth не работает

**Проблема:** Ошибка при редиректе после входа через Google

**Решение:**
1. Проверьте, что `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` установлены
2. Убедитесь, что redirect URI в Google Console совпадает с вашим доменом
3. Проверьте, что `NEXTAUTH_URL` установлен корректно
4. Убедитесь, что `AUTH_SECRET` сгенерирован и установлен

### Сессия не сохраняется

**Проблема:** После входа пользователь сразу выходит

**Решение:**
1. Проверьте, что таблица `session` создана
2. Убедитесь, что `AUTH_STORAGE=db`
3. Проверьте логи на наличие ошибок записи в БД
4. Убедитесь, что `AUTH_SECRET` одинаковый для всех инстансов

## Мониторинг и обслуживание

### Просмотр активных сессий

```sql
SELECT 
  s."sessionToken",
  u.email,
  s.expires,
  CASE 
    WHEN s.expires > NOW() THEN 'active'
    ELSE 'expired'
  END as status
FROM session s
JOIN "user" u ON s."userId" = u.id
ORDER BY s.expires DESC
LIMIT 20;
```

### Очистка истекших сессий

```sql
DELETE FROM session 
WHERE expires < NOW();
```

### Статистика пользователей

```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN "emailVerified" IS NOT NULL THEN 1 END) as verified_users,
  COUNT(CASE WHEN "passwordHash" IS NOT NULL THEN 1 END) as password_users
FROM "user";
```

## Следующие шаги

После успешной настройки Vercel Postgres:

1. ✅ Протестируйте все сценарии авторизации
2. ✅ Настройте мониторинг и алерты
3. ✅ Создайте резервные копии базы данных
4. ✅ Обновите документацию команды
5. ✅ Проведите финальное тестирование перед продакшеном

## Дополнительные ресурсы

- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)

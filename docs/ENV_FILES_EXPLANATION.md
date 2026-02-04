# 📁 Структура .env файлов

## Упрощённая структура (текущая)

В проекте используется **один главный файл** для всех переменных окружения:

### `apps/web/.env.local` ⭐ **ЕДИНСТВЕННЫЙ ФАЙЛ ДЛЯ СЕКРЕТОВ**

- **Назначение**: Все переменные для локальной разработки
- **Содержит**: API ключи, DATABASE_URL, AUTH_SECRET, feature flags
- **Git**: ✅ В `.gitignore` (никогда не коммитится)
- **Автозагрузка**: Next.js загружает его автоматически

### `.env.example` (корень проекта)

- **Назначение**: Шаблон для других разработчиков
- **Содержит**: Примеры переменных БЕЗ реальных значений
- **Git**: ✅ Коммитится в репозиторий (безопасно)
- **Использование**: Копируется в `apps/web/.env.local` при первом запуске

## Структура проекта

```text
collabstep-new-3/
├── .env.example            # Шаблон (безопасно коммитить)
└── apps/
    └── web/
        └── .env.local      # ⭐ ВСЕ переменные здесь
```

## Первоначальная настройка

```bash
# 1. Скопируйте шаблон
cp .env.example apps/web/.env.local

# 2. Отредактируйте файл и добавьте реальные значения
nano apps/web/.env.local

# Или используйте скрипт
pnpm ensure-env
```

## Порядок загрузки в Next.js

Next.js автоматически загружает переменные в следующем порядке (от низкого к высокому приоритету):

```text
1. .env                    (базовые значения)
2. .env.local              (локальные переопределения) ⭐
3. .env.development        (только в dev режиме)
4. .env.production         (только в production)
5. .env.development.local  (локальные dev переопределения)
6. .env.production.local   (локальные prod переопределения)
```

**В нашем проекте используется только `apps/web/.env.local`** — это упрощает структуру и избегает путаницы.

## Переменные с префиксом `NEXT_PUBLIC_`

```bash
# ❌ НЕБЕЗОПАСНО - доступно в браузере
NEXT_PUBLIC_API_KEY=secret123  # Любой может увидеть в DevTools!

# ✅ БЕЗОПАСНО - только на сервере
OPENAI_API_KEY=sk-proj-...      # Недоступно в браузере
DATABASE_URL=postgres://...     # Недоступно в браузере
```

**Важно**: Переменные с `NEXT_PUBLIC_` встраиваются в JavaScript бандл и доступны всем!

## Правила безопасности

### ✅ БЕЗОПАСНО (можно коммитить)

- `.env.example` — только примеры с placeholder значениями
- Документация с примерами

### ❌ НЕБЕЗОПАСНО (никогда не коммитить)

- `apps/web/.env.local` — содержит реальные секреты
- Любые файлы с реальными API ключами

## Vercel

На Vercel переменные настраиваются через Dashboard:
- **Settings** → **Environment Variables**
- Все переменные из `apps/web/.env.local` должны быть добавлены в Vercel
- Vercel автоматически делает их доступными при деплое

## Категории переменных

### 🗄️ Database

```bash
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...?pgbouncer=true
# NOTE: AI_AGENTS_DATABASE_URL removed (2026-02-04) - all data now uses main DATABASE_URL
```

### 🔐 Authentication

```bash
AUTH_SECRET=...
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 🤖 AI

```bash
OPENAI_API_KEY=sk-proj-...
AI_ASSISTANT_API_KEY=sk-proj-...
```

### 🚀 Feature Flags

```bash
NEXT_PUBLIC_FEATURE_AI_ASSISTANT=true
NEXT_PUBLIC_FEATURE_PM_DASHBOARD=1
```

### ⏰ Cron

```bash
CRON_SECRET=your-cron-secret
```

Используется для защиты cron endpoints (Authorization: Bearer ...).

## Рекомендации

1. **Все секреты** → `apps/web/.env.local`
2. **Шаблон для команды** → `.env.example`
3. **Никогда не коммитьте** `apps/web/.env.local`
4. **Синхронизируйте** локальные переменные с Vercel Dashboard

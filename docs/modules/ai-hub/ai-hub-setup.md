# AI-хаб — Настройка

**Статус:** stable  
**Владелец:** engineering  
**Создан:** 2026-01-07  
**Последнее обновление:** 2026-01-07

## Введение

Детальная настройка AI Hub включает настройку ключей для разных провайдеров, переменные окружения и конфигурацию модуля.

## Провайдеры AI

### OpenAI (основной)

**Модели:**
- `gpt-3.5-turbo` — быстрая и дешевая модель (рекомендуется для разработки)
- `gpt-4` — более мощная модель (рекомендуется для production)
- `gpt-4-turbo` — улучшенная версия GPT-4

**Получение ключа:**
1. Перейдите на https://platform.openai.com/api-keys
2. Создайте новый secret key
3. Скопируйте ключ (начинается с `sk-proj-` или `sk-`)

**Настройка биллинга:**
1. Перейдите на https://platform.openai.com/account/billing/overview
2. Добавьте способ оплаты
3. Установите лимит ($5-10 для начала)

### Yandex GPT (опционально)

**Модели:**
- `yandexgpt/latest` — последняя версия Yandex GPT

**Получение ключа:**
1. Создайте аккаунт в Yandex Cloud
2. Создайте сервисный аккаунт
3. Получите API ключ и Folder ID

**Настройка:**
- `YANDEX_API_KEY` — API ключ Yandex Cloud
- `YANDEX_FOLDER_ID` — ID папки в Yandex Cloud
- `YANDEX_MODEL_URI` — URI модели (обычно `yandexgpt/latest`)

## Переменные окружения

### Обязательные переменные

```bash
# OpenAI API ключ
OPENAI_API_KEY=sk-proj-ваш-ключ-здесь

# Feature flags
NEXT_PUBLIC_FEATURE_AI_V1=true
FEATURE_AI_V1=true
```

### Опциональные переменные

```bash
# Модель OpenAI
OPENAI_MODEL=gpt-3.5-turbo  # или gpt-4, gpt-4-turbo

# Параметры генерации
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# Провайдер по умолчанию
AI_DEFAULT_PROVIDER=openai

# Yandex Cloud (опционально)
YANDEX_API_KEY=AQVN...
YANDEX_FOLDER_ID=b1g...
YANDEX_MODEL_URI=yandexgpt/latest

# Rate Limiting
AI_RATE_LIMIT_PER_USER_HOUR=20
AI_RATE_LIMIT_PER_ENDPOINT_HOUR=10
AI_RATE_LIMIT_GLOBAL_HOUR=100
AI_RATE_LIMIT_MIN_INTERVAL=3000
```

## Конфигурация

### Файл .env.local

Создайте файл `apps/web/.env.local`:

```bash
cd apps/web
cat > .env.local << 'EOF'
OPENAI_API_KEY=sk-proj-ваш-ключ-здесь
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
NEXT_PUBLIC_FEATURE_AI_V1=true
FEATURE_AI_V1=true
AI_DEFAULT_PROVIDER=openai
EOF
```

### Безопасность

- ✅ Ключи хранятся только на сервере в `.env.local`
- ✅ Ключи НЕ отправляются с клиента
- ✅ Ключи НЕ доступны в браузере
- ✅ Файл `.env.local` в `.gitignore` (не коммитится)

**Важно:**
- Никогда не коммитьте `.env.local` в git
- Не делитесь содержимым `.env.local` публично
- Используйте разные ключи для dev/staging/production

## Инициализация AI агентов

AI агенты создаются автоматически при первом использовании через `AIAgentsRepository.ensureInitialized()`.

**Предустановленный агент:**
- Email: `ai.assistant@collabverse.ai`
- Тип: `assistant`
- Область: `public`

### Сброс AI агентов

```bash
pnpm reset:ai-agents
```

## Настройка для разных окружений

### Development

```bash
OPENAI_API_KEY=sk-proj-dev-key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
NEXT_PUBLIC_FEATURE_AI_V1=true
FEATURE_AI_V1=true
```

### Staging

```bash
OPENAI_API_KEY=sk-proj-staging-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.5
NEXT_PUBLIC_FEATURE_AI_V1=true
FEATURE_AI_V1=true
```

### Production

```bash
OPENAI_API_KEY=sk-proj-prod-key
OPENAI_MODEL=gpt-4-turbo
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.5
AI_DEFAULT_PROVIDER=openai
NEXT_PUBLIC_FEATURE_AI_V1=true
FEATURE_AI_V1=true
AI_RATE_LIMIT_PER_USER_HOUR=20
AI_RATE_LIMIT_PER_ENDPOINT_HOUR=10
AI_RATE_LIMIT_GLOBAL_HOUR=100
```

## Тестирование

Для тестирования без реальных ключей используйте:
- `TEST_KEY` для OpenAI
- `YANDEX_TEST_KEY` для Yandex

Эти значения вернут мок-данные.

## Troubleshooting

### Ключ не работает

1. Проверьте, что ключ правильный (начинается с `sk-proj-` или `sk-`)
2. Проверьте, что биллинг настроен в OpenAI
3. Проверьте, что ключ не истек

### Медленные ответы

1. Используйте `gpt-3.5-turbo` вместо `gpt-4`
2. Уменьшите `OPENAI_MAX_TOKENS`
3. Проверьте скорость интернет-соединения

### Ошибки rate limiting

1. Увеличьте `AI_RATE_LIMIT_PER_USER_HOUR`
2. Увеличьте `AI_RATE_LIMIT_GLOBAL_HOUR`
3. Проверьте лимиты в OpenAI Dashboard

## Связанные документы

- [AI Hub Module](./ai-hub-overview.md) — обзор модуля
- [Quick Start](./ai-hub-quick-start.md) — быстрый старт
- [Integration](./ai-hub-integration.md) — архитектура и API

---

**Последнее обновление:** 2026-01-07
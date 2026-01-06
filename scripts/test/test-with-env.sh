#!/bin/bash
# Скрипт для запуска тестов с переменными окружения из .env.local

set -e

# Загружаем переменные из .env.local если они не установлены
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  if [ -f "apps/web/.env.local" ]; then
    echo "📝 Загрузка переменных из apps/web/.env.local..."
    # Используем более надежный способ загрузки переменных
    export $(grep -v '^#' apps/web/.env.local | grep -E "(DATABASE_URL|POSTGRES_URL)" | xargs)
  fi
fi

# Проверяем наличие переменных окружения после загрузки
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Переменные DATABASE_URL или POSTGRES_URL не найдены"
  echo "💡 Убедитесь, что apps/web/.env.local содержит DATABASE_URL или POSTGRES_URL"
  echo "💡 Или используйте: pnpm test:local (требует Docker)"
  exit 1
fi

# Используем DATABASE_URL если установлен, иначе POSTGRES_URL
if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_URL" ]; then
  export DATABASE_URL="$POSTGRES_URL"
fi

if [ -z "$POSTGRES_URL" ] && [ -n "$DATABASE_URL" ]; then
  export POSTGRES_URL="$DATABASE_URL"
fi

echo "🔧 Применение схемы БД..."
echo "   DATABASE_URL: ${DATABASE_URL:0:50}..."
pnpm --filter @collabverse/api db:push

echo "🧪 Запуск тестов..."
pnpm -w test


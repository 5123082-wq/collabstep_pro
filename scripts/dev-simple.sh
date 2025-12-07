#!/bin/bash

# Скрипт для запуска development без WebSocket
# Использовать когда не нужны real-time функции

echo "🚀 Starting development server (без WebSocket)..."
echo "⚡️ Оптимизированный режим для снижения нагрузки"
echo ""

# Проверка переменных окружения
cd "$(dirname "$0")/.."

# Загружаем переменные из .env если файл существует
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Проверяем AUTH_STORAGE и POSTGRES_URL
if [ "$AUTH_STORAGE" = "db" ]; then
  if [ -z "$POSTGRES_URL" ] && [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: AUTH_STORAGE=db but POSTGRES_URL or DATABASE_URL is not set!"
    echo "   The application will not be able to use database storage."
    echo "   Please set POSTGRES_URL in your .env file."
    echo ""
  else
    echo "✅ AUTH_STORAGE=db and database connection configured"
  fi
elif [ -n "$POSTGRES_URL" ] || [ -n "$DATABASE_URL" ]; then
  echo "💡 INFO: Database connection is available but AUTH_STORAGE is not set to 'db'."
  echo "   For database authentication, set AUTH_STORAGE=db in your .env file."
  echo ""
fi

# Убедимся что WebSocket отключен
export NEXT_PUBLIC_WS_ENABLED=false

# Запускаем только web
pnpm --filter @collabverse/web dev

echo ""
echo "✅ Server stopped"


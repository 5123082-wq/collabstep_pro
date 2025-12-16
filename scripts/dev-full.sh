#!/bin/bash

# Скрипт для запуска development с WebSocket
# Использовать когда нужны real-time функции

echo "🚀 Starting full development environment..."
echo "⚡️ Web + WebSocket Server"
echo ""

cd "$(dirname "$0")/.."

# Загружаем переменные из apps/web/.env.local если файл существует
if [ -f apps/web/.env.local ]; then
  export $(grep -v '^#' apps/web/.env.local | xargs)
fi

# Проверяем AUTH_STORAGE и POSTGRES_URL
if [ "$AUTH_STORAGE" = "db" ]; then
  if [ -z "$POSTGRES_URL" ] && [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: AUTH_STORAGE=db but POSTGRES_URL or DATABASE_URL is not set!"
    echo "   The application will not be able to use database storage."
    echo "   Please set POSTGRES_URL in apps/web/.env.local file."
    echo ""
  else
    echo "✅ AUTH_STORAGE=db and database connection configured"
  fi
elif [ -n "$POSTGRES_URL" ] || [ -n "$DATABASE_URL" ]; then
  echo "💡 INFO: Database connection is available but AUTH_STORAGE is not set to 'db'."
  echo "   For database authentication, set AUTH_STORAGE=db in apps/web/.env.local file."
  echo ""
fi

# Включаем WebSocket
export NEXT_PUBLIC_WS_ENABLED=true
export WS_METRICS=false

# Функция для cleanup
cleanup() {
  echo ""
  echo "🛑 Stopping servers..."
  jobs -p | xargs kill 2>/dev/null
  exit 0
}

# Trap SIGINT и SIGTERM
trap cleanup SIGINT SIGTERM

# Запускаем WebSocket сервер в фоне
echo "📡 Starting WebSocket server on port 8080..."
pnpm --filter @collabverse/api dev:ws &
WS_PID=$!

# Ждем немного чтобы WS сервер запустился
sleep 2

# Запускаем web
echo "🌐 Starting web server on port 3000..."
pnpm --filter @collabverse/web dev &
WEB_PID=$!

echo ""
echo "✅ Both servers are running:"
echo "   - Web: http://localhost:3000"
echo "   - WebSocket: ws://localhost:8080"
echo ""
echo "Press Ctrl+C to stop all servers"

# Ждем завершения
wait $WEB_PID $WS_PID


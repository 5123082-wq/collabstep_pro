#!/bin/bash

# Скрипт для запуска development с WebSocket
# Использовать когда нужны real-time функции

echo "🚀 Starting full development environment..."
echo "⚡️ Web + WebSocket Server"
echo ""

# Включаем WebSocket
export NEXT_PUBLIC_WS_ENABLED=true
export WS_METRICS=false

cd "$(dirname "$0")/.."

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


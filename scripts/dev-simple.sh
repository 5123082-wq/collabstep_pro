#!/bin/bash

# Скрипт для запуска development без WebSocket
# Использовать когда не нужны real-time функции

echo "🚀 Starting development server (без WebSocket)..."
echo "⚡️ Оптимизированный режим для снижения нагрузки"
echo ""

# Убедимся что WebSocket отключен
export NEXT_PUBLIC_WS_ENABLED=false

# Запускаем только web
cd "$(dirname "$0")/.."
pnpm --filter @collabverse/web dev

echo ""
echo "✅ Server stopped"


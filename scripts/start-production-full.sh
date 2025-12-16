#!/bin/bash

# Скрипт для запуска продакшн сервера со всеми функциями для полного тестирования
# Использовать для полного тестирования всех возможностей платформы

echo "🚀 Starting full production environment with all features enabled..."
echo "⚡️ Production Web + WebSocket Server"
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

# Устанавливаем переменные окружения для полного тестирования
export NODE_ENV=production

# Включаем WebSocket
export NEXT_PUBLIC_WS_ENABLED=true
export WS_METRICS=false
export NEXT_PUBLIC_WS_ORIGIN=http://localhost:3000

# Включаем все feature flags для полного тестирования
export NAV_V1=on
export AUTH_DEV=on
export FEATURE_PROJECTS_V1=1
export NEXT_PUBLIC_FEATURE_FINANCE_GLOBAL=1
export NEXT_PUBLIC_FEATURE_PROJECTS_OVERVIEW=1
export NEXT_PUBLIC_FEATURE_PROJECTS_V1=1
export NEXT_PUBLIC_FEATURE_CREATE_WIZARD=1
export NEXT_PUBLIC_FEATURE_PROJECT_DASHBOARD=1
export NEXT_PUBLIC_FEATURE_WORKSPACE_DASHBOARD=1
export NEXT_PUBLIC_FEATURE_TASKS_WORKSPACE=1
export NEXT_PUBLIC_FEATURE_BUDGET_LIMITS=1
export NEXT_PUBLIC_FEATURE_FINANCE_AUTOMATIONS=1
export NEXT_PUBLIC_FEATURE_PROJECT_ACTIVITY_AUDIT=1
export NEXT_PUBLIC_FEATURE_TASK_TIME_TRACKING=1
export NEXT_PUBLIC_FEATURE_PM_NAV_PROJECTS_AND_TASKS=1
export NEXT_PUBLIC_FEATURE_PM_PROJECTS_LIST=1
export NEXT_PUBLIC_FEATURE_PM_PROJECT_CARD=1
export NEXT_PUBLIC_FEATURE_PM_TASKS_BOARD=1
export NEXT_PUBLIC_FEATURE_PM_TASKS_LIST=1
export NEXT_PUBLIC_FEATURE_PM_TASKS_CALENDAR=1
export NEXT_PUBLIC_FEATURE_PM_DASHBOARD=1
export NEXT_PUBLIC_FEATURE_PM_ARCHIVE=1

# AI Assistant (опционально, если настроен)
if [ -n "$AI_ASSISTANT_API_KEY" ]; then
  export NEXT_PUBLIC_FEATURE_AI_ASSISTANT=1
  echo "✅ AI Assistant enabled (API key found)"
else
  echo "ℹ️  AI Assistant disabled (AI_ASSISTANT_API_KEY not set)"
fi

# Отключаем версионирование и телеметрию для продакшн
export NEXT_DISABLE_VERSION_CHECK=1
export NEXT_TELEMETRY_DISABLED=1

# Функция для cleanup
cleanup() {
  echo ""
  echo "🛑 Stopping servers..."
  jobs -p | xargs kill 2>/dev/null
  exit 0
}

# Trap SIGINT и SIGTERM
trap cleanup SIGINT SIGTERM

# Проверяем, собран ли проект
if [ ! -d "apps/web/.next" ]; then
  echo "📦 Building production bundle..."
  pnpm build
  if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
  fi
  echo "✅ Build completed"
  echo ""
fi

# Запускаем WebSocket сервер в фоне
echo "📡 Starting WebSocket server on port 8080..."
pnpm --filter @collabverse/api dev:ws &
WS_PID=$!

# Ждем немного чтобы WS сервер запустился
sleep 2

# Запускаем web в продакшн режиме
echo "🌐 Starting production web server on port 3000..."
pnpm --filter @collabverse/web start &
WEB_PID=$!

echo ""
echo "✅ Both servers are running in production mode:"
echo "   - Web (Production): http://localhost:3000"
echo "   - WebSocket: ws://localhost:8080"
echo ""
echo "📋 All features enabled for full testing:"
echo "   - Projects Core"
echo "   - Finance Global"
echo "   - Projects Overview"
echo "   - Project Create Wizard"
echo "   - Workspace Dashboard"
echo "   - Project Dashboard"
echo "   - Budget Limits"
echo "   - Tasks Workspace"
echo "   - Finance Automations"
echo "   - Project Activity Audit"
echo "   - Task Time Tracking"
echo "   - PM Navigation"
echo "   - PM Projects List"
echo "   - PM Project Card"
echo "   - PM Tasks Board"
echo "   - PM Tasks List"
echo "   - PM Tasks Calendar"
echo "   - PM Dashboard"
echo "   - PM Archive"
if [ -n "$AI_ASSISTANT_API_KEY" ]; then
  echo "   - AI Assistant"
fi
echo ""
echo "Press Ctrl+C to stop all servers"

# Ждем завершения
wait $WEB_PID $WS_PID


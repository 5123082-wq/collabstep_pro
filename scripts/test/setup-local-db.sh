#!/bin/bash
# Скрипт для запуска локального PostgreSQL в Docker для тестов

set -e

CONTAINER_NAME="collabverse-postgres-test"
POSTGRES_USER="test"
POSTGRES_PASSWORD="test"
POSTGRES_DB="testdb"
PORT="5432"

echo "🐘 Запуск PostgreSQL контейнера для тестов..."

# Проверяем, не запущен ли уже контейнер
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✅ Контейнер ${CONTAINER_NAME} уже запущен"
    exit 0
  else
    echo "🔄 Удаление старого контейнера..."
    docker rm -f ${CONTAINER_NAME} > /dev/null 2>&1 || true
  fi
fi

# Проверяем, не занят ли порт
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "⚠️  Порт ${PORT} уже занят. Используйте другой порт или остановите процесс."
  exit 1
fi

# Запускаем контейнер
echo "🚀 Запуск контейнера ${CONTAINER_NAME}..."
docker run --name ${CONTAINER_NAME} \
  -e POSTGRES_USER=${POSTGRES_USER} \
  -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
  -e POSTGRES_DB=${POSTGRES_DB} \
  -p ${PORT}:5432 \
  -d postgres:16 > /dev/null

# Ждем, пока PostgreSQL будет готов
echo "⏳ Ожидание готовности PostgreSQL..."
for i in {1..30}; do
  if docker exec ${CONTAINER_NAME} pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} > /dev/null 2>&1; then
    echo "✅ PostgreSQL готов!"
    echo ""
    echo "📝 Переменные окружения для использования:"
    echo "   export DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${PORT}/${POSTGRES_DB}"
    echo "   export POSTGRES_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${PORT}/${POSTGRES_DB}"
    echo ""
    echo "💡 Или используйте: pnpm test:local"
    exit 0
  fi
  sleep 1
done

echo "❌ PostgreSQL не запустился за 30 секунд"
docker logs ${CONTAINER_NAME}
exit 1


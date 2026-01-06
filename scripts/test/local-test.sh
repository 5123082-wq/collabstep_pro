#!/bin/bash
# Скрипт для запуска тестов с локальной БД

set -e

CONTAINER_NAME="collabverse-postgres-test"
POSTGRES_USER="test"
POSTGRES_PASSWORD="test"
POSTGRES_DB="testdb"
PORT="5432"

# Проверяем, запущен ли контейнер
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Контейнер ${CONTAINER_NAME} не запущен"
  echo "💡 Запустите: pnpm test:local:setup"
  exit 1
fi

# Устанавливаем переменные окружения
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${PORT}/${POSTGRES_DB}"
export POSTGRES_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${PORT}/${POSTGRES_DB}"

echo "🔧 Применение схемы БД..."
pnpm --filter @collabverse/api db:push

echo "🧪 Запуск тестов..."
pnpm -w test


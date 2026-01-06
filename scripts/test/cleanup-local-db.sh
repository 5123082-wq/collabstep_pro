#!/bin/bash
# Скрипт для остановки и удаления локального PostgreSQL контейнера

set -e

CONTAINER_NAME="collabverse-postgres-test"

echo "🛑 Остановка PostgreSQL контейнера..."

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  docker stop ${CONTAINER_NAME} > /dev/null 2>&1
  echo "✅ Контейнер остановлен"
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  docker rm ${CONTAINER_NAME} > /dev/null 2>&1
  echo "✅ Контейнер удален"
else
  echo "ℹ️  Контейнер ${CONTAINER_NAME} не найден"
fi


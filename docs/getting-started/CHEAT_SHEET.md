# 📋 Шпаргалка команд

## Быстрый старт

```bash

# Обычная разработка (без WebSocket)

pnpm run dev:simple

# С WebSocket (real-time функции)

pnpm run dev:full

# Только WebSocket сервер

pnpm run dev:ws
```

## Управление

```bash

# Остановить серверы на портах 3000,3001,3002,8080

pnpm run kill:ports

# Экстренная остановка всех Node процессов

pnpm run kill:node

# Проверить производительность

pnpm run check:performance
```

## Полезные команды

```bash

# Проверить какие порты заняты

lsof -i :3000,3001,3002,8080

# Проверить Node процессы

ps aux | grep node

# Убить процесс по PID

kill -9 <PID>

# Очистить Next.js cache

rm -rf apps/web/.next

# Переустановить зависимости

rm -rf node_modules apps/*/node_modules
pnpm install
```

## Режимы

| Команда | WebSocket | CPU | RAM | Использование |
|---------|-----------|-----|-----|---------------|
| `dev:simple` | ❌ | ~25% | ~500MB | UI разработка |
| `dev:full` | ✅ | ~45% | ~800MB | Real-time тесты |
| `dev:ws` | ✅ | ~15% | ~200MB | Только WS |

## Environment Variables

```bash

# Включить WebSocket (создать .env.local в apps/web/)

NEXT_PUBLIC_WS_ENABLED=true
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# WebSocket сервер (создать .env в apps/api/)

WS_PORT=8080
WS_METRICS=false
```

## Build и Deploy

```bash

# Build

pnpm run build

# Start production

pnpm run start

# Typecheck

pnpm run typecheck

# Lint

pnpm run lint

# Test

pnpm run test

# E2E tests

pnpm run test:e2e
```

## Troubleshooting

### CPU высокий

```bash
pnpm run kill:ports
pnpm run dev:simple
```

### Port занят

```bash
pnpm run kill:ports
```

### WebSocket не работает

```bash

# 1. Проверить что сервер запущен

lsof -i :8080

# 2. Если нет - запустить

pnpm run dev:ws

# 3. Включить в .env.local

echo "NEXT_PUBLIC_WS_ENABLED=true" > apps/web/.env.local
```

### Память растет

```bash

# Перезапустить и очистить cache

pnpm run kill:ports
rm -rf apps/web/.next
pnpm run dev:simple
```

## Структура

```text
collabstep-new-3/
├── apps/
│   ├── api/          # WebSocket сервер
│   └── web/          # Next.js приложение
├── scripts/
│   ├── dev-simple.sh     # Запуск без WS
│   ├── dev-full.sh       # Запуск с WS
│   └── check-performance.sh
├── QUICK_START.md        # Детальная инструкция
├── PERFORMANCE_FIX.md    # Описание проблем
└── CHEAT_SHEET.md        # Этот файл
```

## Ссылки

- 📚 [QUICK_START.md](./QUICK_START.md) - Полная инструкция
- 🔧 [PERFORMANCE_FIX.md](./PERFORMANCE_FIX.md) - Технические детали
- 🌐 Web: http://localhost:3000
- 📡 WebSocket: ws://localhost:8080


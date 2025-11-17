#!/bin/bash

# Скрипт для проверки использования ресурсов

echo "🔍 Проверка использования ресурсов..."
echo ""

echo "📊 Node процессы:"
ps aux | grep node | grep -v grep | awk '{printf "  PID: %-8s CPU: %-6s MEM: %-6s CMD: %s\n", $2, $3"%", $4"%", $11}'

echo ""
echo "🌐 Активные порты:"
lsof -i :3000,3001,3002,8080 2>/dev/null | grep LISTEN || echo "  Нет активных портов"

echo ""
echo "💾 Использование памяти Node:"
ps aux | grep node | grep -v grep | awk '{sum+=$4} END {printf "  Total: %.1f%%\n", sum}'

echo ""
echo "💻 CPU Node:"
ps aux | grep node | grep -v grep | awk '{sum+=$3} END {printf "  Total: %.1f%%\n", sum}'

echo ""
echo "ℹ️  Если CPU > 50% или Memory > 30%, проверьте PERFORMANCE_FIX.md"


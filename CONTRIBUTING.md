# Contributing to Collabverse

> **Последнее обновление:** 2025-11-10

## Начало работы

- Прочитайте [быстрый старт](docs/getting-started/quick-start.md) для начала работы
- Изучите [руководство по настройке](docs/getting-started/setup.md), чтобы подготовить окружение и переменные
- Используйте `pnpm verify` перед пушем: команда запускает линт, typecheck, build, тесты, проверку маршрутов и симуляцию Vercel
- Требования: Node.js 20, pnpm 9+

## Workflow

1. Создайте feature-ветку от `main`
2. Внесите изменения, следуя существующему стилю кода
3. Запустите `pnpm verify` для проверки всех тестов
4. Создайте Pull Request с описанием изменений

## Release checklist

Полная версия чек-листа: [docs/development/release-checklist.md](docs/development/release-checklist.md).

Перед релизом убедитесь, что:

- Выровнены версии Node.js 20 и pnpm 9+
- Структура маршрутов покрыта `page/layout/loading/error/not-found`
- Навигация и доступность проверены e2e-тестами
- Error boundaries реализованы во всех ключевых сегментах
- Конфигурация Vercel обновлена
- Прогон `pnpm verify` проходит успешно

## Документация

- Карта документации: [docs/README.md](docs/README.md)
- Быстрый старт: [docs/getting-started/quick-start.md](docs/getting-started/quick-start.md)
- Настройка окружения: [docs/getting-started/setup.md](docs/getting-started/setup.md)
- Дорожная карта: [docs/development/PLAN.md](docs/development/PLAN.md)
- Системный анализ: [docs/architecture/system-analysis.md](docs/architecture/system-analysis.md)
- Чеклист релиза: [docs/development/release-checklist.md](docs/development/release-checklist.md)

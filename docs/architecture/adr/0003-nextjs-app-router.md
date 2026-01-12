# ADR-0003: Next.js App Router для фронтенда

**Статус:** Принято  
**Дата:** 2026-01-07  
**Владелец:** engineering  
**Авторы:** Architecture Documentation  
**Последнее обновление:** 2026-01-07

## Контекст

При создании платформы Collabverse возникла необходимость выбрать фреймворк для фронтенда. Существовали два основных варианта:

1. **Next.js Pages Router** — традиционный подход с файлами `pages/`
2. **Next.js App Router** — новый подход с файлами `app/` и Server Components

Также рассматривались альтернативы:
- **Remix** — другой React фреймворк с focus на Server Components
- **Vite + React Router** — минималистичный подход без фреймворка

Требования к платформе:
- Управление проектами с большим количеством данных
- Real-time обновления через WebSocket
- Модульная архитектура (PM Core, Marketplace, Marketing, AI Hub)
- Высокая производительность и SEO

## Решение

**Использовать Next.js 14 App Router с Server Components и Server Actions для фронтенда.**

### Детали решения

1. **Next.js 14 App Router:**
   - Структура маршрутов через папку `app/`
   - Server Components по умолчанию для уменьшения клиентского кода
   - Server Actions для мутаций данных без API routes
   - Встроенная поддержка layouts, loading states, error boundaries

2. **Server Components:**
   - Рендеринг на сервере для уменьшения клиентского кода
   - Прямой доступ к БД из компонентов (без API routes)
   - Автоматическая оптимизация bundle size

3. **Server Actions:**
   - Мутации данных через серверные функции
   - Валидация на сервере через Zod
   - Прогрессивное улучшение (работает без JavaScript)

4. **Структура приложения:**
   ```text
   apps/web/app/
   ├── (marketing)/          # Маркетинговые страницы
   ├── (app)/                # Приложение после логина
   │   ├── pm/               # PM Core модуль
   │   ├── marketplace/      # Marketplace модуль
   │   └── ...
   └── api/                  # API routes (для совместимости)
   ```

## Последствия

### Положительные

- ✅ **Производительность:** Server Components уменьшают размер клиентского bundle
- ✅ **DX (Developer Experience):** Лучший DX с Server Components и Server Actions
- ✅ **SEO:** Server-side рендеринг улучшает SEO
- ✅ **Простота:** Меньше boilerplate кода по сравнению с Pages Router
- ✅ **Type Safety:** Полная типизация между сервером и клиентом
- ✅ **Встроенные фичи:** Layouts, loading states, error boundaries из коробки

### Отрицательные

- ⚠️ **Новизна:** App Router относительно новый, меньше документации и примеров
- ⚠️ **Миграция:** Если бы использовался Pages Router, потребовалась бы миграция
- ⚠️ **Ограничения:** Некоторые библиотеки еще не поддерживают Server Components
- ⚠️ **Сложность:** Больше концепций для изучения (Server Components, Server Actions, streaming)

### Митигация

- **Документация:** Подробная документация Next.js App Router
- **Постепенная миграция:** Можно использовать оба подхода одновременно (Pages Router для legacy кода)
- **Fallback:** Client Components для интерактивности где нужно
- **Обучение:** Команда изучает новые концепции постепенно

## Альтернативы

### Альтернатива 1: Next.js Pages Router

**Рассмотрено:** Традиционный подход с `pages/` директорией.

**Отклонено:** Pages Router не поддерживает Server Components, что приводит к большему клиентскому bundle. App Router предоставляет лучший DX и производительность.

### Альтернатива 2: Remix

**Рассмотрено:** Другой React фреймворк с focus на Server Components.

**Отклонено:** Меньше экосистема и сообщество по сравнению с Next.js. Next.js более популярен и имеет больше интеграций.

### Альтернатива 3: Vite + React Router

**Рассмотрено:** Минималистичный подход без фреймворка.

**Отклонено:** Требует больше boilerplate кода для SSR, routing, code splitting. Next.js предоставляет все из коробки.

## Связанные документы

- [`../system-analysis.md`](../system-analysis.md) - системный анализ с описанием клиентской архитектуры
- [`../../../apps/web/app/`](../../../apps/web/app/) - структура App Router
- [`../arc42.md`](../arc42.md#5-building-block-view) - Building Block View с описанием Web App
- [Next.js App Router Documentation](https://nextjs.org/docs/app) - официальная документация

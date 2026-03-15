# AI-хаб — Обзор

**Статус:** draft  
**Владелец:** engineering  
**Создан:** 2026-01-07  
**Последнее обновление:** 2026-03-09

## 1) Purpose

AI Hub — модуль интеграции AI-функциональности в платформу Collabverse. Модуль предоставляет AI-ассистентов для проектов, генерацию контента, управление промптами и AI-агентов для автоматизации задач.

**Роль в платформе:**

- AI-ассистент для проектов — помощь с задачами, генерация описаний, суммирование комментариев
- Генерация контента — тексты, изображения, код через различные AI провайдеры
- Управление промптами — создание и использование шаблонов промптов
- AI-агенты — автономные агенты для автоматизации задач и процессов
- Интеграция с PM Core — использование AI в проектах, задачах, чате

## 2) Key objects

Основные сущности модуля AI Hub:

- **AIAssistant** — AI-ассистент для проектов. Помогает с задачами, генерацией контента, анализом. Реализовано в Stage M.
- **AIGeneration** — генерация контента AI. Тексты, изображения, код. Поддержка различных провайдеров (OpenAI, Yandex GPT).
- **AIPrompt** — промпт для AI. Шаблон запроса к AI-модели. Управление промптами в AI Hub.
- **AIAgent** — автономный AI-агент для автоматизации задач. Планируется в Stage N.

**Связанные сущности:**

- **Project** — проект (см. `../projects-tasks/projects-tasks-projects.md`)
- **Task** — задача (см. `../projects-tasks/projects-tasks-tasks.md`)
- **TaskComment** — комментарий к задаче (см. `../projects-tasks/projects-tasks-comments.md`)

## 3) Top user scenarios (E2E)

### Сценарий 1: Генерация описания задачи

1. Пользователь создает новую задачу
2. Вводит название задачи
3. Нажимает "✨ Сгенерировать описание"
4. AI создает структурированное описание задачи в markdown
5. Пользователь может редактировать описание перед сохранением

### Сценарий 2: Использование AI-ассистента в чате

1. Пользователь открывает чат проекта
2. Упоминает `@ai-assistant` в сообщении
3. AI-ассистент анализирует контекст проекта и отвечает
4. Пользователь получает полезные рекомендации или ответы на вопросы

### Сценарий 3: Суммирование комментариев

1. Пользователь открывает задачу с множеством комментариев
2. Нажимает "Суммировать комментарии"
3. AI создает краткую сводку обсуждений
4. Пользователь видит основные моменты обсуждения

### Сценарий 4: Генерация структуры проекта

1. Пользователь создает новый проект
2. Вводит описание проекта, размер команды, дедлайн
3. Нажимает "Сгенерировать структуру проекта"
4. AI создает структуру проекта с фазами, задачами, рисками и рекомендациями
5. Пользователь может применить структуру к проекту

### Сценарий 5: Анализ загруженности команды

1. Пользователь открывает проект
2. Переходит в раздел "Аналитика"
3. Нажимает "Анализ загруженности"
4. AI анализирует распределение задач по исполнителям
5. Показывает перегруженных и недоиспользованных участников
6. Предлагает рекомендации по перераспределению нагрузки

## 4) Functional catalog

| Feature | What it does | Doc | Status |
|---------|--------------|-----|--------|
| Integration | Архитектура AI системы, API endpoints, интеграция с UI | [integration.md](./ai-hub-integration.md) | ✅ stable |
| Quick Start | Быстрый старт с AI, настройка ключей | [quick-start.md](./ai-hub-quick-start.md) | ✅ stable |
| Setup | Детальная настройка AI Hub, провайдеры, переменные окружения | [setup.md](./ai-hub-setup.md) | ✅ stable |
| Assistant | AI-ассистент для проектов, использование в чате, генерация описаний | [assistant.md](./ai-hub-assistant.md) | ✅ stable |
| Agents | AI-агенты для автоматизации задач и процессов | [agents.md](./ai-hub-agents.md) | ⏳ planned |
| Brandbook Agent | Генеративный брендбук мерча на основе логотипа | [ai-brandbook-agent.md](../../development/ai-brandbook-agent/00-index.md) | ⚠️ partial |
| Generations | Генерация контента AI, типы генераций | [generations.md](./ai-hub-generations.md) | ⚠️ partial |
| Prompts | Управление промптами, шаблоны промптов | [prompts.md](./ai-hub-prompts.md) | ⏳ planned |
| OpenClaw Architecture | Стартовая архитектура shared/private agent модели на базе OpenClaw | [openclaw-architecture.md](./ai-hub-openclaw-architecture.md) | 🔄 draft |
| Implementation Plan | План реализации AI Hub, этапы Stage M и Stage N | [_implementation-plan.md](./ai-hub-implementation-plan.md) | ✅ stable |

## 5) Permissions

See: `../../platform/roles-permissions.md`

NEEDS_CONFIRMATION: Права доступа для использования AI функций. Есть ли ограничения по ролям?

## 6) Analytics

See: `../../platform/analytics-events.md`

События AI Hub:
- `ai_generation_requested` — запрошена генерация контента
- `ai_generation_completed` — генерация завершена
- `ai_assistant_used` — использован AI-ассистент
- `ai_agent_invoked` — агент вызван через @упоминание
- `ai_agent_run_created` — создан запуск агента
- `ai_agent_run_completed` — запуск завершён успешно
- `ai_agent_run_failed` — запуск завершился ошибкой
- `ai_agent_limit_exceeded` — превышен лимит агента

## 7) Implementation status

AI Hub частично реализован:

- ✅ Stage M: AI-ассистент (базовый) — завершен
  - Генерация описания задачи
  - Суммирование комментариев
  - AI агенты в чате
  - Напоминания о дедлайнах
- ✅ Brandbook Agent (MVP, Stage 1) — UI точка входа в AI Hub
- ✅ Brandbook Agent S1.5 — персистентные сессии + org‑storage + upload
- ✅ Brandbook Agent S2.0 — интеграция в Identity (AI-пользователь `brandbook.agent@collabverse.ai`), отдельный API ключ `BRANDBOOK_AGENT_OPENAI_API_KEY`, промпты через динамические блоки (`blocks`), персистентная история чатов (`AIConversation`).
- 🔄 OpenClaw architecture brief — стартовая структура shared/private agent модели и этапов внедрения зафиксирована в отдельном документе (2026-03-09).
- ⚠️ Генерация контента — частично реализована
- ⏳ Stage N: Расширенная AI функциональность — не начат
  - Планирование проекта
  - Генерация подзадач
  - Анализ загруженности
  - Рекомендации по назначению
  - Массовые операции

See: `_implementation-plan.md` и `../../ROADMAP.md`

## 8) Related documents

- [PM Core — Projects](../projects-tasks/projects-tasks-projects.md) — интеграция AI в проекты
- [PM Core — Tasks](../projects-tasks/projects-tasks-tasks.md) — генерация описаний задач
- [PM Core — Comments](../projects-tasks/projects-tasks-comments.md) — суммирование комментариев
- [PM Core — Chat](../projects-tasks/projects-tasks-chat.md) — AI-ассистент в чате
- [Platform Overview](../../platform/overview.md) — обзор платформы
- [Integration](./ai-hub-integration.md) — полное руководство по AI
- [OpenClaw Architecture](./ai-hub-openclaw-architecture.md) — стартовая архитектура shared/private agent модели
- [Quick Start](./ai-hub-quick-start.md) — быстрый старт
- [Setup](./ai-hub-setup.md) — настройка ключей

---

## TODO / Future improvements

| Идея | Приоритет | Дата | Контекст | Статус |
|------|-----------|------|----------|--------|
| **История чатов с AI-агентами** | **P1** | 2026-02-04 | Реализована персистентность диалогов (`AIConversation`, `AIMessage`). | ✅ |
| **Исправить N+1 на странице агентов** | **P1** | 2026-01-19 | Медленная загрузка `/ai-hub/agents` | ⏳ |
| Реализация Stage N функций | P2 | 2026-01-07 | Из плана реализации | ⏳ |
| Управление промптами | P2 | 2026-01-07 | Планируется | ⏳ |
| Расширение генерации контента | P2 | 2026-01-07 | Частично реализовано | ⏳ |
| AI-агенты для автоматизации | P3 | 2026-01-07 | Stage N | ⏳ |
| OpenClaw shared/private agent rollout | P1 | 2026-03-09 | Новый execution layer для AI Hub | 🔄 |

---

**Последнее обновление:** 2026-03-09

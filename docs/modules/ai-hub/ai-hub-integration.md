# AI-хаб — Интеграция

**Статус:** stable  
**Владелец:** engineering  
**Создан:** 2026-01-07  
**Последнее обновление:** 2026-01-19

## Обзор AI функциональности

### Реализованные возможности (Stage M)

- ✅ **Генерация описания задачи** — AI создает структурированное описание на основе названия
- ✅ **Суммирование комментариев** — краткая сводка обсуждений в задаче
- ✅ **AI агенты в чате** — автоматические ответы при упоминании `@ai-assistant`
- ✅ **Напоминания о дедлайнах** — персонализированные напоминания через AI

### Поддерживаемые провайдеры

- **OpenAI** (основной) — GPT-3.5-turbo, GPT-4, GPT-4-turbo
- **Yandex GPT** (опционально) — Yandex Cloud AI

## Архитектура AI системы

### Слои архитектуры

```text
┌─────────────────────────────────────────────────────────┐
│                    UI Components                         │
│  (AssistantDrawer, TaskForms, ProjectChat, etc.)        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              API Routes (/api/ai/*)                     │
│  - generate-description                                 │
│  - generate-subtasks                                    │
│  - summarize-comments                                   │
│  - generate-project-structure                           │
│  - analyze-workload                                     │
│  - suggest-assignments                                  │
│  - generate (универсальный)                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         AI Services (apps/api/src/services/)            │
│  - ai-service.ts (базовые функции)                     │
│  - ai-planning-service.ts (планирование)                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         AI Clients (apps/web/lib/ai/)                   │
│  - client.ts (generateText - основной)                 │
│  - openai-client.ts (OpenAIClient класс)               │
│  - yandex-ai-client.ts (YandexAIClient)                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              External APIs                              │
│  - OpenAI API                                           │
│  - Yandex Cloud AI                                      │
└─────────────────────────────────────────────────────────┘
```

### Потоки данных

1. **Пользователь → UI → API Route → AI Service → AI Client → External API**
2. **AI Agent → Repository → AI Service → AI Client → External API**

## Структура файлов

### Frontend (apps/web/)

#### AI Клиенты

- `lib/ai/client.ts` — основной клиент с функцией `generateText()`
- `lib/ai/openai-client.ts` — класс `OpenAIClient`
- `lib/ai/yandex-ai-client.ts` — класс `YandexAIClient`

#### AI Утилиты

- `lib/ai/planning-service.ts` — сервис планирования
- `lib/ai/prompts.ts` — шаблоны промптов
- `lib/ai/bulk-operations.ts` — массовые операции
- `lib/ai/chat.ts` — интеграция AI в чат проектов
- `lib/ai/deadline-reminder.ts` — напоминания о дедлайнах
- `lib/ai/agent-responses.ts` — обработка ответов AI агентов
- `lib/ai/agent-task-actions.ts` — действия AI агентов с задачами
- `lib/ai/security.ts` — безопасность AI запросов
- `lib/ai/rate-limiter.ts` — ограничение частоты запросов

#### API Routes

- `app/api/ai/generate-description/route.ts` — генерация описания задачи
- `app/api/ai/generate-subtasks/route.ts` — генерация подзадач
- `app/api/ai/summarize-comments/route.ts` — суммирование комментариев
- `app/api/ai/generate-project-structure/route.ts` — генерация структуры проекта
- `app/api/ai/analyze-workload/route.ts` — анализ загруженности
- `app/api/ai/suggest-assignments/route.ts` — рекомендации по назначению
- `app/api/ai/generate/route.ts` — универсальный endpoint для генерации

#### UI Components

- `components/right-rail/AssistantDrawer.tsx` — панель AI помощника (⚠️ не реализована полностью)
- `app/(marketing)/product/ai/page.tsx` — маркетинговая страница AI

### Backend (apps/api/)

#### Repositories

- `src/repositories/ai-agents-repository.ts` — управление AI агентами
  - Создание, обновление, удаление агентов
  - Поиск агентов по типу и проекту
  - Инициализация предустановленных агентов

#### Services

- `src/services/ai-service.ts` — базовые AI функции
  - `generateTaskDescription()` — генерация описания задачи
  - `generateTaskChecklist()` — генерация чек-листа
  - `summarizeTaskComments()` — суммирование комментариев
  - `generateDeadlineReminder()` — напоминания о дедлайнах
  - `generateChatResponse()` — ответы в чате проекта
  - `parseAIJsonResponse()` — парсинг JSON ответов

- `src/services/ai-planning-service.ts` — планирование проектов
  - `generateProjectStructure()` — генерация структуры проекта
  - `suggestTaskAssignments()` — рекомендации по назначению
  - `analyzeWorkload()` — анализ загруженности команды
  - `generateSubtasks()` — генерация подзадач

#### Types

- `src/types.ts` — типы AI агентов
  - `AIAgent` — интерфейс AI агента
  - `AIAgentType` — типы агентов: 'assistant' | 'reviewer' | 'reminder' | 'summarizer'
  - `AIAgentScope` — область видимости: 'personal' | 'team' | 'public'

## API Endpoints

### POST /api/ai/generate-description

Генерация описания задачи

**Request:**
```json
{
  "taskTitle": "Создать REST API",
  "projectId": "optional-project-id"
}
```

**Response:**
```json
{
  "description": "Структурированное описание задачи в markdown"
}
```

### POST /api/ai/generate-subtasks

Генерация подзадач

**Request:**
```json
{
  "taskTitle": "Создать страницу авторизации",
  "taskDescription": "Опциональное описание"
}
```

**Response:**
```json
{
  "subtasks": [
    {
      "title": "Название подзадачи",
      "description": "Описание",
      "estimatedHours": 4
    }
  ]
}
```

### POST /api/ai/summarize-comments

Суммирование комментариев задачи

**Request:**
```json
{
  "taskId": "task-id",
  "projectId": "project-id"
}
```

**Response:**
```json
{
  "summary": "Краткая сводка комментариев в markdown"
}
```

### POST /api/ai/generate-project-structure

Генерация структуры проекта

**Request:**
```json
{
  "description": "Описание проекта",
  "projectName": "Название",
  "teamSize": 5,
  "deadline": "2025-12-31",
  "preferences": {
    "taskGranularity": "medium",
    "includeRisks": true,
    "includeRecommendations": true
  }
}
```

---

## Brandbook Agent (S1.5)

**Статус:** ✅ реализовано

**Ключевые endpoints:**
- `POST /api/ai/agents/brandbook/runs` — запуск (sync), `organizationId` обязателен при отсутствии `projectId`.
- `GET /api/ai/agents/brandbook/runs` — список запусков пользователя (org/project фильтр).
- `GET /api/ai/agents/brandbook/runs/{runId}` — run + сообщения + артефакты.
- `POST /api/ai/agents/brandbook/runs/{runId}/messages` — запись сообщений чата.

**Доступ:**
- при `projectId`: читать могут все участники проекта (включая viewer), писать — owner/admin/member;
- без `projectId`: читать/писать может только автор запуска.

**Файлы (загрузка логотипа):**
- `POST /api/files/upload-url` → upload token.
- `POST /api/files/complete` → фиксация файла + получение `logoFileId`.

**Хранилище (без projectId):**
- Папка организации `AI Generations/Brandbook/YYYY-MM-DD`.
- Runs/messages хранятся в отдельной БД (`AI_AGENTS_DATABASE_URL`).

**Response:**
```json
{
  "ok": true,
  "data": {
    "runId": "run-id",
    "status": "queued",
    "metadata": {
      "pipelineType": "generative",
      "outputFormat": "png",
      "previewFormat": "jpg"
    }
  }
}
```

### POST /api/ai/analyze-workload

Анализ загруженности команды

**Request:**
```json
{
  "projectId": "project-id"
}
```

**Response:**
```json
{
  "members": [...],
  "overloadedMembers": [...],
  "underutilizedMembers": [...],
  "recommendations": [...],
  "redistributionSuggestions": [...]
}
```

### POST /api/ai/suggest-assignments

Рекомендации по назначению задач

**Request:**
```json
{
  "projectId": "project-id",
  "taskIds": ["task-id-1", "task-id-2"]
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "taskId": "task-id",
      "recommendedAssigneeId": "user-id",
      "reason": "Обоснование",
      "confidence": 0.85
    }
  ]
}
```

### POST /api/ai/generate

Универсальный endpoint для генерации

**Request:**
```json
{
  "action": "generate-structure" | "generate-subtasks" | "analyze-workload",
  "provider": "openai" | "yandex",
  "data": { ... }
}
```

### POST /api/ai/agents/brandbook/runs

Запуск Brandbook Agent (MVP)

`projectId`, `taskId` и `logoFileId` опциональны. Если `projectId` указан, применяется проверка доступа к проекту.

**Request:**
```json
{
  "projectId": "project-id",
  "taskId": "task-id",
  "logoFileId": "file-id",
  "productBundle": "merch_basic",
  "preferences": ["минимализм", "монохром"],
  "outputLanguage": "ru",
  "watermarkText": "Confidential",
  "contactBlock": "hello@brand.com"
}
```

**Response:**
```json
{
  "runId": "run-id",
  "status": "queued",
  "metadata": {
    "pipelineType": "generative",
    "outputFormat": "png",
    "previewFormat": "jpg"
  }
}
```

## Интеграция с UI

### Компоненты использующие AI

1. **Task Creation Form**
   - Кнопка "✨ Сгенерировать описание"
   - Вызов: `/api/ai/generate-description`

2. **Task Detail Page**
   - Кнопка "Суммировать комментарии"
   - Вызов: `/api/ai/summarize-comments`

3. **Project Planning**
   - AI Планирование проекта
   - Вызов: `/api/ai/generate-project-structure`

4. **Project Chat**
   - Команды: `@ai-assistant`, `/ai вопрос`
   - Обработка: `lib/ai/chat.ts`

5. **AI Agents Panel**
   - Управление AI агентами в проекте
   - API: `/api/pm/projects/[id]/ai-agents`

6. **Assistant Drawer** ⚠️
   - Панель AI помощника (не реализована полностью)
   - Компонент: `components/right-rail/AssistantDrawer.tsx`

7. **Brandbook Agent (AI Hub / Agents)**
   - Карточка и модалка запуска
   - Чат‑модалка после запуска для логотипа и уточнений
   - API: `/api/ai/agents/brandbook/runs`

### Feature Flags

```typescript
// apps/web/lib/flags.ts
AI_V1: resolveLegacyBooleanFlag(['NEXT_PUBLIC_FEATURE_AI_V1', 'FEATURE_AI_V1'])
```

**Использование:**
```typescript
import { flags } from '@/lib/flags';

if (flags.AI_V1) {
  // Показать AI функции
}
```

## Известные проблемы

### 1. Дублирование AI клиентов

**Проблема:** Два разных способа работы с AI:
- `lib/ai/client.ts` — функция `generateText()`
- `lib/ai/openai-client.ts` — класс `OpenAIClient`

**Решение:** Унифицировать использование. Рекомендуется использовать `client.ts` как основной.

### 2. AssistantDrawer не реализован

**Проблема:** `components/right-rail/AssistantDrawer.tsx` содержит только заглушку.

**Решение:** Реализовать интеграцию с `/api/ai/generate` или создать отдельный endpoint.

### 3. analyzeWorkload возвращает мок

**Проблема:** В `lib/ai/planning-service.ts` функция `analyzeWorkload()` возвращает пустой результат.

**Решение:** Использовать реализацию из `apps/api/src/services/ai-planning-service.ts`.

## Связанные документы

- [AI Hub Module](./ai-hub-overview.md) — обзор модуля
- [Quick Start](./ai-hub-quick-start.md) — быстрый старт
- [Setup](./ai-hub-setup.md) — детальная настройка
- [Assistant](./ai-hub-assistant.md) — AI-ассистент

---

**Последнее обновление:** 2026-01-07

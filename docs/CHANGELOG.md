# История изменений документации

## 2025-11-16 — Завершение Stage M: AI-ассистент (базовая функциональность)

### Добавлено

**AI Core Infrastructure:**

- OpenAI интеграция с базовым клиентом и retry логикой
- Шаблоны промптов для всех AI операций
- Rate limiting и система безопасности (валидация, санитизация)
- Сервис напоминаний о дедлайнах через AI

**API Endpoints:**

- `/api/ai/generate-description` — генерация описания задачи через AI
- `/api/ai/summarize-comments` — суммирование комментариев задачи через AI
- `/api/pm/projects/[id]/ai-agents` — управление AI-агентами проекта (GET, POST, DELETE)

**UI Components:**

- `TaskAIActions` — кнопки AI действий для задач (генерация описания, суммирование)
- `AIAssistant` — панель чата с AI ассистентом
- `ProjectAIAgents` — управление AI-агентами проекта
- Интеграция AI в форму создания задачи

**AI-агенты:**

- AI Помощник — помогает с общими вопросами по проекту
- AI Ревьюер — проверяет задачи и даёт обратную связь
- AI Напоминатель — напоминает о дедлайнах
- AI Суммаризатор — создаёт краткие сводки обсуждений
- Автоматические ответы агентов на упоминания в чате (@ai-assistant)

**Безопасность и ограничения:**

- Rate limiting на уровне пользователя, endpoint и глобально
- Валидация входных данных и санитизация ответов AI
- Контроль стоимости запросов
- Аудит логирование AI запросов

**Новые файлы:**

- `apps/web/lib/ai/README.md` — документация по AI
- `apps/web/lib/ai/client.ts` — OpenAI клиент
- `apps/web/lib/ai/prompts.ts` — шаблоны промптов
- `apps/web/lib/ai/chat.ts` — интеграция в чат
- `apps/web/lib/ai/deadline-reminder.ts` — напоминания
- `apps/web/lib/ai/rate-limiter.ts` — rate limiting
- `apps/web/lib/ai/security.ts` — безопасность
- `apps/api/src/services/ai-service.ts` — AI сервис
- `apps/web/app/api/ai/generate-description/route.ts`
- `apps/web/app/api/ai/summarize-comments/route.ts`
- `apps/web/app/api/pm/projects/[id]/ai-agents/route.ts`
- `apps/web/components/pm/TaskAIActions.tsx`
- `apps/web/components/pm/AIAssistant.tsx`
- `apps/web/components/pm/ProjectAIAgents.tsx`
- `apps/web/tests/unit/ai-service.spec.ts`
- `apps/web/tests/e2e/ai-assistant.spec.ts`
- `docs/modules/ai-hub/ai-hub-setup.md` — подробное руководство по настройке OpenAI
- `docs/modules/ai-hub/ai-hub-quick-start.md` — быстрая инструкция по настройке

**Обновлено:**

- `apps/web/package.json` — добавлена зависимость `openai@4.68.0`
- `apps/web/components/pm/CreateTaskModal.tsx` — интегрирован TaskAIActions
- `apps/web/app/(app)/pm/projects/[id]/page.tsx` — добавлена вкладка "AI-агенты"
- `docs/modules/projects-tasks/projects-tasks-projects.md` — добавлен полный отчет Stage M
- `docs/development/stages/stage-M-ai-basic.md` — статус изменен на "ЗАВЕРШЁН"
- `README.md` — добавлена ссылка на руководство по настройке AI

### Требования для работы AI

Для использования AI функциональности необходимо:

1. OpenAI API ключ (получить на https://platform.openai.com/api-keys)
2. Настроенный биллинг на OpenAI
3. Файл `.env.local` с переменными:
   ```bash
   OPENAI_API_KEY=sk-proj-ваш-ключ
   NEXT_PUBLIC_FEATURE_AI_V1=true
   ```

**Документация:** [docs/modules/ai-hub/ai-hub-setup.md](modules/ai-hub/ai-hub-setup.md)

---

## 2025-01-XX — Завершение Stage J: Чат проекта и файловый каталог

### Добавлено (Stage J)

**Чат проекта:**

- Полноценный чат проекта для командного общения
- API endpoints для получения и отправки сообщений в чате проекта
- UI компонент ProjectChat с polling, infinite scroll и прикреплением файлов
- Интеграция уведомлений о новых сообщениях в чате
- Автопрокрутка к новым сообщениям и загрузка старых при прокрутке вверх

**Файловый каталог проекта:**

- Централизованный файловый каталог проекта
- API endpoints для получения списка файлов и загрузки файлов в проект
- UI компонент ProjectFilesCatalog с фильтрацией и группировкой по источникам
- Группировка файлов по источникам: задачи, комментарии, чат, проект, документы
- Просмотр, скачивание и загрузка файлов

**Новые файлы:**

- `apps/api/src/repositories/project-chat-repository.ts`
- `apps/web/app/api/pm/projects/[id]/chat/route.ts`
- `apps/web/components/pm/ProjectChat.tsx`
- `apps/web/app/api/pm/projects/[id]/files/route.ts`
- `apps/web/components/pm/ProjectFilesCatalog.tsx`

**Обновлено:**

- `docs/modules/projects-tasks/projects-tasks-projects.md` — добавлен отчет о завершении Stage J
- `docs/development/stages/stage-J-chat-files.md` — статус изменен на "ЗАВЕРШЁН"
- `apps/api/src/types.ts` — добавлен `ProjectChatMessage` и `'project_chat'` в `AttachmentEntityType`
- `apps/web/lib/notifications/event-generator.ts` — добавлена функция `notifyChatMessageAdded`
- `apps/web/app/(app)/pm/projects/[id]/page.tsx` — добавлена система вкладок (Обзор, Чат, Файлы)

### Интеграция

- Чат интегрирован в страницу проекта через систему вкладок
- Файловый каталог интегрирован в страницу проекта через систему вкладок
- Уведомления о сообщениях в чате генерируются для всех участников проекта
- Файлы из разных источников (задачи, комментарии, чат) отображаются в едином каталоге

---

## 2025-01-XX — Завершение Stage I: Система уведомлений

### Добавлено (Stage I)

**Система уведомлений:**

- Полноценная система уведомлений для событий в проектах
- API endpoints для получения, обновления и удаления уведомлений
- Генератор событий уведомлений для задач, комментариев и приглашений
- UI компоненты: панель уведомлений и страница уведомлений с фильтрацией
- Автоматический счетчик непрочитанных уведомлений с polling
- Unit и E2E тесты для всех компонентов системы

**Новые файлы:**

- `apps/api/src/repositories/notifications-repository.ts`
- `apps/web/lib/notifications/event-generator.ts`
- `apps/web/app/api/notifications/route.ts`
- `apps/web/app/api/notifications/[id]/route.ts`
- `apps/web/app/api/notifications/mark-all-read/route.ts`
- `apps/web/app/api/notifications/unread-count/route.ts`
- `apps/web/hooks/useUnreadNotifications.ts`
- `apps/web/tests/unit/notifications.spec.ts`
- `apps/web/tests/e2e/notifications.spec.ts`

**Обновлено:**

- `docs/modules/projects-tasks/projects-tasks-projects.md` — добавлен отчет о завершении Stage I
- `docs/development/stages/stage-I-notifications.md` — статус изменен на "ЗАВЕРШЁН"

### Интеграция (Stage I)

- Уведомления генерируются при создании/обновлении задач
- Уведомления генерируются при добавлении комментариев
- Уведомления интегрированы в существующие API endpoints

---

## 2025-11-10 — Полная реорганизация

### Удалено

**Устаревшие папки:**

- `docs/_report/` — пустая папка с отчетами
- `docs/adr/` — пустая папка с ADR
- `docs/archive/` — пустая папка с архивами
- `docs/guides/` — перенесено в новую структуру

**Устаревшие файлы:**

- `docs/CLEANUP_REPORT.md` — устаревший отчет о предыдущей очистке
- `docs/flags-snapshot.json` — устаревший снапшот флагов
- `docs/calendar-timeline-views.md` — документация о несуществующих компонентах Calendar и Timeline

**Дублирующийся код:**

- `apps/web/app/mkt/` — полное дублирование функционала `(marketing)`, не использовалось
- Обновлен `sitemap.ts` — удалены маршруты `/mkt/*`
- Обновлен `error.tsx` — исправлена ссылка с `/mkt/projects` на `/projects`

### Добавлено (Документация)

**Новая структура документации:**

```text
docs/
├── README.md                           # Главная карта документации (обновлен)
├── CHANGELOG.md                        # История изменений (новый)
├── 02-Platforma-Opisanie.md           # Описание платформы
├── 03-Technical-Plan.md               # Технический план
├── STAGE_G_SUMMARY.md                 # Сводка по этапу G
├── getting-started/                    # Начало работы (новая папка)
│   ├── quick-start.md                 # Быстрый старт (новый)
│   └── setup.md                       # Настройка окружения (перенесен)
├── architecture/                       # Архитектура (новая папка)
│   └── system-analysis.md             # Системный анализ (перенесен)
├── development/                        # Разработка (новая папка)
│   ├── PLAN.md                        # Дорожная карта (перенесен)
│   └── release-checklist.md           # Чеклист релиза (перенесен)
└── components/                         # Компоненты (новая папка)
    └── ui/                            # UI компоненты (скопированы из apps/web/docs)
        ├── alert.md
        ├── button.md
        ├── form.md
        ├── input.md
        └── modal.md
```

### Обновлено

**Корневые файлы:**

- `README.md` — обновлены ссылки на документацию, дата обновления → 2025-11-10
- `CONTRIBUTING.md` — обновлены ссылки на документацию, дата обновления → 2025-11-10

**Файлы документации:**

- `docs/README.md` — полностью переписан с новой структурой навигации
- `docs/getting-started/setup.md` — обновлена дата → 2025-11-10
- `docs/development/release-checklist.md` — файл удален (устарел)
- `docs/development/PLAN.md` — файл удален (устарел)
- `docs/architecture/system-analysis.md` — обновлена дата → 2025-11-10

**Исходный код:**

- `apps/web/app/sitemap.ts` — удалены дублирующиеся маршруты `/mkt/*`
- `apps/web/app/(marketing)/error.tsx` — исправлена ссылка

### Итоги чистки

**Удалено файлов:** 8
**Удалено папок:** 4
**Создано файлов:** 2
**Обновлено файлов:** 9
**Перемещено файлов:** 5

### Преимущества новой структуры

1. **Логичная организация** — документация разделена на понятные категории
2. **Легкая навигация** — быстрый доступ к нужной информации
3. **Актуальность** — удалена вся устаревшая документация
4. **Централизация** — UI документация теперь в общей структуре
5. **Быстрый старт** — новый файл `quick-start.md` для новых разработчиков

---

## Предыдущие изменения

### 2025-11-04 — Обнуление этапов разработки

- Все этапы в PLAN.md переведены в статус "в очереди"
- Унифицированы требования: Node.js 20, pnpm 9+
- Удалены несуществующие ADR документы

---

**Автор:** AI Assistant  
**Дата создания:** 2025-11-10

# Проекты и задачи — WebSocket

**Статус:** 95% завершён  
**Владелец:** product  
**Создан:** 2026-01-06  
**Последнее обновление:** 2026-01-06

## Введение

WebSocket интеграция обеспечивает real-time обновления интерфейса без перезагрузки страницы. При изменении задач, комментариев, уведомлений, сообщений в чате все подключенные клиенты получают события мгновенно. При недоступности WebSocket используется fallback на polling.

**Статус реализации:** ✅ 95% завершён (Stage L)

## Режимы работы

### С WebSocket сервером

Если WebSocket сервер доступен (`NEXT_PUBLIC_WS_URL` указан):
- ✅ Мгновенные обновления в реальном времени
- ✅ Меньше нагрузка на сервер (меньше HTTP запросов)
- ✅ Автоматический fallback на polling при недоступности сервера

**Настройка:**
1. Запустить WebSocket сервер: `pnpm --filter @collabverse/api dev:ws`
2. Добавить переменную окружения: `NEXT_PUBLIC_WS_URL=http://localhost:8080`
3. Перезапустить Next.js приложение

### Без WebSocket сервера (fallback)

Если WebSocket сервер недоступен или не настроен:
- ✅ Все функции работают нормально
- ✅ Обновления происходят через polling интервалы:
  - Чат: каждые 5 секунд
  - Уведомления: каждые 30 секунд
  - Комментарии: при действиях пользователя
  - Задачи: через обычные события браузера
- ⚠️ Нет мгновенных обновлений в реальном времени
- ⚠️ Изменения других пользователей видны с задержкой

**Никаких дополнительных действий не требуется** — просто не указывайте `NEXT_PUBLIC_WS_URL`.

## Подключение

### WebSocket клиент

**Библиотека:** Socket.io

**Процесс подключения:**
1. Клиент подключается к WebSocket серверу
2. Подписывается на комнаты проектов
3. Получает события при изменениях в проектах

**Код:**
```typescript
import { useWebSocket } from '@/lib/websocket/hooks';

const { connected, subscribe, unsubscribe } = useWebSocket();

// Подписка на события проекта
subscribe('project:123', (event) => {
  // Обработка события
});
```

### Комнаты проектов

Клиенты подключаются к комнатам проектов:
- Каждый проект имеет свою комнату
- События проекта рассылаются всем клиентам в комнате
- Клиенты автоматически отписываются при закрытии страницы

## Типы событий

### События задач

- **`task.created`** — создана новая задача
  ```typescript
  {
    type: 'task.created',
    taskId: string,
    projectId: string,
    task: Task
  }
  ```

- **`task.updated`** — обновлена задача
  ```typescript
  {
    type: 'task.updated',
    taskId: string,
    projectId: string,
    changes: Partial<Task>
  }
  ```

- **`task.status_changed`** — изменен статус задачи
  ```typescript
  {
    type: 'task.status_changed',
    taskId: string,
    projectId: string,
    oldStatus: TaskStatus,
    newStatus: TaskStatus
  }
  ```

### События комментариев

- **`comment.added`** — добавлен комментарий
  ```typescript
  {
    type: 'comment.added',
    commentId: string,
    taskId: string,
    projectId: string,
    comment: TaskComment
  }
  ```

- **`comment.updated`** — обновлен комментарий
- **`comment.deleted`** — удален комментарий

### События чата

- **`chat.message`** — отправлено сообщение в чат проекта
  ```typescript
  {
    type: 'chat.message',
    messageId: string,
    projectId: string,
    message: ProjectChatMessage
  }
  ```

### События уведомлений

- **`notification.new`** — создано новое уведомление
  ```typescript
  {
    type: 'notification.new',
    notificationId: string,
    userId: string,
    notification: Notification
  }
  ```

## Синхронизация состояния

### Обновление UI

При получении события WebSocket:
1. Событие обрабатывается соответствующим обработчиком
2. Локальное состояние обновляется
3. UI автоматически перерисовывается

**Пример:**
```typescript
useEffect(() => {
  if (!connected) return;

  const handleTaskUpdated = (event: TaskUpdatedEvent) => {
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === event.taskId ? { ...t, ...event.changes } : t
      )
    );
  };

  subscribe('project:123', handleTaskUpdated);
  return () => unsubscribe('project:123', handleTaskUpdated);
}, [connected, subscribe, unsubscribe]);
```

### Интеграция с компонентами

**Kanban доска:**
- Обновление задач при изменении статуса
- Обновление счетчиков колонок
- Синхронизация с другими представлениями

**Комментарии:**
- Добавление новых комментариев в реальном времени
- Обновление существующих комментариев
- Удаление комментариев

**Чат проекта:**
- Добавление новых сообщений
- Обновление истории чата
- Индикатор печати (планируется)

**Уведомления:**
- Обновление счетчика непрочитанных
- Добавление новых уведомлений в панель
- Автоматическое обновление списка уведомлений

## Обработка ошибок

### Переподключение

При разрыве соединения:
1. Клиент автоматически пытается переподключиться
2. Интервал переподключения увеличивается экспоненциально
3. При успешном переподключении восстанавливаются подписки

**Настройки:**
- Начальный интервал: 1 секунда
- Максимальный интервал: 30 секунд
- Максимальное количество попыток: бесконечно

### Fallback на polling

Если WebSocket недоступен:
- Автоматический переход на polling
- Polling интервалы для разных компонентов:
  - Чат: каждые 5 секунд
  - Уведомления: каждые 30 секунд
  - Задачи: при действиях пользователя
- Плавный переход между режимами

## Переменные окружения

### `NEXT_PUBLIC_WS_URL`

URL WebSocket сервера. Если не указан, WebSocket отключен.

**Примеры:**
- `http://localhost:8080` — локальная разработка
- `wss://ws.example.com` — production (WebSocket Secure)

### `NEXT_PUBLIC_WS_ENABLED`

Явное включение/отключение WebSocket. По умолчанию WebSocket включен, если указан `NEXT_PUBLIC_WS_URL`.

**Значения:**
- `true`, `1`, `on` — включить WebSocket
- `false`, `0`, `off` — отключить WebSocket (даже если указан URL)

## Проверка работы

### Без WebSocket сервера

- В консоли браузера: `[WebSocket] WebSocket disabled or URL not configured, using polling fallback`
- Обновления работают через polling интервалы

### С WebSocket сервером

- В консоли браузера: `[WebSocket] Connected`
- Обновления происходят мгновенно
- При недоступности сервера автоматически переключается на polling

## Отладка

Если WebSocket не работает:

1. Проверьте, запущен ли сервер: `pnpm --filter @collabverse/api dev:ws`
2. Проверьте переменную окружения: `NEXT_PUBLIC_WS_URL`
3. Проверьте консоль браузера на ошибки подключения
4. Убедитесь, что порт 8080 не занят другим процессом

## Производительность

### С WebSocket

- ✅ Мгновенные обновления
- ✅ Меньше нагрузка на сервер (меньше HTTP запросов)
- ✅ Эффективное использование ресурсов

### Без WebSocket

- ✅ Проще в настройке
- ⚠️ Больше HTTP запросов (polling)
- ⚠️ Задержка в обновлениях

## API и интеграция

### WebSocket сервер

**Расположение:** `apps/api/src/websocket/` (планируется)

**Функции:**
- Подключение клиентов
- Управление комнатами проектов
- Рассылка событий
- Обработка переподключений

### React hooks

**Расположение:** `apps/web/lib/websocket/hooks.ts`

**Хуки:**
- `useWebSocket()` — основной хук для работы с WebSocket
- `useWebSocketEvent()` — подписка на конкретное событие
- `useWebSocketProject()` — подписка на события проекта

## Оставшиеся задачи

### Unit и E2E тесты

**Статус:** ⚠️ Планируется

В будущем планируется добавить:
- Unit тесты для WebSocket клиента
- E2E тесты для real-time обновлений
- Тесты переподключения и fallback

## Связанные документы

- [`_module.md`](./projects-tasks-overview.md) — обзор модуля PM Core
- [`tasks.md`](./projects-tasks-tasks.md) — обновления задач через WebSocket
- [`comments.md`](./projects-tasks-comments.md) — обновления комментариев
- [`chat.md`](./projects-tasks-chat.md) — обновления чата
- [`notifications.md`](./projects-tasks-notifications.md) — обновления уведомлений
- [`kanban.md`](./projects-tasks-kanban.md) — real-time обновления Kanban доски
- [`_implementation-plan.md`](./projects-tasks-implementation-plan.md#stage-l) — Stage L: WebSocket

---

**Последнее обновление:** 2026-01-06
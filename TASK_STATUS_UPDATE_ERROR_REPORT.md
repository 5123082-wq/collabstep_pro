# Отчет об ошибке обновления статуса задачи

**Дата:** 2025-01-15  
**Проблема:** Не удается обновить статус задачи через модальное окно TaskDetailModal  
**Статус:** Не решена

---

## Описание проблемы

При попытке изменить статус задачи вручную через модальное окно деталей задачи (`TaskDetailModal`), запрос к API `/api/pm/tasks/bulk` возвращает ошибку 400, и статус не сохраняется.

### Симптомы

1. Пользователь открывает задачу в модальном окне
2. Выбирает новый статус из выпадающего списка
3. Запрос отправляется на `/api/pm/tasks/bulk` (POST)
4. API возвращает статус 400 с ошибкой
5. Статус задачи не обновляется

---

## Ошибки из консоли браузера

### Основные ошибки:

1. **Первая ошибка:**

   ```
   Failed to update task: Error: INVALID_REQUEST
   ```

2. **Вторая ошибка (последняя, более информативная):**
   ```
   Failed to update task: Error: time zone "gmt+0300" not recognized
   ```

### Логи из консоли:

- `[TaskDetailModal] Sending update request: [object Object]` - запрос отправляется
- `[TaskDetailModal] API Error: [object Object]` - получена ошибка от API
- `Failed to update task: Error: time zone "gmt+0300" not recognized` - **КРИТИЧЕСКАЯ ОШИБКА**

### Сетевые запросы:

- `POST /api/pm/tasks/bulk` - статус 400 (Bad Request)
- Запрос отправляется корректно, но сервер возвращает ошибку

---

## Анализ проблемы

### Корневая причина

Ошибка `time zone "gmt+0300" not recognized` указывает на проблему с обработкой дат/времени. Вероятно, проблема возникает при:

1. Обработке поля `dueAt` (дедлайн задачи)
2. Форматировании дат в репозитории задач
3. Сохранении/обновлении задачи в базе данных

Формат временной зоны `gmt+0300` не является стандартным форматом IANA (должно быть `GMT+03:00` или `Europe/Moscow`).

### Где может возникать ошибка

1. **В репозитории задач** (`apps/api/src/repositories/tasks-repository.ts`) при обновлении задачи
2. **В базе данных** при сохранении дат с временной зоной
3. **В API endpoint** при обработке поля `dueAt`

---

## Выполненные действия

### 1. Исправление обработки ответа API в TasksBoardView

**Файл:** `apps/web/components/pm/TasksBoardView.tsx`

**Проблема:** Клиент неправильно читал структуру ответа API.

**Исправление:**

- Изменена обработка ответа с `data.tasks` на `data.data.tasks` (правильная структура ответа `jsonOk`)
- Добавлена обратная совместимость с `responseData?.tasks`

```typescript
// Было:
const data = await response.json();
if (data.tasks && data.tasks.length > 0) {
  const serverTask = data.tasks[0];
  // ...
}

// Стало:
const responseData = await response.json();
const tasks = responseData?.data?.tasks || responseData?.tasks;
if (tasks && Array.isArray(tasks) && tasks.length > 0) {
  const serverTask = tasks[0];
  // ...
}
```

### 2. Очистка данных запроса в TaskDetailModal

**Файл:** `apps/web/components/pm/TaskDetailModal.tsx`

**Проблема:** В `requestPatch` могли попадать `undefined` значения, что ломало валидацию API.

**Исправление:**

- Создан очищенный объект `requestPatch`, который содержит только валидные значения
- Правильная обработка `null` для удаления значений (`assigneeId`, `dueAt`)
- Добавлена проверка на пустой объект перед отправкой

```typescript
// Создаем очищенный объект для запроса
const requestPatch: Record<string, unknown> = {};

if ('status' in patch && patch.status !== undefined) {
  requestPatch.status = patch.status;
}
// ... аналогично для других полей

// Проверяем, что есть хотя бы одно поле для обновления
if (Object.keys(requestPatch).length === 0) {
  console.warn('[TaskDetailModal] No fields to update');
  return;
}
```

### 3. Улучшение обработки assigneeId в API

**Файл:** `apps/web/app/api/pm/tasks/bulk/route.ts`

**Проблема:** Неправильная обработка `null` для `assigneeId`.

**Исправление:**

- Явная обработка `null` и пустой строки для удаления исполнителя
- Правильное преобразование в `undefined` для репозитория

```typescript
if ('assigneeId' in updates) {
  if (updates.assigneeId === null || updates.assigneeId === '') {
    patch.assigneeId = undefined;
  } else if (updates.assigneeId) {
    patch.assigneeId = updates.assigneeId;
  }
}
```

### 4. Улучшение валидации статуса

**Файл:** `apps/web/app/api/pm/tasks/bulk/route.ts`

**Исправление:**

- Добавлена проверка на невалидный статус с возвратом понятной ошибки
- Улучшено логирование

```typescript
if ('status' in updates) {
  const statusValue = updates.status;
  const validStatuses: TaskStatus[] = [
    'new',
    'in_progress',
    'review',
    'done',
    'blocked',
  ];
  if (
    statusValue &&
    typeof statusValue === 'string' &&
    validStatuses.includes(statusValue as TaskStatus)
  ) {
    patch.status = statusValue as TaskStatus;
  } else if (statusValue !== null && statusValue !== undefined) {
    return jsonError(
      `Invalid status value: ${statusValue}. Valid statuses: ${validStatuses.join(', ')}`,
      { status: 400 }
    );
  }
}
```

### 5. Улучшение логирования ошибок

**Файлы:**

- `apps/web/components/pm/TaskDetailModal.tsx`
- `apps/web/app/api/pm/tasks/bulk/route.ts`

**Исправление:**

- Добавлено детальное логирование ошибок в клиенте
- Улучшена обработка ошибок в API с возвратом детальной информации

```typescript
// В TaskDetailModal:
console.error('[TaskDetailModal] API Error:', {
  status: response.status,
  statusText: response.statusText,
  payload,
  requestBody: { taskIds: [taskData.id], updates: requestPatch },
});

// В API:
if (error instanceof Error) {
  return jsonError(error.message || 'INVALID_REQUEST', {
    status: 400,
    details: error.stack,
  });
}
```

---

## Текущее состояние

### Что работает:

- ✅ Drag & drop карточек на канбан-доске (после исправления обработки ответа)
- ✅ Отправка запросов на API
- ✅ Валидация данных на клиенте

### Что не работает:

- ❌ Обновление статуса через модальное окно TaskDetailModal
- ❌ Ошибка: `time zone "gmt+0300" not recognized`

---

## Гипотезы о причине ошибки

### Гипотеза 1: Проблема с форматом временной зоны в dueAt

Ошибка `time zone "gmt+0300" not recognized` указывает на проблему с обработкой дат. Возможные причины:

1. **В репозитории задач** при обновлении задачи с полем `dueAt` используется неправильный формат временной зоны
2. **В базе данных** (PostgreSQL) не распознается формат `gmt+0300`
3. **При сериализации/десериализации** дат происходит преобразование в неправильный формат

### Гипотеза 2: Проблема в tasksRepository.update()

Возможно, при обновлении задачи в методе `update` репозитория происходит попытка сохранить дату с неправильным форматом временной зоны.

### Гипотеза 3: Проблема в обработке dueAt в API

В API endpoint при обработке поля `dueAt` может происходить преобразование даты, которое приводит к неправильному формату временной зоны.

---

## Рекомендации для дальнейшего анализа

### 1. Проверить обработку дат в репозитории

**Файл:** `apps/api/src/repositories/tasks-repository.ts`

Проверить метод `update()` и обработку поля `dueAt`:

- Как форматируется дата перед сохранением
- Используется ли правильный формат временной зоны (IANA или ISO 8601)
- Происходит ли преобразование даты при обновлении

### 2. Проверить логи сервера

Проверить логи сервера Next.js для получения полного стека ошибки:

- Где именно возникает ошибка `time zone "gmt+0300" not recognized`
- Какой код вызывает эту ошибку
- Какие данные передаются в момент ошибки

### 3. Проверить обработку dueAt в API

**Файл:** `apps/web/app/api/pm/tasks/bulk/route.ts`

Проверить обработку поля `dueAt`:

- Как обрабатывается значение `dueAt` из запроса
- Происходит ли преобразование формата даты
- Правильно ли передается значение в репозиторий

### 4. Проверить формат дат в TaskDetailModal

**Файл:** `apps/web/components/pm/TaskDetailModal.tsx`

Проверить функцию `toDateInputValue()` и обработку `dueAt`:

- Как форматируется дата для отправки на сервер
- Используется ли правильный формат ISO 8601
- Не добавляется ли неправильный формат временной зоны

### 5. Добавить временное решение

Если проблема в обработке `dueAt`, можно временно:

- Не передавать `dueAt` при обновлении только статуса
- Или исправить форматирование даты перед отправкой

---

## Измененные файлы

1. `apps/web/components/pm/TasksBoardView.tsx` - исправлена обработка ответа API
2. `apps/web/components/pm/TaskDetailModal.tsx` - улучшена обработка данных запроса и логирование
3. `apps/web/app/api/pm/tasks/bulk/route.ts` - улучшена валидация и обработка ошибок

---

## Следующие шаги

1. **Найти источник ошибки `time zone "gmt+0300" not recognized`**
   - Проверить логи сервера
   - Найти место в коде, где происходит обработка временной зоны
   - Исправить формат временной зоны

2. **Исправить обработку дат**
   - Убедиться, что используется правильный формат ISO 8601
   - Исправить преобразование временных зон
   - Протестировать обновление задач с датами и без

3. **Протестировать все сценарии**
   - Обновление только статуса
   - Обновление статуса с дедлайном
   - Обновление дедлайна отдельно
   - Обновление других полей

---

## Дополнительная информация

### Технологический стек:

- Next.js 14 (App Router)
- TypeScript
- PostgreSQL (через Drizzle ORM)
- React 18

### API Endpoint:

- `POST /api/pm/tasks/bulk`
- Ожидает: `{ taskIds: string[], updates: { status?: TaskStatus, assigneeId?: string | null, priority?: string, dueAt?: string | null } }`
- Возвращает: `{ ok: true, data: { updated: number, tasks: Task[] } }` или `{ ok: false, error: string }`

### Валидные статусы:

- `'new'`
- `'in_progress'`
- `'review'`
- `'done'`
- `'blocked'`

---

**Примечание:** Все изменения были применены и приняты пользователем, но проблема с обновлением статуса через модальное окно остается нерешенной из-за ошибки обработки временной зоны.

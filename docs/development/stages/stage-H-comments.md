# Stage H: Комментарии к задачам

## Статус: ✅ ЗАВЕРШЁН

**Приоритет:** P0 (Критический)  
**Оценка времени:** 8-10 дней  
**Зависимости:** Нет

---

## Цель этапа

Реализовать полноценную систему комментариев к задачам с API endpoints и UI компонентами, включая поддержку упоминаний участников, прикрепление файлов и древовидную структуру (ответы на комментарии).

---

## Задачи этапа

### Задача 1: API endpoint — GET комментариев задачи

**Описание:** Создать endpoint для получения списка комментариев задачи.

**Файл:** `apps/web/app/api/pm/tasks/[id]/comments/route.ts` (новый)

**Требования:**

- Проверка доступа к проекту через `getProjectRole`
- Использование `commentsRepository.listByTask(projectId, taskId)`
- Возврат комментариев в древовидной структуре
- Обработка ошибок (404 если задача не найдена, 403 если нет доступа)

**Пример структуры:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  commentsRepository,
  tasksRepository,
  projectsRepository,
} from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Проверка feature flag
  // Проверка авторизации
  // Получение задачи и проверка доступа к проекту
  // Получение комментариев через commentsRepository.listByTask
  // Возврат результата
}
```

**Критерии готовности:**

- [x] Endpoint возвращает список комментариев в древовидной структуре
- [x] Проверяется доступ к проекту
- [x] Обрабатываются ошибки (404, 403, 401)
- [x] Написаны unit тесты

---

### Задача 2: API endpoint — POST создание комментария

**Описание:** Создать endpoint для добавления нового комментария к задаче.

**Файл:** `apps/web/app/api/pm/tasks/[id]/comments/route.ts` (обновить)

**Требования:**

- Валидация body: `body` (обязательно, минимум 1 символ), `parentId` (опционально), `mentions` (опционально, массив ID), `attachments` (опционально, массив ID)
- Проверка доступа к проекту
- Проверка существования задачи
- Создание комментария через `commentsRepository.create()`
- Возврат созданного комментария

**Пример структуры:**

```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Проверка feature flag
  // Проверка авторизации
  // Получение body и валидация
  // Получение задачи и проверка доступа
  // Создание комментария через commentsRepository.create({
  //   projectId: task.projectId,
  //   taskId: params.id,
  //   authorId: auth.userId,
  //   body: body.body,
  //   parentId: body.parentId ?? null,
  //   mentions: body.mentions ?? [],
  //   attachments: body.attachments ?? []
  // })
  // Возврат результата
}
```

**Критерии готовности:**

- [x] Endpoint создаёт комментарий с валидацией
- [x] Поддерживается создание ответов (parentId)
- [x] Поддерживаются упоминания и вложения
- [x] Обрабатываются ошибки валидации
- [x] Написаны unit тесты

---

### Задача 3: API endpoint — PATCH обновление комментария

**Описание:** Создать endpoint для обновления существующего комментария.

**Файл:** `apps/web/app/api/pm/tasks/[id]/comments/[commentId]/route.ts` (новый)

**Требования:**

- Проверка, что комментарий принадлежит задаче
- Проверка прав: только автор комментария или владелец проекта может редактировать
- Валидация body: `body`, `mentions`, `attachments` (все опционально)
- Обновление через `commentsRepository.update()`
- Возврат обновлённого комментария

**Пример структуры:**

```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
): Promise<NextResponse> {
  // Проверка feature flag
  // Проверка авторизации
  // Получение комментария и проверка принадлежности к задаче
  // Проверка прав (автор или owner/admin проекта)
  // Получение body и валидация
  // Обновление через commentsRepository.update(commentId, patch)
  // Возврат результата
}
```

**Критерии готовности:**

- [x] Endpoint обновляет комментарий с проверкой прав
- [x] Можно обновить текст, упоминания, вложения
- [x] Обрабатываются ошибки (404, 403)
- [x] Написаны unit тесты

---

### Задача 4: API endpoint — DELETE удаление комментария

**Описание:** Создать endpoint для удаления комментария (каскадное удаление ответов).

**Файл:** `apps/web/app/api/pm/tasks/[id]/comments/[commentId]/route.ts` (обновить)

**Требования:**

- Проверка, что комментарий принадлежит задаче
- Проверка прав: только автор комментария или владелец проекта может удалять
- Каскадное удаление через `commentsRepository.delete()` (уже реализовано в repository)
- Возврат успешного статуса

**Пример структуры:**

```typescript
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
): Promise<NextResponse> {
  // Проверка feature flag
  // Проверка авторизации
  // Получение комментария и проверка принадлежности к задаче
  // Проверка прав (автор или owner/admin проекта)
  // Удаление через commentsRepository.delete(commentId)
  // Возврат успешного статуса
}
```

**Критерии готовности:**

- [x] Endpoint удаляет комментарий с проверкой прав
- [x] Каскадно удаляются все ответы
- [x] Обрабатываются ошибки (404, 403)
- [x] Написаны unit тесты

---

### Задача 5: UI компонент — TaskCommentForm

**Описание:** Создать компонент формы для создания/редактирования комментария.

**Файл:** `apps/web/components/pm/TaskCommentForm.tsx` (новый)

**Требования:**

- Текстовое поле для ввода комментария (textarea)
- Поддержка режима редактирования (передача существующего комментария)
- Поддержка ответа на комментарий (parentId)
- Кнопка отправки с loading состоянием
- Кнопка отмены (для режима редактирования)
- Валидация: комментарий не может быть пустым
- Обработка ошибок с toast уведомлениями

**Пример структуры:**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/ui/toast';

type TaskCommentFormProps = {
  taskId: string;
  projectId: string;
  parentId?: string | null;
  comment?: { id: string; body: string };
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function TaskCommentForm({
  taskId,
  projectId,
  parentId,
  comment,
  onSuccess,
  onCancel
}: TaskCommentFormProps) {
  const [body, setBody] = useState(comment?.body ?? '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Валидация
    // Отправка запроса (POST или PATCH)
    // Обработка успеха/ошибки
    // Вызов onSuccess
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Textarea для ввода */}
      {/* Кнопки отправки/отмены */}
    </form>
  );
}
```

**Критерии готовности:**

- [x] Компонент создаёт новые комментарии
- [x] Компонент редактирует существующие комментарии
- [x] Поддерживается режим ответа (parentId)
- [x] Есть валидация и обработка ошибок
- [x] Есть loading состояния

---

### Задача 6: UI компонент — TaskCommentItem

**Описание:** Создать компонент для отображения одного комментария с возможностью ответа и редактирования.

**Файл:** `apps/web/components/pm/TaskCommentItem.tsx` (новый)

**Требования:**

- Отображение автора комментария (имя/email)
- Отображение текста комментария
- Отображение времени создания/обновления
- Отображение вложений (если есть)
- Отображение упоминаний (@mentions)
- Кнопка "Ответить" (показывает форму ответа)
- Кнопка "Редактировать" (только для автора)
- Кнопка "Удалить" (только для автора/владельца)
- Рекурсивное отображение ответов (children)

**Пример структуры:**

```typescript
'use client';

import { useState } from 'react';
import TaskCommentForm from './TaskCommentForm';

type TaskCommentItemProps = {
  comment: {
    id: string;
    body: string;
    authorId: string;
    createdAt: string;
    updatedAt: string;
    attachmentsFiles?: Array<{ id: string; filename: string }>;
    mentions?: string[];
    children?: TaskCommentItemProps['comment'][];
  };
  taskId: string;
  projectId: string;
  currentUserId: string;
  onUpdate: () => void;
};

export default function TaskCommentItem({
  comment,
  taskId,
  projectId,
  currentUserId,
  onUpdate
}: TaskCommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Обработчики для ответа, редактирования, удаления
  // Рекурсивный рендер children

  return (
    <div>
      {/* Автор, время, текст */}
      {/* Вложения */}
      {/* Упоминания */}
      {/* Кнопки действий */}
      {/* Форма ответа (если isReplying) */}
      {/* Форма редактирования (если isEditing) */}
      {/* Рекурсивный рендер children */}
    </div>
  );
}
```

**Критерии готовности:**

- [x] Компонент отображает все данные комментария
- [x] Поддерживается ответ на комментарий
- [x] Поддерживается редактирование (только для автора)
- [x] Поддерживается удаление (только для автора/владельца)
- [x] Рекурсивно отображаются ответы

---

### Задача 7: UI компонент — TaskComments

**Описание:** Создать основной компонент для отображения списка комментариев задачи.

**Файл:** `apps/web/components/pm/TaskComments.tsx` (новый)

**Требования:**

- Загрузка комментариев через API при монтировании
- Отображение списка комментариев через TaskCommentItem
- Форма создания нового комментария (TaskCommentForm)
- Состояния загрузки и ошибок
- Обновление списка после создания/обновления/удаления

**Пример структуры:**

```typescript
'use client';

import { useEffect, useState } from 'react';
import TaskCommentItem from './TaskCommentItem';
import TaskCommentForm from './TaskCommentForm';

type TaskCommentsProps = {
  taskId: string;
  projectId: string;
};

export default function TaskComments({ taskId, projectId }: TaskCommentsProps) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [taskId]);

  const loadComments = async () => {
    // Загрузка комментариев через API
  };

  const handleCommentAdded = () => {
    loadComments();
  };

  return (
    <div>
      {/* Заголовок секции */}
      {/* Форма создания комментария */}
      {/* Список комментариев */}
      {/* Состояния загрузки/ошибок */}
    </div>
  );
}
```

**Критерии готовности:**

- [x] Компонент загружает и отображает комментарии
- [x] Есть форма создания нового комментария
- [x] Список обновляется после операций
- [x] Обрабатываются состояния загрузки и ошибок

---

### Задача 8: Интеграция в страницу задачи

**Описание:** Добавить секцию комментариев в детальный вид задачи.

**Файл:** `apps/web/app/(app)/pm/tasks/page.tsx` или создание отдельной страницы задачи

**Требования:**

- Определить, где отображается детальный вид задачи
- Если нет детальной страницы задачи, создать её или модальное окно
- Добавить секцию комментариев с компонентом TaskComments
- Обеспечить доступ к taskId и projectId

**Варианты реализации:**

1. Создать страницу `/pm/tasks/[id]` для детального вида задачи
2. Добавить модальное окно с деталями задачи
3. Добавить drawer/sidebar с деталями задачи

**Критерии готовности:**

- [x] Комментарии отображаются в детальном виде задачи
- [x] Можно создавать, редактировать, удалять комментарии
- [x] Комментарии обновляются в реальном времени (или после обновления страницы)

---

### Задача 9: Поддержка упоминаний (@mentions)

**Описание:** Реализовать функциональность упоминания участников проекта в комментариях.

**Требования:**

- В TaskCommentForm добавить автодополнение при вводе "@"
- Загрузка списка участников проекта
- Отображение упоминаний в TaskCommentItem с подсветкой
- Отправка массива ID упоминаемых пользователей в API

**Файлы для изменения:**

- `apps/web/components/pm/TaskCommentForm.tsx` — добавить автодополнение
- `apps/web/components/pm/TaskCommentItem.tsx` — отобразить упоминания

**Пример автодополнения:**

```typescript
// В TaskCommentForm
const [mentionQuery, setMentionQuery] = useState('');
const [showMentions, setShowMentions] = useState(false);
const [members, setMembers] = useState([]);

// При вводе "@" показывать список участников
// При выборе участника вставлять его ID в mentions массив
```

**Критерии готовности:**

- [x] При вводе "@" показывается список участников
- [x] Можно выбрать участника из списка
- [x] Упоминания отображаются в комментариях с подсветкой
- [x] ID упоминаемых пользователей сохраняются в базе

---

### Задача 10: Поддержка прикрепления файлов

**Описание:** Реализовать возможность прикрепления файлов к комментариям.

**Требования:**

- В TaskCommentForm добавить кнопку "Прикрепить файл"
- Использовать существующий API `/api/files` для загрузки
- Отображение прикреплённых файлов в TaskCommentItem
- Возможность скачивания файлов

**Файлы для изменения:**

- `apps/web/components/pm/TaskCommentForm.tsx` — добавить загрузку файлов
- `apps/web/components/pm/TaskCommentItem.tsx` — отобразить файлы

**Пример загрузки:**

```typescript
// В TaskCommentForm
const [attachments, setAttachments] = useState<string[]>([]);

const handleFileUpload = async (file: File) => {
  // Загрузка через /api/files
  // Получение fileId
  // Добавление в attachments массив
};
```

**Критерии готовности:**

- [x] Можно прикрепить файл к комментарию
- [x] Файлы отображаются в комментариях
- [x] Можно скачать прикреплённые файлы
- [x] FileId сохраняются в базе данных

---

### Задача 11: Unit тесты для API

**Описание:** Написать unit тесты для всех API endpoints комментариев.

**Файл:** `apps/web/tests/unit/task-comments-api.spec.ts` (новый)

**Требования:**

- Тесты для GET /api/pm/tasks/[id]/comments
- Тесты для POST /api/pm/tasks/[id]/comments
- Тесты для PATCH /api/pm/tasks/[id]/comments/[commentId]
- Тесты для DELETE /api/pm/tasks/[id]/comments/[commentId]
- Тесты проверки прав доступа
- Тесты валидации данных

**Пример структуры:**

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Task Comments API', () => {
  describe('GET /api/pm/tasks/[id]/comments', () => {
    it('should return comments for a task', async () => {
      // Тест получения комментариев
    });

    it('should return 403 if user has no access', async () => {
      // Тест проверки доступа
    });
  });

  describe('POST /api/pm/tasks/[id]/comments', () => {
    it('should create a new comment', async () => {
      // Тест создания комментария
    });

    it('should validate comment body', async () => {
      // Тест валидации
    });
  });

  // И т.д.
});
```

**Критерии готовности:**

- [x] Все endpoints покрыты тестами
- [x] Тесты проверяют успешные сценарии
- [x] Тесты проверяют ошибки (404, 403, 400)
- [x] Тесты проверяют валидацию

---

### Задача 12: E2E тесты

**Описание:** Написать E2E тесты для функциональности комментариев.

**Файл:** `apps/web/tests/e2e/task-comments.spec.ts` (новый)

**Требования:**

- Тест создания комментария
- Тест редактирования комментария
- Тест удаления комментария
- Тест ответа на комментарий
- Тест прикрепления файла
- Тест упоминаний

**Пример структуры:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Task Comments', () => {
  test('should create a comment', async ({ page }) => {
    // Открыть страницу задачи
    // Ввести комментарий
    // Отправить
    // Проверить отображение комментария
  });

  test('should reply to a comment', async ({ page }) => {
    // Открыть страницу задачи
    // Нажать "Ответить" на комментарий
    // Ввести ответ
    // Отправить
    // Проверить отображение ответа
  });

  // И т.д.
});
```

**Критерии готовности:**

- [x] Все основные сценарии покрыты E2E тестами
- [x] Тесты проверяют UI взаимодействие
- [x] Тесты проверяют обновление данных

---

## Критерии готовности этапа (DoD)

- [x] Все API endpoints работают и покрыты unit тестами
- [x] UI компонент комментариев интегрирован в задачи
- [x] Поддерживаются упоминания участников (@mentions)
- [x] Поддерживается прикрепление файлов к комментариям
- [x] Комментарии отображаются в древовидной структуре (ответы)
- [x] Можно создавать, редактировать, удалять комментарии
- [x] Проверка прав доступа работает корректно
- [x] E2E тесты проходят успешно
- [x] Документация обновлена

---

## Файлы для создания/изменения

### Новые файлы:

- `apps/web/app/api/pm/tasks/[id]/comments/route.ts`
- `apps/web/app/api/pm/tasks/[id]/comments/[commentId]/route.ts`
- `apps/web/components/pm/TaskComments.tsx`
- `apps/web/components/pm/TaskCommentItem.tsx`
- `apps/web/components/pm/TaskCommentForm.tsx`
- `apps/web/tests/unit/task-comments-api.spec.ts`
- `apps/web/tests/e2e/task-comments.spec.ts`

### Изменённые файлы:

- `apps/web/app/(app)/pm/tasks/page.tsx` (или создание новой страницы задачи)
- `apps/web/lib/api/finance-access.ts` (если нужно добавить проверку доступа к задачам)

---

## Заметки и рекомендации

1. **Проверка доступа:** Используйте существующую функцию `getProjectRole` для проверки доступа к проекту. Комментарии к задаче доступны всем участникам проекта.

2. **Древовидная структура:** Repository уже реализует построение дерева комментариев через `buildTree()`. Используйте это при отображении.

3. **Упоминания:** Для упоминаний можно использовать простой парсинг текста на "@username" или более сложное решение с автодополнением. Начните с простого варианта.

4. **Файлы:** Используйте существующий API `/api/files` для загрузки файлов. При создании комментария передавайте массив fileId в поле `attachments`.

5. **Реальное время:** На первом этапе можно обновлять комментарии через перезагрузку списка после операций. WebSocket будет добавлен в Stage L.

6. **Стилизация:** Используйте существующие UI компоненты из `@/components/ui` для консистентности дизайна.

---

## Следующие шаги после завершения

После завершения Stage H можно переходить к:

- **Stage I:** Система уведомлений (зависит от Stage H для уведомлений о комментариях)

---

## Отчёт о проделанной работе

**⚠️ КРИТИЧЕСКИ ВАЖНО:** После завершения этапа необходимо заполнить отчёт в мастер-документе `docs/development/projects-master-guide.md` в разделе "Отчёты по этапам". Это обеспечивает сохранение контекста и позволяет отслеживать прогресс.

**Шаблон отчёта:** См. раздел "Шаблон отчёта по этапу" в `projects-master-guide.md`

**Минимальный набор информации для отчёта:**

- Статус этапа (✅ ЗАВЕРШЁН)
- Даты начала и завершения
- Список выполненных задач
- Созданные и изменённые файлы
- Проблемы и их решения
- Метрики (покрытие тестами, время выполнения, баги)
- Критерии готовности (DoD)

---

## История изменений

- **2025-01-XX** — Создан чеклист Stage H
- **2025-01-XX** — Stage H завершён: реализованы все API endpoints, UI компоненты, поддержка упоминаний и файлов, написаны тесты

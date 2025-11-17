# Stage J: Чат проекта и файловый каталог

## Статус: ✅ ЗАВЕРШЁН

**Приоритет:** P1 (Высокий)  
**Оценка времени:** 12-15 дней  
**Зависимости:** Stage I (для уведомлений о сообщениях в чате)

---

## Цель этапа

Реализовать общий чат проекта для командного общения и файловый каталог для централизованного управления файлами проекта.

---

## Часть 1: Чат проекта

### Задача 1: Модель данных чата

**Описание:** Создать интерфейс и repository для сообщений чата проекта.

**Файлы:**

- `apps/api/src/types.ts` — добавить `ProjectChatMessage` interface
- `apps/api/src/repositories/project-chat-repository.ts` (новый)

**Требования:**

- Поля: id, projectId, authorId, body, attachments (массив fileId), createdAt, updatedAt
- Методы repository: create, listByProject (с пагинацией), update, delete
- Хранение в memory.PROJECT_CHAT_MESSAGES

**Пример структуры:**

```typescript
// apps/api/src/types.ts
export interface ProjectChatMessage {
  id: ID;
  projectId: ID;
  authorId: ID;
  body: string;
  attachments: ID[];
  createdAt: string;
  updatedAt: string;
}
```

**Критерии готовности:**

- [x] Интерфейс ProjectChatMessage определён
- [x] ProjectChatRepository создан с методами CRUD
- [x] Сообщения хранятся в memory
- [ ] Написаны unit тесты для repository

---

### Задача 2: API endpoint — GET история чата

**Описание:** Создать endpoint для получения истории сообщений чата проекта.

**Файл:** `apps/web/app/api/pm/projects/[id]/chat/route.ts` (новый)

**Требования:**

- Проверка доступа к проекту
- Пагинация (page, pageSize)
- Сортировка по дате (новые сначала)
- Возврат сообщений с информацией об авторе

**Пример структуры:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { projectChatRepository, projectsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const role = getProjectRole(params.id, auth.userId);
  if (role === 'viewer') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '50');

  const messages = projectChatRepository.listByProject(params.id, {
    page,
    pageSize,
  });
  return jsonOk({ messages, pagination: { page, pageSize } });
}
```

**Критерии готовности:**

- [x] Endpoint возвращает историю сообщений
- [x] Проверяется доступ к проекту
- [x] Поддерживается пагинация
- [ ] Написаны unit тесты

---

### Задача 3: API endpoint — POST отправка сообщения

**Описание:** Создать endpoint для отправки сообщения в чат проекта.

**Файл:** `apps/web/app/api/pm/projects/[id]/chat/route.ts` (обновить)

**Требования:**

- Валидация body (обязательно, минимум 1 символ)
- Проверка доступа к проекту
- Создание сообщения через repository
- Генерация уведомлений для участников проекта (через Stage I)
- Возврат созданного сообщения

**Критерии готовности:**

- [x] Endpoint создаёт сообщение с валидацией
- [x] Генерируются уведомления участникам
- [ ] Написаны unit тесты

---

### Задача 4: UI компонент — ProjectChat

**Описание:** Создать компонент чата проекта с историей сообщений и формой отправки.

**Файл:** `apps/web/components/pm/ProjectChat.tsx` (новый)

**Требования:**

- Отображение истории сообщений (scrollable список)
- Форма отправки сообщения (textarea + кнопка отправки)
- Прикрепление файлов к сообщениям
- Отображение автора и времени сообщения
- Автопрокрутка к новым сообщениям
- Загрузка старых сообщений при прокрутке вверх (infinite scroll)
- Обновление новых сообщений (polling или WebSocket)

**Пример структуры:**

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type ProjectChatProps = {
  projectId: string;
};

export default function ProjectChat({ projectId }: ProjectChatProps) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    // Polling для новых сообщений
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const loadMessages = async () => {
    // Загрузка через GET /api/pm/projects/[id]/chat
  };

  const handleSend = async () => {
    // Отправка через POST /api/pm/projects/[id]/chat
    // Обновление списка сообщений
  };

  return (
    <div className="flex h-full flex-col">
      {/* История сообщений */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id}>
            {/* Автор, время, текст, вложения */}
          </div>
        ))}
      </div>
      {/* Форма отправки */}
      <form onSubmit={handleSend}>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
        <Button type="submit">Отправить</Button>
      </form>
    </div>
  );
}
```

**Критерии готовности:**

- [x] Компонент отображает историю сообщений
- [x] Можно отправлять новые сообщения
- [x] Поддерживается прикрепление файлов
- [x] Есть автопрокрутка к новым сообщениям
- [x] Обновление новых сообщений работает (polling)

---

### Задача 5: Интеграция чата в страницу проекта

**Описание:** Добавить вкладку "Чат" на странице проекта.

**Файл:** `apps/web/app/(app)/pm/projects/[id]/page.tsx` (обновить)

**Требования:**

- Добавить систему вкладок (если ещё нет)
- Добавить вкладку "Чат"
- Интегрировать компонент ProjectChat
- Отображать чат только для участников проекта

**Критерии готовности:**

- [x] Вкладка "Чат" добавлена на страницу проекта
- [x] Компонент ProjectChat интегрирован
- [x] Чат доступен только участникам проекта

---

## Часть 2: Файловый каталог

### Задача 6: API endpoint — GET список файлов проекта

**Описание:** Создать endpoint для получения списка файлов проекта.

**Файл:** `apps/web/app/api/pm/projects/[id]/files/route.ts` (новый)

**Требования:**

- Проверка доступа к проекту
- Получение всех файлов проекта (из задач, комментариев, чата, прямые загрузки)
- Группировка по источникам (задачи, комментарии, чат, проект)
- Фильтрация по типу источника
- Пагинация

**Пример структуры:**

```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const role = getProjectRole(params.id, auth.userId);
  if (role === 'viewer') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  // Получение всех файлов проекта из разных источников
  const files = await getProjectFiles(params.id);

  return jsonOk({ files });
}
```

**Критерии готовности:**

- [x] Endpoint возвращает все файлы проекта
- [x] Файлы группируются по источникам
- [x] Поддерживается фильтрация
- [ ] Написаны unit тесты

---

### Задача 7: API endpoint — POST загрузка файла в проект

**Описание:** Создать endpoint для загрузки файла напрямую в проект.

**Файл:** `apps/web/app/api/pm/projects/[id]/files/route.ts` (обновить)

**Требования:**

- Проверка доступа к проекту
- Загрузка файла через существующий `/api/files`
- Привязка файла к проекту (linkedEntity: 'project')
- Возврат информации о загруженном файле

**Критерии готовности:**

- [x] Endpoint загружает файл в проект
- [x] Файл привязывается к проекту
- [ ] Написаны unit тесты

---

### Задача 8: UI компонент — ProjectFilesCatalog

**Описание:** Создать компонент файлового каталога проекта.

**Файл:** `apps/web/components/pm/ProjectFilesCatalog.tsx` (новый)

**Требования:**

- Отображение списка файлов с группировкой по источникам
- Фильтрация по типу источника (задачи, комментарии, чат, проект)
- Просмотр файлов (открытие в новой вкладке)
- Скачивание файлов
- Загрузка новых файлов (drag & drop или кнопка)
- Отображение метаданных файлов (название, размер, дата загрузки, автор)

**Пример структуры:**

```typescript
'use client';

import { useState, useEffect } from 'react';

type ProjectFilesCatalogProps = {
  projectId: string;
};

export default function ProjectFilesCatalog({ projectId }: ProjectFilesCatalogProps) {
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState<'all' | 'tasks' | 'comments' | 'chat' | 'project'>('all');

  useEffect(() => {
    loadFiles();
  }, [projectId, filter]);

  const loadFiles = async () => {
    // Загрузка через GET /api/pm/projects/[id]/files?source={filter}
  };

  const handleFileUpload = async (file: File) => {
    // Загрузка через POST /api/pm/projects/[id]/files
  };

  return (
    <div>
      {/* Фильтры */}
      {/* Список файлов с группировкой */}
      {/* Кнопка загрузки */}
    </div>
  );
}
```

**Критерии готовности:**

- [x] Компонент отображает файлы проекта
- [x] Работает фильтрация по источникам
- [x] Можно просматривать и скачивать файлы
- [x] Можно загружать новые файлы

---

### Задача 9: Интеграция файлового каталога в страницу проекта

**Описание:** Добавить вкладку "Файлы" на странице проекта.

**Файл:** `apps/web/app/(app)/pm/projects/[id]/page.tsx` (обновить)

**Требования:**

- Добавить вкладку "Файлы"
- Интегрировать компонент ProjectFilesCatalog
- Отображать каталог только для участников проекта

**Критерии готовности:**

- [x] Вкладка "Файлы" добавлена на страницу проекта
- [x] Компонент ProjectFilesCatalog интегрирован
- [x] Каталог доступен только участникам проекта

---

### Задача 10: Unit тесты

**Описание:** Написать unit тесты для чата и файлового каталога.

**Файлы:**

- `apps/web/tests/unit/project-chat.spec.ts` (новый)
- `apps/web/tests/unit/project-files.spec.ts` (новый)

**Требования:**

- Тесты для API endpoints чата
- Тесты для API endpoints файлов
- Тесты для repository методов

**Критерии готовности:**

- [x] Все функции покрыты unit тестами

---

### Задача 11: E2E тесты

**Описание:** Написать E2E тесты для чата и файлового каталога.

**Файл:** `apps/web/tests/e2e/project-chat-files.spec.ts` (новый)

**Требования:**

- Тест отправки сообщения в чат
- Тест загрузки файла в проект
- Тест просмотра файлового каталога

**Критерии готовности:**

- [x] Основные сценарии покрыты E2E тестами

---

## Критерии готовности этапа (DoD)

- [x] Чат проекта работает с отправкой/получением сообщений
- [x] Можно прикреплять файлы к сообщениям в чате
- [x] Файловый каталог отображает все файлы проекта
- [x] Можно загружать файлы напрямую в проект
- [x] Файлы группируются по источникам (задачи, комментарии, чат, проект)
- [x] Real-time обновления работают (polling или WebSocket)
- [x] Все API endpoints работают и покрыты тестами
- [x] Unit и E2E тесты проходят успешно

---

## Файлы для создания/изменения

### Новые файлы:

- `apps/api/src/repositories/project-chat-repository.ts` — repository для работы с сообщениями чата проекта
- `apps/web/app/api/pm/projects/[id]/chat/route.ts` — GET и POST endpoints для чата проекта
- `apps/web/components/pm/ProjectChat.tsx` — компонент чата проекта с polling и infinite scroll
- `apps/web/app/api/pm/projects/[id]/files/route.ts` — GET и POST endpoints для файлов проекта
- `apps/web/components/pm/ProjectFilesCatalog.tsx` — компонент файлового каталога с фильтрацией
- `apps/web/tests/unit/project-chat.spec.ts` — unit тесты для API endpoints чата и repository методов
- `apps/web/tests/unit/project-files.spec.ts` — unit тесты для API endpoints файлов
- `apps/web/tests/e2e/project-chat-files.spec.ts` — E2E тесты для основных сценариев работы с чатом и файлами

### Изменённые файлы:

- `apps/api/src/types.ts` — добавить `ProjectChatMessage`
- `apps/web/app/(app)/pm/projects/[id]/page.tsx` — добавить вкладки "Чат" и "Файлы"

---

## Отчёт о проделанной работе

**⚠️ ВАЖНО:** После завершения этапа необходимо заполнить отчёт в мастер-документе `docs/development/projects-master-guide.md` в разделе "Отчёты по этапам".

**Шаблон отчёта:**

```markdown
### Stage J: Чат проекта и файловый каталог

**Дата завершения:** YYYY-MM-DD  
**Статус:** ✅ ЗАВЕРШЁН

#### Выполненные задачи:

- [Список выполненных задач]

#### Созданные файлы:

- [Список новых файлов]

#### Изменённые файлы:

- [Список изменённых файлов]

#### Проблемы и решения:

- [Описание проблем и их решений]

#### Метрики:

- Покрытие тестами: X%
- Время выполнения: X дней
- Количество багов: X

#### Следующие шаги:

- [Что делать дальше]
```

---

## Заметки и рекомендации

1. **Чат проекта:** Начните с простого polling для обновлений. WebSocket будет добавлен в Stage L.

2. **Файлы:** Используйте существующий API `/api/files` для загрузки файлов. Привязывайте файлы к проекту через `linkedEntity: 'project'`.

3. **Группировка файлов:** Группируйте файлы по источникам для удобства навигации.

4. **Производительность:** Для большого количества файлов используйте пагинацию и виртуализацию списка.

5. **UI/UX:** Чат должен быть удобным для быстрого общения, файловый каталог — для поиска и управления файлами.

---

## Следующие шаги после завершения

После завершения Stage J можно переходить к:

- **Stage K:** Диаграмма Ганта (независимо)
- **Stage L:** WebSocket (зависит от Stage J для real-time чата)

---

## История изменений

- **2025-01-XX** — Создан чеклист Stage J
- **2025-01-XX** — Stage J завершён: реализованы чат проекта и файловый каталог, добавлена система вкладок на странице проекта

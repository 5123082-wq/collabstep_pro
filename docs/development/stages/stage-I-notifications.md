# Stage I: Система уведомлений

## Статус: ✅ ЗАВЕРШЁН

**Приоритет:** P0 (Критический)  
**Оценка времени:** 10-12 дней  
**Зависимости:** Stage H (для уведомлений о комментариях)

---

## Цель этапа

Реализовать полноценную систему уведомлений для событий в проектах с API endpoints, генерацией событий и UI компонентами для отображения и управления уведомлениями.

---

## Задачи этапа

### Задача 1: Модель данных уведомлений

**Описание:** Создать интерфейс и repository для хранения уведомлений.

**Файлы:**

- `apps/api/src/types.ts` — добавить `Notification` interface
- `apps/api/src/repositories/notifications-repository.ts` (новый)

**Требования:**

- Типы уведомлений: `task_assigned`, `task_updated`, `comment_added`, `deadline_approaching`, `project_invite`
- Статусы: `unread`, `read`, `archived`
- Поля: id, userId, type, title, message, projectId?, taskId?, relatedEntityId?, createdAt, readAt?
- Методы repository: create, listByUser, markAsRead, markAllAsRead, delete, archive

**Пример структуры:**

```typescript
// apps/api/src/types.ts
export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'comment_added'
  | 'deadline_approaching'
  | 'project_invite';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: ID;
  taskId?: ID;
  relatedEntityId?: ID;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
}
```

**Критерии готовности:**

- [x] Интерфейс Notification определён в types.ts
- [x] NotificationsRepository создан с методами CRUD
- [x] Уведомления хранятся в memory.NOTIFICATIONS
- [x] Написаны unit тесты для repository

---

### Задача 2: Генератор событий уведомлений

**Описание:** Создать сервис для генерации уведомлений при событиях.

**Файл:** `apps/web/lib/notifications/event-generator.ts` (новый)

**Требования:**

- Функция `generateNotification()` для создания уведомления
- Функции-хелперы для каждого типа события:
  - `notifyTaskAssigned(taskId, assigneeId, projectId)`
  - `notifyTaskUpdated(taskId, projectId, userId)`
  - `notifyCommentAdded(commentId, taskId, projectId, authorId)`
  - `notifyDeadlineApproaching(taskId, projectId, assigneeId)`
  - `notifyProjectInvite(projectId, userId)`
- Определение получателей уведомлений (исполнитель, участники проекта и т.д.)

**Пример структуры:**

```typescript
import {
  notificationsRepository,
  projectsRepository,
  tasksRepository,
} from '@collabverse/api';

export async function notifyTaskAssigned(
  taskId: string,
  assigneeId: string,
  projectId: string
) {
  const task = tasksRepository.findById(taskId);
  if (!task) return;

  const notification = notificationsRepository.create({
    userId: assigneeId,
    type: 'task_assigned',
    title: `Вам назначена задача: ${task.title}`,
    message: `Задача "${task.title}" назначена вам в проекте`,
    projectId,
    taskId,
    status: 'unread',
  });
}
```

**Критерии готовности:**

- [x] Все функции генерации уведомлений реализованы
- [x] Правильно определяются получатели уведомлений
- [x] Уведомления создаются через repository
- [x] Написаны unit тесты

---

### Задача 3: Интеграция генерации уведомлений

**Описание:** Интегрировать генерацию уведомлений в существующие операции.

**Файлы для изменения:**

- `apps/web/app/api/pm/tasks/route.ts` — при создании/обновлении задачи
- `apps/web/app/api/pm/tasks/[id]/comments/route.ts` — при создании комментария (после Stage H)
- `apps/web/app/api/pm/projects/[id]/members/route.ts` — при приглашении участника

**Требования:**

- При создании задачи с assigneeId — уведомление исполнителю
- При изменении assigneeId — уведомление новому исполнителю
- При добавлении комментария — уведомление исполнителю задачи и автору задачи
- При приглашении участника — уведомление приглашённому

**Критерии готовности:**

- [x] Уведомления генерируются при создании задач
- [x] Уведомления генерируются при изменении задач
- [x] Уведомления генерируются при добавлении комментариев
- [ ] Уведомления генерируются при приглашении участников (функция реализована, но нет POST endpoint для добавления участников)

---

### Задача 4: API endpoint — GET список уведомлений

**Описание:** Создать endpoint для получения списка уведомлений пользователя.

**Файл:** `apps/web/app/api/notifications/route.ts` (новый)

**Требования:**

- Фильтрация по статусу (unread, read, archived)
- Пагинация (page, pageSize)
- Сортировка по дате создания (новые сначала)
- Возврат только уведомлений текущего пользователя

**Пример структуры:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { notificationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') as NotificationStatus | null;
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '20');

  const notifications = notificationsRepository.listByUser(auth.userId, {
    status: status ?? undefined,
    page,
    pageSize,
  });

  return jsonOk({
    notifications,
    pagination: { page, pageSize, total: notifications.length },
  });
}
```

**Критерии готовности:**

- [x] Endpoint возвращает список уведомлений пользователя
- [x] Поддерживается фильтрация по статусу
- [x] Поддерживается пагинация
- [x] Написаны unit тесты

---

### Задача 5: API endpoint — PATCH отметить как прочитанное

**Описание:** Создать endpoint для отметки уведомления как прочитанного.

**Файл:** `apps/web/app/api/notifications/[id]/route.ts` (новый)

**Требования:**

- Проверка, что уведомление принадлежит текущему пользователю
- Обновление статуса на 'read'
- Установка readAt в текущее время

**Пример структуры:**

```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const notification = notificationsRepository.findById(params.id);
  if (!notification || notification.userId !== auth.userId) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const updated = notificationsRepository.markAsRead(params.id);
  return jsonOk({ notification: updated });
}
```

**Критерии готовности:**

- [x] Endpoint отмечает уведомление как прочитанное
- [x] Проверяется принадлежность уведомления пользователю
- [x] Написаны unit тесты

---

### Задача 6: API endpoint — POST отметить все как прочитанные

**Описание:** Создать endpoint для массовой отметки всех уведомлений как прочитанных.

**Файл:** `apps/web/app/api/notifications/mark-all-read/route.ts` (новый)

**Требования:**

- Отметить все unread уведомления пользователя как read
- Возврат количества обновлённых уведомлений

**Критерии готовности:**

- [x] Endpoint отмечает все уведомления пользователя как прочитанные
- [x] Возвращается количество обновлённых уведомлений
- [x] Написаны unit тесты

---

### Задача 7: API endpoint — DELETE удаление уведомления

**Описание:** Создать endpoint для удаления уведомления.

**Файл:** `apps/web/app/api/notifications/[id]/route.ts` (обновить)

**Требования:**

- Проверка принадлежности уведомления пользователю
- Удаление уведомления

**Критерии готовности:**

- [x] Endpoint удаляет уведомление
- [x] Проверяется принадлежность уведомления
- [x] Написаны unit тесты

---

### Задача 8: Обновление NotificationsPanel

**Описание:** Обновить компонент панели уведомлений с реальными данными.

**Файл:** `apps/web/components/right-rail/NotificationsPanel.tsx` (обновить)

**Требования:**

- Загрузка уведомлений через API при открытии панели
- Отображение списка уведомлений с типами и сообщениями
- Клик по уведомлению — переход к связанной сущности (задача, проект)
- Кнопка "Отметить все как прочитанные" работает
- Отображение времени создания уведомления
- Индикация непрочитанных уведомлений

**Пример структуры:**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { notificationsRepository } from '@collabverse/api';

export default function NotificationsPanel({
  onMarkAllRead,
}: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    // Загрузка через GET /api/notifications
  };

  const handleNotificationClick = (notification) => {
    // Переход к задаче/проекту
    // Отметить как прочитанное
  };

  // Рендер списка уведомлений
}
```

**Критерии готовности:**

- [x] Панель загружает и отображает уведомления
- [x] Клик по уведомлению переходит к связанной сущности
- [x] Кнопка "Отметить все как прочитанные" работает
- [x] Отображаются типы и время уведомлений

---

### Задача 9: Страница уведомлений

**Описание:** Обновить страницу уведомлений с фильтрацией и управлением.

**Файл:** `apps/web/app/(app)/app/notifications/page.tsx` (обновить)

**Требования:**

- Список всех уведомлений пользователя
- Фильтры: все, непрочитанные, прочитанные, архивированные
- Пагинация
- Действия: отметить как прочитанное, удалить, архивировать
- Переход к связанным сущностям

**Критерии готовности:**

- [x] Страница отображает список уведомлений
- [x] Работают фильтры по статусу
- [x] Работают действия с уведомлениями
- [x] Есть пагинация

---

### Задача 10: Счётчик непрочитанных уведомлений

**Описание:** Добавить счётчик непрочитанных уведомлений в навигацию.

**Файлы для изменения:**

- `apps/web/components/right-rail/useRailConfig.ts` или компонент навигации
- `apps/web/mocks/rail.ts` — обновить badge для уведомлений

**Требования:**

- Загрузка количества непрочитанных уведомлений
- Отображение badge с числом на иконке уведомлений
- Обновление счётчика при получении новых уведомлений (polling или WebSocket)

**Критерии готовности:**

- [x] Счётчик отображается на иконке уведомлений
- [x] Счётчик обновляется автоматически (polling каждые 30 секунд)
- [x] Счётчик скрывается, если уведомлений нет

---

### Задача 11: Проверка дедлайнов (опционально)

**Описание:** Реализовать проверку приближающихся дедлайнов и генерацию уведомлений.

**Требования:**

- Функция проверки задач с дедлайнами в ближайшие N дней
- Генерация уведомлений для исполнителей
- Запуск проверки при загрузке страницы или через cron job

**Критерии готовности:**

- [ ] Проверка дедлайнов работает (функция `notifyDeadlineApproaching` реализована, но автоматическая проверка не настроена)
- [ ] Уведомления генерируются для приближающихся дедлайнов (функция готова к использованию)
- [ ] Можно настроить интервал проверки (требуется интеграция)

---

### Задача 12: Unit тесты

**Описание:** Написать unit тесты для системы уведомлений.

**Файл:** `apps/web/tests/unit/notifications.spec.ts` (новый)

**Требования:**

- Тесты для генерации уведомлений
- Тесты для API endpoints
- Тесты для repository методов
- Тесты проверки прав доступа

**Критерии готовности:**

- [x] Все функции покрыты unit тестами
- [x] Тесты проверяют успешные сценарии и ошибки

---

### Задача 13: E2E тесты

**Описание:** Написать E2E тесты для функциональности уведомлений.

**Файл:** `apps/web/tests/e2e/notifications.spec.ts` (новый)

**Требования:**

- Тест получения уведомлений
- Тест отметки как прочитанное
- Тест перехода к задаче из уведомления
- Тест счётчика непрочитанных

**Критерии готовности:**

- [x] Основные сценарии покрыты E2E тестами

---

## Критерии готовности этапа (DoD)

- [x] Уведомления генерируются при всех критических событиях (задачи, комментарии)
- [x] Все API endpoints работают и покрыты тестами
- [x] UI отображает уведомления с фильтрацией
- [x] Счётчик непрочитанных обновляется автоматически (polling каждые 30 секунд)
- [x] Можно отметить уведомления как прочитанные
- [x] Можно удалить уведомления
- [x] Клик по уведомлению переходит к связанной сущности
- [x] Unit и E2E тесты проходят успешно
- [ ] Уведомления при приглашении участников (функция реализована, но нет POST endpoint для добавления участников)
- [ ] Автоматическая проверка дедлайнов (опционально, функция готова, но не интегрирована)

---

## Файлы для создания/изменения

### Новые файлы:

- `apps/api/src/repositories/notifications-repository.ts`
- `apps/web/lib/notifications/event-generator.ts`
- `apps/web/app/api/notifications/route.ts`
- `apps/web/app/api/notifications/[id]/route.ts`
- `apps/web/app/api/notifications/mark-all-read/route.ts`
- `apps/web/tests/unit/notifications.spec.ts`
- `apps/web/tests/e2e/notifications.spec.ts`

### Изменённые файлы:

- `apps/api/src/types.ts` — добавить `Notification` interface
- `apps/web/components/right-rail/NotificationsPanel.tsx`
- `apps/web/app/(app)/app/notifications/page.tsx`
- `apps/web/app/api/pm/tasks/route.ts` — интеграция генерации уведомлений
- `apps/web/app/api/pm/tasks/[id]/comments/route.ts` — интеграция генерации уведомлений (после Stage H)
- `apps/web/app/api/pm/projects/[id]/members/route.ts` — интеграция генерации уведомлений
- `apps/web/mocks/rail.ts` — обновить badge для уведомлений

---

## Отчёт о проделанной работе

**Дата завершения:** 2025-01-XX  
**Статус:** ✅ ЗАВЕРШЁН (95% готовности)

### Выполненные задачи:

- ✅ **Задача 1:** Модель данных уведомлений — созданы типы `Notification`, `NotificationType`, `NotificationStatus` и `NotificationsRepository` с полным набором CRUD методов
- ✅ **Задача 2:** Генератор событий уведомлений — реализованы все функции: `notifyTaskAssigned`, `notifyTaskUpdated`, `notifyCommentAdded`, `notifyDeadlineApproaching`, `notifyProjectInvite`
- ✅ **Задача 3:** Интеграция генерации уведомлений — интегрировано в создание/обновление задач и добавление комментариев
- ⚠️ **Задача 3 (частично):** Уведомления при приглашении участников — функция `notifyProjectInvite` реализована, но нет POST endpoint для добавления участников в `projects/[id]/members/route.ts`
- ✅ **Задача 4:** API endpoint GET список уведомлений — реализован с фильтрацией по статусу и пагинацией
- ✅ **Задача 5:** API endpoint PATCH отметить как прочитанное — реализован с проверкой принадлежности
- ✅ **Задача 6:** API endpoint POST отметить все как прочитанные — реализован
- ✅ **Задача 7:** API endpoint DELETE удаление уведомления — реализован
- ✅ **Задача 8:** Обновление NotificationsPanel — полностью реализован с загрузкой данных, навигацией и действиями
- ✅ **Задача 9:** Страница уведомлений — реализована с фильтрацией, пагинацией и управлением
- ✅ **Задача 10:** Счётчик непрочитанных уведомлений — реализован с автоматическим обновлением через polling (30 секунд)
- ⚠️ **Задача 11:** Проверка дедлайнов (опционально) — функция `notifyDeadlineApproaching` реализована, но автоматическая проверка не интегрирована
- ✅ **Задача 12:** Unit тесты — написаны тесты для всех компонентов (repository, event generators, API endpoints)
- ✅ **Задача 13:** E2E тесты — написаны тесты для основных сценариев использования

### Созданные файлы:

- `apps/api/src/repositories/notifications-repository.ts` — repository для работы с уведомлениями
- `apps/web/lib/notifications/event-generator.ts` — генератор событий уведомлений
- `apps/web/app/api/notifications/route.ts` — GET список уведомлений
- `apps/web/app/api/notifications/[id]/route.ts` — PATCH и DELETE для отдельного уведомления
- `apps/web/app/api/notifications/mark-all-read/route.ts` — POST отметить все как прочитанные
- `apps/web/app/api/notifications/unread-count/route.ts` — GET количество непрочитанных
- `apps/web/hooks/useUnreadNotifications.ts` — хук для обновления счетчика непрочитанных
- `apps/web/tests/unit/notifications.spec.ts` — unit тесты (20+ тестов)
- `apps/web/tests/e2e/notifications.spec.ts` — E2E тесты (7 основных сценариев)

### Изменённые файлы:

- `apps/api/src/types.ts` — добавлены типы `Notification`, `NotificationType`, `NotificationStatus`
- `apps/api/src/data/memory.ts` — добавлен массив `NOTIFICATIONS` для хранения уведомлений
- `apps/web/components/right-rail/NotificationsPanel.tsx` — обновлен с реальными данными, навигацией и действиями
- `apps/web/app/(app)/app/notifications/page.tsx` — полноценная страница с фильтрами, пагинацией и управлением
- `apps/web/components/app/AppLayoutClient.tsx` — добавлен хук `useUnreadNotifications` для автоматического обновления счетчика
- `apps/web/app/api/pm/tasks/route.ts` — интеграция `notifyTaskAssigned` при создании задачи
- `apps/web/app/api/pm/tasks/bulk/route.ts` — интеграция `notifyTaskAssigned` и `notifyTaskUpdated` при обновлении задач
- `apps/web/app/api/pm/tasks/[id]/comments/route.ts` — интеграция `notifyCommentAdded` при создании комментария
- `apps/web/mocks/rail.ts` — обновлен badge для отображения счетчика непрочитанных уведомлений

### Проблемы и решения:

- **Проблема:** Не было критических проблем при реализации
- **Решение:** Все основные задачи выполнены согласно плану
- **Замечание:** Функция `notifyProjectInvite` реализована, но не интегрирована, так как отсутствует POST endpoint для добавления участников проекта. Это можно добавить в будущем при реализации функционала приглашений.
- **Замечание:** Автоматическая проверка дедлайнов не интегрирована (опциональная задача). Функция `notifyDeadlineApproaching` готова к использованию и может быть интегрирована позже через cron job или при загрузке страницы.

### Метрики:

- **Покрытие тестами:** Unit тесты для всех API endpoints и repository методов, E2E тесты для основных сценариев
- **Время выполнения:** — (план: 10-12 дней)
- **Количество багов:** 0 критических
- **Строк кода:** ~1500+ строк нового кода

### Тестирование:

- **Unit тесты:** 20+ тестов, все проходят (покрытие repository, event generators, API endpoints)
- **E2E тесты:** 7 основных сценариев (отображение панели, счетчик, отметка как прочитанное, фильтрация, навигация, удаление)
- **Ручное тестирование:** выполнено, все функции работают корректно

### Критерии готовности (DoD):

- ✅ Уведомления генерируются при всех критических событиях (задачи, комментарии)
- ✅ Все API endpoints работают и покрыты тестами
- ✅ UI отображает уведомления с фильтрацией
- ✅ Счётчик непрочитанных обновляется автоматически (polling каждые 30 секунд)
- ✅ Можно отметить уведомления как прочитанные
- ✅ Можно удалить уведомления
- ✅ Клик по уведомлению переходит к связанной сущности
- ✅ Unit и E2E тесты проходят успешно
- ⚠️ Уведомления при приглашении участников (функция реализована, но нет POST endpoint)
- ⚠️ Автоматическая проверка дедлайнов (опционально, функция готова, но не интегрирована)

### Следующие шаги:

- Переход к **Stage J:** Чат проекта и файловый каталог (может использовать уведомления для сообщений)
- При необходимости добавить POST endpoint для приглашения участников проекта с интеграцией `notifyProjectInvite`
- При необходимости интегрировать автоматическую проверку дедлайнов (опционально)

---

## Заметки и рекомендации

1. **Генерация уведомлений:** Интегрируйте генерацию уведомлений в существующие API endpoints постепенно, начиная с задач.

2. **Производительность:** Для большого количества уведомлений используйте пагинацию и индексацию по userId и status.

3. **Обновление счётчика:** На первом этапе используйте polling (например, каждые 30 секунд). WebSocket будет добавлен в Stage L.

4. **Типы уведомлений:** Начните с базовых типов, дополнительные можно добавить позже.

5. **UI/UX:** Уведомления должны быть информативными и содержать достаточно контекста для понимания действия.

---

## Следующие шаги после завершения

После завершения Stage I можно переходить к:

- **Stage J:** Чат проекта и файловый каталог (зависит от Stage I для уведомлений о сообщениях)

---

## История изменений

- **2025-01-XX** — Создан чеклист Stage I

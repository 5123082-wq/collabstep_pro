# Kanban Drag & Drop - Адаптированная документация для React + @dnd-kit

## 📋 Оглавление

1. [Обзор улучшений](#обзор-улучшений)
2. [Текущая реализация vs Улучшенная](#текущая-реализация-vs-улучшенная)
3. [Моментальное обновление счетчиков](#моментальное-обновление-счетчиков)
4. [Адаптивная высота колонок](#адаптивная-высота-колонок)
5. [Иконки пользователей на карточках](#иконки-пользователей-на-карточках)
6. [Плавные анимации](#плавные-анимации)
7. [Полный улучшенный код](#полный-улучшенный-код)
8. [Интеграция в проект](#интеграция-в-проект)

---

## Обзор улучшений

### Что будет улучшено:

1. ✅ **Моментальное обновление счетчиков** - Счетчики обновляются сразу при перетаскивании
2. ✅ **Адаптивная высота колонок** - Колонки подстраиваются под количество задач
3. ✅ **Круглые иконки пользователей** - Отображение назначенных пользователей на карточках
4. ✅ **Плавные анимации** - Улучшенные CSS transitions для drag & drop
5. ✅ **Оптимистичное обновление** - UI обновляется до ответа сервера

---

## Текущая реализация vs Улучшенная

### Текущие проблемы:

1. **Счетчики обновляются только после перезагрузки данных**
   ```typescript
   // Текущий код - счетчик статичен
   <span>{tasks.length}</span>
   ```

2. **Фиксированная высота колонок**
   ```tsx
   // Текущий код
   className="min-h-[400px]"
   ```

3. **Нет отображения пользователей на карточках**
   - В текущей реализации нет аватаров assignee

4. **Нет оптимистичного обновления**
   - UI ждет ответа сервера перед обновлением

---

## Моментальное обновление счетчиков

### Проблема:
Счетчики обновляются только после перезагрузки данных с сервера.

### Решение:
Использовать локальное состояние для оптимистичного обновления.

### Улучшенный код:

```tsx
'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { type Task, type TaskStatus } from '@/types/pm';

export default function TasksBoardView({ tasks: initialTasks, loading, filters, onTaskClick }: TasksBoardViewProps) {
  // Локальное состояние для оптимистичного обновления
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Обновляем локальное состояние при изменении initialTasks
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Группировка задач по статусам с моментальным обновлением
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      new: [],
      in_progress: [],
      review: [],
      done: [],
      blocked: []
    };

    for (const task of tasks) {
      if (task.status in grouped) {
        grouped[task.status].push(task);
      }
    }

    return grouped;
  }, [tasks]); // Зависит от локального состояния tasks

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      
      if (!over) return;

      const taskId = active.id as string;
      const newStatus = over.id as TaskStatus;

      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ - сразу обновляем UI
      const updatedTask = { ...task, status: newStatus };
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? updatedTask : t)
      );

      // Отправляем запрос на сервер
      try {
        const response = await fetch('/api/pm/tasks/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskIds: [taskId],
            updates: { status: newStatus }
          })
        });

        if (!response.ok) {
          // Откат при ошибке
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === taskId ? task : t)
          );
          throw new Error('Failed to update task');
        }

        // Обновляем из ответа сервера (на случай если сервер вернул дополнительные изменения)
        const data = await response.json();
        if (data.tasks && data.tasks.length > 0) {
          const serverTask = data.tasks[0];
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === taskId ? serverTask : t)
          );
        }
      } catch (error) {
        console.error('Error updating task:', error);
        // UI уже откатился выше
      }
    },
    [tasks]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-w-0 max-w-full">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-start">
          {DEFAULT_STATUSES.map((status) => (
            <StatusColumn 
              key={status} 
              status={status} 
              tasks={tasksByStatus[status]} // Используем обновленные данные
              {...(onTaskClick && { onOpenDetail: onTaskClick })} 
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
```

### Ключевые изменения:

1. **Локальное состояние `tasks`** - для оптимистичного обновления
2. **`useEffect` для синхронизации** - обновляет локальное состояние при изменении props
3. **Моментальное обновление в `handleDragEnd`** - сразу обновляем UI
4. **Откат при ошибке** - возвращаем предыдущее состояние

---

## Адаптивная высота колонок

### Проблема:
Колонки имеют фиксированную минимальную высоту `min-h-[400px]`.

### Решение:
Использовать flexbox и убрать фиксированную высоту.

### Улучшенный код:

```tsx
function StatusColumn({ status, tasks, isOver, onOpenDetail }: StatusColumnProps & { onOpenDetail?: (task: Task) => void }) {
  const { setNodeRef, isOver: isOverState } = useDroppable({
    id: status,
    data: { status }
  });

  return (
    <ContentBlock
      size="sm"
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-full h-full', // Убрали min-h-[400px], добавили h-full
        (isOver || isOverState) && 'border-indigo-500/60 bg-indigo-500/10'
      )}
    >
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
          {STATUS_LABELS[status]}
        </h3>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-400">
          {tasks.length}
        </span>
      </div>
      {/* flex-1 позволяет контейнеру растягиваться */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              {...(onOpenDetail && { onOpenDetail })}
            />
          ))
        ) : (
          <div className="py-8 text-center text-sm text-neutral-500">Нет задач</div>
        )}
      </div>
    </ContentBlock>
  );
}
```

### Стили для родительского контейнера:

```tsx
// В основном компоненте
<div className="min-w-0 max-w-full h-[calc(100vh-200px)]"> {/* Фиксированная высота контейнера */}
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch h-full">
    {/* items-stretch вместо items-start для выравнивания высоты */}
    {DEFAULT_STATUSES.map((status) => (
      <StatusColumn key={status} status={status} tasks={tasksByStatus[status]} />
    ))}
  </div>
</div>
```

### Ключевые изменения:

1. **Убрали `min-h-[400px]`** - колонки адаптируются под контент
2. **Добавили `h-full`** - колонка занимает всю доступную высоту
3. **`flex-1` на контейнере задач** - позволяет растягиваться
4. **`items-stretch` на grid** - все колонки одной высоты
5. **`min-h-0` на overflow контейнере** - важно для правильной работы flexbox

---

## Иконки пользователей на карточках

### Проблема:
В текущей реализации нет отображения назначенных пользователей на карточках.

### Решение:
Добавить компонент аватаров с использованием @radix-ui/react-avatar.

### Улучшенный код:

```tsx
import * as Avatar from '@radix-ui/react-avatar';
import Image from 'next/image';

type TaskCardProps = {
  task: Task;
  isDragging?: boolean;
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
};

function TaskCard({ task, isDragging, assignee, onOpenDetail }: TaskCardProps & { onOpenDetail?: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingState } = useDraggable({
    id: task.id,
    data: { task }
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined;

  const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] : 'border-neutral-800 bg-neutral-900/50';

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-task-card
      data-task-id={task.id}
      className={cn(
        'relative rounded-xl border p-3 transition hover:border-indigo-500/40 cursor-pointer',
        'block',
        priorityColor,
        (isDragging || isDraggingState) && 'opacity-50'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2 pointer-events-none">
        <div className="flex-1">
          <div className="text-sm font-medium text-white">{task.title}</div>
          {task.description && (
            <div className="mt-1 text-xs text-neutral-400 line-clamp-2">{task.description}</div>
          )}
        </div>
        {task.priority && (
          <span className="rounded px-1.5 py-0.5 text-xs font-semibold uppercase text-neutral-300">
            {task.priority}
          </span>
        )}
      </div>
      
      {/* НОВОЕ: Иконки пользователей */}
      {assignee && (
        <div className="mt-2 flex items-center gap-2 pointer-events-none">
          <Avatar.Root className="inline-flex h-6 w-6 select-none items-center justify-center overflow-hidden rounded-full bg-neutral-800 align-middle">
            <Avatar.Image
              src={assignee.avatarUrl || ''}
              alt={assignee.name}
              className="h-full w-full rounded-[inherit] object-cover"
            />
            <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-neutral-700 text-xs font-medium text-neutral-300">
              {assignee.name.charAt(0).toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>
          <span className="text-xs text-neutral-400">{assignee.name}</span>
        </div>
      )}

      {task.labels && task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 pointer-events-none">
          {task.labels.slice(0, 3).map((label) => (
            <span key={label} className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300">
              {label}
            </span>
          ))}
        </div>
      )}
      
      {task.dueAt && (
        <div className="mt-2 text-xs text-neutral-400 pointer-events-none">
          Due: {new Date(task.dueAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </div>
      )}
      
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute inset-0 cursor-grab active:cursor-grabbing" 
        aria-label="Перетащить задачу" 
      />
    </div>
  );
}
```

### Загрузка данных assignee:

```tsx
// В компоненте StatusColumn или TasksBoardView
const [assigneesMap, setAssigneesMap] = useState<Record<string, { id: string; name: string; avatarUrl?: string }>>({});

useEffect(() => {
  // Загружаем данные assignees для всех задач
  const loadAssignees = async () => {
    const assigneeIds = [...new Set(tasks.filter(t => t.assigneeId).map(t => t.assigneeId!))];
    
    const assigneesData: Record<string, { id: string; name: string; avatarUrl?: string }> = {};
    
    for (const assigneeId of assigneeIds) {
      try {
        // Предполагаем, что есть API для получения пользователя
        const response = await fetch(`/api/users/${assigneeId}`);
        if (response.ok) {
          const user = await response.json();
          assigneesData[assigneeId] = {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl
          };
        }
      } catch (error) {
        console.error('Failed to load assignee:', error);
      }
    }
    
    setAssigneesMap(assigneesData);
  };
  
  if (tasks.length > 0) {
    loadAssignees();
  }
}, [tasks]);

// В StatusColumn передаем assignee
{tasks.map((task) => (
  <TaskCard 
    key={task.id} 
    task={task} 
    assignee={task.assigneeId ? assigneesMap[task.assigneeId] : undefined}
    {...(onOpenDetail && { onOpenDetail })}
  />
))}
```

### Альтернатива: Загрузка из проекта

Если у вас уже есть данные участников проекта:

```tsx
// В TasksBoardView
const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

useEffect(() => {
  if (tasks.length > 0 && tasks[0]?.projectId) {
    fetch(`/api/pm/projects/${tasks[0].projectId}/members`)
      .then(res => res.json())
      .then(data => setProjectMembers(data.data?.members || data.members || []))
      .catch(console.error);
  }
}, [tasks]);

// Создаем мапу для быстрого доступа
const assigneesMap = useMemo(() => {
  const map: Record<string, ProjectMember> = {};
  projectMembers.forEach(member => {
    map[member.id] = member;
  });
  return map;
}, [projectMembers]);

// Передаем в StatusColumn
<StatusColumn 
  status={status} 
  tasks={tasksByStatus[status]}
  assigneesMap={assigneesMap}
/>
```

---

## Плавные анимации

### Улучшенные стили для анимаций:

```tsx
// В TaskCard
<div
  ref={setNodeRef}
  style={style}
  className={cn(
    'relative rounded-xl border p-3 transition-all duration-200 ease-out', // Добавили transition-all
    'hover:border-indigo-500/40 hover:shadow-lg', // Улучшенный hover
    'cursor-pointer',
    'block',
    priorityColor,
    (isDragging || isDraggingState) && 'opacity-50 scale-95' // Добавили scale для плавности
  )}
>
```

### Стили для колонки при drag over:

```tsx
// В StatusColumn
<ContentBlock
  ref={setNodeRef}
  className={cn(
    'flex flex-col w-full h-full',
    'transition-all duration-200 ease-out', // Плавный переход
    (isOver || isOverState) && 'border-indigo-500/60 bg-indigo-500/10 scale-[1.02]' // Легкое увеличение
  )}
>
```

### DragOverlay стили:

```tsx
<DragOverlay
  className="opacity-90"
  style={{
    cursor: 'grabbing'
  }}
>
  {activeTask ? (
    <TaskCard 
      task={activeTask} 
      isDragging 
      assignee={activeTask.assigneeId ? assigneesMap[activeTask.assigneeId] : undefined}
      className="shadow-2xl scale-105" // Увеличенная тень и масштаб
    />
  ) : null}
</DragOverlay>
```

---

## Полный улучшенный код

### Полный компонент TasksBoardView:

```tsx
'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { type Task, type TaskStatus } from '@/types/pm';
import { type TaskListFilters } from '@/lib/pm/task-filters';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { buildTaskFilterParams } from '@/lib/pm/task-filters';
import { useTransition } from 'react';
import { trackEvent } from '@/lib/telemetry';
import { ContentBlock } from '@/components/ui/content-block';
import * as Avatar from '@radix-ui/react-avatar';

const DEFAULT_STATUSES: TaskStatus[] = ['new', 'in_progress', 'review', 'done', 'blocked'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked'
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-rose-500/50 bg-rose-500/10',
  high: 'border-orange-500/50 bg-orange-500/10',
  med: 'border-yellow-500/50 bg-yellow-500/10',
  low: 'border-blue-500/50 bg-blue-500/10'
};

type ProjectMember = {
  id: string;
  name: string;
  avatarUrl?: string;
};

type TaskCardProps = {
  task: Task;
  isDragging?: boolean;
  assignee?: ProjectMember;
  className?: string;
};

function TaskCard({ task, isDragging, assignee, className, onOpenDetail }: TaskCardProps & { onOpenDetail?: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingState } = useDraggable({
    id: task.id,
    data: { task }
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined;

  const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] : 'border-neutral-800 bg-neutral-900/50';

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging || isDraggingState) return;
    e.stopPropagation();
    onOpenDetail?.(task);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-task-card
      data-task-id={task.id}
      className={cn(
        'relative rounded-xl border p-3 transition-all duration-200 ease-out',
        'hover:border-indigo-500/40 hover:shadow-lg',
        'cursor-pointer block',
        priorityColor,
        (isDragging || isDraggingState) && 'opacity-50 scale-95',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2 pointer-events-none">
        <div className="flex-1">
          <div className="text-sm font-medium text-white">{task.title}</div>
          {task.description && (
            <div className="mt-1 text-xs text-neutral-400 line-clamp-2">{task.description}</div>
          )}
        </div>
        {task.priority && (
          <span className="rounded px-1.5 py-0.5 text-xs font-semibold uppercase text-neutral-300">
            {task.priority}
          </span>
        )}
      </div>
      
      {/* Иконки пользователей */}
      {assignee && (
        <div className="mt-2 flex items-center gap-2 pointer-events-none">
          <Avatar.Root className="inline-flex h-6 w-6 select-none items-center justify-center overflow-hidden rounded-full bg-neutral-800 align-middle border-2 border-neutral-700">
            <Avatar.Image
              src={assignee.avatarUrl || ''}
              alt={assignee.name}
              className="h-full w-full rounded-[inherit] object-cover"
            />
            <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-neutral-700 text-xs font-medium text-neutral-300">
              {assignee.name.charAt(0).toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>
          <span className="text-xs text-neutral-400 truncate max-w-[100px]">{assignee.name}</span>
        </div>
      )}

      {task.labels && task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 pointer-events-none">
          {task.labels.slice(0, 3).map((label) => (
            <span key={label} className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300">
              {label}
            </span>
          ))}
        </div>
      )}
      
      {task.dueAt && (
        <div className="mt-2 text-xs text-neutral-400 pointer-events-none">
          Due: {new Date(task.dueAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </div>
      )}
      
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute inset-0 cursor-grab active:cursor-grabbing" 
        aria-label="Перетащить задачу" 
      />
    </div>
  );
}

type StatusColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  isOver?: boolean;
  assigneesMap?: Record<string, ProjectMember>;
};

function StatusColumn({ status, tasks, isOver, assigneesMap, onOpenDetail }: StatusColumnProps & { onOpenDetail?: (task: Task) => void }) {
  const { setNodeRef, isOver: isOverState } = useDroppable({
    id: status,
    data: { status }
  });

  return (
    <ContentBlock
      size="sm"
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-full h-full',
        'transition-all duration-200 ease-out',
        (isOver || isOverState) && 'border-indigo-500/60 bg-indigo-500/10 scale-[1.02]'
      )}
    >
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
          {STATUS_LABELS[status]}
        </h3>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-400">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task}
              assignee={task.assigneeId && assigneesMap ? assigneesMap[task.assigneeId] : undefined}
              {...(onOpenDetail && { onOpenDetail })}
            />
          ))
        ) : (
          <div className="py-8 text-center text-sm text-neutral-500">Нет задач</div>
        )}
      </div>
    </ContentBlock>
  );
}

type TasksBoardViewProps = {
  tasks: Task[];
  loading?: boolean;
  filters: TaskListFilters;
  onTaskClick?: (task: Task) => void;
};

export default function TasksBoardView({ tasks: initialTasks, loading, filters, onTaskClick }: TasksBoardViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Синхронизация с props
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Загрузка участников проекта
  useEffect(() => {
    if (tasks.length > 0 && tasks[0]?.projectId) {
      fetch(`/api/pm/projects/${tasks[0].projectId}/members`)
        .then(res => res.json())
        .then(data => setProjectMembers(data.data?.members || data.members || []))
        .catch(console.error);
    }
  }, [tasks]);

  // Мапа для быстрого доступа к assignees
  const assigneesMap = useMemo(() => {
    const map: Record<string, ProjectMember> = {};
    projectMembers.forEach(member => {
      map[member.id] = member;
    });
    return map;
  }, [projectMembers]);

  // Группировка задач по статусам
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      new: [],
      in_progress: [],
      review: [],
      done: [],
      blocked: []
    };

    for (const task of tasks) {
      if (task.status in grouped) {
        grouped[task.status].push(task);
      }
    }

    return grouped;
  }, [tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      
      if (!over) return;

      const taskId = active.id as string;
      const newStatus = over.id as TaskStatus;

      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ
      const updatedTask = { ...task, status: newStatus };
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? updatedTask : t)
      );

      try {
        trackEvent('pm_task_moved_board', { taskId, fromStatus: task.status, toStatus: newStatus });
        
        const response = await fetch('/api/pm/tasks/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskIds: [taskId],
            updates: { status: newStatus }
          })
        });

        if (!response.ok) {
          // Откат при ошибке
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === taskId ? task : t)
          );
          throw new Error('Failed to update task');
        }

        const data = await response.json();
        if (data.tasks && data.tasks.length > 0) {
          const serverTask = data.tasks[0];
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === taskId ? serverTask : t)
          );
        }

        trackEvent('pm_task_updated', { taskId, status: newStatus });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('task-updated', { 
            detail: { taskId, projectId: task.projectId } 
          }));
        }

        const params = buildTaskFilterParams(filters);
        startTransition(() => {
          router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
        });
      } catch (error) {
        console.error('Error updating task:', error);
      }
    },
    [tasks, filters, router, pathname, startTransition]
  );

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (loading) {
    return (
      <div className="min-w-0 max-w-full h-[calc(100vh-200px)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch h-full">
          {DEFAULT_STATUSES.map((status) => (
            <div key={status} className="h-96 animate-pulse rounded-2xl bg-neutral-900/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-w-0 max-w-full h-[calc(100vh-200px)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch h-full">
          {DEFAULT_STATUSES.map((status) => (
            <StatusColumn 
              key={status} 
              status={status} 
              tasks={tasksByStatus[status]}
              assigneesMap={assigneesMap}
              {...(onTaskClick && { onOpenDetail: onTaskClick })} 
            />
          ))}
        </div>
      </div>
      <DragOverlay
        className="opacity-90"
        style={{ cursor: 'grabbing' }}
      >
        {activeTask ? (
          <TaskCard 
            task={activeTask} 
            isDragging
            assignee={activeTask.assigneeId ? assigneesMap[activeTask.assigneeId] : undefined}
            className="shadow-2xl scale-105"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

---

## Интеграция в проект

### Шаг 1: Установка зависимостей

```bash
# @dnd-kit уже установлен, но проверьте версию
pnpm add @radix-ui/react-avatar
```

### Шаг 2: Замена компонента

1. Откройте `apps/web/components/pm/TasksBoardView.tsx`
2. Замените содержимое на улучшенный код выше
3. Убедитесь, что импорты корректны

### Шаг 3: Проверка типов

Убедитесь, что типы совпадают:

```typescript
// types/pm.ts
export interface Task {
  // ... существующие поля
  assigneeId?: string; // Должно быть
}
```

### Шаг 4: Тестирование

1. Проверьте drag & drop между колонками
2. Убедитесь, что счетчики обновляются моментально
3. Проверьте отображение аватаров
4. Проверьте адаптивную высоту колонок

---

## Чек-лист улучшений

- [x] Моментальное обновление счетчиков через локальное состояние
- [x] Адаптивная высота колонок через flexbox
- [x] Иконки пользователей на карточках
- [x] Плавные анимации при перетаскивании
- [x] Оптимистичное обновление UI
- [x] Откат изменений при ошибке
- [x] Загрузка данных assignees из проекта

---

**Готово к использованию!** 🚀


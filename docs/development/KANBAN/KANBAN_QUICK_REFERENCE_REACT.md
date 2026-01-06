# Kanban Drag & Drop - Быстрая справка для React

> **Последнее обновление:** 2026-01-05

## 🚀 Ключевые улучшения

### 1. Моментальное обновление счетчиков

```tsx
// Локальное состояние для оптимистичного обновления
const [tasks, setTasks] = useState<Task[]>(initialTasks);

// Моментальное обновление в handleDragEnd
setTasks(prevTasks => 
  prevTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
);
```

### 2. Адаптивная высота колонок

```tsx
// Убрать min-h-[400px], добавить:
className="flex flex-col w-full h-full"

// Контейнер задач:
className="flex-1 space-y-2 overflow-y-auto min-h-0"

// Родительский grid:
className="items-stretch h-full"
```

### 3. Иконки пользователей

```tsx
import * as Avatar from '@radix-ui/react-avatar';

<Avatar.Root className="h-6 w-6 rounded-full">
  <Avatar.Image src={assignee.avatarUrl} />
  <Avatar.Fallback>{assignee.name.charAt(0)}</Avatar.Fallback>
</Avatar.Root>
```

### 4. Плавные анимации

```tsx
// Карточка
className="transition-all duration-200 ease-out hover:shadow-lg"

// Колонка при drag over
className="transition-all duration-200 ease-out scale-[1.02]"
```

---

## 📋 Основные изменения в коде

### Оптимистичное обновление

```tsx
const handleDragEnd = async (event: DragEndEvent) => {
  // 1. Сразу обновляем UI
  setTasks(prevTasks => 
    prevTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
  );
  
  // 2. Отправляем на сервер
  try {
    await fetch('/api/pm/tasks/bulk', { ... });
  } catch {
    // 3. Откат при ошибке
    setTasks(prevTasks => 
      prevTasks.map(t => t.id === taskId ? task : t)
    );
  }
};
```

### Загрузка assignees

```tsx
const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

useEffect(() => {
  if (tasks[0]?.projectId) {
    fetch(`/api/pm/projects/${tasks[0].projectId}/members`)
      .then(res => res.json())
      .then(data => setProjectMembers(data.data?.members || []));
  }
}, [tasks]);

const assigneesMap = useMemo(() => {
  const map: Record<string, ProjectMember> = {};
  projectMembers.forEach(member => {
    map[member.id] = member;
  });
  return map;
}, [projectMembers]);
```

---

## 🎯 Чек-лист внедрения

- [ ] Добавить локальное состояние `tasks`
- [ ] Реализовать оптимистичное обновление в `handleDragEnd`
- [ ] Убрать `min-h-[400px]`, добавить `h-full` и `flex-1`
- [ ] Изменить `items-start` на `items-stretch` в grid
- [ ] Установить `@radix-ui/react-avatar`
- [ ] Добавить загрузку `projectMembers`
- [ ] Передать `assigneesMap` в `StatusColumn`
- [ ] Добавить `Avatar` компонент в `TaskCard`
- [ ] Добавить `transition-all` для анимаций

---

## 🔧 Быстрые исправления

### Счетчики не обновляются
```tsx
// Использовать tasks из локального состояния
const tasksByStatus = useMemo(() => { ... }, [tasks]); // не initialTasks
```

### Колонки не адаптируются
```tsx
// Убедиться что есть:
// 1. h-full на колонке
// 2. flex-1 на контейнере задач
// 3. items-stretch на grid
// 4. min-h-0 на overflow контейнере
```

### Аватары не отображаются
```tsx
// Проверить:
// 1. Загрузку projectMembers
// 2. Создание assigneesMap
// 3. Передачу в StatusColumn и TaskCard
// 4. task.assigneeId существует
```

---

**Полная документация:** [KANBAN_DRAG_DROP_ADAPTED.md](./KANBAN_DRAG_DROP_ADAPTED.md)


# Исправления дублирующих путей получения данных дашборда

## Дата: 2025-12-06

## Проблема

В проекте существовало **два дублирующих способа** получения списка доступных проектов для пользователя:

### 1. PM Dashboard (`/api/pm/dashboard`)
❌ **Старый подход** - фильтрация только по владельцу:
```typescript
const allProjects = projectsRepository.list();
const userProjects = allProjects.filter((project) => 
  project.ownerId === currentUserId
);
```

**Проблема**: Игнорировались проекты, где пользователь является участником (member), но не владельцем.

### 2. Workspace Dashboard (`/api/dashboard/data`)
✅ **Правильный подход** - проверка доступа через `hasAccess()`:
```typescript
const allProjects = projectsRepository.list();
const isAdmin = isAdminUserId(userId) || isDemoAdminEmail(email);

if (isAdmin) {
  accessibleProjects.push(...allProjects);
} else {
  for (const project of allProjects) {
    const hasAccess = await projectsRepository.hasAccess(project.id, userId);
    if (hasAccess) {
      accessibleProjects.push(project);
    }
  }
}
```

**Правильно**: Учитывает владельцев, участников и публичные проекты.

---

## Решение

### Создана единая функция `getAccessibleProjects()`

**Файл**: `apps/web/lib/api/project-access.ts`

```typescript
export async function getAccessibleProjects(
  userId: string,
  email: string,
  options?: { archived?: boolean | null; workspaceId?: string | null }
): Promise<Project[]> {
  const allProjects = projectsRepository.list(options);
  const isAdmin = isAdminUserId(userId) || isDemoAdminEmail(email);
  
  if (isAdmin) {
    return allProjects;
  }
  
  const accessible: Project[] = [];
  for (const project of allProjects) {
    const hasAccess = await projectsRepository.hasAccess(project.id, userId);
    if (hasAccess) {
      accessible.push(project);
    }
  }
  
  return accessible;
}
```

### Логика проверки доступа (`projectsRepository.hasAccess`)

Из `apps/api/src/repositories/projects-repository.ts`:

```typescript
async hasAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await this.findById(projectId);
  if (!project) return false;
  
  // Public projects are accessible to everyone
  if (project.visibility === 'public') {
    return true;
  }
  
  // Private projects are only accessible to owner or members
  if (project.visibility === 'private') {
    const isOwner = project.ownerId === userId;
    const isMember = this.getMember(projectId, userId) !== null;
    return isOwner || isMember;
  }
  
  return false;
}
```

---

## Внесённые изменения

### 1. Обновлён PM Dashboard API
**Файл**: `apps/web/app/api/pm/dashboard/route.ts`

**Было**:
```typescript
const allProjects = projectsRepository.list();
const userProjects = allProjects.filter((project) => 
  project.ownerId === currentUserId
);
```

**Стало**:
```typescript
import { getAccessibleProjects } from '@/lib/api/project-access';

const userProjects = await getAccessibleProjects(currentUserId, auth.email);
```

### 2. Обновлён Workspace Dashboard API
**Файл**: `apps/web/app/api/dashboard/data/route.ts`

**Было**:
```typescript
const allProjects = projectsRepository.list();
const isAdmin = isAdminUserId(userId) || isDemoAdminEmail(email);

const accessibleProjects: typeof allProjects = [];
if (isAdmin) {
  accessibleProjects.push(...allProjects);
} else {
  for (const project of allProjects) {
    const hasAccess = await projectsRepository.hasAccess(project.id, userId);
    if (hasAccess) {
      accessibleProjects.push(project);
    }
  }
}
```

**Стало**:
```typescript
import { getAccessibleProjects } from '@/lib/api/project-access';

const accessibleProjects = await getAccessibleProjects(userId, email);
```

---

## Преимущества

1. **✅ Единый источник истины** - одна функция для проверки доступа к проектам
2. **✅ Консистентность данных** - оба дашборда показывают одинаковые данные
3. **✅ DRY принцип** - нет дублирования логики
4. **✅ Простота поддержки** - изменения в одном месте
5. **✅ Правильная логика доступа** - учитывает owner, member, public
6. **✅ Поддержка админов** - админы видят все проекты

---

## Проверка доступа к проектам

### Матрица доступа

| Роль | Владелец (owner) | Участник (member) | Публичный | Приватный |
|------|-----------------|-------------------|-----------|-----------|
| **Админ** | ✅ Да | ✅ Да | ✅ Да | ✅ Да |
| **Владелец проекта** | ✅ Да | ✅ Да | ✅ Да | ✅ Да (свой) |
| **Участник проекта** | ❌ Нет | ✅ Да | ✅ Да | ✅ Да (член) |
| **Обычный пользователь** | ❌ Нет | ❌ Нет | ✅ Да | ❌ Нет |

### Примеры

**Пример 1**: Админ
```typescript
// Админ видит все проекты
const projects = await getAccessibleProjects(adminUserId, adminEmail);
// projects = [project1, project2, project3, ...]
```

**Пример 2**: Владелец проекта
```typescript
// Владелец видит свои проекты
const projects = await getAccessibleProjects(ownerId, ownerEmail);
// projects = [ownedProject1, ownedProject2]
```

**Пример 3**: Участник проекта
```typescript
// Участник видит проекты, где он member
const projects = await getAccessibleProjects(memberId, memberEmail);
// projects = [projectWhereMember1, projectWhereMember2]
```

**Пример 4**: Обычный пользователь
```typescript
// Видит только публичные проекты
const projects = await getAccessibleProjects(userId, userEmail);
// projects = [publicProject1, publicProject2]
```

---

## Тестирование

### Ручное тестирование

1. **Тест 1: Владелец проекта**
   - Создать проект как user1
   - Зайти под user1
   - Открыть `/pm` - должны быть видны проекты
   - Открыть `/app/dashboard` - должны быть видны те же проекты

2. **Тест 2: Участник проекта**
   - Создать проект как user1
   - Добавить user2 как member
   - Зайти под user2
   - Открыть `/pm` - должен быть виден проект
   - Открыть `/app/dashboard` - должен быть виден проект

3. **Тест 3: Публичный проект**
   - Создать публичный проект как user1
   - Зайти под user2 (не участник)
   - Открыть `/pm` - должен быть виден проект
   - Открыть `/app/dashboard` - должен быть виден проект

4. **Тест 4: Приватный проект**
   - Создать приватный проект как user1
   - Зайти под user2 (не участник)
   - Открыть `/pm` - проект НЕ должен быть виден
   - Открыть `/app/dashboard` - проект НЕ должен быть виден

### Автоматизированное тестирование

**TODO**: Создать E2E тесты для проверки правильности отображения проектов:

```typescript
// apps/web/tests/e2e/dashboard-projects-access.spec.ts
test('member should see projects where they are member', async ({ page }) => {
  // 1. Create project as user1
  // 2. Add user2 as member
  // 3. Login as user2
  // 4. Check /pm dashboard shows the project
  // 5. Check /app/dashboard shows the project
});

test('non-member should not see private projects', async ({ page }) => {
  // 1. Create private project as user1
  // 2. Login as user2 (not member)
  // 3. Check /pm dashboard does not show the project
  // 4. Check /app/dashboard does not show the project
});
```

---

## Логирование

Добавлено подробное логирование для отладки:

```typescript
console.log('[pm/dashboard] GET request:', {
  userId: currentUserId,
  email: auth.email,
  accessibleProjectsCount: userProjects.length,
  projectIds: userProjects.map(p => ({ 
    id: p.id, 
    title: p.title, 
    ownerId: p.ownerId 
  }))
});
```

Это поможет диагностировать проблемы доступа в production.

---

## Производительность

### Текущая реализация

```typescript
for (const project of allProjects) {
  const hasAccess = await projectsRepository.hasAccess(project.id, userId);
  if (hasAccess) {
    accessible.push(project);
  }
}
```

**Проблема**: O(n) асинхронных вызовов, где n = количество проектов.

### Возможные оптимизации (TODO)

1. **Батч-проверка доступа**:
```typescript
const accessResults = await projectsRepository.checkAccessBatch(projectIds, userId);
```

2. **Кэширование**:
```typescript
const cacheKey = `user:${userId}:accessible-projects`;
const cached = await cache.get(cacheKey);
if (cached) return cached;
```

3. **Индексы БД**:
- Создать индекс на `project_members(user_id, project_id)`
- Создать индекс на `projects(visibility)`

4. **Денормализация**:
- Хранить список доступных проектов в отдельной таблице
- Обновлять при изменении членства

---

## Миграция данных

Не требуется. Изменения касаются только логики запросов.

---

## Обратная совместимость

✅ Полностью обратно совместимо.

Изменения не влияют на:
- API контракты
- Схемы данных
- Клиентский код
- Тесты

---

## Заключение

### Исправлено

✅ Дублирование логики получения доступных проектов  
✅ Неправильная фильтрация только по owner в PM Dashboard  
✅ Несоответствие данных между двумя дашбордами  
✅ Нарушение DRY принципа  

### Результат

- Оба дашборда теперь используют единую функцию `getAccessibleProjects()`
- Правильная проверка доступа (owner + member + public)
- Консистентные данные между всеми виджетами
- Упрощена поддержка кода

### Следующие шаги

1. Добавить E2E тесты для проверки доступа к проектам
2. Рассмотреть оптимизацию производительности (батч-проверка, кэширование)
3. Добавить мониторинг производительности `getAccessibleProjects()`
4. Создать документацию для разработчиков о правилах доступа к проектам


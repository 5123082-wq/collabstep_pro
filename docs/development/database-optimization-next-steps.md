# Следующие шаги оптимизации БД

**Дата создания:** 2026-01-05  
**Статус:** Ожидает выполнения  
**Приоритет:** Средний (улучшения, не критично)

## Контекст

Основные критические задачи оптимизации БД выполнены:

- ✅ Организация синхронизирована с БД
- ✅ Репозитории проектов и задач читают из БД
- ✅ Канонические таблицы зафиксированы
- ✅ Документация обновлена

Остались задачи по улучшению архитектуры, которые можно выполнить позже.

## Задача 1: Унификация точек записи

### Проблема

В коде есть прямые SQL-вставки в `pm_projects`/`pm_tasks` вне репозиториев, что нарушает принцип единой точки записи.

### Текущее состояние

**Найдено прямых SQL-вставок:**

1. `apps/web/app/api/pm/projects/route.ts` - функция `upsertOrganizationProject()`:

   ```typescript
   await db.insert(projects).values({ ... })  // Drizzle таблица project
   ```

   - Проблема: записывает в deprecated таблицу `project` вместо `pm_projects`
   - Нужно: использовать `projectsRepository.create()` или `persistProjectToPg()`

2. `apps/api/src/services/project-template-service.ts` - функция `upsertOrganizationProject()`:
   - Прямая запись в `pm_projects` через SQL
   - Нужно: использовать `projectsRepository.create()` через репозиторий

### Цель

Все операции create/update для проектов и задач должны проходить через репозитории, без прямых SQL-вставок.

### Условия выполнения

1. **Найти все прямые SQL-вставки:**

   ```bash
   # Поиск прямых SQL-вставок в pm_projects/pm_tasks
   grep -r "INSERT INTO pm_projects" apps/
   grep -r "INSERT INTO pm_tasks" apps/
   grep -r "db.insert(projects)" apps/
   ```

2. **Проверить использование функций:**
   - `upsertOrganizationProject()` - где используется и как заменить
   - Прямые вызовы `sql.query()` для проектов/задач

3. **Заменить на репозитории:**
   - Использовать `projectsRepository.create()` для создания проектов
   - Использовать `tasksRepository.create()` для создания задач
   - Убрать прямые SQL-вставки

4. **Транзакции для критических операций:**
   - Создание проекта + задач должно быть в одной транзакции
   - Использовать `db.transaction()` для атомарности

### Критерии успеха

- ✅ Нет прямых SQL-вставок в `pm_projects`/`pm_tasks` вне репозиториев
- ✅ Все операции создания проектов идут через `projectsRepository.create()`
- ✅ Все операции создания задач идут через `tasksRepository.create()`
- ✅ Критические операции (проект + задачи) выполняются в транзакциях

### Файлы для изменения

- `apps/web/app/api/pm/projects/route.ts` - убрать `upsertOrganizationProject()`
- `apps/api/src/services/project-template-service.ts` - заменить прямые SQL на репозитории
- Возможно другие файлы с прямыми SQL-вставками

### Риски

- **Риск:** Потеря данных при замене прямых SQL на репозитории
  - **Митигация:** Тестирование на dev окружении, проверка что все поля записываются корректно

- **Риск:** Производительность транзакций
  - **Митигация:** Транзакции только для критических операций (создание проекта + задач), остальное асинхронно

## Задача 2: Полная реализация cache-aside с TTL

### Проблема

Текущая реализация cache-aside не имеет TTL (time-to-live) и инвалидации кэша при записи. Кэш обновляется только при чтении, но не инвалидируется при записи.

### Текущее состояние

**Текущая реализация:**

- Чтение: проверка кэша → промах → БД → запись в кэш ✅
- Запись: БД → обновление кэша (частично) ⚠️
- TTL: отсутствует ❌
- Инвалидация при записи: частичная ⚠️

### Цель

Реализовать полноценный cache-aside паттерн с:

- TTL для кэшированных данных
- Инвалидацией кэша при записи
- Стратегией кэширования для разных типов данных

### Условия выполнения

1. **Добавить TTL в память:**

   Создать структуру для хранения TTL:

   ```typescript
   // apps/api/src/data/memory.ts
   type CacheEntry<T> = {
     data: T;
     expiresAt: number; // timestamp
   };

   const PROJECTS_CACHE: Map<string, CacheEntry<Project[]>> = new Map();
   const TASKS_CACHE: Map<string, CacheEntry<Task[]>> = new Map();
   ```

2. **TTL значения:**
   - **Справочники** (организации, пользователи): 10 минут
   - **Проекты**: 5 минут
   - **Задачи**: 2 минуты
   - **Активность** (комментарии, чаты): 1 минута

3. **Инвалидация при записи:**

   При создании/обновлении проекта:

   ```typescript
   async create(project: Project): Promise<Project> {
     // Запись в БД
     await persistProjectToPg(project);

     // Инвалидация кэша
     invalidateProjectsCache(project.workspaceId);
     invalidateProjectsCache(); // глобальный кэш

     return project;
   }
   ```

4. **Проверка TTL при чтении:**

   ```typescript
   async list(): Promise<Project[]> {
     const cacheKey = 'projects:all';
     const cached = PROJECTS_CACHE.get(cacheKey);

     if (cached && cached.expiresAt > Date.now()) {
       return cached.data; // Возвращаем из кэша
     }

     // Кэш истек или отсутствует - читаем из БД
     const dbProjects = await fetchProjectsFromPg();

     // Обновляем кэш
     PROJECTS_CACHE.set(cacheKey, {
       data: dbProjects,
       expiresAt: Date.now() + 5 * 60 * 1000 // 5 минут
     });

     return dbProjects;
   }
   ```

5. **Функции инвалидации:**

   ```typescript
   function invalidateProjectsCache(workspaceId?: string): void {
     if (workspaceId) {
       PROJECTS_CACHE.delete(`projects:workspace:${workspaceId}`);
     }
     PROJECTS_CACHE.delete('projects:all');
   }

   function invalidateTasksCache(projectId?: string): void {
     if (projectId) {
       TASKS_CACHE.delete(`tasks:project:${projectId}`);
     }
     TASKS_CACHE.delete('tasks:all');
   }
   ```

### Критерии успеха

- ✅ Кэш имеет TTL для всех типов данных
- ✅ Кэш инвалидируется при записи (create/update/delete)
- ✅ Проверка TTL при чтении из кэша
- ✅ Разные TTL для разных типов данных (справочники дольше, активность короче)

### Файлы для изменения

- `apps/api/src/data/memory.ts` - добавить структуру кэша с TTL
- `apps/api/src/repositories/projects-repository.ts` - добавить проверку TTL и инвалидацию
- `apps/api/src/repositories/tasks-repository.ts` - добавить проверку TTL и инвалидацию
- `apps/api/src/repositories/organizations-repository.ts` - добавить проверку TTL и инвалидацию

### Риски

- **Риск:** Усложнение кода
  - **Митигация:** Вынести логику кэширования в отдельный модуль `cache-manager.ts`

- **Риск:** Память растет без ограничений
  - **Митигация:** Очистка истекших записей периодически или при достижении лимита

- **Риск:** Несоответствие данных в кэше и БД
  - **Митигация:** Корректная инвалидация при всех операциях записи

## Порядок выполнения

1. **Сначала:** Унификация точек записи (задача 1)
   - Проще выполнить, меньше рисков
   - Устраняет прямые SQL-вставки

2. **Затем:** Реализация cache-aside с TTL (задача 2)
   - Требует больше изменений
   - Зависит от унификации точек записи (нужны правильные точки инвалидации)

## Тестирование

После выполнения каждой задачи:

1. **Проверка функциональности:**

   ```bash
   # Создание проекта из шаблона
   # Проверка что проект создается в БД
   # Проверка что репозитории возвращают данные
   ```

2. **Проверка производительности:**
   - Время ответа API endpoints
   - Нагрузка на БД (должна снизиться за счет кэша)

3. **Проверка консистентности:**
   - Данные в БД и кэше совпадают
   - Кэш обновляется при записи

## Связанные документы

- [Архитектура БД](../architecture/database-architecture.md)
- [ADR-0001: Канонические таблицы](../architecture/adr/0001-canonical-database-tables.md)
- [Отчет аудита](../../audit/DATA_LOCATION_AUDIT_REPORT.md)
- [Правила работы с БД](../../../.cursor/rules/database.mdc)

## Вопросы для уточнения

1. **TTL значения:** Подтвердить предложенные значения TTL или скорректировать?
2. **Стратегия очистки кэша:** Периодическая очистка или при достижении лимита?
3. **Метрики:** Нужны ли метрики hit/miss rate для кэша?

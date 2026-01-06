# Защита целостности данных организаций

## Проблема

Организации могут исчезать из-за:
1. Ошибок при создании проектов из шаблонов
2. Каскадного удаления при ошибках в БД
3. Случайного удаления через `organization-closure-service`
4. Ошибок в логике отката (rollback)

## Защита

### 1. Валидация перед созданием проекта

В `project-template-service.ts` добавлена валидация существования организации **ДО** создания проекта:

```typescript
// Validate organization exists BEFORE creating project
const organization = await organizationsRepository.findById(params.organizationId);
if (!organization) {
  throw new ProjectTemplateValidationError(
    `Organization not found: ${params.organizationId}`,
    404
  );
}
```

Это предотвращает создание проектов с несуществующими организациями.

### 2. Валидация selectedTaskIds

Валидация `selectedTaskIds` происходит **ДО** создания проекта:

```typescript
// Validate selectedTaskIds BEFORE creating project
if (params.selectedTaskIds && params.selectedTaskIds.length > 0) {
  for (const taskId of params.selectedTaskIds) {
    if (!tasksById.has(taskId)) {
      throw new ProjectTemplateValidationError(`Task not found in template: ${taskId}`, 400);
    }
  }
}
```

### 3. Улучшенный откат (rollback)

При ошибках проект удаляется, но организация **НИКОГДА** не удаляется:

```typescript
try {
  // ... создание проекта ...
} catch (error) {
  // Rollback: delete project if it was created before the error
  if (project) {
    try {
      projectsRepository.delete(project.id);
    } catch (deleteError) {
      console.error('[ProjectTemplateService] Failed to rollback project deletion:', deleteError);
    }
  }
  throw error;
}
```

## Диагностика

### Скрипт проверки статуса организаций

```bash
pnpm tsx scripts/check-organization-status.ts
```

Проверяет:
- Все организации в БД
- Организации пользователя (как владельца)
- Членство в организациях
- Проекты пользователя и их связи с организациями
- Архивные/удаленные организации

### Скрипт диагностики БД

```bash
pnpm tsx scripts/diagnose-db-issues.ts
```

Проверяет:
- Проекты без организаций
- "Осиротевшие" проекты (без задач)
- Проекты с несуществующими организациями
- Тестовые проекты

### Скрипт очистки

```bash
CONFIRM_DELETE=yes pnpm tsx scripts/cleanup-orphaned-projects.ts
```

Удаляет только:
- Проекты без организаций **И** без задач
- Проекты с несуществующими организациями **И** без задач

**ВАЖНО**: Скрипт **НИКОГДА** не удаляет организации!

## Восстановление

Если организация была удалена по ошибке:

1. Проверить статус через `check-organization-status.ts`
2. Если организация в статусе `archived`, можно восстановить через API
3. Если организация в статусе `deleted`, нужно создать новую организацию

## Предотвращение проблем

1. **Всегда валидируйте данные ДО записи в БД**
2. **Никогда не удаляйте организации при ошибках создания проектов**
3. **Используйте транзакции для критических операций** (если возможно)
4. **Логируйте все операции с организациями**
5. **Регулярно проверяйте целостность данных через диагностические скрипты**

## Мониторинг

Рекомендуется регулярно запускать:
- `check-organization-status.ts` - для проверки статуса организаций
- `diagnose-db-issues.ts` - для выявления проблем с данными

## Связанные файлы

- `apps/api/src/services/project-template-service.ts` - логика создания проектов из шаблонов
- `scripts/check-organization-status.ts` - проверка статуса организаций
- `scripts/diagnose-db-issues.ts` - диагностика проблем БД
- `scripts/cleanup-orphaned-projects.ts` - очистка "осиротевших" проектов


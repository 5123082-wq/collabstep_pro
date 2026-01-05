# Отчет об исправлении ошибок в форме создания проекта

## Дата
2024-01-04

## Найденные проблемы

### 1. Конфликт имен переменной `payload` (критично)
**Файлы:** 
- `apps/web/components/pm/CreateProjectModal.tsx`
- `apps/web/app/(app)/projects/create/ProjectCreateWizardClient.tsx`

**Проблема:** 
Переменная `payload` объявлялась дважды в одной области видимости:
- Строка 159: `const payload: { ... } = { ... }` (объект запроса)
- Строка 194: `const payload = (await response.json()) as { ... }` (объект ответа)

**Ошибка TypeScript:**
```
error TS2451: Cannot redeclare block-scoped variable 'payload'.
```

**Исправление:**
- Переименована переменная запроса в `requestPayload`
- Переименована переменная ответа в `responseData`

### 2. Неправильная структура ответа API (критично)
**Файлы:**
- `apps/web/components/pm/CreateProjectModal.tsx`
- `apps/web/app/(app)/projects/create/ProjectCreateWizardClient.tsx`

**Проблема:**
Код пытался получить `payload.project?.id`, но API возвращает структуру `{ ok: true, data: { project: { id, key } } }`.

**Ошибка TypeScript:**
```
error TS2339: Property 'project' does not exist on type '{ name: string; ... }'.
```

**Исправление:**
Использована правильная структура ответа:
```typescript
const responseData = (await response.json()) as {
  data?: { project: { id: string; key: string } };
  project?: { id: string; key: string };
};
const projectId = responseData.data?.project?.id || responseData.project?.id;
```

### 3. Проблема с пустым типом проекта (критично)
**Файлы:**
- `apps/web/components/pm/CreateProjectModal.tsx`
- `apps/web/app/(app)/projects/create/ProjectCreateWizardClient.tsx`

**Проблема:**
Поле `type` всегда отправлялось в API, даже если это пустая строка `''`. Это вызывало проблемы с типизацией.

**Исправление:**
- Изменен тип `type` на опциональный: `type?: (typeof typeOptions)[number]['value']`
- Поле `type` добавляется в payload только если `projectType` не пустое:
```typescript
if (projectType) {
  requestPayload.type = projectType;
}
```

### 4. Проблема с типом `type` в API route (критично)
**Файл:** `apps/web/app/api/pm/projects/route.ts`

**Проблема:**
TypeScript жаловался, что `undefined` не подходит для типа `ProjectType` при использовании `exactOptionalPropertyTypes: true`.

**Ошибка TypeScript:**
```
error TS2379: Argument of type '{ ... type: "product" | ... | undefined; ... }' is not assignable to parameter of type '{ ... type?: ProjectType; ... }'
  Type 'undefined' is not assignable to type 'ProjectType'.
```

**Исправление:**
Использовано условное добавление свойства вместо передачи `undefined`:
```typescript
const projectCreatePayload: { ... } = {
  // ... базовые поля
};

if (rawType) {
  projectCreatePayload.type = rawType as (typeof allowedProjectTypes)[number];
}
```

## Результаты

### Проверки
- ✅ TypeScript проверка: `pnpm --filter @collabverse/web typecheck` - проходит без ошибок
- ✅ Линтер: проверка не выявила ошибок
- ✅ Unit тесты: `pnpm --filter @collabverse/web test pm-projects-create` - проходят

### Исправленные файлы
1. `apps/web/components/pm/CreateProjectModal.tsx`
2. `apps/web/app/(app)/projects/create/ProjectCreateWizardClient.tsx`
3. `apps/web/app/api/pm/projects/route.ts`

## Статус

✅ **Все ошибки исправлены**

Форма создания проекта теперь должна работать корректно:
- Все поля (visibility, type, stage, deadline) отправляются правильно
- Пустые поля не отправляются (type, deadline)
- Структура ответа API обрабатывается корректно
- TypeScript ошибки устранены


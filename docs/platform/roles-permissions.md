# Roles & Permissions

**Статус:** active  
**Владелец:** product/engineering  
**Последнее обновление:** 2026-03-09

## Роли (канонические)

### Роли в организации (Organization Roles)

Роли определяются в `organization_role` enum в базе данных:

- **`owner`** — владелец организации. Полный доступ ко всем workspace и проектам организации.
- **`admin`** — администратор организации. Может управлять workspace, проектами, приглашать участников.
- **`member`** — участник организации. Может создавать проекты, работать с задачами.
- **`viewer`** — наблюдатель. Только просмотр проектов и задач.

**Примечание:** Первый создатель организации автоматически получает роль `owner`.

### Роли в проекте (Project Roles)

Текущие PM/Catalog read-models используют следующие эффективные роли проекта:

- **`owner`** — владелец проекта. Полный контроль над проектом.
- **`admin`** — администратор проекта. Может управлять задачами, командой и сервисными действиями каталога.
- **`member`** — участник проекта. Может создавать и редактировать задачи, комментировать.
- **`viewer`** — наблюдатель. Только просмотр задач и комментариев.

**Примечание:** Создатель проекта автоматически получает роль `owner`.
Legacy naming `manager` / `contributor` всё ещё встречается в части PM docs и архивных материалов; для `Каталога` source of truth — текущий effective role layer `owner/admin/member/viewer`.

### Системные роли платформы (Platform Roles)

Роли определяются в `platform_user.roles` (массив строк):

- **`productAdmin`** — администратор продукта. Доступ к админ-панели, управление feature flags.
- **`featureAdmin`** — администратор фич. Управление feature flags.
- **`financeAdmin`** — администратор финансов. Доступ к финансовому модулю.
- **`moderator`** — модератор. Модерация контента, пользователей.
- **`betaTester`** — бета-тестер. Доступ к бета-фичам.
- **`viewer`** — базовый просмотр.

### Клиентские роли (User Roles)

Роли для UI, определены в `apps/web/lib/auth/roles.ts`:

- **`FOUNDER`** — основатель. Полный доступ.
- **`SPECIALIST`** — специалист. Доступ к маркетплейсу, выполнение задач.
- **`CONTRACTOR`** — подрядчик. Доступ к маркетплейсу, выполнение задач.
- **`PM`** — проджект-менеджер. Управление проектами и задачами.
- **`ADMIN`** — администратор. Системное администрирование.
- **`MODERATOR`** — модератор. Модерация контента.
- **`OBSERVER`** — наблюдатель. Только просмотр.

**Примечание:** Клиентские роли маппятся на системные роли и роли в организациях/проектах.

## Модель прав доступа

### Области применения (Scopes)

Права применяются в следующих областях:

1. **Workspace scope** — права на уровне рабочего пространства
2. **Project scope** — права на уровне проекта
3. **Organization scope** — права на уровне организации
4. **Platform scope** — системные права платформы

### Наследование прав

- Роль в организации влияет на доступ к workspace и проектам организации
- Роль в проекте определяет доступ к задачам и ресурсам проекта
- Системные роли платформы дают доступ к системным функциям независимо от организации/проекта

## Матрица прав доступа

### Организация

| Действие | Owner | Admin | Member | Viewer |
|----------|:-----:|:-----:|:------:|:-----:|
| Создать workspace | ✅ | ❌ | ❌ | ❌ |
| Удалить workspace | ✅ | ❌ | ❌ | ❌ |
| Пригласить участника в организацию | ✅ | ✅ | ❌ | ❌ |
| Удалить участника из организации | ✅ | ✅ | ❌ | ❌ |
| Изменить роль участника | ✅ | ✅ | ❌ | ❌ |
| Просмотр организации | ✅ | ✅ | ✅ | ✅ |

### Проект

| Действие | Owner | Admin | Member | Viewer |
|----------|:-----:|:-----:|:------:|:-----:|
| Создать проект | ✅ | ✅ | ✅ | ❌ |
| Удалить проект | ✅ | ❌ | ❌ | ❌ |
| Архивировать проект | ✅ | ✅ | ❌ | ❌ |
| Пригласить участника в проект | ✅ | ✅ | ❌ | ❌ |
| Удалить участника из проекта | ✅ | ✅ | ❌ | ❌ |
| Изменить роль участника | ✅ | ✅ | ❌ | ❌ |
| Создать задачу | ✅ | ✅ | ✅ | ❌ |
| Редактировать задачу | ✅ | ✅ | ✅ | ❌ |
| Удалить задачу | ✅ | ✅ | ❌ | ❌ |
| Изменить статус задачи | ✅ | ✅ | ✅ | ❌ |
| Комментировать задачу | ✅ | ✅ | ✅ | ❌ |
| Просмотр проекта | ✅ | ✅ | ✅ | ✅ |
| Просмотр задач | ✅ | ✅ | ✅ | ✅ |
| Управление бюджетом | ✅ | ✅ | ❌ | ❌ |
| Создание расходов | ✅ | ✅ | ✅ | ❌ |
| Утверждение расходов | ✅ | ✅ | ❌ | ❌ |

### Каталог / Marketplace overlay (C5)

- read-side surfaces `Каталога` (`/market/*`, `/p/:handle`) сейчас живут внутри authenticated app shell; anonymous public web exposure не входит в текущий контракт;
- author-page visibility:
  - расширенные performer-блоки показываются только при `performer_profile.isPublic`;
  - minimal author-shell может рендериться по `handle`, если уже есть публичные catalog entities;
  - PM publication попадает на `/p/:handle` только при `authorEntityType=user`, `state=published`, `showOnAuthorPage=true`;
  - team-owned publication не попадает на person-route `/p/:handle`;
- publish/manage rights:
  - personal PM project -> publish/manage only owner;
  - team-owned PM project -> publish/manage owner/admin;
  - template/service publication -> create/manage only `ownerUserId`;
  - manager rights и persisted author entity — разные слои; read-path не должен переписывать авторство уже созданной публикации;
- apply/import rights:
  - current implementation в catalog/PM create path проверяет только active membership выбранной организации;
  - import в existing project разрешён owner/admin/member и запрещён viewer;
  - apply/import не меняет publication-layer автоматически;
- inquiry/deal-layer access:
  - brief создаётся из authenticated catalog flow;
  - привязать inquiry можно только к проектам, где доступен create-task-capable target;
  - `/market/orders` пока остаётся локальным secondary layer без shared backend deal model.

### Open Contradiction After C5

- matrix выше трактует `viewer` как read-only роль и не даёт ему create-project rights;
- current PM/catalog implementation для нового проекта проверяет только active organization membership;
- это не зафиксировано как новый канонический product contract;
- нужен отдельный corrective task: либо сузить create path до `owner/admin/member`, либо утвердить более широкий contract и затем обновить matrix.

### Платформа

| Действие | productAdmin | featureAdmin | financeAdmin | moderator | betaTester | viewer |
|----------|:------------:|:------------:|:------------:|:---------:|:----------:|:-----:|
| Доступ к админ-панели | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Управление feature flags | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Управление пользователями | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Доступ к финансам | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Модерация контента | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Доступ к бета-фичам | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

## Особые случаи

### Мультиаккаунт

- Пользователь может состоять в нескольких организациях с разными ролями
- Активная организация определяется через `OrganizationContext`
- Права применяются в контексте активной организации

### Общие проекты

- Проект может быть видимым для workspace (`workspace` visibility)
- Участники workspace могут просматривать общие проекты, но не редактировать без явного приглашения

### Публичные проекты

- Проект с `public` visibility виден всем авторизованным пользователям
- Только участники проекта могут редактировать

### Внешние участники

- Участники из других организаций могут быть приглашены в проект
- Их права определяются ролью в проекте, а не ролью в организации

## Интеграция с системой аутентификации

### Dev-режим

В dev-режиме (`AUTH_DEV=on`) используется cookie `cv_session` с payload:
```json
{
  "email": "user@example.com",
  "role": "admin",
  "issuedAt": "2026-01-06T00:00:00.000Z"
}
```

### Production (планируется)

- JWT/паспортный токен, подписанный server-side ключом
- Refresh-токены в Redis/БД для отзыва сессий
- Payload расширен до `{ userId, activeAccountId, roles, issuedAt }`

## Проверка прав в коде

### Backend

```typescript
// Проверка роли в организации
const member = await organizationsRepository.getMember(orgId, userId);
if (member.role !== 'owner' && member.role !== 'admin') {
  throw new Error('Forbidden');
}

// Проверка роли в проекте
const projectMember = await projectsRepository.getMember(projectId, userId);
if (!projectMember || projectMember.role === 'viewer') {
  throw new Error('Forbidden');
}
```

### Frontend

```typescript
// Проверка системных ролей
import { getUserRoles } from '@/lib/auth/roles';
const roles = getUserRoles();
if (roles.includes('ADMIN')) {
  // Показать админ-панель
}

// Проверка доступа к финансам
import { canAccessFinance } from '@/lib/auth/roles';
if (canAccessFinance()) {
  // Показать финансовый модуль
}
```

## NEEDS_CONFIRMATION

- [ ] Детали RBAC/ABAC (scopes, inheritance, custom roles)
- [ ] Каноническое правило project creation в organization context: `owner/admin/member` или любой active member
- [ ] Права для внешних участников (contractors, guests)
- [ ] Права на уровне workspace (отдельно от организации)
- [ ] Интеграция с системой подписок (free/pro/max планы)

---

**Связанные документы:**
- [Обзор платформы](./overview.md)
- [Глоссарий](./glossary.md)
- [Системный анализ](../architecture/system-analysis.md#авторизация-и-мультиаккаунт)

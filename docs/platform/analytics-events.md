# Analytics Events Taxonomy

**Статус:** active  
**Владелец:** product/analytics  
**Последнее обновление:** 2026-03-09

Это **канонический** список событий аналитики и их схем.

## Правила именования и структуры

### Именование событий

- Имена событий: `snake_case`
- Префиксы по модулям: `auth_`, `pm_`, `marketplace_`, `marketing_`, `ai_`, `finance_`
- Для текущего `Каталога` дополнительно уже существуют lightweight события `catalog_publication_*`; существующие namespaces не переименовываются задним числом
- Формат: `{module}_{entity}_{action}`

### Общие поля (обязательные)

Все события должны содержать:

- `event_id` — уникальный идентификатор события (UUID)
- `ts` — timestamp события (ISO 8601)
- `user_id` — ID пользователя (если авторизован)
- `workspace_id` — ID активного workspace (если применимо)
- `organization_id` — ID активной организации (если применимо)
- `session_id` — ID сессии (если применимо)
- `source` — источник события (`web` | `app`)

### PII (Personally Identifiable Information)

**НЕ отправлять:**
- Email адреса
- Телефонные номера
- Сырые текстовые описания (только хэши или агрегаты)
- Пароли и токены

**Политика:** Определить явную политику обработки PII (NEEDS_CONFIRMATION)

## События Auth & Регистрация

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `auth_account_type_selected` | Выбран тип аккаунта при регистрации | `{ account_type: 'personal' \| 'business', registration_type: 'direct' \| 'invite' }` | При выборе типа аккаунта в форме регистрации | Frontend form `/register` |
| `auth_user_registered` | Пользователь зарегистрирован | `{ user_id, account_type: 'personal' \| 'business', registration_type: 'direct' \| 'invite', organization_id }` | После успешной регистрации | API endpoint `/api/auth/register` |
| `auth_user_logged_in` | Пользователь вошел в систему | `{ user_id, login_method: 'email' \| 'google' \| 'demo' }` | При успешном входе | API endpoint `/api/auth/login` или NextAuth |
| `auth_user_logged_out` | Пользователь вышел из системы | `{ user_id }` | При выходе | API endpoint `/api/auth/logout` |

## События PM Core

### Проекты

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `pm_project_created` | Создан новый проект | `{ project_id, title, template_id?, workspace_id }` | При создании проекта | API endpoint `/api/pm/projects` |
| `pm_project_updated` | Проект обновлен | `{ project_id, changed_fields }` | При обновлении проекта | API endpoint `/api/pm/projects/[id]` |
| `pm_project_archived` | Проект архивирован | `{ project_id }` | При архивировании | API endpoint `/api/pm/projects/[id]/archive` |
| `pm_project_restored` | Проект восстановлен из архива | `{ project_id }` | При восстановлении | API endpoint `/api/pm/projects/[id]/restore` |
| `pm_project_deleted` | Проект удален | `{ project_id }` | При удалении | API endpoint `/api/pm/projects/[id]` |
| `pm_project_viewed` | Просмотр страницы проекта | `{ project_id, view_type }` | При открытии страницы проекта | Frontend page `/pm/projects/[id]` |
| `pm_project_member_invited` | Приглашен участник проекта | `{ project_id, member_role }` | При отправке приглашения | API endpoint `/api/pm/projects/[id]/invites` |
| `pm_project_member_removed` | Удален участник проекта | `{ project_id, member_id }` | При удалении участника | API endpoint `/api/pm/projects/[id]/members` |

### Задачи

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `pm_task_created` | Создана новая задача | `{ task_id, project_id, title, status }` | При создании задачи | API endpoint `/api/pm/tasks` |
| `pm_task_updated` | Задача обновлена | `{ task_id, changed_fields }` | При обновлении задачи | API endpoint `/api/pm/tasks/[id]` |
| `pm_task_status_changed` | Изменен статус задачи | `{ task_id, from_status, to_status }` | При изменении статуса | API endpoint `/api/pm/tasks/[id]` |
| `pm_task_assigned` | Задача назначена исполнителю | `{ task_id, assignee_id }` | При назначении | API endpoint `/api/pm/tasks/[id]` |
| `pm_task_deleted` | Задача удалена | `{ task_id }` | При удалении | API endpoint `/api/pm/tasks/[id]` |
| `pm_task_viewed` | Просмотр задачи | `{ task_id, view_type }` | При открытии задачи | Frontend modal/page |
| `pm_task_comment_added` | Добавлен комментарий к задаче | `{ task_id, comment_id }` | При создании комментария | API endpoint `/api/pm/tasks/[id]/comments` |

### Представления (Views)

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `pm_view_changed` | Изменено представление задач | `{ view_type, project_id?, filters }` | При переключении представления | Frontend views (Kanban/List/Calendar) |
| `pm_kanban_column_changed` | Изменена колонка Kanban | `{ project_id, from_column, to_column, task_id }` | При drag & drop | Frontend Kanban board |
| `pm_filter_applied` | Применен фильтр | `{ view_type, filter_type, filter_value }` | При применении фильтра | Frontend views |
| `pm_sort_changed` | Изменена сортировка | `{ view_type, sort_field, sort_direction }` | При изменении сортировки | Frontend views |

## События Marketplace / Каталога

### Реально реализовано на 2026-03-09

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `pm_publish_started` | Создан черновик PM-публикации | `{ workspaceId, projectId, userId, actorUserId, authorEntityType, authorEntityId, publishedByUserId, listingId, source }` | При `POST /api/pm/projects/[id]/listings` | API |
| `pm_listing_updated` | Обновлена PM-публикация | `{ workspaceId, projectId, userId, actorUserId, authorEntityType, authorEntityId, listingId, source }` | При `PATCH /api/pm/projects/[id]/listings` | API |
| `pm_listing_deleted` | Удалена PM-публикация | `{ workspaceId, projectId, userId, actorUserId, authorEntityType, authorEntityId, listingId, source }` | При `DELETE /api/pm/projects/[id]/listings` | API |
| `catalog_publication_created` | Создана author publication для шаблона или услуги | `{ userId, kind, publicationId, sourceTemplateId? }` | При `POST /api/marketplace/author-publications` | API |
| `catalog_publication_updated` | Обновлена managed publication (`solution`/`template`/`service`) | `{ userId, kind, publicationId, state, authorEntityType?, authorEntityId? }` | При `PATCH /api/marketplace/author-publications/[kind]/[id]` | API |

**Примечание:** Это lightweight implementation telemetry. Payload keys пока следуют текущим code-level contracts и ещё не нормализованы к канонической warehouse schema из этого документа.

### Задокументировано, но пока не реализовано после C5

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `marketplace_product_viewed` | Просмотр detail surface публикации/шаблона | `{ product_id, listing_id, referrer?, position? }` | Планируется для detail surfaces `/market/*` | Frontend |
| `marketplace_product_added_to_cart` | Продукт добавлен в корзину | `{ product_id, listing_id }` | Планируется для template cart path | Frontend |
| `marketplace_cart_viewed` | Просмотр корзины | `{ item_count }` | Планируется при открытии `/market/cart` | Frontend |
| `marketplace_purchase_initiated` | Начата покупка | `{ product_id, listing_id, total_amount }` | Планируется вместе с real checkout | Frontend/API |
| `marketplace_purchase_completed` | Покупка завершена | `{ order_id, product_id, listing_id, total_amount }` | Планируется вместе с access delivery | API |
| `marketplace_service_inquiry_sent` | Отправлен inquiry/brief | `{ service_id, listing_id }` | Планируется для `Запросить адаптацию` | Frontend/API |
| `marketplace_listing_created` | Создана публикация в unified marketplace namespace | `{ listing_id, project_id, listing_type }` | Пока не используется; publication layer сейчас логирует `pm_*` и `catalog_publication_*` события | API |
| `marketplace_listing_published` | Публикация переведена в `published` | `{ listing_id }` | Планируется после выделения publish-state analytics | API |

### Catalog C5 gaps

- на 2026-03-09 в `/market`, `/p/:handle`, detail modals, favorites/cart/apply/inquiry/orders нет прямых frontend `trackEvent` вызовов;
- discovery / author-page / favorites / cart / apply / inquiry / orders остаются отдельной analytics implementation wave;
- storage / transport / enrichment pipeline для Catalog events пока не выделен отдельно.

## События Marketing

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `marketing_dashboard_viewed` | Просмотр дашборда маркетинга | `{ dashboard_type, date_range }` | При открытии дашборда | Frontend page `/marketing/overview` |
| `marketing_campaign_created` | Создана кампания | `{ campaign_id, campaign_type }` | При создании кампании | Frontend page `/marketing/campaigns` (API планируется) |
| `marketing_source_connected` | Подключен источник данных | `{ source_type, source_id }` | При подключении интеграции | Планируется (API `/api/marketing/*` отсутствует) |
| `marketing_report_exported` | Экспортирован отчет | `{ report_type, format }` | При экспорте отчета | Frontend export (API планируется) |

## События AI Hub

### AI-ассистенты

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `ai_assistant_used` | Использован AI-ассистент | `{ assistant_type, project_id?, task_id? }` | При использовании ассистента | Frontend AI Hub |
| `ai_generation_created` | Создана генерация | `{ generation_id, generation_type, provider }` | При создании генерации | API endpoint `/api/ai/generate` |
| `ai_prompt_created` | Создан промпт | `{ prompt_id, prompt_type }` | При создании промпта | Планируется (API `/api/ai/prompts` отсутствует) |
| `ai_agent_triggered` | Запущен AI-агент | `{ agent_id, trigger_type }` | При запуске агента | API endpoint `/api/pm/projects/[id]/ai-agents` |

### AI-агенты (Brandbook и другие)

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `ai_agent_invoked` | Агент вызван через @упоминание | `{ agent_type, project_id, user_id }` | При @упоминании агента в чате проекта | API endpoint `/api/pm/projects/[id]/chat` |
| `ai_agent_run_created` | Создан запуск агента | `{ run_id, agent_type, organization_id, project_id?, product_bundle }` | При создании нового запуска | API endpoint `/api/ai/agents/brandbook/runs` |
| `ai_agent_run_completed` | Запуск завершён | `{ run_id, agent_type, duration_ms, artifacts_count }` | При успешном завершении запуска | API endpoint `/api/ai/agents/brandbook/runs/[runId]` |
| `ai_agent_run_failed` | Запуск провалился | `{ run_id, agent_type, error_code, error_message? }` | При ошибке запуска | API endpoint `/api/ai/agents/brandbook/runs/[runId]` |
| `ai_agent_limit_exceeded` | Превышен лимит | `{ agent_type, organization_id, limit_type, current_value, max_value }` | При попытке превысить лимит (квота запусков и т.д.) | API endpoint `/api/ai/agents/*/runs` |

## События Finance

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `finance_budget_updated` | Обновлен бюджет проекта | `{ project_id, budget_total, currency }` | При обновлении бюджета | API endpoint `/api/pm/projects/[id]/budget` |
| `finance_expense_created` | Создан расход | `{ expense_id, project_id, amount, category }` | При создании расхода | API endpoint `/api/expenses` |
| `finance_expense_approved` | Расход утвержден | `{ expense_id, project_id, amount }` | При утверждении расхода | API endpoint `/api/expenses/[id]` (status=approved) |
| `finance_budget_threshold_exceeded` | Превышен порог бюджета | `{ project_id, threshold, current_spent }` | При превышении порога | Background job/API |

## Примеры схем событий

### pm_task_status_changed

```typescript
{
  event_id: "uuid",
  ts: "2026-01-06T12:00:00.000Z",
  user_id: "user-id",
  workspace_id: "workspace-id",
  organization_id: "org-id",
  session_id: "session-id",
  source: "web",
  // Специфичные поля
  task_id: "task-id",
  from_status: "new",
  to_status: "in_progress",
  project_id: "project-id"
}
```

### marketplace_product_viewed

```typescript
{
  event_id: "uuid",
  ts: "2026-01-06T12:00:00.000Z",
  user_id: "user-id",
  session_id: "session-id",
  source: "web",
  // Специфичные поля
  product_id: "product-id",
  listing_id: "listing-id",
  referrer?: "search" | "category" | "recommendation",
  position?: number // Позиция в списке/каталоге
}
```

### auth_account_type_selected

```typescript
{
  event_id: "uuid",
  ts: "2026-01-21T12:00:00.000Z",
  session_id: "session-id",
  source: "web",
  // Специфичные поля
  account_type: "personal" | "business",
  registration_type: "direct" | "invite"
}
```

## Реализация

### Frontend

События отправляются через `apps/web/lib/telemetry/index.ts`:

```typescript
import { trackEvent } from '@/lib/telemetry';

trackEvent('pm_task_created', {
  task_id: task.id,
  project_id: task.projectId,
  title: task.title,
  status: task.status
});
```

### Backend

События логируются в API endpoints при соответствующих действиях.

**Примечание:** Полная реализация аналитики планируется в будущем. Текущая реализация только логирует события в dev-режиме.

## NEEDS_CONFIRMATION

- [ ] Политика обработки PII
- [ ] Интеграция с внешними аналитическими системами (Google Analytics, Mixpanel, Amplitude)
- [ ] Хранение событий (база данных, data warehouse)
- [ ] Агрегация и отчеты
- [ ] Real-time дашборды аналитики
- [ ] Каталог: discovery / author / apply / inquiry / orders telemetry, storage и schema normalization
- [x] AI-агенты: базовые события реализованы (`ai_agent_invoked`, `ai_agent_run_created`)

---

**Связанные документы:**
- [Обзор платформы](./overview.md)
- [Глоссарий](./glossary.md)

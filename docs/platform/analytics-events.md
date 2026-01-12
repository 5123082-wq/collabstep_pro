# Analytics Events Taxonomy

**Статус:** active  
**Владелец:** product/analytics  
**Последнее обновление:** 2026-01-06

Это **канонический** список событий аналитики и их схем.

## Правила именования и структуры

### Именование событий

- Имена событий: `snake_case`
- Префиксы по модулям: `pm_`, `marketplace_`, `marketing_`, `ai_`, `finance_`
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

## События Marketplace

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `marketplace_product_viewed` | Просмотр продукта | `{ product_id, listing_id, referrer?, position? }` | При открытии страницы продукта | Frontend page `/market/*` |
| `marketplace_product_added_to_cart` | Продукт добавлен в корзину | `{ product_id, listing_id }` | При добавлении в корзину | Frontend page `/market/cart` |
| `marketplace_cart_viewed` | Просмотр корзины | `{ item_count }` | При открытии корзины | Frontend page `/market/cart` |
| `marketplace_purchase_initiated` | Начата покупка | `{ product_id, listing_id, total_amount }` | При переходе к checkout | Frontend checkout (API планируется) |
| `marketplace_purchase_completed` | Покупка завершена | `{ order_id, product_id, listing_id, total_amount }` | При успешной покупке | Планируется (API `/api/marketplace/*` отсутствует) |
| `marketplace_service_inquiry_sent` | Отправлен запрос на услугу | `{ service_id, listing_id }` | При отправке запроса | Планируется (API `/api/marketplace/*` отсутствует) |
| `marketplace_listing_created` | Создана публикация | `{ listing_id, project_id, listing_type }` | При публикации проекта | Планируется (API `/api/marketplace/*` отсутствует) |
| `marketplace_listing_published` | Публикация опубликована | `{ listing_id }` | При публикации | Планируется (API `/api/marketplace/*` отсутствует) |

## События Marketing

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `marketing_dashboard_viewed` | Просмотр дашборда маркетинга | `{ dashboard_type, date_range }` | При открытии дашборда | Frontend page `/marketing/overview` |
| `marketing_campaign_created` | Создана кампания | `{ campaign_id, campaign_type }` | При создании кампании | Frontend page `/marketing/campaigns` (API планируется) |
| `marketing_source_connected` | Подключен источник данных | `{ source_type, source_id }` | При подключении интеграции | Планируется (API `/api/marketing/*` отсутствует) |
| `marketing_report_exported` | Экспортирован отчет | `{ report_type, format }` | При экспорте отчета | Frontend export (API планируется) |

## События AI Hub

| Событие | Описание | Payload | Когда | Где |
|---------|----------|--------|-------|-----|
| `ai_assistant_used` | Использован AI-ассистент | `{ assistant_type, project_id?, task_id? }` | При использовании ассистента | Frontend AI Hub |
| `ai_generation_created` | Создана генерация | `{ generation_id, generation_type, provider }` | При создании генерации | API endpoint `/api/ai/generate` |
| `ai_prompt_created` | Создан промпт | `{ prompt_id, prompt_type }` | При создании промпта | Планируется (API `/api/ai/prompts` отсутствует) |
| `ai_agent_triggered` | Запущен AI-агент | `{ agent_id, trigger_type }` | При запуске агента | API endpoint `/api/pm/projects/[id]/ai-agents` |

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
- [ ] Marketplace/Marketing события и API (модули планируются)
- [ ] AI prompts/agents события (API отсутствуют)

---

**Связанные документы:**
- [Обзор платформы](./overview.md)
- [Глоссарий](./glossary.md)

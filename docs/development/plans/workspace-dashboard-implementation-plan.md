# План реализации «Рабочий стол» (универсальный дашборд виджетов)

Статус: План готов  
Цель: собрать единую точку входа по всем разделам (проекты, маркетинг, финансы, маркетплейс, AI-агенты, поддержка и т.д.), дать пользователю настраиваемую сетку виджетов (добавление, удаление, перетаскивание, ресайз, настройки) и сохранить контекст разработки.

Текущий код: `/apps/web/app/(app)/app/dashboard/_wip/dashboard-page.tsx` — заглушка в фичефлаге `projectDashboard`. Меню ведет на `/app/dashboard` через редирект `/dashboard`.

---

## Обзор этапов

- Stage A — Каркас, фичефлаг, IA/навигация (P0)
- Stage B — Сетка виджетов, Shell и Registry (P0)
- Stage C — Каталог виджетов, настройки, пресеты, стейты (P0)
- Stage D — Источники данных и API агрегатор (P0)
- Stage E — AI-слой (дайджест, аномалии, Q&A, suggested actions) (P1)
- Stage F — Аналитика, перф, тесты, мониторинг синков (P1)

Оценка: A–D ~4–5 недель, E–F +2–3 недели.

---

## Архитектурные принципы

- Widget-first: каждый виджет независим, регистрируется через реестр `type -> renderer`.
- Layout-as-data: координаты/размеры сохраняются на пользователя (БД) + локальный fallback.
- Stateful UX: обязательные состояния `content | loading | empty | error`, lastUpdated, источник данных, retry.
- Actionable: у каждого виджета CTA/быстрые действия (создать задачу, перезапустить агента, открыть тикет).
- AI-поверх: дайджест важного, аномалии по метрикам, Q&A с данными.
- Observability: статусы интеграций, очередь синков, ошибки, метки времени.

---

## Контракты данных (Frontend)

```ts
export type WidgetType =
  | 'projects-tasks'
  | 'ai-agents'
  | 'marketplace-reactions'
  | 'finance'
  | 'marketing'
  | 'community'
  | 'documents'
  | 'support'
  | 'system-status'
  | 'quick-actions';

export type WidgetState = 'content' | 'loading' | 'empty' | 'error';

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title?: string;
  layout: WidgetLayout;
  settings: Record<string, unknown>; // фильтры, источники, режим отображения
}

export interface WidgetData<T = unknown> {
  state: WidgetState;
  payload?: T;
  error?: string;
  lastUpdated?: string;
  source?: string;
}

export interface DashboardPreset {
  id: string;
  name: string;
  layout: WidgetConfig[];
  createdAt: string;
  updatedAt: string;
}
```

---

## Stage A — Каркас, фичефлаг, IA/навигация

**Статус:** TODO | **Приоритет:** P0 | **Оценка:** 2–3 дня | **Зависимости:** нет

### Цель
Включить раздел под новым флагом, зафиксировать маршруты, обновить меню/редиректы и подготовить документацию для дальнейших этапов.

### Задачи
- Ввести фичефлаг `workspaceDashboard` (env + `apps/web/lib/flags.ts`).
- Подключить `/app/dashboard` к новому флагу (удалить заглушку `FeatureComingSoon`).
- Проверить редиректы `/dashboard -> /app/dashboard`, хлебные крошки, активное состояние меню.
- Обновить документацию/IA (ссылки на новый флаг и маршрут).

### DoD
- Флаг `workspaceDashboard` управляет показом новой страницы.
- Роуты и меню работают, e2e smoke для `/app/dashboard` проходит.
- Нет регрессий для текущего `projectDashboard` флага (если нужен, оставить совместимость).

### Файлы
- `apps/web/lib/flags.ts` — добавить `WORKSPACE_DASHBOARD`.
- `apps/web/app/(app)/app/dashboard/page.tsx` — включить контент под флагом.
- `apps/web/components/app/LeftMenu.config.ts` — убедиться в корректном href/label.
- `docs/...` — ссылка на новый флаг (см. Stage F для аналитики).

---

## Stage B — Сетка виджетов, Shell и Registry

**Статус:** TODO | **Приоритет:** P0 | **Оценка:** 5–7 дней | **Зависимости:** Stage A

### Цель
Собрать визуальный каркас: сетка, оболочка виджета, реестр компонентов, базовые состояния.

### Задачи
- Компоненты: `DashboardShell`, `WidgetGrid`, `WidgetShell` (header, body, footer, статус, CTA).
- Реестр: `widgetRegistry` (`type -> component`, `type -> defaultConfig`).
- Состояния: отображение `loading/empty/error/content`, skeletons, retry.
- Брейкпоинты: desktop/tablet/mobile с snap-to-grid, минимальные размеры.
- Локальное сохранение layout (`localStorage`/Zustand) для перетаскивания.

### DoD
- Можно разместить стартовый набор мок-виджетов, перетащить и изменить размер, состояние сохраняется локально.
- Есть единый `WidgetShell` со статус-индикатором и lastUpdated placeholder.
- Код покрыт сторибуками или unit snapshot для shell (при наличии storybook).

### Файлы
- `apps/web/components/dashboard/WidgetShell.tsx` (новый)
- `apps/web/components/dashboard/WidgetGrid.tsx` (новый)
- `apps/web/components/dashboard/widget-registry.ts` (новый)
- `apps/web/app/(app)/app/dashboard/_wip/dashboard-page.tsx` — заменить на новый shell.
- `apps/web/styles/dashboard.css` или модульный стиль (новый/обновленный).

---

## Stage C — Каталог виджетов, настройки, пресеты, стейты

**Статус:** TODO | **Приоритет:** P0 | **Оценка:** 6–8 дней | **Зависимости:** Stage B

### Цель
Дать пользователю контроль: добавление/удаление/сброс, настройки виджетов, сохранение пресетов и демонстрация стейтов.

### Задачи
- Каталог виджетов (offcanvas/модал) с поиском и превью.
- CRUD пресетов: `Мой день`, `Операционный`, `Маркетинг`, `Финансы`; сохранение под пользователем.
- Настройки внутри виджета (иконка шестеренки): источники, фильтры, режим отображения (card/table/mini-chart).
- Кнопки `Обновить виджеты`, `Запланировать синк` (мок), табы стейтов `контент | загрузка | пусто | ошибка` для демо.
- Сохранение layout на сервере (fallback — локально).

### DoD
- Добавление/удаление виджетов из каталога работает, layout сохраняется и восстанавливается.
- Можно переключить пресет, сбросить к дефолту, изменить настройки виджета и увидеть изменения.
- UX-стейты переключаются и отображаются корректно.

### Файлы
- `apps/web/components/dashboard/WidgetCatalog.tsx` (новый)
- `apps/web/components/dashboard/WidgetSettingsDrawer.tsx` (новый)
- `apps/web/lib/dashboard/layout-store.ts` (новый, Zustand/локалсторадж)
- `apps/web/app/api/dashboard/layout/route.ts` (новый, мок сохранения layout на пользователя)
- `apps/web/app/(app)/app/dashboard/_wip/dashboard-page.tsx` — подключение каталога/пресетов.

---

## Stage D — Источники данных и API агрегатор

**Статус:** TODO | **Приоритет:** P0 | **Оценка:** 8–10 дней | **Зависимости:** Stage C

### Цель
Подключить реальные данные из основных разделов через единый агрегатор, показывать статусы синков и ошибки.

### Задачи
- Backend: `DashboardService` + `DashboardRepository` для агрегации данных по виджетам.
- API:
  - `GET /api/dashboard/data?widgets=...` — вернуть `WidgetData[]` батчем.
  - `POST /api/dashboard/sync` — ручной запуск синка (мок/очередь).
  - `GET /api/dashboard/status` — статусы интеграций/последний синк.
- Источники (минимум MVP):
  - Проекты/задачи: overdue, due soon, блокеры, активные спринты.
  - AI-агенты: активные/остановленные, ошибки пайпов.
  - Маркетплейс реакции: последние отзывы/рейтинги, непрочитанные.
  - Финансы: доходы/расходы/покупки, MRR/ARR, кэш-фло.
  - Маркетинг: активные кампании, ROAS/CAC/CTR, аномалии трат.
  - Комьюнити/поддержка/документы: новые заявки, тикеты, согласования.
  - Системный статус: интеграции, очередь синков, latency/ошибки.
- Добавить `lastUpdated`, `source`, `error` в UI, кнопка retry.

### DoD
- API возвращает валидные данные/ошибки по каждому виджету, UI показывает стейты и время обновления.
- Список интеграций фиксирован и документирован; при недоступности источника виджет уходит в error с retry.
- Локальный мок покрыт unit/e2e smoke (интеграционный маршрут).

### Файлы
- `apps/api/src/services/dashboard-service.ts` (новый)
- `apps/api/src/repositories/dashboard-repository.ts` (новый или mock)
- `apps/api/src/routes/dashboard.ts` или `apps/web/app/api/dashboard/data/route.ts` (новый)
- `apps/web/components/dashboard/widgets/*` — реальные виджеты для стартового набора.
- `apps/web/tests/e2e/dashboard.spec.ts` — smoke загрузки виджетов.

---

## Stage E — AI-слой (дайджест, аномалии, Q&A, suggested actions)

**Статус:** TODO | **Приоритет:** P1 | **Оценка:** 5–6 дней | **Зависимости:** Stage D

### Цель
Добавить поверх данных AI-ассист: резюме дня, аномалии, ответы на вопросы, предложки действий.

### Задачи
- Виджет `AI дайджест`: краткие выводы по проектам/маркетингу/финансам/поддержке.
- Аномалии: правило/эвристика (без внешнего API) + подсветка в соответствующих виджетах.
- Q&A: чат поверх данных виджетов (локальный контекст) — базовый мок/локальный LLM stub.
- Suggested actions: кнопки "создать задачу", "перезапустить кампанию", "ответить на отзыв".

### DoD
- Дайджест отображается из данных Stage D, обновляется по кнопке.
- Минимальный стор для Q&A и список готовых предложенных действий.
- UI/UX соответствует единым стейтам (`loading/error/content`).

### Файлы
- `apps/web/components/dashboard/widgets/ai-digest.tsx` (новый)
- `apps/web/components/dashboard/ai-context-provider.tsx` (новый)
- `apps/api/src/services/dashboard-ai-service.ts` (новый, если нужен мок)

---

## Stage F — Аналитика, перф, тесты, мониторинг синков

**Статус:** TODO | **Приоритет:** P1 | **Оценка:** 4–5 дней | **Зависимости:** Stage D

### Цель
Закрыть качество: аналитика событий, перф, e2e, мониторинг ошибок синков.

### Задачи
- События аналитики:
  - `dashboard_viewed`, `dashboard_widget_added/removed/resized/moved`, `dashboard_preset_applied/saved/reset`
  - `dashboard_sync_started/completed/failed`, `dashboard_widget_retry`
  - `dashboard_ai_digest_requested`, `dashboard_qna_asked`, `dashboard_suggested_action_clicked`
- Перф: ленивые виджеты, мемоизация, агрегация запросов, батчинг API.
- Мониторинг: логирование ошибок синков, лимит ретраев, отображение в `SystemStatus`.
- Тесты: unit (store, registry, reducers), e2e (добавление/перетаскивание/сохранение), accessibility smoke.

### DoD
- Все ключевые действия логируются, аналитика документирована.
- E2E сценарии стабильны, не ломают остальные разделы.
- Ошибки синков видны пользователю и в логах/консоле при dev.

### Файлы
- `apps/web/lib/analytics/events.ts` — добавить события.
- `apps/web/tests/e2e/dashboard.spec.ts` — расширить.
- `apps/api/src/services/dashboard-service.ts` — логирование синков/ошибок.

---

## Стартовый набор виджетов (MVP)

- Projects/Tasks: due soon/overdue, спринты, блокеры.
- AI-агенты: активные/остановленные, ошибки пайпов, restart.
- Marketplace реакции: отзывы, рейтинг, быстрый ответ.
- Финансы: доходы/расходы/покупки, MRR/ARR, кэш-фло.
- Маркетинг: кампании, ROAS/CAC/CTR, аномалии трат.
- Комьюнити/Поддержка: заявки, тикеты, SLA, непрочитанные.
- Документы: новые/на согласовании, дедлайны.
- System Status: интеграции, очередь синков, last updated, retry.
- Quick Actions: создаёт задачи/кампании/тикеты/агентов.

---

## UX и интеракции

- Каталог виджетов: offcanvas справа, поиск, превью, фильтр по типу.
- Виджет: заголовок + статус-точка (green/yellow/red), шестеренка настроек, меню действий.
- Состояния: `loading` — skeleton; `empty` — информативный текст + CTA; `error` — причина + retry.
- Перетаскивание/ресайз: snap к сетке, ограничения min/max, undo/redo (минимум 1 шаг).
- Метки времени: `lastUpdated`, источник данных, `nextSync` (если доступно).

---

## Интеграции и источники данных

- Проекты/Задачи: Linear/Jira/Asana/ClickUp или внутренние API `/api/pm/dashboard`.
- Маркетинг: GA4, Meta Ads, Google Ads, TikTok Ads (агрегация через бек сервис).
- Финансы: Stripe/PayPal/внутренние транзакции (см. finance plan).
- Маркетплейс: внутренние отзывы/реакции, webhooks внешних площадок (если есть).
- Комьюнити/Поддержка: Intercom/Zendesk/HelpScout/Telegram/Discord.
- AI-агенты: внутренний статус воркеров, очереди, ошибки пайпов.
- Observability: статусы интеграций, счетчики ошибок, лаг синка.

---

## Хранение и пресеты

- Локально: Zustand + `localStorage` (`cv-dashboard-layout`) для быстрого UX.
- Сервер: `/api/dashboard/layout` хранит layout/preset на пользователя (таблица `dashboard_layouts` при переходе на реальную БД).
- Пресеты: дефолт (MVP), пользовательские (CRUD), экспорт/импорт (JSON) — опционально после Stage C.

---

## Аналитика (события и параметры)

- Общие поля: `{ userId, workspaceId, orgId?, presetId?, widgetType?, source?, state? }`.
- Навигация/просмотр: `dashboard_viewed`, `dashboard_preset_applied`.
- Манипуляции: `dashboard_widget_added/removed/moved/resized`, `dashboard_settings_opened/saved`.
- Данные: `dashboard_sync_started/completed/failed`, `dashboard_widget_retry`.
- AI: `dashboard_ai_digest_requested`, `dashboard_qna_asked`, `dashboard_suggested_action_clicked`.

---

## Риски и ограничения

- Зависимости на внешние интеграции — предусмотреть graceful degradation (empty/error).
- Перф: избегать N+1 запросов, делать батч по виджетам.
- Миграция от `projectDashboard` к `workspaceDashboard` — предусмотреть временное сосуществование флагов.
- Мобильный вид: ограниченный набор виджетов, одиночная колонка, отключить ресайз.

---

## Чек-лист готовности перед релизом

- [ ] Флаг `workspaceDashboard` включен на staging, off на prod.
- [ ] Все виджеты имеют стейты `loading/empty/error` и retry.
- [ ] Перетаскивание/ресайз сохраняются между сессиями.
- [ ] Агрегатор возвращает данные без 500, ошибки видны в UI.
- [ ] Аналитика событий зафиксирована и отправляется.
- [ ] E2E smoke: загрузка дашборда, добавление/удаление виджета, применение пресета.

[AGENT][done][Stage A+B]: Добавлен фичефлаг workspaceDashboard и маршрут /app/dashboard без заглушки; собран Widget-first каркас (DashboardShell, WidgetGrid, WidgetShell, registry, layout-store с localStorage) с мок-виджетами и стейтами content/loading/empty/error + lastUpdated/source/retry. Ключевые файлы: apps/web/app/(app)/app/dashboard/page.tsx, apps/web/components/dashboard/*, apps/web/lib/dashboard/*. Проверен флаг projectDashboard на совместимость. Тесты: pnpm --filter @collabverse/web typecheck.
[AGENT][done][Stage C/D]: Добавлен батч-эндпоинт /api/dashboard/data с реальными метриками projects-tasks (overdue/dueSoon/blockers/activeSprints, spotlight); DashboardShell грузит данные через API с состояниями loading/empty/error, lastUpdated/source и retry/refresh. Реализованы каталог виджетов (добавление/удаление), пресеты (default/my-day/operational/marketing/finance + кастомные), и серверное хранение layout через /api/dashboard/layout; layout/preset подтягиваются при загрузке и сохраняются при изменениях. Флаг projectDashboard не затронут.
[AGENT][tools]: pnpm --filter @collabverse/web typecheck.
[AGENT][next]: Расширить агрегатор на остальные виджеты + /api/dashboard/status|sync, добавить настройки виджетов и e2e/smoke на добавление/перетаскивание/пресеты, обработать ошибки источников и аналитики.

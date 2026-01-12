# Architecture (arc42)

**Статус:** active  
**Владелец:** engineering  
**Последнее обновление:** 2026-01-07

Архитектурная документация платформы Collabverse в формате arc42. Документ описывает архитектуру системы, ключевые решения и технические детали.

## 1. Introduction & Goals

### Business Goals

Платформа Collabverse объединяет управление проектами, маркетплейс и маркетинговую аналитику в единую систему. Основные бизнес-цели:

**Единая платформа для управления проектами:**
- Создание проектов из шаблонов или с нуля
- Управление задачами с поддержкой иерархии, статусов, меток
- Различные представления (Kanban, List, Calendar, Gantt) для разных рабочих стилей
- Real-time синхронизация состояния между участниками

**Коллаборация команды:**
- Приглашение участников в проекты и организации
- Комментарии к задачам, чат проекта
- Файловый менеджер для совместной работы с документами
- Уведомления о важных событиях

**Финансовый контроль:**
- Бюджеты проектов с лимитами по категориям
- Учет расходов с привязкой к проектам
- Отслеживание превышения лимитов и предупреждения
- Финансовая отчетность

**Публикация и продажа:**
- Публикация проектов как шаблонов в маркетплейсе
- Продажа продуктов через корзину
- Предоставление услуг через запросы
- Управление заказами

**Маркетинговая аналитика:**
- Дашборды ROI/CPC/CPA/CLV
- Интеграции с внешними платформами (Google Ads, Facebook Ads)
- Экспорт и публикация отчетов

**AI-помощь:**
- AI-ассистент для проектов
- Генерация контента (тексты, изображения)
- Автоматизация рутинных задач через AI-агентов

Подробнее см. [`../platform/vision-scope.md`](../platform/vision-scope.md).

### Quality Goals

**Надежность:**
- Высокая доступность системы (uptime > 99.9%)
- Отказоустойчивость: автоматический fallback на polling при недоступности WebSocket
- Целостность данных: транзакции для критических операций, валидация через Zod

**Производительность:**
- Быстрая загрузка страниц: использование Server Components для уменьшения клиентского кода
- Оптимизация чтения данных: cache-aside паттерн для кэширования результатов запросов
- Real-time обновления: WebSocket для мгновенной синхронизации состояния

**Безопасность:**
- Параметризованные SQL-запросы для предотвращения SQL-инъекций
- Проверка прав доступа на уровне API и UI
- Валидация всех пользовательских данных через Zod схемы
- Безопасное хранение секретов в переменных окружения

**Масштабируемость:**
- Горизонтальное масштабирование через Vercel
- Модульная архитектура: независимые модули (PM Core, Marketplace, Marketing, AI Hub)
- Оптимизация БД: индексы, нормализация данных, эффективные запросы

**Поддерживаемость:**
- Строгая типизация TypeScript для раннего обнаружения ошибок
- Модульная структура кода: разделение на репозитории, сервисы, компоненты
- Документация: docs-as-code подход, актуальная документация в репозитории
- Feature flags для управления функциональностью без деплоя

### Stakeholders

**B2B команды:**
- **Агентства** — управление клиентскими проектами, командами, бюджетами
- **Стартапы** — полный цикл разработки продукта от идеи до запуска
- **Компании** — внутренние проекты, команды, финансы

**B2C профессионалы/креаторы:**
- **Фрилансеры** — управление проектами, клиентами, финансами
- **Креаторы** — публикация работ в маркетплейсе, управление заказами

**Агентства:**
- **Дизайн-агентства** — управление проектами, командами, публикация портфолио
- **Маркетинговые агентства** — управление кампаниями, аналитика, отчеты

Подробнее см. [`../platform/vision-scope.md`](../platform/vision-scope.md#целевые-аудитории).

## 2. Constraints

### Technical Constraints

**Технологический стек:**
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript 5.5
- **Backend:** Next.js route handlers, TypeScript
- **Database:** PostgreSQL (Vercel Postgres), Drizzle ORM
- **State Management:** Zustand для клиентского состояния
- **Validation:** Zod для схем валидации
- **Styling:** Tailwind CSS с кастомными design tokens

**Хостинг и инфраструктура:**
- **Hosting:** Vercel для фронтенда и API
- **Database:** Vercel Postgres (PostgreSQL)
- **File Storage:** Vercel Blob Storage
- **WebSocket:** отдельный процесс (порт 8080)

**Ограничения TypeScript:**
- `exactOptionalPropertyTypes: true` — требует правильной работы с опциональными свойствами
- Строгая типизация: избегание `any`, использование конкретных типов

**Ограничения БД:**
- PostgreSQL как единственный источник истины для данных
- Память используется только как кэш (cache-aside паттерн)
- Миграции через Drizzle ORM

### Organizational Constraints

**Feature Flags:**
- Управление функциональностью через feature flags без деплоя
- Конфигурация: `config/feature-flags.ts` и `apps/web/lib/feature-flags.ts`
- Примеры флагов: `NAV_V1`, `AUTH_DEV`, `PM_NAV_PROJECTS_AND_TASKS`, `FIN_EXPENSES_STORAGE`

**Модульная архитектура:**
- Каждый модуль независим, можно использовать отдельно
- Модули: PM Core, Marketplace, Marketing, AI Hub, Finance, Community, Performers
- Документация модулей в `docs/modules/`

**Docs-as-code:**
- Документация хранится в репозитории, версионируется вместе с кодом
- Обновление документации при реализации новых фич
- Структурированная документация: платформа, модули, архитектура

### Legal/Compliance

**Data Privacy:**
- Хранение персональных данных в соответствии с требованиями GDPR (если применимо)
- Безопасное хранение паролей: хеширование через bcrypt или аналогичные алгоритмы
- Ограничение доступа к данным: проверка прав доступа на уровне API

**NEEDS_CONFIRMATION:**
- [ ] Детальные требования GDPR compliance
- [ ] Требования к хранению данных в разных регионах
- [ ] Политика удаления данных пользователей

## 3. Context & Scope

### External Systems

**Vercel Postgres:**
- Основное хранилище данных (PostgreSQL)
- Используется для хранения пользователей, организаций, проектов, задач
- Миграции через Drizzle ORM
- Строка подключения через переменную окружения `POSTGRES_URL`

**Vercel Blob Storage:**
- Хранение файлов проектов
- Интеграция с файловым менеджером PM Core
- Публичные ссылки для доступа к файлам (с проверкой прав доступа)

**AI провайдеры:**
- **OpenAI** — генерация контента, AI-ассистент
- **Yandex GPT** — альтернативный провайдер для AI-функций
- **Anthropic** — планируется интеграция
- API ключи через переменные окружения

**Планируемые интеграции:**
- **Google Ads API** — маркетинговая аналитика
- **Facebook Ads API** — маркетинговая аналитика
- **Stripe** — платежи для подписок и маркетплейса

**Диаграмма контекста (упрощенная):**
```mermaid
flowchart LR
  User[Users] --> WebApp[Web App (Next.js)]
  WebApp --> API[API routes]
  WebApp <--> WS[WebSocket server]
  API --> DB[(Vercel Postgres)]
  API --> Blob[Vercel Blob Storage]
  API --> AI[AI Providers]
```

### Users and Roles

**Роли в организации (Organization Roles):**
- **`owner`** — владелец организации. Полный доступ ко всем workspace и проектам организации
- **`admin`** — администратор организации. Может управлять workspace, проектами, приглашать участников
- **`member`** — участник организации. Может создавать проекты, работать с задачами
- **`viewer`** — наблюдатель. Только просмотр проектов и задач

**Роли в проекте (Project Roles):**
- **`owner`** — владелец проекта. Полный контроль над проектом
- **`manager`** — менеджер проекта. Может управлять задачами, командой, но не удалять проект
- **`contributor`** — участник проекта. Может создавать и редактировать задачи, комментировать
- **`viewer`** — наблюдатель. Только просмотр задач и комментариев

**Системные роли платформы (Platform Roles):**
- **`productAdmin`** — администратор продукта. Доступ к админ-панели, управление feature flags
- **`featureAdmin`** — администратор фич. Управление feature flags
- **`financeAdmin`** — администратор финансов. Доступ к финансовому модулю
- **`moderator`** — модератор. Модерация контента, пользователей
- **`betaTester`** — бета-тестер. Доступ к бета-фичам

Подробнее см. [`../platform/roles-permissions.md`](../platform/roles-permissions.md).

### Data Flows

**Auth Flow:**
1. Пользователь вводит email и пароль на `/login`
2. `POST /api/auth/login` проверяет учетные данные
3. Устанавливается cookie `cv_session` с данными сессии
4. Пользователь перенаправляется в приложение
5. Проверка прав доступа на каждом запросе через middleware

**Project Creation Flow:**
1. Пользователь создает проект через UI (`/pm/projects`)
2. `POST /api/pm/projects` валидирует данные через Zod
3. Проверка прав доступа к workspace
4. Создание проекта в БД через `ProjectsRepository`
5. Обновление кэша (cache-aside паттерн)
6. WebSocket событие `project.created` для real-time обновления

**Task Updates Flow:**
1. Пользователь обновляет задачу (например, меняет статус в Kanban)
2. `PATCH /api/pm/tasks/:id` валидирует изменения
3. Обновление задачи в БД через `TasksRepository`
4. Инвалидация кэша
5. WebSocket событие `task.updated` рассылается всем клиентам в комнате проекта
6. UI обновляется в реальном времени на всех клиентах

**Checkout Flow (Marketplace):**
1. Пользователь добавляет продукты в корзину
2. Состояние корзины хранится в Zustand store
3. При checkout: `POST /api/marketplace/orders`
4. Создание заказа в БД
5. Обработка платежа (планируется интеграция со Stripe)
6. Уведомление покупателя и продавца

**Service Inquiries Flow:**
1. Пользователь создает запрос на услугу в маркетплейсе
2. `POST /api/marketplace/inquiries`
3. Уведомление продавца о новом запросе
4. Продавец отвечает на запрос
5. Создание проекта из шаблона при согласовании

**Marketing Dashboards Flow:**
1. Пользователь открывает маркетинговый дашборд
2. Загрузка данных из БД и внешних API (Google Ads, Facebook Ads)
3. Агрегация метрик (ROI, CPC, CPA, CLV)
4. Отображение графиков и таблиц
5. Экспорт отчетов в CSV/PDF

## 4. Solution Strategy

### Key Architectural Decisions

Ключевые архитектурные решения задокументированы в ADR (Architectural Decision Records):

- **[ADR-0001: Канонические таблицы](./adr/0001-canonical-database-tables.md)** — зафиксированы `pm_projects` и `pm_tasks` как единственные канонические таблицы для проектов и задач
- **[ADR-0002: Cache-aside паттерн](./adr/0002-cache-aside-pattern.md)** — память используется только как кэш, БД — единственный источник истины
- **[ADR-0003: Next.js App Router](./adr/0003-nextjs-app-router.md)** — выбор Next.js 14 App Router с Server Components и Server Actions
- **[ADR-0004: WebSocket для real-time](./adr/0004-websocket-realtime.md)** — WebSocket с fallback на polling для real-time синхронизации
- **[ADR-0005: Мультиаккаунт](./adr/0005-multi-account-model.md)** — целевое состояние: Organizations + Workspaces с подпиской, текущая реализация частичная

Полный список ADR см. [`./adr/README.md`](./adr/README.md).

### Technology Choices

**Frontend:**
- **Next.js 14 App Router** — современный роутинг, Server Components, Server Actions
- **React 18** — компоненты, хуки, контекст
- **TypeScript 5.5** — строгая типизация для надежности
- **Zustand** — управление клиентским состоянием (корзина, UI состояние)
- **Zod** — валидация схем на клиенте и сервере
- **Tailwind CSS** — утилитарная стилизация с кастомными design tokens
- **Lucide React** — иконки

**Backend:**
- **Next.js route handlers** — API endpoints в `app/api/`
- **Drizzle ORM** — работа с БД, миграции, типизация
- **PostgreSQL** — реляционная БД через Vercel Postgres
- **Zod** — валидация входных данных API

**Real-time:**
- **Socket.io** — WebSocket сервер для real-time обновлений
- **Fallback на polling** — при недоступности WebSocket

**File Storage:**
- **Vercel Blob Storage** — хранение файлов проектов
- **Публичные ссылки** — с проверкой прав доступа через server-side proxy

**AI Integration:**
- **OpenAI API** — генерация контента, AI-ассистент
- **Yandex GPT** — альтернативный провайдер

Подробнее см. [`../platform/overview.md`](../platform/overview.md#архитектура-платформы).

## 5. Building Block View

### Major Components

**Web App (Next.js 14 App Router):**
- **Расположение:** `apps/web/app/`
- **Структура:** App Router с Server Components и Server Actions
- **Маркетинговые страницы:** `(marketing)/` — публичные страницы с шапкой и футером
- **Приложение:** `(app)/` — защищенные страницы после логина
- **API routes:** `api/` — Next.js route handlers для backend логики
- **Компоненты:** `components/` — React компоненты (UI, app, feature)

**Backend/API (Next.js route handlers):**
- **Расположение:** `apps/web/app/api/`
- **Аутентификация:** `/api/auth/*` — login, logout, register
- **PM Core:** `/api/pm/*` — проекты, задачи, комментарии, уведомления
- **Marketplace:** `/api/marketplace/*` — продукты, заказы, запросы
- **Organizations:** `/api/organizations/*` — управление организациями
- **Files:** `/api/files/*` — загрузка и управление файлами

**Repositories:**
- **Расположение:** `apps/api/src/repositories/`
- **Назначение:** Абстракция доступа к данным, работа с БД и кэшем
- **Примеры:**
  - `ProjectsRepository` — работа с проектами (`pm_projects`)
  - `TasksRepository` — работа с задачами (`pm_tasks`)
  - `OrganizationsRepository` — работа с организациями
  - `TemplateTasksRepository` — работа с задачами шаблонов
- **Паттерн:** Cache-aside для чтения, запись в БД с обновлением кэша

**Realtime/Notifications (WebSocket сервер):**
- **Расположение:** `apps/api/src/websocket/`
- **Назначение:** Real-time синхронизация состояния между клиентами
- **Протокол:** Socket.io
- **Комнаты:** Каждый проект имеет свою комнату для событий
- **События:** `task.created`, `task.updated`, `comment.added`, `chat.message`, `notification.new`
- **Fallback:** Polling при недоступности WebSocket сервера
- **Документация:** [`../modules/projects-tasks/projects-tasks-websocket.md`](../modules/projects-tasks/projects-tasks-websocket.md)

**Marketplace Services:**
- **Модуль:** Marketplace
- **Функции:** Каталог продуктов, корзина, checkout, заказы, запросы на услуги
- **Документация:** [`../modules/marketplace/marketplace-overview.md`](../modules/marketplace/marketplace-overview.md)
- **API:** `/api/marketplace/*`

**AI Hub Services:**
- **Модуль:** AI Hub
- **Функции:** AI-ассистент, генерация контента, промпты, агенты
- **Интеграции:** OpenAI, Yandex GPT, Anthropic (планируется)
- **Документация:** [`../modules/ai-hub/ai-hub-overview.md`](../modules/ai-hub/ai-hub-overview.md)
- **Документация интеграции:** [`../modules/ai-hub/ai-hub-integration.md`](../modules/ai-hub/ai-hub-integration.md)

**Analytics Pipeline:**
- **События:** Определены в [`../platform/analytics-events.md`](../platform/analytics-events.md)
- **Типы событий:** `project.created`, `task.updated`, `comment.added`, `notification.created`, и др.
- **Сбор данных:** События отправляются при действиях пользователей
- **Аналитика:** Дашборды с метриками (ROI, CPC, CPA, CLV)

**External Integrations:**
- **Vercel Postgres** — основное хранилище данных
- **Vercel Blob Storage** — хранение файлов
- **OpenAI / Yandex GPT** — AI провайдеры
- **Google Ads API** — планируется интеграция
- **Facebook Ads API** — планируется интеграция
- **Stripe** — планируется интеграция для платежей

## 6. Runtime View

### Key Flows

**Auth Flow:**
```text
1. Пользователь → POST /api/auth/login (email, password)
2. Backend → Проверка учетных данных (dev: из ENV, prod: из БД)
3. Backend → Установка cookie cv_session с данными сессии
4. Backend → Редирект на /app/dashboard
5. Middleware → Проверка сессии на каждом запросе
6. API → Проверка прав доступа через roles
```

**Task Updates Flow (WebSocket):**
```text
1. Пользователь A → PATCH /api/pm/tasks/:id (изменение статуса)
2. Backend → Валидация через Zod
3. Backend → Обновление в БД через TasksRepository
4. Backend → Инвалидация кэша
5. WebSocket Server → Событие task.updated в комнату проекта
6. Все клиенты в комнате → Получение события через WebSocket
7. UI → Обновление локального состояния и перерисовка
```

**Task Updates Flow (Fallback Polling):**
```text
1. Пользователь A → PATCH /api/pm/tasks/:id
2. Backend → Обновление в БД
3. Пользователь B → Polling каждые N секунд (зависит от компонента)
4. Backend → Возврат актуальных данных
5. UI → Обновление состояния
```

**Checkout Flow (Marketplace):**
```text
1. Пользователь → Добавление продуктов в корзину (Zustand store)
2. Пользователь → POST /api/marketplace/orders (checkout)
3. Backend → Валидация данных заказа
4. Backend → Создание заказа в БД
5. Backend → Обработка платежа (планируется: Stripe)
6. Backend → Уведомление покупателя и продавца
7. UI → Обновление состояния корзины и заказов
```

**Service Inquiries Flow:**
```text
1. Пользователь → Создание запроса на услугу в маркетплейсе
2. Backend → POST /api/marketplace/inquiries
3. Backend → Создание inquiry в БД
4. Backend → Уведомление продавца (WebSocket + notification)
5. Продавец → Просмотр запроса и ответ
6. При согласовании → Создание проекта из шаблона
```

**Marketing Dashboards Flow:**
```text
1. Пользователь → Открытие маркетингового дашборда
2. Frontend → Запрос данных из БД и внешних API
3. Backend → Агрегация метрик (ROI, CPC, CPA, CLV)
4. Backend → Возврат данных для графиков
5. Frontend → Отображение графиков и таблиц
6. Пользователь → Экспорт отчета (CSV/PDF)
```

Подробнее о потоках см. [`../architecture/system-analysis.md`](./system-analysis.md#текущее-api-nextjs-route-handlers).

## 7. Deployment View

### Environments

**Development:**
- **Frontend:** `localhost:3000` — Next.js dev server
- **WebSocket:** `localhost:8080` — отдельный WebSocket сервер
- **Database:** Vercel Postgres (dev instance) или локальный PostgreSQL через Docker
- **File Storage:** Vercel Blob Storage (dev bucket)
- **Feature Flags:** Все флаги доступны для тестирования

**Staging:**
- **Hosting:** Vercel preview deployments
- **Database:** Vercel Postgres (staging instance)
- **File Storage:** Vercel Blob Storage (staging bucket)
- **Feature Flags:** Контролируемое включение фич для тестирования

**Production:**
- **Hosting:** Vercel production deployment
- **Database:** Vercel Postgres (production instance)
- **File Storage:** Vercel Blob Storage (production bucket)
- **Feature Flags:** Постепенное включение фич через feature flags
- **Monitoring:** Vercel Analytics, Speed Insights

### Hosting

**Vercel:**
- **Frontend + API:** Next.js приложение деплоится на Vercel
- **Runtime:** Serverless/Node.js по умолчанию; Edge Functions используются точечно при необходимости
- **Serverless:** Автоматическое масштабирование при нагрузке
- **CDN:** Статические ресурсы раздаются через CDN
- **Environment Variables:** Управление через Vercel dashboard

**WebSocket Server:**
- **Отдельный процесс:** WebSocket сервер запускается отдельно (порт 8080)
- **NEEDS_CONFIRMATION:** Детали деплоя WebSocket сервера в production

### Infrastructure

**Vercel Postgres:**
- **Тип:** Managed PostgreSQL
- **Регион:** NEEDS_CONFIRMATION
- **Backup:** Автоматические бэкапы через Vercel
- **Миграции:** Применяются через Drizzle ORM при деплое

**Vercel Blob Storage:**
- **Тип:** Object storage для файлов
- **Интеграция:** Через `@vercel/blob` SDK
- **Доступ:** Публичные ссылки с проверкой прав доступа через server-side proxy

**Monitoring:**
- **Vercel Analytics:** Метрики производительности
- **Speed Insights:** Core Web Vitals
- **Logs:** Доступны через Vercel dashboard

**NEEDS_CONFIRMATION:**
- [ ] Детали деплоя WebSocket сервера в production
- [ ] Стратегия масштабирования WebSocket сервера
- [ ] Мониторинг и алертинг (логи, метрики, трейсы)

## 8. Cross-cutting Concepts

### AuthN/AuthZ

**Аутентификация (AuthN):**
- **Dev-режим:** Cookie `cv_session` с base64 JSON payload (email, role, issuedAt)
- **Production:** Планируется JWT/паспортный токен с refresh tokens
- **NextAuth.js v5:** Интеграция для production аутентификации
- **Сессии:** Хранение в БД через таблицу `sessions`

**Авторизация (AuthZ):**
- **Роли:** Определены в [`../platform/roles-permissions.md`](../platform/roles-permissions.md)
- **Проверка прав:** На уровне API через `hasAccess()` методы репозиториев
- **UI:** Проверка ролей через `getUserRoles()` и `canAccessProject()`
- **Scopes:** Права на уровне организации, workspace, проекта

Подробнее см. [`../platform/roles-permissions.md`](../platform/roles-permissions.md) и [`../architecture/system-analysis.md`](./system-analysis.md#авторизация-и-мультиаккаунт).

### Multi-tenancy

**Текущее состояние:**
- **Organizations:** Пользователь может состоять в нескольких организациях
- **Workspaces:** Логический `workspace_id` в `pm_*` таблицах; отдельной таблицы workspace в БД нет
- **Projects:** Проект принадлежит `workspace_id`
- **Data Isolation:** Фильтрация данных по `organization_id` (Drizzle) и `workspace_id` (pm_* таблицы)

**Целевое состояние (подписка):**
- **Organizations + Workspaces:** Отдельные таблицы workspaces и membership с привязкой к organization
- **Ограничения подписок:** лимиты по организациям/воркспейсам (частично реализовано через `user_subscription.max_organizations`)
- **NEEDS_CONFIRMATION:** Детали схемы workspaces и миграции данных

**Переключение контекста (UI):**
- **Organization Context:** `OrganizationContext` определяет активную организацию
- **Switching:** Переключение через `OrganizationSwitcher` компонент
- **Session:** Активная организация хранится в сессии и Zustand store

Подробнее см. [`../modules/projects-tasks/projects-tasks-access.md`](../modules/projects-tasks/projects-tasks-access.md) и [ADR-0005](./adr/0005-multi-account-model.md).

### Observability

**Логирование:**
- **Backend:** Логи операций репозиториев (загрузка из БД, ошибки)
- **Frontend:** Консольные логи для отладки (dev режим)
- **NEEDS_CONFIRMATION:** Централизованное логирование в production

**Метрики:**
- **Vercel Analytics:** Метрики производительности страниц
- **Speed Insights:** Core Web Vitals (LCP, FID, CLS)
- **NEEDS_CONFIRMATION:** Кастомные метрики бизнес-логики

**Трейсинг:**
- **NEEDS_CONFIRMATION:** Распределенный трейсинг запросов

**Мониторинг:**
- **Vercel Dashboard:** Мониторинг деплоев, ошибок, производительности
- **Database:** Мониторинг через Vercel Postgres dashboard
- **NEEDS_CONFIRMATION:** Алертинг при критических ошибках

### Data Privacy

**Хранение данных:**
- **Пароли:** Хеширование через bcrypt или аналогичные алгоритмы
- **Персональные данные:** Хранение в соответствии с требованиями GDPR (если применимо)
- **Файлы:** Хранение в Vercel Blob Storage с проверкой прав доступа

**Доступ к данным:**
- **Проверка прав:** На уровне API перед возвратом данных
- **Фильтрация:** Данные фильтруются по организации/workspace пользователя
- **Публичные ссылки:** Файлы доступны через server-side proxy с проверкой прав

**Удаление данных:**
- **NEEDS_CONFIRMATION:** Политика удаления данных пользователей (GDPR right to be forgotten)

## 9. Architectural Decisions

Ключевые архитектурные решения задокументированы в ADR (Architectural Decision Records):

| ADR | Решение | Статус |
|-----|---------|--------|
| [ADR-0001](./adr/0001-canonical-database-tables.md) | Канонические таблицы для проектов и задач | Принято |
| [ADR-0002](./adr/0002-cache-aside-pattern.md) | Cache-aside паттерн для чтения данных | Принято |
| [ADR-0003](./adr/0003-nextjs-app-router.md) | Next.js App Router для фронтенда | Принято |
| [ADR-0004](./adr/0004-websocket-realtime.md) | WebSocket для real-time обновлений | Принято |
| [ADR-0005](./adr/0005-multi-account-model.md) | Мультиаккаунт через Organizations и Workspaces | Принято |

**Краткое описание решений:**

1. **Канонические таблицы:** `pm_projects` и `pm_tasks` зафиксированы как единственные таблицы для проектов и задач. Таблица `project` (Drizzle) помечена как deprecated.

2. **Cache-aside паттерн:** Память используется только как кэш для чтения данных. БД — единственный источник истины. При чтении: проверка кэша → чтение из БД → обновление кэша.

3. **Next.js App Router:** Выбран Next.js 14 App Router с Server Components и Server Actions для лучшего DX и производительности.

4. **WebSocket:** WebSocket с fallback на polling для real-time синхронизации состояния между клиентами.

5. **Мультиаккаунт:** Целевое состояние Organizations + Workspaces для поддержки нескольких организаций и workspace на пользователя.

Полный список и детали ADR см. [`./adr/README.md`](./adr/README.md).

## 10. Quality Requirements

### Performance

**Оптимизация загрузки:**
- **Server Components:** Уменьшение клиентского кода, рендеринг на сервере
- **Code Splitting:** Автоматическое разделение кода через Next.js
- **Image Optimization:** Оптимизация изображений через Next.js Image компонент
- **Static Generation:** Статические страницы где возможно

**Оптимизация чтения данных:**
- **Cache-aside паттерн:** Кэширование результатов запросов в памяти
- **Индексы БД:** Индексы на часто используемых полях (`organization_id`, `project_id`, `user_id`)
- **Эффективные запросы:** Использование JOIN вместо множественных запросов где возможно

**Real-time обновления:**
- **WebSocket:** Мгновенные обновления без polling
- **Fallback:** Polling при недоступности WebSocket (не блокирует работу)

**Метрики:**
- **Core Web Vitals:** LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Vercel Analytics:** Отслеживание производительности страниц

### Security

**Защита от SQL-инъекций:**
- **Параметризованные запросы:** Все SQL-запросы используют параметры (`$1`, `$2`, etc.)
- **Drizzle ORM:** Типобезопасные запросы через ORM

**Валидация данных:**
- **Zod схемы:** Валидация всех пользовательских данных на клиенте и сервере
- **Type Safety:** TypeScript для раннего обнаружения ошибок

**Проверка прав доступа:**
- **API уровень:** Проверка через `hasAccess()` методы репозиториев
- **UI уровень:** Проверка ролей перед отображением элементов
- **Middleware:** Проверка сессии на каждом запросе

**Безопасное хранение секретов:**
- **Environment Variables:** Секреты хранятся в переменных окружения
- **Vercel:** Управление секретами через Vercel dashboard
- **NEEDS_CONFIRMATION:** Ротация секретов, управление ключами

### Scalability

**Горизонтальное масштабирование:**
- **Vercel:** Автоматическое масштабирование при нагрузке
- **Serverless:** API routes работают как serverless функции
- **Database:** Vercel Postgres поддерживает горизонтальное масштабирование

**Модульная архитектура:**
- **Независимые модули:** PM Core, Marketplace, Marketing, AI Hub можно масштабировать отдельно
- **Feature Flags:** Управление функциональностью без деплоя

**Оптимизация БД:**
- **Индексы:** Индексы на часто используемых полях
- **Нормализация:** Нормализованная структура данных
- **Эффективные запросы:** Оптимизация запросов для минимизации нагрузки

**NEEDS_CONFIRMATION:**
- [ ] Стратегия масштабирования WebSocket сервера
- [ ] Кэширование на уровне CDN для статических ресурсов
- [ ] Rate limiting для API endpoints

### Maintainability

**Типобезопасность:**
- **TypeScript strict mode:** Строгая типизация для раннего обнаружения ошибок
- **`exactOptionalPropertyTypes: true`:** Правильная работа с опциональными свойствами
- **Избегание `any`:** Использование конкретных типов

**Модульная структура:**
- **Разделение ответственности:** Репозитории, сервисы, компоненты разделены по функциональности
- **Документация:** Docs-as-code подход, актуальная документация в репозитории
- **Тестирование:** Unit тесты (Jest), E2E тесты (Playwright)

**Управление зависимостями:**
- **pnpm:** Монорепозиторий с pnpm workspaces
- **Версионирование:** Фиксированные версии зависимостей через `pnpm-lock.yaml`

**Feature Flags:**
- **Управление функциональностью:** Включение/выключение фич без деплоя
- **Постепенный rollout:** Постепенное включение фич для тестирования

## 11. Risks & Technical Debt

### Known Risks

**WebSocket Fallback:**
- **Риск:** При недоступности WebSocket сервера используется polling, что увеличивает нагрузку на сервер
- **Митигация:** Автоматический fallback на polling, мониторинг доступности WebSocket сервера
- **Статус:** Реализовано, требуется мониторинг в production

**Deprecated таблица `project`:**
- **Риск:** Таблица `project` (Drizzle) остается в схеме, может вызвать путаницу
- **Митигация:** Таблица помечена как `@deprecated`, не используется для новых операций
- **Статус:** Требуется миграция данных и удаление таблицы в будущем

**Мультиаккаунт сложность:**
- **Риск:** Сложность управления правами доступа при нескольких организациях
- **Митигация:** Четкая модель ролей, проверка прав на каждом уровне
- **Статус:** Реализовано, требуется тестирование edge cases

**NEEDS_CONFIRMATION:**
- [ ] Риски безопасности (SQL-инъекции, XSS, CSRF)
- [ ] Риски производительности при росте данных
- [ ] Риски доступности при сбоях инфраструктуры

### Technical Debt

**Миграция с памяти на БД:**
- **Текущее состояние:** Репозитории читают из БД, но некоторые операции все еще используют память
- **Задача:** Полная миграция всех операций на БД
- **Приоритет:** Средний
- **Документация:** [`../development/reports/database-optimization-next-steps.md`](../development/reports/database-optimization-next-steps.md)

**Унификация точек записи:**
- **Текущее состояние:** Некоторые операции используют прямые SQL-вставки вместо репозиториев
- **Задача:** Все операции записи должны проходить через репозитории
- **Приоритет:** Средний

**Полная реализация cache-aside:**
- **Текущее состояние:** Cache-aside реализован частично
- **Задача:** Добавить TTL для кэша, инвалидацию при записи
- **Приоритет:** Низкий

**Тестирование:**
- **Текущее состояние:** Unit тесты есть, но не покрывают все компоненты
- **Задача:** Увеличить покрытие тестами, добавить E2E тесты для WebSocket
- **Приоритет:** Средний

**Мониторинг и алертинг:**
- **Текущее состояние:** Базовый мониторинг через Vercel
- **Задача:** Настроить централизованное логирование, метрики, алертинг
- **Приоритет:** Высокий для production

**NEEDS_CONFIRMATION:**
- [ ] Другие известные технические долги
- [ ] Приоритизация технических долгов

## 12. Glossary

Архитектурные термины и определения:

**Основные сущности:**
- **Workspace:** Логическое рабочее пространство; в PM хранится как `workspace_id` в `pm_*`.
- **Organization:** Организация (компания, команда). Может содержать несколько workspace.
- **Project:** Проект, принадлежащий workspace. Содержит задачи, файлы, документы, команду.
- **Task:** Задача в проекте. Поддерживает иерархию, статусы, метки, назначения.
- **Account (OAuth):** Запись NextAuth для внешнего провайдера, не связана с workspace.

**Архитектурные паттерны:**
- **Cache-aside:** Паттерн кэширования, где кэш используется только для чтения, БД — источник истины.
- **Server Components:** React компоненты, рендерящиеся на сервере для уменьшения клиентского кода.
- **Server Actions:** Серверные функции Next.js для мутаций данных без API routes.

**Технологии:**
- **Drizzle ORM:** TypeScript ORM для работы с PostgreSQL.
- **Zustand:** Легковесная библиотека для управления состоянием React.
- **Zod:** TypeScript-first схема валидации.

Полный глоссарий терминов платформы см. [`../platform/glossary.md`](../platform/glossary.md).

---

**Связанные документы:**
- [Системный анализ](./system-analysis.md) — детальный анализ системы
- [Архитектура БД](./database-architecture.md) — архитектура базы данных
- [ADR решения](./adr/) — архитектурные решения
- [Обзор платформы](../platform/overview.md) — обзор платформы и модулей
- [Видение и scope](../platform/vision-scope.md) — бизнес-цели и целевые аудитории

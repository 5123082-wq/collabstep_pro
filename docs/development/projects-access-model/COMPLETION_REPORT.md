## Итоговый отчет о реализации модели доступа и организаций

### Реализованные компоненты

1.  **База данных (Schema & Migrations):**
    *   Добавлены таблицы:
        *   `organizations` (Типы: closed/open)
        *   `organization_members` (Роли: owner, admin, member, viewer)
        *   `performer_profiles` (Для каталога исполнителей, с JSONB полями для навыков)
        *   `projects` (Новая таблица для миграции с memory-store, поддерживает стадии и видимость)
        *   `project_members` (Роли: owner, manager, contributor, viewer)
        *   `organization_invites` & `project_invites` (Поддержка 2-этапного процесса доступа)
    *   Созданы строгие Postgres ENUM типы для статусов и ролей.
    *   Сгенерирована миграция `0001_chemical_lake.sql`.

2.  **Бэкенд логика (Repositories):**
    *   `invitations-repository`: Реализует сложную логику приглашений (создание токенов, переходы статусов preview -> pending -> approved).
    *   `organizations-repository`: Управление организациями и членами.
    *   `performer-profiles-repository`: Управление профилями исполнителей и публичным каталогом.
    *   `db-projects-repository`: Изолированный репозиторий для новой модели проектов (чтобы не ломать текущий `projects-repository` на in-memory хранилище).

3.  **API Endpoints (Next.js App Router):**
    *   **Профиль**: `/api/me/performer-profile` (создание/редактирование профиля, управление видимостью).
    *   **Организации**:
        *   `/api/organizations` (CRUD).
        *   `/api/organizations/[orgId]/members` (Список участников).
        *   `/api/organizations/[orgId]/invites` (Создание и листинг приглашений).
    *   **Каталог исполнителей**:
        *   `/api/performers` (Публичный поиск/листинг).
        *   `/api/performers/[userId]` (Просмотр профиля).
        *   `/api/performers/[userId]/invite-to-organization` (Приглашение исполнителя в команду/проект).
    *   **Проекты (Новая модель)**:
        *   `/api/projects` (CRUD для DB-проектов).
        *   `/api/projects/[projectId]/invites` (Создание приглашений).
    *   **Доступ и Приглашения (2-step flow)**:
        *   `/api/projects/invites/[token]` (Предпросмотр проекта по токену).
        *   `/api/projects/invites/[token]/accept` (Пользователь принимает приглашение -> статус `pending_owner_approval`).
        *   `/api/projects/[projectId]/invites/[inviteId]/approve` (Владелец одобряет -> создание `ProjectMember`).
        *   `/api/projects/[projectId]/invites/[inviteId]/reject` (Владелец отклоняет).

### Следующие шаги (За рамками текущего плана)

1.  **Frontend-интеграция**:
    *   Создать страницы для каталога исполнителей.
    *   Реализовать UI для управления организацией (списки членов, настройки).
    *   Реализовать "Лендинг приглашения" (страница, куда попадает юзер по ссылке с токеном) с предпросмотром проекта.
    *   Добавить в дашборд владельца раздел "Заявки на вступление".

2.  **Миграция данных**:
    *   Написать скрипт для переноса существующих проектов из `memory.PROJECTS` в новую таблицу `projects`.
    *   Адаптировать существующие сервисы (например, `finance-service`) для работы с новой таблицей проектов.


# Организация — Обзор

**Статус:** draft  
**Владелец:** product/engineering  
**Создан:** 2026-01-07  
**Последнее обновление:** 2026-01-07

Краткое описание управления организациями, рабочими пространствами (workspace) и членством.

## 1) Назначение

Документ описывает модель организации, membership и ключевые операции (приглашения, роли, закрытие организации).

## 2) Текущее состояние

- Есть UI-разделы управления организацией и командой.
- Реализованы API для организаций и участников.
- Закрытие организации описано в `docs/development/organization-closure/*`.

## 3) Пользовательские маршруты (UI)

- `/org/settings` — настройки организации
- `/org/team` — команда организации
- `/org/billing` — биллинг (если включен)
- `/org/[orgId]/settings` — настройки конкретной организации
- `/org/[orgId]/team` — команда конкретной организации
- `/org/[orgId]/finance` — финансы организации

## 4) API endpoints

- `GET /api/organizations` — список организаций
- `POST /api/organizations` — создание организации
- `GET /api/organizations/[orgId]` — детали организации
- `PATCH /api/organizations/[orgId]` — обновление организации
- `GET /api/organizations/[orgId]/members` — участники
- `PATCH /api/organizations/[orgId]/members/[memberId]` — обновление роли участника
- `POST /api/organizations/[orgId]/invites` — приглашение участника
- `POST /api/organizations/[orgId]/leave` — выход из организации
- `GET /api/organizations/[orgId]/projects` — проекты организации
- `GET /api/organizations/[orgId]/membership` — текущее членство
- `GET /api/organizations/[orgId]/invitee-lookup` — поиск приглашенного
- `POST /api/organizations/[orgId]/closure/preview` — предпросмотр закрытия
- `POST /api/organizations/[orgId]/closure/initiate` — инициировать закрытие
- `GET /api/workspaces` — список workspace
- `GET /api/workspaces/[id]` — детали workspace

## 5) Ключевые сущности

- **Organization** — организация (верхний контур)
- **Workspace/Account** — рабочее пространство внутри организации
- **Membership** — членство пользователя в организации

## 6) Roadmap (draft)

### P0 — базовая фиксация

- [ ] Уточнить жизненный цикл организации (создание, архив, закрытие)
- [x] Зафиксировать роли в организации: owner/admin/member/viewer
- [ ] Описать сценарии приглашений и выхода

### P1 — процессы и политика

- [ ] Описать правила удаления/закрытия организации
- [ ] Согласовать правила владения проектами при закрытии

### P2 — интеграции

- [ ] Описать связку орг-настроек с биллингом и финмодулем
- [ ] Определить события аналитики для орг-действий

## NEEDS_CONFIRMATION

- Политика закрытия/архивирования
- Правила владения workspace и проектами

---

**Связанные документы:**
- [Обзор платформы](../../platform/overview.md)
- [Роли и права доступа](../../platform/roles-permissions.md)
- [Закрытие организации: спецификация](../../development/organization-closure/organization-closure-specification.md)
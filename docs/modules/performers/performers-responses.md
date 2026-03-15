# Исполнители — Отклики и приглашения

**Статус:** partial
**Владелец:** product/engineering
**Создан:** 2026-01-07
**Последнее обновление:** 2026-03-15

## Назначение

Раздел «Отклики и приглашения» отвечает за переход от discovery к рабочему доступу: отклик на вакансию, приглашение в организацию, переписка с кандидатом, preview-доступ к проекту и последующее одобрение.

## Навигация

- `/performers/responses` — отклики и приглашения

## Текущее состояние (по UI и коду)

- Список приглашений загружается из API `/api/invites`.
- Есть вкладки «Входящие отклики» и «Мои отклики» с фильтрами по статусу и вакансии.
- Входящие отклики подгружаются по вакансиям организации через `/api/vacancies/:id/responses`.
- Статус отклика можно менять через `/api/responses/:id` (только owner/admin).
- Для инвайтов уже существуют invite threads и отдельные сообщения в `/api/invites/threads/[threadId]/messages`.
- При создании org invite можно передать `previewProjectIds`, и система создаёт `project_invite` со статусом `previewing`.
- Принятие project invite по токену переводит его в `pending_owner_approval`, после чего owner проекта может одобрить инвайт и добавить участника в проект.

## Канонический workflow контакта и допуска

1. Организация находит человека в каталоге или получает отклик на вакансию.
2. Создаётся или открывается invite/contact thread.
3. Стороны общаются в переписке и уточняют контекст работы.
4. Owner/admin даёт ограниченный preview-доступ к одному или нескольким проектам.
5. Кандидат подтверждает интерес и запрашивает полноценный доступ.
6. Owner проекта одобряет доступ.
7. Только после этого человек становится частью команды проекта и попадает в assignee picker задач.

## Основные сценарии

1. Просмотр входящих откликов по вакансиям организации.
2. Обновление статуса отклика (принять/отклонить).
3. Просмотр собственных откликов и их статусов.
4. Просмотр активных приглашений в организацию/проект.
5. Переписка по invite thread до принятия решения.
6. Выдача preview-доступа в проект и последующее approval.

## Статусы и роли

- Статусы откликов: `pending` | `accepted` | `rejected`.
- Инвайт в организацию создаётся со статусом `pending`, затем может перейти в `accepted` или `rejected`.
- В project invite уже используются `invited`, `previewing`, `accepted_by_user`, `pending_owner_approval`, `approved`, `rejected`.
- Обработка входящих откликов доступна owner/admin организаций.
- Отдельную новую state machine для contact flow вводить не нужно: нужно доиспользовать уже существующие invite statuses и invite threads.

## Доступность по ролям

- Входящие отклики и смена статуса — owner/admin организаций.
- «Мои отклики» — исполнители (по текущему пользователю).
- Выдача preview-доступа и org invite — owner/admin организации.
- Финальное одобрение project invite — owner проекта по текущей реализации.

## API (MVP)

- `GET /api/invites` — список приглашений для текущего пользователя
- `GET /api/invites/threads/[threadId]/messages?page=&pageSize=` — история invite thread
- `POST /api/invites/threads/[threadId]/messages` — отправить сообщение в invite thread
- `POST /api/organizations/[orgId]/invites` — создать org invite, при необходимости с `previewProjectIds`
- `GET /api/vacancies/:id/responses` — отклики на вакансию
- `POST /api/vacancies/:id/responses` — отправить отклик
- `GET /api/responses?status=&vacancyId=` — список откликов текущего пользователя
- `GET /api/responses/:id` — получить отклик
- `PATCH /api/responses/:id` — обновить статус отклика (owner/admin)
- `POST /api/projects/invites/[token]/accept` — принять project invite и перевести его в `pending_owner_approval`
- `GET /api/projects/[projectId]/invites?status=` — список project invites по статусу
- `POST /api/projects/[projectId]/invites/[inviteId]/approve` — одобрить project invite и добавить участника

## Взаимодействия с другими разделами

- **Специалисты:** приглашение исполнителей.
- **Мои вакансии:** источник откликов.
- **Проекты и задачи:** preview-доступ и финальное включение в команду проекта.
- **Кабинет пользователя:** будущая картотека контактов должна открывать этот же workflow, а не создавать отдельный независимый механизм.

## Ограничения и планируемое

- Нет отдельного contact-first inbox для коммуникации с людьми, найденными в каталоге, если формальный invite ещё не отправлен.
- Нет полноценного owner-facing approval workspace для перевода кандидата из preview в команду проекта.
- Нет массовых действий и пагинации в списках.
- Часть project invite API всё ещё использует legacy PM role model (`manager` / `contributor`) и должна быть приведена к текущему `owner` / `admin` / `member` / `viewer`, прежде чем flow будет расширяться.

## Связанные документы

- [Исполнители — Специалисты](./performers-specialists.md)
- [Исполнители — Мои вакансии](./performers-my-vacancies.md)
- [Исполнители — Кабинет и карточка исполнителя](./performers-profile-cabinet.md)
- [Исполнители — План реализации](./performers-implementation-plan.md)

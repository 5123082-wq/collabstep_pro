# Исполнители — План реализации

**Статус:** planned  
**Владелец:** product/engineering  
**Создан:** 2026-03-15  
**Последнее обновление:** 2026-03-15

## Цель

Свести в один связанный продуктовый контур:

- единый кабинет пользователя;
- создание и публикацию карточки исполнителя;
- картотеку людей и контактов;
- контактный workflow `общение -> preview -> approval -> membership`;
- проектное использование людей без поломки текущего PM people picker и assignee contract.

## Что уже можно переиспользовать

- `users` и `/api/me/profile` для базового профиля;
- `performer_profile` и `/api/me/performer-profile` для публичной карточки;
- портфолио и кейсы;
- `/p/:handle` как публичную визитку;
- org invites с `previewProjectIds`;
- invite threads и сообщения;
- project invite statuses `previewing`, `pending_owner_approval`, `approved`;
- PM people picker `/api/pm/projects/[id]/member-candidates`;
- direct add `/api/pm/projects/[id]/members` для известных пользователей.

## Принципы реализации

1. Не вводить новую независимую сущность человека, если уже достаточно `users` + `performer_profile` + relation layer.
2. Не вводить новую state machine для external access, если можно использовать текущие invite statuses.
3. Не ломать существующий PM people picker; он остаётся быстрым operational flow для внутренних или уже известных пользователей.
4. Не смешивать публичный профиль исполнителя с приватным слоем заметок и shortlist организации.
5. Не расширять task assignee contract: назначать можно только участников проекта.

## Фазы

### P0. Контракт и документация

**Статус:** завершено как docs-only этап.

Задачи:
- синхронизировать overview performers;
- зафиксировать устройство кабинета и карточки исполнителя;
- зафиксировать target flow картотеки и contact workflow;
- развести `current reality` и `target contract`.

### P1. Единый кабинет пользователя

Цель: убрать разрозненность между `/settings/profile`, `/settings/performer`, `/profile/*` и модалками.

Задачи:
- сделать `/settings/profile` канонической точкой входа кабинета;
- превратить `/settings/performer` в вкладку или алиас раздела `Карточка исполнителя`;
- перевести `UserProfileSettingsModal` на shared form logic с `/settings/profile`;
- определить судьбу `/profile`, `/profile/card`, `/profile/rating`, `/profile/badges`: либо редиректы, либо read-only табы;
- сделать создание performer card private-first;
- добавить корректный handle onboarding.

Критерий готовности:
- пользователь понимает, где настраивается он сам, а где его публичная карточка;
- нет двух конкурирующих путей редактирования одной и той же сущности.

### P2. Картотека людей

Цель: превратить каталог специалистов в полноценную people surface.

Задачи:
- развить `/performers/specialists` в первую версию картотеки людей;
- добавить категории: специалисты, команды, подрядчики, мои контакты, в проекте, на согласовании;
- перевести поиск и фильтрацию на server-side contract;
- показать relation status относительно организации и проекта;
- добавить приватный слой карточки контакта: заметки, теги, shortlist, связанные проекты.

Рекомендуемый API shape:
- расширить `GET /api/performers` серверными фильтрами и сортировкой;
- добавить отдельный private relation-layer под организацию, а не смешивать приватные заметки с публичным профилем;
- переиспользовать PM member-candidates там, где нужен operational search зарегистрированных пользователей.

### P3. Контактный workflow и preview-доступ

Цель: внешний кандидат сначала общается и знакомится с проектом, а не попадает в команду напрямую.

Задачи:
- сделать contact-first CTA на карточке: `Написать`, `Сохранить`, `Предложить preview`;
- переиспользовать invite threads как базовый messaging layer;
- использовать `POST /api/organizations/[orgId]/invites` с `previewProjectIds` как основу preview flow;
- вывести owner/admin inbox для кандидатов в `previewing` и `pending_owner_approval`;
- связать preview flow с карточкой контакта и картотекой.

Критерий готовности:
- внешний кандидат может посмотреть ровно то, что ему разрешено;
- без approval он не считается участником проекта и не попадает в assignee picker.

### P4. Перевод в команду проекта

Цель: завершить путь от внешнего кандидата к полноценному участнику проекта.

Задачи:
- нормализовать project invite approval routes под текущую PM role model `owner/admin/member/viewer`;
- оставить direct add только для внутренних сценариев и известных людей;
- для внешнего каталожного кандидата запретить мгновенный bypass в членство, если не пройден approval flow;
- после approval автоматически синхронизировать membership и доступность в assignee picker.

Критерий готовности:
- один и тот же человек может быть найден, приглашён, одобрен и назначен в задачу без ручных обходных сценариев.

## Состав UX-поверхностей

### Кабинет

- профиль пользователя;
- карточка исполнителя;
- портфолио и кейсы;
- публичность и ссылка;
- организации и доступы;
- уведомления и предпочтения.

### Картотека

- список людей с категориями и фильтрами;
- карточка контакта;
- действия `написать`, `сохранить`, `shortlist`, `preview`, `пригласить`, `добавить после одобрения`.

### Approval workflow

- invite thread;
- preview invite landing;
- owner/admin inbox;
- project membership confirmation.

## Разрешения

- редактирование своего кабинета и performer card — только владелец;
- выдача org invite и preview access — owner/admin организации;
- финальное project approval — owner/admin проекта после нормализации current routes;
- assignee picker задач — только участники проекта.

## Аналитика и события

При реализации нужно отдельно решить telemetry; сейчас эти события ещё не зафиксированы в `docs/platform/analytics-events.md`.

Рекомендуемые события:
- `people_directory_opened`
- `contact_card_opened`
- `contact_thread_started`
- `contact_shortlisted`
- `project_preview_granted`
- `project_access_requested`
- `project_access_approved`

## Риски и блокеры

- текущий specialists catalog частично держится на client-side filtering;
- `/profile/*` и settings modals создают ложное ощущение существующего кабинета;
- часть invite API всё ещё использует legacy PM roles;
- команды и подрядчики пока не оформлены как отдельные сущности;
- публичный performer-layer и marketplace author-layer пересекаются по `handle`, поэтому изменения должны учитывать обе поверхности.

## Документы для синхронизации при реализации

- `docs/ROADMAP.md`
- `docs/modules/performers/performers-overview.md`
- `docs/modules/performers/performers-specialists.md`
- `docs/modules/performers/performers-responses.md`
- `docs/modules/performers/performers-profile-cabinet.md`
- `docs/modules/projects-tasks/projects-tasks-access.md`
- `docs/modules/projects-tasks/projects-tasks-teams.md`
- `docs/platform/overview.md`
- `docs/platform/analytics-events.md`
- `CONTINUITY.md`

## Связанные документы

- [Исполнители — Обзор](./performers-overview.md)
- [Исполнители — Специалисты](./performers-specialists.md)
- [Исполнители — Отклики и приглашения](./performers-responses.md)
- [Исполнители — Кабинет и карточка исполнителя](./performers-profile-cabinet.md)
- [Проекты и задачи — Команды](../projects-tasks/projects-tasks-teams.md)
- [Проекты и задачи — Доступ](../projects-tasks/projects-tasks-access.md)

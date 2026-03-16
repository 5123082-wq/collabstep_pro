# Исполнители — Handoff для нового агента

**Статус:** active  
**Владелец:** product/engineering  
**Создан:** 2026-03-15  
**Последнее обновление:** 2026-03-15

## Для чего этот документ

Это единый входной документ для нового агента, который должен продолжить разработку people directory, кабинета пользователя и карточки исполнителя без повторного сбора контекста по разным файлам.

Если агенту дают только один документ, передавать нужно именно этот.

## Проблема, которую нужно решить

Сейчас в платформе уже есть:

- базовый личный профиль пользователя;
- `performer_profile` и публичная карточка `/p/:handle`;
- каталог специалистов;
- org/project invite primitives;
- PM people picker для прямого добавления зарегистрированных пользователей в проект.

Но это не собрано в единый продуктовый flow.

Основные проблемы:

1. **Нет единого кабинета пользователя.**  
   `/settings/profile`, `/settings/performer`, `/profile/*` и settings modals выглядят как разрозненные куски.

2. **Нет канонического создания карточки исполнителя.**  
   Технически `performer_profile` уже создаётся, но UX-флоу разорван и не объясняет пользователю, где его реальный кабинет.

3. **Нет полноценной картотеки людей.**  
   Есть public catalog специалистов, но нет private contact layer организации с relation status, заметками, shortlist и приватной карточкой контакта.

4. **Нет связанного external hiring flow.**  
   Внешнего кандидата нельзя провести по каноническому пути `нашёл -> написал -> дал preview -> получил approval -> добавил в проект`.

## Что уже реализовано и должно быть переиспользовано

### Профиль и performer card

- `/settings/profile`
- `/api/me/profile`
- `/settings/performer`
- `/api/me/performer-profile`
- `/api/me/performer-profile/portfolio`
- `/api/me/performer-profile/cases`
- `/onboarding/create-profile`
- `/p/:handle`

### Discovery и контакты

- `/performers/specialists`
- `GET /api/performers`
- `GET /api/performers/:userId`
- `POST /api/performers/:userId/invite-to-organization`

### Invite / preview / approval primitives

- `GET /api/invites`
- `GET/POST /api/invites/threads/[threadId]/messages`
- `POST /api/organizations/[orgId]/invites` с `previewProjectIds`
- `POST /api/projects/invites/[token]/accept`
- `GET /api/projects/[projectId]/invites?status=`
- `POST /api/projects/[projectId]/invites/[inviteId]/approve`

### PM operational add

- `GET /api/pm/projects/[id]/member-candidates`
- `POST /api/pm/projects/[id]/members`

## Канонический целевой контракт

### 1. Единый кабинет

У пользователя должен быть один кабинет.

- `/settings/profile` — канонический вход в кабинет;
- `/settings/performer` — вкладка или deep-link в тот же кабинет;
- `/profile/*` — legacy/transition state, а не канонические surfaces.

### 2. Карточка исполнителя

Карточка исполнителя создаётся из единого кабинета на базе существующего `performer_profile`.

Принцип:

- не создавать новую сущность профиля;
- использовать текущий `performer_profile`;
- считать карточку исполнителя расширением аккаунта пользователя.

### 3. Картотека людей

Картотека должна состоять из:

- публичного discovery-layer;
- приватного relation-layer организации;
- operational people picker внутри PM.

Категории картотеки:

- специалисты;
- команды;
- подрядчики;
- мои контакты;
- в проекте;
- на согласовании.

### 4. Workflow внешнего кандидата

Канонический flow:

1. Найти человека.
2. Открыть карточку контакта.
3. Начать переписку.
4. При необходимости выдать preview-доступ к проекту.
5. Получить подтверждение кандидата.
6. Провести owner/admin approval.
7. Добавить в организацию/проект.
8. Только потом разрешить назначение в задачи.

## Жёсткие ограничения

Агент не должен нарушать эти правила.

1. Не вводить новую сущность “person”, если хватает `users` + `performer_profile` + relation layer.
2. Не вводить новую state machine для candidate access, если можно переиспользовать текущие `organization_invite`, `project_invite`, invite threads и статусы `previewing`, `pending_owner_approval`, `approved`.
3. Не расширять assignee picker задач до всей платформы. Он должен оставаться project-scoped.
4. Не ломать текущий PM people picker. Он остаётся быстрым internal/known-user flow.
5. Не смешивать публичные данные performer card с приватными заметками организации.
6. Не ломать `handle` и `/p/:handle`; это каноническая публичная ссылка человека.

## Известные текущие несоответствия

Агент должен их понимать до старта работ.

- `UserProfileSettingsModal` дублирует `/settings/profile`.
- `PlatformSettingsModal` не решает задачи кабинета и пока остаётся заглушкой.
- `/profile`, `/profile/card`, `/profile/rating`, `/profile/badges` сейчас в основном placeholders.
- specialists catalog частично работает на client-side filtering.
- часть project invite API всё ещё использует legacy PM roles `manager` / `contributor`.
- teams и contractors пока не оформлены как отдельные сущности.

## С чего начинать без дополнительного уточнения

Если пользователь не уточнил очередность, агент должен начинать с **P1: единый кабинет пользователя**.

Причина:

- это блокирует понятное создание performer card;
- без этого картотека людей будет строиться на кривом основании;
- это самый безопасный slice для начала, потому что он переиспользует уже существующие API и сущности.

### Default first slice

1. Свести `/settings/profile` и `/settings/performer` в один кабинет.
2. Определить судьбу `/profile/*` и убрать ложные entry points.
3. Сделать performer card private-first.
4. Нормализовать handle flow.
5. Только после этого переходить к картотеке людей и approval workflow.

## Порядок реализации

### P1. Единый кабинет

Сделать:

- один cabinet shell;
- shared form logic для user profile;
- performer tab внутри кабинета;
- миграцию `/profile/*` в redirect/read-only mode;
- private-first creation для performer card.

### P2. Картотека людей

Сделать:

- server-side people search;
- категории и фильтры;
- private relation layer организации;
- карточку контакта.

### P3. Contact -> preview -> approval

Сделать:

- contact-first CTA;
- reuse invite threads;
- preview access через текущие invite primitives;
- owner/admin inbox для approval.

### P4. Финальная стыковка с PM

Сделать:

- нормализацию project invite approval routes под `owner/admin/member/viewer`;
- правила direct add vs external candidate;
- синхронизацию с project membership и assignee picker.

## Acceptance criteria

Агент должен держать в голове эти критерии, даже если работает по фазам.

- Пользователь понимает, где его реальный кабинет.
- Карточка исполнителя создаётся из кабинета, а не из случайной отдельной поверхности.
- Внешнего кандидата можно найти, но нельзя обойти approval flow прямым bypass в проект.
- После approval человек становится участником проекта и доступен для назначения в задачи.
- Публичная карточка и private contact layer не смешиваются.

## Какие документы читать вместе с этим handoff

- [performers-overview.md](./performers-overview.md)
- [performers-profile-cabinet.md](./performers-profile-cabinet.md)
- [performers-specialists.md](./performers-specialists.md)
- [performers-responses.md](./performers-responses.md)
- [performers-implementation-plan.md](./performers-implementation-plan.md)
- [projects-tasks-teams.md](../projects-tasks/projects-tasks-teams.md)
- [projects-tasks-access.md](../projects-tasks/projects-tasks-access.md)

## Какие файлы в коде смотреть в первую очередь

- `apps/web/app/(app)/settings/profile/page.tsx`
- `apps/web/app/(app)/settings/performer/page.tsx`
- `apps/web/app/(app)/onboarding/create-profile/page.tsx`
- `apps/web/app/(app)/profile/page.tsx`
- `apps/web/app/(app)/profile/card/page.tsx`
- `apps/web/app/(app)/profile/rating/page.tsx`
- `apps/web/app/(app)/profile/badges/page.tsx`
- `apps/web/components/performers/PerformerProfileForm.tsx`
- `apps/web/components/performers/PerformerPublicCard.tsx`
- `apps/web/components/marketplace/SpecialistsCatalog.tsx`
- `apps/web/app/api/me/profile/route.ts`
- `apps/web/app/api/me/performer-profile/route.ts`
- `apps/web/app/api/organizations/[orgId]/invites/route.ts`
- `apps/web/app/api/invites/route.ts`
- `apps/web/app/api/projects/invites/[token]/accept/route.ts`
- `apps/web/app/api/projects/[projectId]/invites/[inviteId]/approve/route.ts`
- `apps/web/app/api/pm/projects/[id]/member-candidates/route.ts`
- `apps/web/app/api/pm/projects/[id]/members/route.ts`

## Что обновить после реализации

Если агент меняет поведение, он обязан синхронизировать:

- `docs/ROADMAP.md`
- `docs/modules/performers/performers-overview.md`
- `docs/modules/performers/performers-specialists.md`
- `docs/modules/performers/performers-responses.md`
- `docs/modules/performers/performers-profile-cabinet.md`
- `docs/modules/performers/performers-implementation-plan.md`
- `docs/modules/projects-tasks/projects-tasks-access.md`
- `docs/modules/projects-tasks/projects-tasks-teams.md`
- `docs/platform/overview.md`
- `docs/platform/analytics-events.md`
- `CONTINUITY.md`

## Проверка

Для docs-only изменений тесты не обязательны. Для code changes минимум:

- `pnpm -w typecheck`
- целевые unit tests по затронутым API и UI contracts

## Короткий ответ для агента

Сначала собери единый кабинет и правильное создание performer card. Потом строй картотеку людей. Потом подключай contact/preview/approval flow. Не начинай с “глобального поиска по пользователям” как с отдельной вещи и не вводи новый домен поверх уже существующих `users`, `performer_profile`, invite threads и project membership.

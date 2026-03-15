# Subagent 03 — Публикация и кабинет автора

**Статус:** completed  
**Владелец:** product/frontend/backend  
**Последнее обновление:** 2026-03-09

## Миссия

Описать и затем реализовать управляемый publish-flow и приватный кабинет `Мои публикации`.

## Зависимости

- workstream 02;
- текущие состояния `draft`, `published`, `rejected`.

## Scope

- publish-flow из PM в `Каталог`;
- publish-flow для шаблонов и услуг;
- приватный кабинет автора;
- управление описанием, обложкой, видимостью, порядком и presence на author page.

## Out of Scope

- реальная выплата автору;
- глубокий billing flow;
- полный redesign публичных team/organization pages.

## Пошаговая работа

1. Развести понятия `проект`, `публикация`, `автор`.
2. Зафиксировать allowed sources публикации:
   - PM project;
   - template;
   - service offer.
3. Зафиксировать states и moderation.
4. Описать кабинет `Мои публикации`.
5. Описать, как публикация попадает на страницу автора.
6. Описать, какие поля редактируются автором, а какие модерацией.

## Артефакты

- doc `Каталог — Публикация`;
- doc `Каталог — Мои публикации`;
- sync с overview и implementation-plan.

## DoD

- publish-flow не ломает PM;
- пользователь управляет публичной публикацией отдельно от PM-проекта;
- статусы модерации reuse existing contract.

## Rework Notes

- первая итерация C3 с `authorUserId` зафиксирована как промежуточная и заменена финальным PM author entity contract
- для `MarketplaceListing` введены явные поля `authorEntityType`, `authorEntityId`, `publishedByUserId`, `lastEditedByUserId`
- deprecated `project.organization_id` выведен из C3 ownership/authorship resolution:
  - PM ownership теперь определяется через `project.workspaceId -> workspace.accountId` и organization/account mapping layer
- publish actor и author entity теперь разделены:
  - project ownership определяет create/manage rights;
  - persisted listing contract определяет author attribution уже созданной публикации
- `/market/publish` больше не показывает team-admin ложный create-flow, если publication-layer этого проекта уже существует
- `/market/seller` управляет PM publications по manager rights, но author entity читает из persisted listing contract
- `/p/:handle` использует тот же author-publications source, но показывает только person-authored publications по persisted listing contract
- `showOnAuthorPage` по-прежнему отделён от PM visibility и `performer_profile.isPublic`
- временное правило после C3 зафиксировано явно: team-owned publication не публикуется на person-route, пока отдельная team public surface не внедрена
- `pnpm -w typecheck` выполнен успешно 2026-03-09
- C3 принят после повторной приёмки; следующий этап — C4 apply/import flows и secondary deal-layer

## Handoff Checklist

- проверить в C4/C5, нужны ли отдельные analytics payloads для team author entity и manager-role changes
- решить отдельную public surface для team author pages без слома canonical person-route `/p/:handle`
- держать `performer_profile` как Phase 1 stack только для person author-page и не смешивать его с team authorship

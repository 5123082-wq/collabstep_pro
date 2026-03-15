# Каталог — Страница автора

**Статус:** active  
**Владелец:** product/engineering  
**Создан:** 2026-03-09  
**Последнее обновление:** 2026-03-09

## Назначение

Страница автора — это публичная trust-surface для карточек `Каталога`.

Она нужна для 3 задач:

1. Показать, кто стоит за решением.
2. Собрать публичные публикации автора в одном каноническом месте.
3. Дать путь от discovery к reuse без показа приватного PM-контура.

## Каноническое решение C2

- канонический target из карточки каталога: `/p/:handle`;
- `/p/:handle` трактуется как author-page каталога, а не как отдельная новая сущность;
- `/market/seller` остаётся приватным кабинетом управления публикациями и не дублируется публичной страницей;
- в Phase 1 страница reuse-ит существующий `performer_profile` / `handle` / public profile stack;
- C2 принят с safe author rule: правило `author = project.ownerId` удалено из public author-page как недостоверное;
- новый DB-слой author profile в этом цикле не вводится.

## Обязательные решения Phase 1

### Handle

- `handle` управляется в `/settings/performer`;
- source of truth: `performer_profile.handle`;
- именно этот `handle` используется в публичной ссылке `/p/:handle` и в author-link из карточек каталога.

### Публичность страницы автора

- расширенные performer-блоки (`bio`, портфолио, кейсы, отзывы, условия работы) контролируются `performer_profile.isPublic`;
- блок `Решения автора` показывает только публичные сущности каталога;
- приватные PM-проекты без публикации на страницу автора не попадают;
- PM-based `MarketplaceListing` попадает на author-page только при явном author entity contract и только если одновременно выполнены:
  - `state = published`;
  - `showOnAuthorPage = true`;
- personal PM publication может попасть на `/p/:handle` только если author entity = человек по explicit contract;
- team-owned PM publication не попадает на `/p/:handle` человека и не подменяет его как fallback, пока отдельная team public route не внедрена;
- если расширенный `performer_profile` не публичен или ещё не заполнен, `/p/:handle` может отрисовать минимальную author-shell по тому же `handle`, но только поверх уже публичных публикаций каталога;
- для mock/demo каталога fallback-механизм сохраняется, но используется только если real managed publications для этого автора ещё отсутствуют.

Это fallback author-shell Phase 1, а не новая продуктовая сущность.

### Минимальный data contract автора на карточке каталога

Phase 1 использует существующий card-level contract `MarketplaceSeller`:

- `id`
- `handle`
- `name`
- `avatarUrl`
- `headline`
- `location`
- `portfolioCount`

Этого достаточно, чтобы:

- показать автора на карточке;
- построить canonical link в `/p/:handle`;
- отрисовать fallback author-shell в demo-режиме;
- не заводить параллельную author-модель.

### Что обязательно в первом экране

Обязательные блоки above the fold:

- имя автора;
- `@handle`;
- короткая identity-summary (`specialization` или `headline`);
- блок `Решения автора`.

Progressive layer:

- портфолио;
- кейсы;
- отзывы и rating;
- invite/review actions;
- условия работы, языки и форматы.

## Маппинг автора каталога на текущий stack

### Production / Phase 1 target

- author page identity: `performer_profile.handle`;
- author page profile content: `performer_profile`;
- author solutions source после C3:
  - `MarketplaceListing` c явной author entity:
    - personal PM publication -> показывается на `/p/:handle`;
    - team-owned PM publication -> не показывается на person-route;
  - template/service publications из единого author-publications source;
  - фильтр public layer: `published + showOnAuthorPage`.

### Mock / demo fallback после C3

- current discovery cards уже несут `seller.handle`;
- этот `handle` считается каноническим author id для public route;
- если живой публичный `performer_profile` недоступен, `/p/:handle` может показать минимальную страницу автора на базе:
  - real public publications автора по `userId`, если они уже есть;
  - иначе public catalog publications по тому же `handle`;
  - mock seller data, если discovery пока работает на demo-слое.

## Источники данных

### Уже используется в C2

- базовый профиль: `performer_profile`;
- handle: `performer_profile.handle`;
- публичность расширенного профиля: `performer_profile.isPublic`;
- портфолио: `performer_portfolio_items`;
- кейсы: `performer_cases`;
- отзывы: performer ratings;
- решения автора:
  - real managed publications из author-publications source по `userId`;
  - fallback mock/public catalog items из current discovery datasets, сгруппированные по `handle`, если real publications ещё отсутствуют.

### Явный privacy guardrail

- page не рендерит raw PM project list;
- `project.ownerId` не используется как финальное author attribution правило для public author-page;
- `draft` и `rejected` листинги скрыты;
- даже `published` `MarketplaceListing` скрыт на author-page, если у него выключен `showOnAuthorPage` или отсутствует явный author contract;
- приватный проект без public listing никогда не попадает в public layer.

## Сценарии

1. Пользователь открывает карточку решения и кликает по автору.
2. Попадает на `/p/:handle`.
3. Видит identity, кейсы и публичные решения автора только из безопасного public-layer.
4. Если у автора есть приватные PM-проекты без публикации, они не видны.
5. Если performer profile ещё не готов, выключен или это mock/demo author, card-flow всё равно не ломается.

## Связь с кабинетами

Публичная страница автора и приватные кабинеты разделены:

- `/p/:handle` — публичная author-page;
- `/settings/performer` — настройка `handle`, публичности и performer-профиля;
- `/market/seller` — управление публикациями, их статусами и future author-page visibility controls.

## Состояние в C3 rework

- `/p/:handle` остался единственным canonical route для author identity;
- author-page и `/market/seller` используют один и тот же source для `MarketplaceListing`, template publications и service publications;
- publication visibility на author-page управляется отдельным author-facing флагом `showOnAuthorPage`;
- `performer_profile.isPublic` по-прежнему управляет расширенными bio/portfolio/cases блоками и не смешивается с publication visibility.
- C3 завершён; текущий PM authorship contract зафиксирован так:
  - ownership для PM publish-flow определяется из `project.workspaceId -> workspace.accountId` и organization/account mapping layer, а не из deprecated `project.organization_id`;
  - personal project -> author = человек-владелец;
  - team-owned project -> author = команда;
  - publish actor хранится отдельно от author entity;
- author-page читает person publication из persisted listing contract:
  - `authorEntityType=user` и `authorEntityId=userId` являются source of truth для попадания PM publication на `/p/:handle`;
  - текущее состояние project ownership не должно переписывать author attribution уже созданного listing;
- canonical person-route остаётся `/p/:handle`, поэтому team-owned publication не попадает на него как fallback;
- отдельная public surface для команды остаётся следующим вопросом после C3, но текущий person-route больше не получает ложную team attribution.

## Cross-cutting note after C5

- `/p/:handle` остаётся canonical person-route каталога, но текущий read-path живёт внутри authenticated app shell; anonymous public web exposure не входил в C5;
- расширенные performer-блоки по-прежнему контролируются `performer_profile.isPublic`, а минимальный author-shell может рендериться поверх уже публичных catalog entities;
- на author-page попадают только личные `published + showOnAuthorPage` публикации по persisted listing contract;
- team-owned publication по-прежнему не попадает на `/p/:handle` человека;
- frontend analytics для page view / author click-through / reuse from author-page пока не реализованы и зафиксированы в C5 как отдельный telemetry gap.

## Acceptance Criteria

- клик по автору из каталога всегда ведёт в `/p/:handle`;
- страница автора не дублирует `/market/seller`;
- на странице автора показываются только публичные публикации;
- PM-based публикация не показывается на author-page, если у неё нет явного author contract, она team-owned или выключен `showOnAuthorPage`;
- `performer_profile` и `handle` зафиксированы как Phase 1 решение;
- mock/demo mapping описан без введения новой DB-сущности.

## Связанные документы

- [Каталог — Обзор](./marketplace-overview.md)
- [Каталог — План реализации](./marketplace-implementation-plan.md)
- [Каталог — Публикация](./marketplace-publish.md)
- [Каталог — Мои публикации](./marketplace-seller.md)
- [Исполнители — Обзор](../performers/performers-overview.md)

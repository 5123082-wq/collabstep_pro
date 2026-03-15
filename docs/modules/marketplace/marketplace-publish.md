# Каталог — Публикация

**Статус:** active  
**Владелец:** product/engineering  
**Создан:** 2026-01-07  
**Последнее обновление:** 2026-03-09

## Назначение

Публикация превращает рабочую сущность платформы в публичную карточку каталога.

Это отдельный слой над исходным объектом, а не переименование самого проекта.

## Источники публикации

- PM-проект;
- шаблон;
- услуга.

## Навигация

- `/market/publish` — мастер публикации

## Основные сценарии

1. Выбрать source публикации в `/market/publish`.
2. Создать `draft` publication-layer поверх PM-проекта, пользовательского шаблона или как отдельную услугу.
3. Перейти в `/market/seller` и отредактировать title, description, tags, status, sort order и `showOnAuthorPage`.
4. Опубликовать объект отдельно от PM visibility и отдельно от публичности performer-profile.

## Статусы

Пока сохраняются текущие:

- `draft`
- `published`
- `rejected`

## Правила

- проект в PM и публикация в каталоге — разные слои;
- публикация не должна раскрывать приватные данные проекта автоматически;
- автор явно решает, становится ли объект публичным;
- публикация должна уметь жить на странице автора;
- `showOnAuthorPage` не равен PM visibility и не включает публичность performer-profile автоматически.

## Текущее состояние

- `/market/publish` больше не заглушка:
  - PM-проект можно превратить в `MarketplaceListing draft`;
  - пользовательский шаблон можно превратить в template publication;
  - услугу можно создать как отдельную service publication;
- C3 закрыт; финальный PM authorship contract зафиксирован так:
  - `MarketplaceListing` хранит `authorEntityType`, `authorEntityId`, `publishedByUserId`, `lastEditedByUserId`;
  - ownership для PM publication contract определяется из `project.workspaceId -> workspace.accountId` и organization/account mapping layer, а не из deprecated `project.organization_id`;
  - personal project -> author entity = человек-владелец, publish only owner;
  - team-owned project -> author entity = команда, publish allowed owner/admin;
- project ownership resolution и listing authorship resolution разведены:
  - project ownership отвечает за право создать или управлять публикацией;
  - после создания listing authorship читается из persisted listing contract и не пересчитывается по project-state на каждом read-path;
- template/service publication живут в отдельном author-publications source и не переиспользуют PM visibility;
- редактирование publication-layer перенесено в `/market/seller`;
- `/market/publish` больше не показывает team-admin ложный create-flow, если publication-layer по этому проекту уже существует.
- C5 дополнительно зафиксировал cross-cutting contract:
  - `/market/publish` требует активную авторскую сессию;
  - личный PM source доступен только owner-у, team-owned source — owner/admin;
  - template/service publication создаются и управляются по `ownerUserId`;
  - telemetry пока покрывает только publication CRUD-слой (`pm_publish_started`, `pm_listing_updated`, `pm_listing_deleted`, `catalog_publication_created`, `catalog_publication_updated`), но не discovery/apply/inquiry funnel.

## Ограничения и планируемое

- модерация пока концептуальная;
- публичные discovery-ленты `/market/templates`, `/market/projects`, `/market/services` всё ещё mixed с demo/mock данными и не стали полным real author-publications feed в C3;
- требуется перечень разрешённых публичных project-полей;
- `/p/:handle` остаётся canonical person-route, поэтому team-owned publication не публикуется на него как временное правило;
- отдельная public surface для команды остаётся следующим design/input topic после C3.

## Связанные документы

- [Каталог — Обзор](./marketplace-overview.md)
- [Каталог — Мои публикации](./marketplace-seller.md)
- [Каталог — Страница автора](./marketplace-author-profile.md)
- [Проекты и задачи — Проекты](../projects-tasks/projects-tasks-projects.md)

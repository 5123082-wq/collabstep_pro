# Каталог — Мои публикации

**Статус:** active  
**Владелец:** product/engineering  
**Создан:** 2026-01-07  
**Последнее обновление:** 2026-03-09

## Назначение

`Мои публикации` — это приватный кабинет автора внутри каталога.

Он нужен для управления публичным слоем решений, а не только для отслеживания продаж.

## Навигация

- `/market/seller` — мои публикации

## Что здесь управляется

- список публикаций;
- статусы `draft`, `published`, `rejected`;
- описание и теги;
- порядок и видимость;
- отображение на публичной странице автора;
- будущая статистика просмотров, сохранений, inquiries и оформлений.

## Основные сценарии

1. Посмотреть все свои публикации.
2. Понять, какие из них опубликованы, а какие нет.
3. Открыть черновик и доработать карточку.
4. Снять публикацию или обновить её.
5. Понять, что попадает на страницу автора.

## Текущее состояние

- user-facing label `Мои публикации` уже внедрён в UI;
- `/market/seller` больше не surface-заглушка;
- кабинет собирает единый список из:
  - `MarketplaceListing` c persisted author entity contract для personal-vs-team PM authorship;
  - template publications;
  - service publications;
- у каждой публикации есть отдельный author-facing control `showOnAuthorPage`;
- publication-layer редактируется отдельно от PM-проекта и отдельно от performer-profile visibility;
- `/market/seller` управляет PM publications по manager rights, а attribution читает из самого listing:
  - project ownership для прав берётся из PM `workspace/account` mapping layer, а не из deprecated `project.organization_id`;
  - personal project -> только owner;
  - team-owned project -> owner/admin;
- `/p/:handle` использует тот же author-publications source, но показывает только person-authored `published + showOnAuthorPage`.

## Ограничения после C5

- `/market/seller` пока не включает реальные dashboard-метрики, discovery/apply/inquiry analytics и server-side deal reporting;
- team-owned PM publication остаётся управляемой в seller-кабинете, но не публикуется на person-route `/p/:handle`, пока отдельная public surface для команды не внедрена.

## Product boundary

`Мои публикации` не заменяют:

- PM-проекты;
- настройки публичного профиля;
- финансовый кабинет.

Это именно слой управления публичной витриной автора.

## Связанные документы

- [Каталог — Обзор](./marketplace-overview.md)
- [Каталог — Публикация](./marketplace-publish.md)
- [Каталог — Страница автора](./marketplace-author-profile.md)
- [Каталог — Сделки и доступ](./marketplace-orders.md)

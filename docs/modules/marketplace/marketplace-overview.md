# Каталог — Обзор

**Статус:** active  
**Владелец:** product/engineering  
**Создан:** 2026-01-07  
**Последнее обновление:** 2026-03-09

## Назначение

`Каталог` — это discovery-first слой платформы Collabverse.

Раздел объединяет:

- шаблоны;
- готовые решения на базе PM-проектов;
- услуги;
- подборки;
- сохранённое;
- публичные страницы авторов;
- вторичный слой оформления и доступа.

Главная задача раздела — не продать объект как товар, а помочь пользователю быстрее:

- найти основу для проекта;
- найти автора/команду;
- применить решение к своему проекту;
- опубликовать собственное решение.

## Термины

- **User-facing имя:** `Каталог`
- **Внутренний домен:** `Marketplace`
- **Технические контракты пока остаются прежними:** `/market/*`, `marketplace_*`, `MarketplaceListing`

## Навигация

### Первый слой

- `/market` — главная лента каталога
- `/market/templates` — шаблоны
- `/market/projects` — готовые решения
- `/market/services` — услуги
- `/market/categories` — подборки
- `/market/favorites` — сохранённое
- `/market/publish` — опубликовать
- `/market/seller` — мои публикации
- `/p/:handle` — публичная страница автора

### Вторичный слой

- `/market/cart` — корзина и оформление
- `/market/orders` — сделки и доступ

## Фактически внедрено в C1

- корневой маршрут `/market` теперь работает как discovery-first лента, а не редирект в шаблоны;
- левое меню и topbar уже используют user-facing IA `Каталог`;
- discovery-карточки шаблонов, готовых решений и услуг упрощены до названия, краткого описания, хэштегов, строки автора и demo-метрик;
- действия `Открыть`, `В проект`, `Сохранить` убраны с плиток ленты и вынесены в detail surface;
- страницы `Готовые решения`, `Услуги` и `Подборки` получили discovery-first framing на mock-данных;
- вторичный слой (`/market/cart`, `/market/orders`) и author-facing поверхности (`/market/publish`, `/market/seller`) визуально понижены в приоритете.

## Основные принципы

1. **Discovery first**
   - Первый контакт с разделом строится через ленту, карточки, авторов, кейсы и подборки.

2. **Reuse важнее checkout**
   - Главный сценарий: взять решение и применить к проекту.

3. **Публикация отделена от PM-проекта**
   - В PM живёт рабочий проект.
   - В каталоге живёт его публичная публикация.

4. **Автор обязателен как часть доверия**
   - У карточки решения должен быть видимый автор и путь к публичной странице.

5. **Коммерческий слой вторичен**
   - Корзина, оплата и доступ сохраняются, но не формируют главное восприятие раздела.

## Ключевые сущности

- **MarketplaceTemplate** — шаблон с возможностью reuse в проекте.
- **MarketplaceListing** — публичная публикация проекта/решения.
- **CatalogAuthorProfile** — user-facing профиль автора; на Phase 1 reuse текущего `performer_profile`.
- **MarketplaceSeller** — текущий минимальный author contract для карточек каталога (`id`, `handle`, `name`, `avatarUrl`, `headline`, `location`, `portfolioCount`).
- **SavedItem** — сохранённый объект каталога.
- **Deal/Access Layer** — оформление, доступ, история сделок и выдача материалов.

## Основные сценарии

1. Найти шаблон или готовое решение в ленте каталога.
2. Открыть карточку и перейти на страницу автора.
3. Сохранить решение для последующего выбора.
4. Применить решение к проекту или создать проект на его основе.
5. Отправить запрос по услуге или адаптации.
6. Опубликовать собственный проект как публичное решение.
7. Управлять своими публикациями отдельно от PM-проектов.

## Текущее состояние

- `/market` уже перестроен в discovery-first feed поверх mock-данных.
- Локальные состояния `favorites`, `cart` и `inquiries` реализованы через persisted Zustand store; `favorites` пока всё ещё template-centric.
- C4 доработан: `Использовать в проекте` и inquiry path больше не заглушки, а Catalog -> PM bridge теперь не уводит новый проект в чужой workspace.
- publish-flow через `/market/publish` уже работает: пользователь может создавать publication-layer для PM-проекта, пользовательского шаблона и отдельной услуги.
- `/market/seller` больше не заглушка: это единый кабинет author-publications для `MarketplaceListing`, шаблонов и услуг.
- `/p/:handle` остаётся канонической public author-page каталога: reuse-ит `performer_profile`, показывает блок `Решения автора` и не дублирует `/market/seller`.
- PM-based `MarketplaceListing` использует текущий C3 rework contract author entity:
  - ownership для PM publish-flow определяется из `project.workspaceId -> workspace.accountId` и organization/account mapping layer, а не из deprecated `project.organization_id`;
  - personal project -> author = человек-владелец, publish only owner;
  - team-owned project -> author = команда, publish allowed owner/admin;
  - publish actor хранится отдельно от author entity.
- Если расширенный performer-profile ещё не публичен или discovery пока работает на mock/demo данных, author-link может fallback-иться на минимальную author-shell по тому же `handle`, не вводя новую сущность поверх `performer_profile`.
- `/market/publish` больше не даёт team-admin ложный сценарий `создать публикацию`, если publication-layer этого проекта уже существует.
- `/market/seller` управляет PM publications по manager rights, но author attribution уже созданной публикации читает из persisted listing contract, а не пересчитывает из project-state.
- canonical person-route `/p/:handle` сохранён, но team-owned publication туда не попадает как fallback; отдельная public surface для команды остаётся следующим этапом.
- corrective task перед C3 завершён: discovery-карточки упрощены, CTA убраны из ленты, demo-метрики оставлены без нового backend/source и аналитики.
- шаблоны и ready solutions теперь реально переводятся в PM через `Использовать в проекте`:
  - новый проект создаётся сразу с reusable task-block;
  - выбранная в apply-flow организация становится каноническим PM context нового проекта через `workspace.accountId = organizationId`;
  - personal selection остаётся personal path;
  - team selection получает минимальный access bridge через snapshot активных участников организации в `project_members`;
  - существующий проект получает отдельный import-block без смешения с publication-layer;
- `Запросить адаптацию` для шаблонов, ready solutions и услуг открывает brief/inquiry flow и складывает запрос в `/market/orders`;
- `/market/cart` и `/market/orders` остались вторичным слоем: reuse path важнее checkout path;
- C5 закрыт как audit/sync layer:
  - read-side каталог и `/p/:handle` сейчас живут внутри authenticated app shell; anonymous web exposure не входил в текущий контракт;
  - visibility автора зафиксирована явно: расширенные performer-блоки требуют `performer_profile.isPublic`, а минимальный author-shell может жить поверх публичных catalog entities;
  - publish/manage rights зафиксированы без переоткрытия C3: personal PM publication = only owner, team-owned PM publication = owner/admin, template/service publication = ownerUserId;
  - apply/import rights зафиксированы без переоткрытия C4: новый проект требует active membership выбранной организации, import в existing project разрешён owner/admin/member и закрыт для viewer;
  - analytics reality задокументирована без переименования namespace: реально логируются `pm_publish_started`, `pm_listing_updated`, `pm_listing_deleted`, `catalog_publication_created`, `catalog_publication_updated`;
  - discovery / author-page / favorites / cart / apply / inquiry / orders пока не получили полного telemetry coverage.
- future scope после C5: full real-publications feed, server-backed cart/favorites/inquiries, protected delivery, dashboard metrics sync и отдельные public routes для команд.

## Архитектурные инварианты

- Внутренние `marketplace_*` namespace не переименовываются в этом цикле.
- Публикация проекта остаётся связанной с PM.
- Не все проекты пользователя становятся публичными автоматически.
- Услуги, шаблоны и решения продолжают жить внутри одного модуля.

## Документация модуля

- [Каталог — План реализации](./marketplace-implementation-plan.md)
- [Каталог — Шаблоны](./marketplace-templates.md)
- [Каталог — Готовые решения](./marketplace-ready-projects.md)
- [Каталог — Услуги](./marketplace-services.md)
- [Каталог — Подборки](./marketplace-categories.md)
- [Каталог — Сохранённое](./marketplace-favorites.md)
- [Каталог — Корзина и оформление](./marketplace-cart.md)
- [Каталог — Сделки и доступ](./marketplace-orders.md)
- [Каталог — Публикация](./marketplace-publish.md)
- [Каталог — Мои публикации](./marketplace-seller.md)
- [Каталог — Страница автора](./marketplace-author-profile.md)
- [Каталог — Пакет документов для субагентов](./agents/README.md)

## Взаимодействия с другими разделами

- **PM Core:** публикация проектов, импорт решений в проекты, статус связки listing ↔ project.
- **Исполнители:** reuse handle/profile слоя для авторов и сервисных сценариев.
- **Финансы:** сделки, доступ, выплаты и статусы оформления.
- **Документы:** выдача файлов и материалов после оформления или в рамках публикации.
- **Рабочий стол:** сводные виджеты по реакциям и активности каталога.

## Архив legacy-модели

Предыдущая shop-first версия документации сохранена в архиве:

- [Legacy Marketplace Structure](../../archive/development/2026-03-09-catalog-reorganization/legacy-marketplace-structure.md)

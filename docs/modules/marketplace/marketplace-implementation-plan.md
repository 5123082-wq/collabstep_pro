# Каталог — План реализации

**Статус:** active  
**Владелец:** product/engineering  
**Создан:** 2026-03-09  
**Последнее обновление:** 2026-03-09

## Роль документа

Это основной документ интеграции для реорганизации текущего модуля `Marketplace` в user-facing раздел `Каталог`.

Документ выполняет сразу 3 функции:

1. Канонический план реализации.
2. Оркестраторский документ для lead-агента.
3. Промежуточный ledger состояния, по которому можно остановить работу и продолжить без ручного восстановления контекста.

Если работа по модулю ставится на паузу, возобновление начинается с чтения этого документа, `docs/ROADMAP.md` и `CONTINUITY.md`.

## Термины и ограничения

- **User-facing имя:** `Каталог`.
- **Внутренний домен:** `Marketplace`.
- **Технические контракты пока не переименовываются:** `marketplace_*`, `/market/*`, `MarketplaceListing`, `useMarketplaceStore` и смежные namespace остаются без изменения до отдельного техэтапа.
- **Нельзя ломать ключевую механику:** пользователь по-прежнему может брать готовое решение из каталога и применять его в свой проект.
- **Нельзя ломать publish-flow:** пользователь по-прежнему может публиковать свой проект из PM в этот же модуль.
- **Нельзя автоматически публиковать все проекты:** публичной становится только явная публикация.
- **Коммерческий слой остаётся вторичным:** корзина, заказы, продажи и checkout не формируют первое впечатление о модуле.

## Целевой продуктовый сдвиг

Переход выполняется от модели `shop-first` к модели `discovery-first`.

Целевое ощущение раздела:

- сначала пользователь видит визуальную ленту решений;
- затем открывает автора, кейсы и связанные публикации;
- потом выбирает один из путей: сохранить, применить к проекту, запросить адаптацию, начать сделку;
- денежный сценарий находится глубже и не доминирует в IA.

## Канонические решения

### 1. Модуль остаётся единым

`Каталог` остаётся единым доменом для:

- шаблонов;
- готовых решений на базе PM-проектов;
- услуг;
- публичных страниц авторов;
- сохранённого;
- публикаций автора;
- вторичного слоя оформления и доступа.

### 2. PM и Каталог разделены по роли

- **PM** хранит рабочие проекты, задачи, файлы, команду и операционную работу.
- **Каталог** показывает публичную витрину решений и даёт вход в reuse/publish/brief/inquiry flow.

### 3. Автор и публикация не равны проекту

- **Проект** — рабочая сущность PM.
- **Публикация** — публичная карточка решения в каталоге.
- **Автор** — пользователь или в будущем команда/организация, у которого есть публичная страница и список публикаций.

### 4. Публичная страница автора реализуется через существующий handle-layer

На Phase 1-2 используется уже существующий маршрут `/p/:handle` и действующая инфраструктура `performer_profile`.

Phase 1 решение:

- публичная страница автора переиспользует текущий handle/profile stack;
- в UI эта поверхность позиционируется как страница автора каталога;
- backend/DB слой `performer_profile` не переименовывается в этом цикле.

## Целевая IA

### Первый слой навигации

- `Каталог` — главная discovery-лента
- `Шаблоны`
- `Готовые решения`
- `Услуги`
- `Подборки`
- `Сохраненное`
- `Опубликовать`
- `Мои публикации`

### Вторичный слой

- `Корзина и оформление`
- `Сделки и доступ`

### Публичные поверхности

- `/market` — главная лента каталога
- `/market/templates` — шаблоны
- `/market/projects` — готовые решения
- `/market/services` — услуги
- `/market/categories` — подборки и навигация
- `/market/favorites` — сохранённое
- `/market/publish` — публикация
- `/market/seller` — мои публикации
- `/market/cart` — корзина и оформление
- `/market/orders` — сделки и доступ
- `/p/:handle` — публичная страница автора

## Аffected Modules

- **Marketplace / Каталог** — основная зона изменений.
- **PM Core** — публикация проекта, импорт решения в проект, связка listing ↔ project.
- **Performers** — reuse публичного handle/profile слоя.
- **Finance** — сделки, оплата, доступ, выплаты.
- **Docs** — выдача файлов/материалов после оформления и хранение артефактов публикации.
- **Analytics** — события просмотра, сохранения, публикации, применения к проекту, inquiry.

## Фазы реализации

| Фаза | Название | Статус | Приоритет | Начало | Завершение | Зависимости | Subagent doc |
|------|----------|--------|-----------|--------|------------|-------------|--------------|
| C0 | Документационное выравнивание и orchestration-pack | ✅ Завершён | P0 | 2026-03-09 | 2026-03-09 | - | - |
| C1 | IA, навигация и discovery-first feed | ✅ Завершён | P0 | 2026-03-09 | 2026-03-09 | C0 | `agents/01-feed-navigation-and-discovery.md` |
| C2 | Публичная страница автора и author identity | ✅ Завершён | P0 | 2026-03-09 | 2026-03-09 | C1 | `agents/02-author-profile-and-public-pages.md` |
| C3 | Публикация и кабинет автора | ✅ Завершён | P0 | 2026-03-09 | 2026-03-09 | C2 | `agents/03-publication-and-management.md` |
| C4 | Apply/import flows и вторичный deal-layer | ✅ Завершён | P1 | 2026-03-09 | 2026-03-09 | C3 | `agents/04-apply-flow-and-deal-layer.md` |
| C5 | Cross-cutting sync: permissions, analytics, docs, QA | ✅ Завершён | P0 | 2026-03-09 | 2026-03-09 | C1, C2, C3, C4 | `agents/05-cross-cutting-and-doc-sync.md` |

## Детализация фаз

### C0. Документационное выравнивание и orchestration-pack

**Статус:** ✅ Завершён

**Результат:**

- создан новый overview `Каталога`;
- создан этот implementation-plan;
- создан пакет документов для субагентов;
- заархивирована legacy-модель старого Marketplace;
- обновлены roadmap/index/continuity документы.

**DoD:**

- есть один канонический orchestration-doc;
- у каждой следующей фазы есть отдельный subagent-doc;
- у lead-агента есть явный протокол проверки и handoff.

### C1. IA, навигация и discovery-first feed

**Статус:** ✅ Завершён

**Цель:** убрать shop-first представление и перевести модуль в discovery-first слой.

**В scope:**

- пользовательское переименование `Маркетплейс` -> `Каталог`;
- изменение первого слоя навигации;
- главная страница как визуальная лента;
- карточки с автором, типом решения, тегами, мягкими CTA;
- перенос корзины/заказов/продаж во второй слой;
- сохранённое и подборки как часть discovery-flow.

**Не в scope:**

- глубокая переработка checkout;
- переименование внутренних namespaces;
- миграции БД.

**DoD:**

- раздел ощущается как каталог решений, а не магазин;
- карточка всегда ведёт к решению и автору;
- ключевые действия доступны только из detail surface и не перегружают discovery-ленту.

**Фактически реализовано (2026-03-09):**

- `/market` переведён из redirect surface в discovery-first feed;
- left navigation, topbar и command palette используют новый user-facing набор лейблов;
- `Шаблоны`, `Готовые решения`, `Услуги`, `Подборки`, `Сохранённое` и second-layer surfaces обновлены под target IA;
- template/discovery cards показывают автора, краткое описание, хэштеги и demo-метрики;
- действия перенесены из плиток в detail surface;
- secondary surfaces (`Корзина и оформление`, `Сделки и доступ`) и author-facing surfaces (`Опубликовать`, `Мои публикации`) понижены в навигационном приоритете.

**Проверка DoD:**

- `shop-first` redirect удалён: `/market` теперь основная лента;
- discovery-карточки в C1-поверхностях показывают автора, краткое описание, хэштеги и demo-метрики;
- CTA убраны с плиток ленты и перенесены в detail surface;
- `pnpm -w typecheck` выполнен успешно 2026-03-09.

**Residual scope после C1:**

- deep author identity и наполнение `/p/:handle` остаются задачей C2;
- publish-flow и кабинет `Мои публикации` остаются задачей C3;
- реальный apply/import, inquiry/deal-layer и checkout/access согласование остаются задачей C4/C5.
- analytics/permissions/dashboard sync под новую IA сознательно не менялись в C1 и были вынесены в C5.

### C2. Публичная страница автора и author identity

**Статус:** ✅ Завершён  
**Завершено:** 2026-03-09

**Цель:** добавить author-page слой без создания новой несвязанной сущности.

**В scope:**

- страница автора на `/p/:handle`;
- блоки `Обо мне`, `Решения автора`, `Шаблоны`, `Готовые решения`, `Услуги`, `Кейсы`, `Отзывы`;
- переход с карточки решения по имени автора;
- reuse текущего `performer_profile` как Phase 1 storage;
- правила публичности и handle.

**DoD:**

- у каждой публичной карточки есть автор;
- у автора есть публичная страница;
- страница не показывает все PM-проекты, а только публичные публикации.

**Фактически реализовано (2026-03-09):**

- `/p/:handle` зафиксирован как canonical author-page каталога;
- author identity в Phase 1 reuse-ит текущий `performer_profile`, `handle` и `isPublic`;
- на странице добавлен блок `Решения автора`;
- блок `Решения автора` собирается только из публичных catalog entities:
  - текущих mock/public catalog items, сгруппированных по `handle`;
- PM-based `MarketplaceListing` временно скрыты на author-page, потому что текущий контракт не содержит явного author field и C2 больше не использует `project.ownerId` как авторство публикации;
- страница автора не дублирует `/market/seller`, а seller-surface остаётся приватным кабинетом;
- добавлен fallback author-shell по `handle`, чтобы карточки каталога не вели в 404, даже если расширенный performer-profile ещё не публичен или discovery пока работает на demo-данных.

**Зафиксированные решения C2:**

- `handle` управляется в `/settings/performer` и хранится в `performer_profile.handle`;
- расширенная публичность author-page управляется `performer_profile.isPublic`;
- `project.ownerId` не используется как финальное author attribution правило для public author-page;
- PM-based `MarketplaceListing` может попасть на author-page только при надёжно определённом явном авторе; в текущем C2-контракте такие публикации скрываются до C3;
- raw PM project list не рендерится на публичной странице;
- first screen в C2 состоит из hero + `Решения автора`, а портфолио/кейсы/отзывы остаются progressive layer.

**Проверка DoD:**

- клик по автору из каталога имеет один canonical target: `/p/:handle`;
- страница автора показывает только public-layer сущности каталога;
- никакая PM-based публикация не показывается на author-page с недостоверным авторством;
- приватные PM-проекты без публикации не попадают на public route;
- `pnpm -w typecheck` выполнен успешно 2026-03-09.

**Handoff в C3:**

- заменить demo aggregation единым author-publications query с явным author contract для `MarketplaceListing`, шаблонов и услуг;
- подключить publish-management для шаблонов и услуг к тому же author-page;
- добавить author-facing controls вида `показывать на странице автора`, не смешивая их с PM visibility;
- определить author entity каталога как человека или команду; это обязательный design/input topic следующего этапа;
- сохранить `/p/:handle` и текущий `performer_profile` как Phase 1-2 canonical stack.

**Corrective task между C2 и C3 (выполнен 2026-03-09):**

- discovery-карточки `Шаблоны`, `Готовые решения`, `Услуги` упрощены;
- CTA `Открыть` / `В проект` / `Сохранить` убраны с плиток в ленте и оставлены только в detail surface;
- на плитке оставлены краткое описание, хэштеги, строка `аватар + имя автора` и demo-метрики `лайки / просмотры / использования`;
- `/p/:handle`, safe author rule C2, publish-flow и scope C3 не менялись.

### C3. Публикация и кабинет автора

**Статус:** ✅ Завершён  
**Последнее обновление:** 2026-03-09

**Цель:** дать пользователю управляемый public layer над его решениями.

**Финальный author contract C3:**

- personal project -> author = человек-владелец проекта, publish allowed только owner;
- team-owned project -> author = команда, publish allowed owner/admin участникам, но публикация создаётся не от имени кликнувшего пользователя;
- publication actor и author entity хранятся и обрабатываются раздельно.

**В scope:**

- publish-flow из PM;
- publish-flow для шаблонов и услуг;
- кабинет `Мои публикации`;
- статусы `draft`, `published`, `rejected` сохраняются;
- управление обложкой, описанием, порядком, видимостью и CTA;
- выбор, показывать ли публикацию на странице автора.
- design/input: определить author entity каталога как человека или команду/организацию без слома `/p/:handle`.

**DoD:**

- пользователь может опубликовать решение;
- пользователь видит статусы и управляет своими публикациями;
- публикации автора и публичная страница используют один источник статуса.

**Что реализовано и исправлено в rework C3 (2026-03-09):**

- `/market/publish` перестал быть заглушкой и стал author-facing точкой создания publication-layer:
  - PM-проект -> `MarketplaceListing draft`;
  - пользовательский шаблон -> template publication;
  - отдельная услуга -> service publication;
- `/market/seller` стал единым кабинетом `Мои публикации` для `MarketplaceListing`, template publications и service publications;
- PM-based `MarketplaceListing` переведён с промежуточного person-first поля `authorUserId` на author entity contract:
  - `authorEntityType`;
  - `authorEntityId`;
  - `publishedByUserId`;
  - `lastEditedByUserId`;
- ownership для PM publication contract больше не определяется через deprecated `project.organization_id`:
  - канонический source теперь строится из PM `project.workspaceId -> workspace.accountId` и безопасного organization/account mapping layer;
  - legacy `project` table не участвует в C3 authorship resolution и не является критической зависимостью этапа;
- author-page visibility вынесен в отдельный author-facing control `showOnAuthorPage`, который не смешивается:
  - с PM visibility проекта;
  - с публичностью `performer_profile.isPublic`;
- `/market/publish` теперь определяет PM authorship по ownership contract проекта:
  - personal project виден для publish только owner;
  - team-owned project виден owner/admin;
  - existing publication определяется по listing-layer source, поэтому team-admin не видит ложный create-flow, если listing уже создан;
- created listing хранит стабильный persisted author entity contract и listing-layer читает именно его:
  - `/market/seller` использует persisted `authorEntityType/authorEntityId` для attribution уже созданной публикации;
  - manager rights остаются отдельным слоем и определяются PM ownership contract, а не переписывают listing authorship;
- `/market/seller` собирает PM publications по manager rights и author entity, а не по current-user author model;
- unified author-publications source для `/p/:handle` показывает только person-authored PM publications:
  - `published + showOnAuthorPage` real publications автора-человека по persisted listing contract;
  - team-owned publication исключается из person-route и не попадает туда как fallback;
  - fallback на demo aggregation сохраняется только если real managed person-publications ещё отсутствуют;
- инварианты C2 сохранены:
  - `/p/:handle` остаётся canonical route;
  - `performer_profile` остаётся Phase 1 stack;
  - `project.ownerId` не используется как author attribution для public author-page.

**Зафиксированное временное правило после C3:**

- `/p/:handle` остаётся canonical person-route;
- team-owned publication не публикуется на person-route и не подменяет его как fallback;
- отдельная public route для команды и team author pages остаются future enhancement.

**Проверка DoD:**

- пользователь может создать draft publication из PM-проекта, шаблона и услуги;
- personal project публикуется только owner-ом и от имени owner-а;
- team-owned project публикуется owner/admin участником, но author entity = команда;
- ownership для PM publish-flow определяется через PM `workspace/account` mapping layer, а не через deprecated `project` table;
- `/market/publish` не показывает ложный create-flow при уже существующей публикации того же team-owned проекта;
- author-facing кабинет и public author surfaces используют persisted listing contract без ложной person attribution;
- видимость на `/p/:handle` управляется отдельным флагом `showOnAuthorPage`;
- team-owned publication не попадает на `/p/:handle` человека;
- `pnpm -w typecheck` выполнен успешно после доработки C3.

**Residual scope после C3:**

- discovery-ленты `/market/projects`, `/market/templates`, `/market/services` всё ещё mixed с mock/demo данными и не стали полным real publications feed;
- apply/import flows, inquiry/deal-layer и checkout/access sync остаются задачей C4/C5;
- team author pages для команд и организаций остаются future enhancement и не ломают текущий person-route.

### C4. Apply/import flows и вторичный deal-layer

**Статус:** ✅ Завершён после corrective bridge-fix  
**Завершено:** 2026-03-09

**Цель:** сохранить reuse-механику и не потерять коммерческие сценарии.

**В scope:**

- `Использовать в проекте` для шаблонов и готовых решений;
- создание проекта на базе решения;
- `Запросить адаптацию` для сервисных сценариев;
- корзина/оформление/доступ как secondary surface;
- согласование того, как услуга превращается в проект, контракт и рабочий контур.

**DoD:**

- reuse-flow работает лучше, чем checkout-flow;
- услуги ведут в inquiry/brief, а не сразу в магазинную механику;
- оформление и доступ остаются доступны, но не доминируют в UX.

**Фактически реализовано (2026-03-09):**

- `Использовать в проекте` в detail surface шаблонов и готовых решений больше не ведёт в intent-toast:
  - открывается project-centric modal с ветками `новый PM-проект` и `существующий PM-проект`;
  - путь по умолчанию — `создать новый проект и сразу импортировать reusable structure`;
- добавлен единый server apply route `/api/marketplace/apply` для `template` и `solution` sources:
  - новый проект создаётся в PM и сразу получает reusable task-block;
  - существующий проект получает отдельный root task `Каталог: ...`, чтобы import не смешивался с уже существующей структурой;
- corrective bridge-fix после возврата C4 в доработку:
  - `Создать новый проект` больше не использует universal `DEFAULT_WORKSPACE_ID`;
  - выбранная в apply-flow организация теперь определяет канонический PM context нового проекта через `workspace.accountId = organizationId`;
  - если у выбранной организации нет однозначного workspace, apply-flow создаёт детерминированный bridge-workspace `ws-catalog-org-<organizationId>` вместо записи проекта в чужой workspace;
  - personal context остаётся personal path;
  - team context получает минимальный access bridge: активные участники организации зеркалятся в `project_members`, чтобы новый проект не деградировал в hidden owner-only state;
  - import в existing project не менялся;
- apply/import не меняет publish-layer и не создаёт новую publication linkage автоматически:
  - `MarketplaceListing` остаётся отдельным public layer;
  - PM получает только рабочую reusable структуру;
- `Запросить адаптацию` для шаблонов, ready solutions и услуг переведён в brief/inquiry modal:
  - пользователь заполняет контекст и ожидаемый результат;
  - inquiry можно привязать к существующему PM-проекту или оставить без проекта до согласования;
- `/market/orders` больше не чистая заглушка:
  - показывает inquiry submissions как secondary deal-layer;
  - даёт переход к источнику и связанному проекту, если он выбран;
- `/market/cart` остаётся вторичным слоем:
  - шаблоны по-прежнему можно добавлять в корзину;
  - сервисы не идут в cart-flow;
  - reuse path явно отправляет обратно в `Использовать в проекте`, а не в checkout;
- локальный catalog-store теперь persist-ит `favorites`, `cart` и `inquiries`, чтобы secondary surfaces не теряли состояние между переходами.

**Проверка DoD:**

- reuse-flow стал главным entry-point detail surface для шаблонов и ready solutions;
- услуги больше не упираются в shop-first CTA и уходят в brief/inquiry path;
- выбор организации в apply-flow теперь реально влияет на канонический PM context нового проекта;
- team apply path больше не сводится к legacy org-link без project access: минимальный team contract закреплён через явный `project_members` bridge;
- PM-project и public publication остались разделены: apply/import не трогает C3 publish contract;
- `/market/orders` и `/market/cart` описаны и реализованы как secondary surfaces;
- `pnpm -w typecheck` выполнен успешно 2026-03-09.

**Residual scope после C4 / handoff в C5:**

- discovery feeds `/market/projects` и `/market/services` всё ещё mixed с mock/demo catalog data, а не с полным real publications feed;
- inquiry history пока хранится в локальном persisted store и не переведена в Finance/Contracts/Docs delivery layer;
- protected delivery, access issuance и real checkout/session остаются незавершёнными;
- новый analytics contract для apply/import/inquiry сознательно не вводился в C4 и был вынесен в C5;
- permission review для import-rights и ручной QA-сценарий были вынесены в C5;
- generic PM create-flow вне каталога сознательно не перерабатывался в рамках этого corrective task.

### C5. Cross-cutting sync

**Статус:** ✅ Завершён  
**Завершено:** 2026-03-09

**Цель:** закрыть платформенные контракты и не оставить модуль в полуобновлённом состоянии.

**В scope:**

- права и роли;
- аналитика;
- документы и protected delivery;
- dashboard/widgets;
- continuity/docs sync;
- тест-план и ручная проверка.

**DoD:**

- overview/implementation-plan/ROADMAP/CONTINUITY синхронизированы;
- аналитика и catalog-specific permissions задокументированы, а открытые противоречия вынесены в residual risks / corrective tasks;
- есть явный список residual risks.

**Что проверено и зафиксировано (2026-03-09):**

- overview / implementation plan / subagent docs / roadmap / continuity синхронизированы;
- platform-wide docs sync закрыт для:
  - `docs/platform/overview.md`;
  - `docs/platform/roles-permissions.md`;
  - `docs/platform/analytics-events.md`;
  - `docs/README.md`;
  - `docs/INDEX.md`;
- подтверждено, что C5 не меняет IA `Каталога`, canonical route `/p/:handle`, person-vs-team contract C3 и apply/publish boundaries C4;
- собран явный testing/rollout checklist и список residual risks.

**Permissions impact после C5:**

- read-side `Каталог` и `/p/:handle` сейчас живут внутри authenticated app shell; anonymous public web exposure не входил в scope;
- `/p/:handle` остаётся canonical person-route:
  - расширенные performer-блоки требуют `performer_profile.isPublic`;
  - minimal author-shell может рендериться поверх публичных catalog entities;
  - PM publication попадает на author-page только при `authorEntityType=user`, `state=published`, `showOnAuthorPage=true`;
  - team-owned publication не попадает на `/p/:handle` человека;
- publish/manage rights зафиксированы без переоткрытия C3:
  - personal PM project -> publish/manage only owner;
  - team-owned PM project -> publish/manage owner/admin;
  - template/service publication -> create/manage only `ownerUserId`;
  - persisted listing contract остаётся source of truth для author attribution уже созданной публикации;
- apply/import rights зафиксированы без переоткрытия C4:
  - current implementation для нового PM-проекта проверяет только active membership выбранной организации;
  - import в existing project разрешён owner/admin/member и закрыт для viewer;
  - apply/import не меняет publication-layer автоматически;
- inquiry/deal-layer access остаётся transitional:
  - brief создаётся из authenticated catalog flow;
  - связать inquiry можно только с проектами, где UI даёт create-task-capable target;
  - `/market/orders` остаётся локальным secondary layer, а не shared contract/escrow workflow.
- открытое противоречие C5:
  - platform matrix всё ещё говорит `viewer` не может создавать проект;
  - current PM/catalog create path проверяет только active organization membership;
  - это вынесено в отдельный corrective task, а не принято как новый канонический permission contract.

**Analytics impact после C5:**

- подтверждено текущее implemented telemetry coverage:
  - `pm_publish_started`;
  - `pm_listing_updated`;
  - `pm_listing_deleted`;
  - `catalog_publication_created`;
  - `catalog_publication_updated`;
- namespaces не переименовывались; legacy `marketplace_*` taxonomy сохранена в platform docs как planned layer;
- discovery / author-page / favorites / cart / apply / inquiry / orders пока не получили полного frontend telemetry coverage;
- payload normalization к канонической analytics schema тоже остаётся будущим этапом: текущие lightweight Catalog events пока используют implementation-level payloads.

**Testing and rollout checklist (manual QA):**

- проверить `/market` и discovery surfaces на отсутствие CTA в карточках и корректный переход в detail surface;
- проверить переходы по автору: карточка -> `/p/:handle` -> `Решения автора`, включая fallback author-shell без публичного performer-profile;
- проверить publish rights:
  - personal PM project доступен только owner;
  - team-owned PM project доступен owner/admin;
  - existing team publication не даёт ложный create-flow;
- проверить seller management:
  - persisted author entity не меняется от текущего project-state;
  - `showOnAuthorPage` влияет только на person-authored published items;
- проверить apply/import:
  - новый проект создаётся в context выбранной организации;
  - existing project import создаёт отдельный root task;
  - viewer не получает import target;
- проверить inquiry path:
  - brief создаётся из template / solution / service;
  - optional project-link использует только доступные PM targets;
  - запись появляется в `/market/orders`;
- проверить secondary surfaces:
  - template cart path не становится главным entry-point;
  - `/market/orders` не обещает delivery, которого ещё нет.

**Known gaps / residual risks после C5:**

- есть открытое permission contradiction:
  - `docs/platform/roles-permissions.md` описывает `viewer` как read-only для project creation;
  - current PM/catalog create path допускает создание проекта при любом active organization membership;
  - нужен отдельный corrective task, который либо сузит код до `owner/admin/member`, либо утвердит более широкий продуктовый контракт;
- discovery feeds `/market/projects`, `/market/templates`, `/market/services` остаются mixed с mock/demo data и demo-метриками;
- `favorites`, `cart` и `inquiries` всё ещё локальные persisted stores без shared backend history, cross-device sync и audit trail;
- real checkout/session, protected delivery, access issuance и post-purchase materials всё ещё не реализованы;
- dashboard/widget layer остаётся legacy:
  - current widget framed as `marketplace-reactions`;
  - он не покрывает discovery / publish / apply / inquiry contracts нового `Каталога`;
- team/organization public routes остаются future enhancement; team-owned publication по-прежнему не имеет отдельной public surface;
- template/service author-publication APIs auth-gated, но пока не имеют отдельного marketplace feature-flag gate;
- platform PM docs вне scope `Каталога` всё ещё содержат legacy role naming `manager/contributor`; это требует отдельного doc corrective task и не менялось в C5.

**Future scope после C5:**

- corrective task по project creation permissions:
  - выровнять platform matrix и implementation для правила `кто может создавать PM-проект в organization context`;
- full real-publications feed вместо mixed mock/demo discovery layer;
- server-backed cart / favorites / inquiries и shared deal history;
- checkout / protected delivery / access issuance / documents handoff;
- dedicated analytics implementation для discovery / author-page / apply / inquiry / orders;
- dashboard/widget sync под новую IA `Каталога`;
- public author pages для команд и организаций.

## Orchestrator Protocol

Lead-агент обязан работать по этой последовательности:

1. Прочитать `AGENTS.md`, `CONTINUITY.md`, `docs/ROADMAP.md`, `docs/modules/marketplace/marketplace-overview.md`, этот документ и нужный subagent-doc.
2. Найти первую фазу со статусом `🔄` или `⏳`, у которой выполнены зависимости.
3. Сформулировать задачу субагенту только в рамках одного workstream-doc.
4. Проверить выход субагента по `DoD`, `Out of scope`, `Handoff checklist`.
5. Синхронизировать статусы:
   - в этом документе;
   - в `docs/ROADMAP.md`;
   - в `CONTINUITY.md`;
   - в профильном модульном документе.
6. Только после этого выдавать следующий workstream.

## Правила для субагентов

- Один субагент = один workstream-doc.
- Субагент не меняет фазу вне своего scope.
- Субагент обязан явно писать, что осталось вне scope.
- Субагент не переименовывает внутренние `marketplace_*` контракты без отдельной задачи.
- Если workstream требует cross-cutting решения, он эскалирует его lead-агенту, а не принимает молча.

## Pause / Resume Protocol

### Перед паузой

Lead-агент обязан:

1. Обновить статус текущей фазы.
2. Заполнить `Execution Ledger`.
3. Добавить короткую factual запись в `CONTINUITY.md`.
4. Обновить `docs/ROADMAP.md`, если изменилась стадия работ.

### После возобновления

Следующий агент обязан:

1. Прочитать `Execution Ledger`.
2. Найти последний checkpoint со статусом `🔄` или последний завершённый `✅`.
3. Проверить зависимые subagent docs.
4. Продолжить с ближайшего незавершённого шага, а не перепланировать модуль заново.

## Execution Ledger

| Дата | Checkpoint | Статус | Артефакты | Что дальше |
|------|------------|--------|-----------|------------|
| 2026-03-09 | C0 завершён: создан новый documentation pack для `Каталога` | ✅ | overview, implementation-plan, agent docs, archive snapshot, roadmap/index/continuity sync | Начать C1: IA, навигация и discovery-first feed |
| 2026-03-09 | C1 завершён: discovery-first IA внедрена в `/market` и user-facing surfaces | ✅ | `/market` feed, новые лейблы навигации, template/discovery cards, doc sync, `pnpm -w typecheck` | Следующий этап: C2 — author profile and public pages |
| 2026-03-09 | C2 возвращён в доработку: удалена ложная author attribution через `project.ownerId` на `/p/:handle` | 🔄 | safe rule для author-page, fallback author-shell сохранён, doc sync, повторная приёмка C2 | После приёмки перейти к C3 с явным author contract и темой `автор = человек или команда` |
| 2026-03-09 | C2 принят после доработки: `/p/:handle` закрыт как safe author-page без ложной PM attribution | ✅ | canonical author-page, fallback author-shell, safe author rule, doc sync | Закрыть corrective task по discovery-card UI и перейти к C3 |
| 2026-03-09 | Corrective task между C2 и C3 завершён: discovery-card UI упрощён, CTA вынесены в detail surface | ✅ | simplified discovery cards, detail modal для solutions/services, demo-metrics, roadmap/continuity/doc sync, `pnpm -w typecheck` | Следующий этап: C3 — публикация и кабинет автора |
| 2026-03-09 | C3 завершён: введены publish-flow, единый author-publications source и кабинет `Мои публикации` | ✅ | `/market/publish`, `/market/seller`, explicit `authorUserId`, `showOnAuthorPage`, author-page sync, doc sync, `pnpm -w typecheck` | Следующий этап: C4 — apply/import flows и secondary deal-layer |
| 2026-03-09 | C3 возвращён в доработку: person-vs-team author contract зафиксирован как обязательный продуктовый инвариант | 🔄 | personal project -> author=user owner only; team-owned project -> author=team; `/market/publish`, `/market/seller` и public author surfaces требуют синхронизации | Не переходить к C4, пока C3 не доведён до корректного author entity contract |
| 2026-03-09 | C3 доработан и закрыт: PM authorship переведён на author entity + actor contract | ✅ | `authorEntityType/authorEntityId/publishedByUserId/lastEditedByUserId`, publish rights by personal-vs-team ownership, seller sync, `/p/:handle` guardrail, doc sync, `pnpm -w typecheck` | Следующий этап остаётся C4 — apply/import flows и secondary deal-layer |
| 2026-03-09 | C3 возвращён в доработку повторно: legacy `project.organization_id` выведен из ownership/authorship resolution, этап ждёт повторной приёмки | 🔄 | PM ownership через `workspace/account` mapping layer, seller/public read-path из persisted listing contract, doc sync, `pnpm -w typecheck` | Не переходить к C4, пока C3 не будет принят повторно |
| 2026-03-09 | C3 принят после повторной приёмки: ownership/authorship split закрыт, C4 разблокирован как следующий этап | ✅ | PM ownership через `workspace/account` mapping layer, persisted listing contract как source of truth для authorship, unit test, doc sync, `pnpm -w typecheck` | Следующий этап: C4 — apply/import flows и secondary deal-layer |
| 2026-03-09 | C4 завершён: apply/import flow стал project-first, услуги ушли в inquiry path | ✅ | `/api/marketplace/apply`, reusable task import для template/solution, detail modals `Использовать в проекте` / `Запросить адаптацию`, `/market/orders` secondary deal-layer, persisted catalog store, doc sync, `pnpm -w typecheck` | Следующий этап: C5 — permissions / analytics / docs / QA sync |
| 2026-03-09 | C4 возвращён в доработку и исправлен минимальный Catalog -> PM bridge | ✅ | canonical PM context через selected organization, deterministic bridge-workspace, minimal team `project_members` bridge, existing import path unchanged, doc sync, `pnpm -w typecheck` | Следующий этап остаётся C5 — permissions / analytics / docs / QA sync |
| 2026-03-09 | C5 завершён: cross-cutting contracts, docs sync и QA backlog зафиксированы без product redesign | ✅ | permissions matrix, analytics reality, roadmap/platform docs sync, residual risks, rollout checklist | Дальше только future scope и отдельные corrective tasks вне C1-C5 |

## Пакет документов для субагентов

- [Пакет субагентов — индекс](./agents/README.md)
- [Subagent 01 — IA, навигация и feed](./agents/01-feed-navigation-and-discovery.md)
- [Subagent 02 — страница автора](./agents/02-author-profile-and-public-pages.md)
- [Subagent 03 — публикация и кабинет автора](./agents/03-publication-and-management.md)
- [Subagent 04 — apply/import и сделки](./agents/04-apply-flow-and-deal-layer.md)
- [Subagent 05 — cross-cutting sync](./agents/05-cross-cutting-and-doc-sync.md)

## История изменений

| Дата | Изменение | Автор |
|------|-----------|-------|
| 2026-03-09 | Создан канонический orchestration-plan для реорганизации Marketplace в `Каталог` | AI Agent |
| 2026-03-09 | C1 завершён: внедрены discovery-first feed, новая IA и обновлённые user-facing labels | AI Agent |
| 2026-03-09 | C2 возвращён в доработку: safe author attribution для `/p/:handle`, PM-based listings скрыты до C3 | AI Agent |
| 2026-03-09 | C2 завершён после доработки; перед C3 зафиксирован отдельный corrective task по discovery-карточкам | AI Agent |
| 2026-03-09 | Corrective task по discovery-карточкам завершён; следующий этап переведён на C3 | AI Agent |
| 2026-03-09 | C3 завершён: publish-flow и кабинет автора реализованы, `/p/:handle` переведён на единый author-publications source | AI Agent |
| 2026-03-09 | C3 возвращён в доработку: утверждён продуктовый контракт `personal project -> author=user`, `team-owned project -> author=team` | AI Agent |
| 2026-03-09 | C3 закрыт после доработки: PM publication contract разделяет actor и author entity, team-owned publication исключён из `/p/:handle` | AI Agent |
| 2026-03-09 | C3 возвращён в доработку повторно: deprecated `project.organization_id` исключён из ownership/authorship resolution, C4 оставлен заблокированным | AI Agent |
| 2026-03-09 | C3 принят после повторной приёмки: ownership/authorship split закрыт, C4 разблокирован как следующий этап | AI Agent |
| 2026-03-09 | C4 доработан после возврата: Catalog -> PM bridge переведён на selected organization context без PM redesign | AI Agent |
| 2026-03-09 | C5 закрыт: cross-cutting sync завершён, residual risks и future scope вынесены отдельно | AI Agent |

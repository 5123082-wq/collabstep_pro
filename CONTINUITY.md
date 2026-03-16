# Continuity Ledger

> **Последнее обновление:** 2026-03-15
> **Default read scope:** читать только до строки `<!-- STOP LINE: ACTIVE CONTEXT ENDS -->`

## Active Context

### Primary Thread

- **Зона работ:** AI Hub / OpenClaw planning
- **Текущий статус:** создан стартовый architecture brief по OpenClaw для AI Hub; синхронизированы `docs/ROADMAP.md`, AI Hub overview и общая навигация документации

### Что зафиксировано по OpenClaw planning

- создан документ `docs/modules/ai-hub/ai-hub-openclaw-architecture.md`
- OpenClaw зафиксирован как execution layer внутри существующего AI Hub, а не как отдельный параллельный модуль
- shared-tier описан как safe mode для всех пользователей
- premium-tier описан как private agent с отдельным trust boundary
- Collabverse оставлен source of truth для auth, org/project membership, files, subscriptions, analytics и feature flags
- полное копирование пользовательских данных в OpenClaw volumes не принято как базовый подход
- rollout разбит на этапы O0-O4: architecture -> shared agent -> scoped workspace tools -> private agent -> external channels

### Ключевые решения по OpenClaw

- shared OpenClaw gateway не трактуется как безопасный multi-tenant host для недоверенных пользователей
- authorization и permissions должны оставаться на стороне Collabverse через proxy/tools layer
- private agent проектируется как premium-capability внутри AI Hub
- внешний канал доступа (Telegram / Discord / WhatsApp / webhooks) вынесен в позднюю фазу

### Что дальше по OpenClaw

- пользователь ревьюит новый OpenClaw brief и добавляет свои идеи
- после этого brief разворачивается в implementation plan по API, schema, UI, infra и rollout

### OpenClaw Docs

- `docs/modules/ai-hub/ai-hub-openclaw-architecture.md`
- `docs/modules/ai-hub/ai-hub-overview.md`
- `docs/platform/overview.md`
- `docs/README.md`
- `docs/INDEX.md`
- `docs/ROADMAP.md`

### OpenClaw Verification

- docs-only change; `pnpm -w typecheck` не запускался

### Secondary Thread

- **Зона работ:** Marketplace / Каталог reorganization
- **Текущий статус:** C5 audit/sync слой закрыт 2026-03-09; docs синхронизированы, но остаётся отдельный corrective task по contradiction `project creation permissions: platform matrix vs implementation`

### Что уже реализовано по C3

- `/p/:handle` зафиксирован как каноническая public author-page каталога
- author-page reuse-ит `performer_profile`, `handle` и `isPublic` как Phase 1 stack
- `/market/publish` стал рабочим publish-flow для PM-проектов, пользовательских шаблонов и услуг
- `/market/seller` стал единым кабинетом `Мои публикации`
- добавлен единый author-publications source для `MarketplaceListing`, template publications и service publications
- промежуточный PM person-first contract через `MarketplaceListing.authorUserId` снят; финальный listing contract теперь хранит:
  - `authorEntityType`
  - `authorEntityId`
  - `publishedByUserId`
  - `lastEditedByUserId`
- deprecated `project.organization_id` выведен из C3 ownership/authorship resolution:
  - PM ownership для publish-flow теперь определяется из `project.workspaceId -> workspace.accountId` и organization/account mapping layer;
  - legacy `project` table не является critical dependency для C3 contract
- добавлен отдельный author-facing visibility control `showOnAuthorPage`
- добавлены lightweight telemetry events `catalog_publication_created` и `catalog_publication_updated`
- author-link из карточек C1 не ломается: есть fallback author-shell по `handle` для mock/demo данных и случаев, когда расширенный performer-profile ещё не публичен
- ложная PM-based author attribution через `project.ownerId` не вернулась: public author-page использует только явный author contract и не принимает team-owned publication на person-route
- `/market/publish` больше не показывает team-admin ложный create-flow, если listing этого PM-проекта уже существует
- `/market/seller` собирает PM publications по manager rights и author entity, а не по current-user author model
- seller/public read-path для самой публикации используют persisted listing contract:
  - listing authorship читается из `authorEntityType/authorEntityId`;
  - manager rights остаются отдельным слоем и определяются PM ownership contract;
  - author attribution уже созданной публикации не меняется из-за текущего project-state без явного update listing contract

### Что реализовано по C4

- `Использовать в проекте` в шаблонах и готовых решениях больше не заглушка:
  - detail surface открывает project-first modal;
  - новый проект создаётся сразу с reusable task-block;
  - существующий проект получает отдельный import-block задач;
- добавлен server apply route `/api/marketplace/apply` для `template` и `solution` sources;
- corrective bridge-fix после возврата C4 в доработку:
  - `Создать новый проект` больше не привязан к universal `DEFAULT_WORKSPACE_ID`;
  - выбранная в apply-flow организация стала каноническим PM context нового проекта через `workspace.accountId = organizationId`;
  - если для выбранной организации нет однозначного workspace, создаётся детерминированный bridge-workspace `ws-catalog-org-<organizationId>`;
  - personal selection остаётся personal path;
  - team selection получает минимальный access bridge через snapshot активных участников организации в `project_members`;
  - существующий import в already-existing project не менялся;
- apply/import не смешивает PM-проект и public publication:
  - `MarketplaceListing` / publication-layer не изменяются автоматически;
  - в PM переносится только рабочая структура;
- `Запросить адаптацию` для шаблонов, ready solutions и услуг открывает brief/inquiry modal;
- inquiry можно привязать к существующему PM-проекту или оставить без проекта до согласования;
- `/market/orders` больше не пустая заглушка:
  - показывает inquiry submissions как secondary deal-layer;
  - даёт переход к источнику и к связанному проекту;
- `/market/cart` сохранён как secondary checkout surface только для template purchase path;
- `useMarketplaceStore` теперь persist-ит `favorites`, `cart` и `inquiries`.

### Что закрыто в C5

- overview / implementation plan / roadmap / continuity / platform docs синхронизированы по итогам C1-C4;
- permissions impact зафиксирован явно:
  - read-side каталог и `/p/:handle` живут внутри authenticated app shell;
  - расширенные performer-блоки требуют `performer_profile.isPublic`, а minimal author-shell может жить поверх публичных catalog entities;
  - personal PM publish/manage = only owner;
  - team-owned PM publish/manage = owner/admin;
  - apply/import в existing project разрешён owner/admin/member;
  - current implementation нового проекта в catalog/PM path проверяет только active membership выбранной организации, и это не считается финально принятым контрактом;
- analytics reality зафиксирована без переименования namespace:
  - реально используются `pm_publish_started`, `pm_listing_updated`, `pm_listing_deleted`, `catalog_publication_created`, `catalog_publication_updated`;
  - discovery / author-page / favorites / cart / apply / inquiry / orders остаются telemetry gaps;
- собран manual QA checklist для discovery, author-page, publish, seller, apply/import, inquiry и secondary surfaces;
- platform-wide docs sync закрыт для:
  - `docs/platform/overview.md`
  - `docs/platform/roles-permissions.md`
  - `docs/platform/analytics-events.md`
  - `docs/README.md`
  - `docs/INDEX.md`
- зафиксированы residual risks:
  - открытое permission contradiction:
    - platform matrix говорит `viewer` не может создавать проект;
    - current PM/catalog create path проверяет только active organization membership;
    - нужен отдельный corrective task;
  - mixed mock/demo discovery feeds и demo metrics;
  - локальные persisted `favorites` / `cart` / `inquiries` без backend history;
  - отсутствие real checkout / protected delivery / access issuance;
  - legacy dashboard widget `marketplace-reactions` не покрывает новую IA `Каталога`;
  - team public route отсутствует;
  - template/service author-publication APIs пока без отдельного marketplace feature flag;
  - PM docs вне scope `Каталога` всё ещё используют legacy role naming `manager/contributor` и требуют отдельного doc corrective task.

### Ключевые решения

- `handle` управляется в `/settings/performer` и хранится в `performer_profile.handle`
- расширенные performer-блоки author-page контролируются `performer_profile.isPublic`
- на author-page показываются только public catalog entities
- `project.ownerId` не используется как финальное правило author attribution для public author-page
- PM-based `MarketplaceListing` попадает на author-page только если:
  - author entity = человек;
  - `state = published`;
  - `showOnAuthorPage = true`
- `/market/seller` остаётся приватным кабинетом и не дублируется author-page
- publication visibility на `/p/:handle` не смешивается с PM visibility и не включает performer-profile автоматически
- discovery-карточки `Шаблоны`, `Готовые решения`, `Услуги` не показывают CTA в ленте; действия живут только в detail surface
- метрики `лайки / просмотры / использования` на discovery-карточках остаются demo placeholders без новой аналитики и backend-source
- для team-owned PM publication действует временное правило C3: до отдельной public team-route она не публикуется на `/p/:handle` человека
- из каталога путь по умолчанию — `создать новый проект`, а импорт в существующий проект остаётся явной альтернативой
- import в существующий PM-проект создаёт отдельный root task `Каталог: ...`, чтобы reusable block не смешивался с текущей структурой проекта
- inquiry/deal-layer C4 сознательно transitional:
  - briefs живут в локальном persisted store;
  - finance/contracts/protected delivery не подключались в этом этапе

### Новое обязательное правило

- personal project -> author = человек-владелец проекта; publish allowed только owner
- team-owned project -> author = команда; publish allowed owner/admin, но publication actor и author entity должны быть разделены
- team-owned publication не должна попадать на `/p/:handle` человека

### Что дальше

- future scope после C5:
  - full real-publications feed;
  - server-backed cart / favorites / inquiries и shared deal history;
  - checkout / protected delivery / access issuance;
  - analytics implementation для discovery / author / apply / inquiry / orders;
  - dashboard/widget sync под новую IA `Каталога`;
- отдельная public surface для команд и организаций остаётся будущим scope и не должна ломать canonical person-route `/p/:handle`
- отдельный corrective task нужен для:
  - project creation permissions (`viewer` vs active membership);
  - platform/PM docs sync по legacy project-role naming

### Актуальные документы

- `docs/modules/marketplace/marketplace-author-profile.md`
- `docs/modules/marketplace/marketplace-cart.md`
- `docs/modules/marketplace/marketplace-overview.md`
- `docs/modules/marketplace/marketplace-implementation-plan.md`
- `docs/modules/marketplace/marketplace-orders.md`
- `docs/modules/marketplace/marketplace-publish.md`
- `docs/modules/marketplace/marketplace-ready-projects.md`
- `docs/modules/marketplace/marketplace-seller.md`
- `docs/modules/marketplace/marketplace-services.md`
- `docs/modules/marketplace/marketplace-templates.md`
- `docs/platform/analytics-events.md`
- `docs/platform/overview.md`
- `docs/platform/roles-permissions.md`
- `docs/README.md`
- `docs/INDEX.md`
- `docs/modules/marketplace/agents/04-apply-flow-and-deal-layer.md`
- `docs/modules/marketplace/agents/05-cross-cutting-and-doc-sync.md`
- `docs/ROADMAP.md`

### Verification

- docs-only update в C5; `pnpm -w typecheck` не запускался
- добавлен unit test `apps/web/tests/unit/marketplace-listing-contract.spec.ts` на ownership/authorship split и persisted listing contract
- добавлен unit test `apps/web/tests/unit/catalog-pm-bridge.spec.ts` на personal/team target PM context и minimal access bridge
- `pnpm test -- catalog-pm-bridge.spec.ts --runInBand` — assertions проходят, но сам Jest-процесс в sandbox завершается с ошибкой из-за фонового DB/WebSocket bootstrap на недоступный host `ep-plain-frost-a467jeml-pooler.us-east-1.aws.neon.tech`
- `pnpm test -- marketplace-listing-contract.spec.ts --runInBand` — assertions проходят, но сам Jest-процесс в sandbox завершается с ошибкой из-за фонового DB/WebSocket bootstrap на недоступный host `ep-plain-frost-a467jeml-pooler.us-east-1.aws.neon.tech`

### Tertiary Thread

- **Зона работ:** PM Core / people picker и project membership
- **Текущий статус:** 2026-03-15 закрыт базовый slice по поиску пользователей платформы и прямому добавлению их в PM-проект

### Что зафиксировано по people picker

- добавлен `/api/pm/projects/[id]/member-candidates`:
  - ищет зарегистрированных пользователей по имени, email и должности;
  - маркирует кандидатов как `уже в проекте` / `в команде организации` / `только на платформе`;
- добавлен `POST /api/pm/projects/[id]/members` для direct add existing user в PM-проект;
- PM modal управления участниками переведён с link-only flow на `search + direct add`, invite-link оставлен как fallback;
- блок `Команда` в карточке проекта получил явную кнопку `Добавить участника`;
- task detail теперь явно подсказывает, что назначение возможно только после project membership;
- docs синхронизированы для `ROADMAP`, PM overview/projects/tasks/access/teams и analytics taxonomy.

### Ключевые решения по people picker

- task assignment остаётся project-scoped: assignee picker не ищет по всей платформе и использует только команду проекта;
- registered platform user можно добавить в проект напрямую без email-only обхода;
- если пользователь есть на платформе, но не состоит в организации, базовый slice допускает его как внешнего project participant;
- отдельная глобальная user directory / картотека пользователей остаётся future scope.

### People Picker Docs

- `docs/ROADMAP.md`
- `docs/modules/projects-tasks/projects-tasks-overview.md`
- `docs/modules/projects-tasks/projects-tasks-projects.md`
- `docs/modules/projects-tasks/projects-tasks-tasks.md`
- `docs/modules/projects-tasks/projects-tasks-access.md`
- `docs/modules/projects-tasks/projects-tasks-teams.md`
- `docs/platform/analytics-events.md`

### People Picker Verification

- `pnpm -w typecheck` — успешно
- `pnpm test -- project-people-picker-api.spec.ts --runInBand` — успешно

### Quaternary Thread

- **Зона работ:** Performers / people directory, user cabinet и performer card contract
- **Текущий статус:** 2026-03-15 собран и синхронизирован docs-only contract по кабинету пользователя, карточке исполнителя, картотеке людей и contact-to-project workflow

### Что зафиксировано по performers docs contract

- `performers-overview` переписан из разрозненного “биржа исполнителей” описания в связанный доменный контракт:
  - единый аккаунт и кабинет пользователя;
  - performer card как расширение аккаунта;
  - публичный каталог + private relation layer;
  - внешний flow `контакт -> preview -> approval -> membership`;
- `performers-specialists` теперь явно разделяет:
  - публичный discovery catalog;
  - PM operational people picker;
  - будущую приватную картотеку контактов;
- `performers-responses` зафиксировал reuse уже существующих invite threads, `previewProjectIds` и project invite statuses вместо новой state machine;
- добавлен единый handoff doc `docs/modules/performers/performers-agent-handoff.md`, который можно отдавать новому агенту как single-source brief;
- добавлен новый канонический doc `docs/modules/performers/performers-profile-cabinet.md`:
  - описывает текущее расщепление `/settings/profile`, `/settings/performer`, `/profile/*`, settings modals;
  - фиксирует, как должна создаваться performer card через единый кабинет;
- добавлен новый `docs/modules/performers/performers-implementation-plan.md` с фазами P0-P4;
- синхронизированы `docs/ROADMAP.md`, `docs/platform/overview.md`, `docs/README.md`, `docs/INDEX.md`.

### Ключевые решения по performers docs contract

- не вводить новую сущность “человек” поверх уже существующих `users` + `performer_profile` + relation layer;
- не вводить отдельную новую state machine для candidate access, если достаточно `organization_invite`, `project_invite`, invite threads и текущих invite statuses;
- current PM people picker остаётся valid для direct add known users, но не считается финальным external hiring/contact flow;
- `/settings/profile` и `/settings/performer` считать текущими рабочими surfaces, а `/profile/*` и часть settings modals — legacy/transition state;
- analytics taxonomy не обновлялась: пока зафиксирован только план будущих событий, без реализации.

### Performers Docs Verification

- docs-only update; `pnpm -w typecheck` не запускался

### Quinary Thread

- **Зона работ:** Platform runtime audit / DB-only business data
- **Текущий статус:** 2026-03-15 выполнен cross-cutting cleanup local runtime sources; business surfaces переведены на DB-backed reads либо в honest maintenance/empty state

### Что зафиксировано по DB-only runtime cleanup

- emergency admin вынесен в изолированный auth/emergency path:
  - логин fallback сохранён;
  - emergency identity больше не materialize-ится в `users` storage и не загрязняет business lists;
- `admin/users` больше не может показывать единственного локального demo admin вместо реальных DB users;
- PM runtime выровнен под DB-only contract:
  - `projectsRepository` и `tasksRepository` переведены на async DB-backed path;
  - task activity больше не читает comments из `memory.TASK_COMMENTS`;
  - PM tasks page/API больше не подставляют fake project / fake current user fallback;
- performers/catalog author route выровнены:
  - `/p/:handle` больше не fallback-ит в marketplace catalog author shell;
  - если нет публичного `performer_profile`, route честно возвращает `notFound()`;
- invites runtime выровнен:
  - org/project invites читаются из DB-backed repositories;
  - invite threads убраны из обычного runtime и заменены maintenance response `INVITE_THREADING_UNAVAILABLE`;
- marketplace local source-of-truth отключён:
  - author publications и seller-management overlays не читают runtime business data из memory;
  - local `favorites/cart/inquiries` persist выключен, UI показывает maintenance/disabled state;
- unified DB detection выровнен на `POSTGRES_URL ?? DATABASE_URL`;
- test infrastructure приведена в соответствие с DB-backed PM runtime:
  - `resetTestDb()` теперь чистит `pm_*` таблицы и repository caches;
  - DB-backed test suites переведены с emergency admin fixture на обычных test users;
  - увеличен timeout integration-style unit suites, завязанных на live test DB.

### Ключевые решения по DB-only runtime cleanup

- local runtime data для business сущностей не оставляются как silent fallback "на всякий случай";
- если DB-backed path для surface пока не готов, surface должен быть honest non-fake, а не mask real data;
- emergency admin разрешён только как operational auth fallback;
- marketplace publication/cart/favorites/inquiries runtime оставлены disabled до появления настоящего DB-backed контракта.

### DB-only Runtime Docs

- `docs/ROADMAP.md`
- `docs/platform/overview.md`
- `docs/modules/performers/performers-overview.md`
- `docs/modules/projects-tasks/projects-tasks-overview.md`
- `docs/modules/projects-tasks/projects-tasks-access.md`
- `CONTINUITY.md`

### DB-only Runtime Verification

- `pnpm -w typecheck` — успешно
- `pnpm test -- --runTestsByPath apps/web/tests/unit/invites-api.spec.ts --runInBand` — успешно
- **Чек-лист для агента (тестирование и исправления):** `docs/playbooks/agent-testing-handoff.md` — переписан в стабильный handoff-playbook: входной контекст, выбор глубины проверок, доменные regression checks, cross-cutting checks и короткий формат отчёта; временные риски выносить в task-specific addendum, а не в базовый шаблон.
- `pnpm test -- --runInBand --runTestsByPath apps/web/tests/unit/project-chat.spec.ts apps/web/tests/unit/project-files.spec.ts apps/web/tests/unit/task-results.spec.ts apps/web/tests/unit/files-direct-upload.spec.ts apps/web/tests/unit/files-trash-limits.spec.ts` — успешно
- `pnpm test -- --runInBand --detectOpenHandles --runTestsByPath apps/web/tests/unit/invites-api.spec.ts apps/web/tests/unit/notifications.spec.ts apps/web/tests/unit/task-comments-api.spec.ts apps/web/tests/unit/project-chat.spec.ts apps/web/tests/unit/project-files.spec.ts apps/web/tests/unit/task-results.spec.ts apps/web/tests/unit/files-direct-upload.spec.ts apps/web/tests/unit/files-trash-limits.spec.ts apps/web/tests/unit/financeApiRoutes.spec.ts` — локализованы residual open handles: test-only `setInterval` в repository/cache слое и shared Neon/Vercel pool sockets
- `pnpm test -- --runInBand --runTestsByPath apps/web/tests/unit/invites-api.spec.ts apps/web/tests/unit/notifications.spec.ts apps/web/tests/unit/task-comments-api.spec.ts apps/web/tests/unit/project-chat.spec.ts apps/web/tests/unit/project-files.spec.ts apps/web/tests/unit/task-results.spec.ts apps/web/tests/unit/files-direct-upload.spec.ts apps/web/tests/unit/files-trash-limits.spec.ts apps/web/tests/unit/financeApiRoutes.spec.ts` — 9 suite / 85 tests, assertions проходят; post-run warning `Jest did not exit one second after the test run has completed` устранён через test-safe timer guards и per-suite `@vercel/postgres` teardown (`apps/web/tests/setup-after-env.js`)

<!-- STOP LINE: ACTIVE CONTEXT ENDS -->

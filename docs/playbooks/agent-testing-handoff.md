# Agent Testing Handoff

**Статус:** stable  
**Владелец:** engineering  
**Последнее обновление:** 2026-03-15

## Назначение

Этот playbook нужен для передачи следующему агенту задачи на проверку изменений, поиск регрессий и исправление дефектов.

Документ не заменяет user task, acceptance criteria или модульную документацию. Его цель проще:
- быстро собрать обязательный контекст;
- выбрать разумную глубину проверки;
- не забыть про cross-cutting риски;
- вернуть пользователю короткий и проверяемый отчёт.

## Когда Использовать

Используй этот handoff, если:
- агент принимает уже начатую задачу и должен проверить чужие изменения;
- после крупного refactor или migration нужен focused regression pass;
- нужно передать следующему агенту не только “что сделано”, но и “что именно надо проверить и где вероятны поломки”.

Не используй его как вечный backlog, implementation plan или архив конкретного аудита.

## Что Прочитать Перед Стартом

Обязательный минимум:
- `CONTINUITY.md` до `<!-- STOP LINE: ACTIVE CONTEXT ENDS -->`;
- текущий user task или handoff-сообщение;
- `docs/ROADMAP.md`;
- overview-док затронутого модуля;
- diff или список изменённых файлов.

Дополнительно, если затронуты права, telemetry или platform contracts:
- `docs/platform/roles-permissions.md`;
- `docs/platform/analytics-events.md`;
- `docs/platform/overview.md`.

Если задача зависит от актуального API библиотеки или framework behavior, сначала проверь docs через Context7.

## Правило Выбора Глубины Проверки

Не все задачи требуют полного прогона всего репозитория.

### Всегда

- понять, какие user scenarios менялись;
- прогнать релевантный typecheck;
- прогнать точечные тесты по изменённому модулю;
- проверить happy path и 1-2 edge cases для затронутого flow;
- проверить, не забыты ли permissions, analytics, feature flags, docs.

### Обычно Нужно

- `pnpm -w lint` если менялись shared rules, contracts, routing, infra или было много правок;
- `pnpm --filter @collabverse/web build` если менялись Next.js routes, app shell, server components, loaders, metadata;
- `pnpm --filter @collabverse/web run check:routes` если менялись страницы, layout, route groups, redirects;
- `pnpm docs:lint` если менялись markdown-доки;
- `pnpm docs:links` если добавлялись, переносились или переименовывались документы.

### Полный Прогон Перед Merge Или После High-Risk Refactor

- `pnpm -w lint`
- `pnpm -w typecheck`
- `pnpm test`
- `pnpm --filter @collabverse/web build`
- `pnpm --filter @collabverse/web run check:routes`

`pnpm verify` используй только когда действительно нужен максимально широкий предрелизный прогон.

## Базовый Workflow Агента

### 1. Собери Scope Проверки

Зафиксируй:
- что именно менялось;
- какие сценарии являются критичными;
- какие пакеты и маршруты затронуты;
- какие внешние зависимости или feature flags участвуют;
- нужен ли live DB / WebSocket / auth environment.

Если чего-то не хватает, не придумывай бизнес-правила. Явно пометь assumption или `N/A`.

### 2. Прогони Обязательный Минимум

Выбери команды по реальному scope задачи.

Примеры:

```bash
pnpm --filter @collabverse/web typecheck
pnpm --filter @collabverse/api typecheck
pnpm test -- --runInBand --runTestsByPath <spec1> <spec2>
pnpm --filter @collabverse/web build
pnpm --filter @collabverse/web run check:routes
pnpm docs:lint
pnpm docs:links
```

Если task небольшой, точечные проверки важнее “прогнать всё подряд”.

### 3. Проверь Доменные Сценарии

Проверяй только затронутые домены, а не весь продукт без причины.

#### Auth / Session

- логин, логаут, session restore;
- корректный current user в API;
- нет утечки emergency/demo identity в business data.

#### PM: Projects / Tasks

- create / update / archive / delete работают через актуальный persistence path;
- списки и детали не берут fake runtime fallback;
- после мутаций есть cache invalidation или refetch;
- realtime не создаёт дубликаты или stale UI.

#### Invites / Membership

- приглашения читаются из актуального source of truth;
- accept/decline корректно меняют membership и статус;
- schema drift деградирует безопасно, а не через 500 там, где ожидается soft fallback.

#### Public Profiles / Performers

- публичный route честно отдаёт данные только при валидном public contract;
- при отсутствии public profile используется `notFound()`, а не ложный fallback;
- CTA уважают permissions.

#### Marketplace

- seller / publish / apply / orders читают реальный контракт, а не local runtime business state;
- disabled или maintenance surfaces не создают ложных сохранений;
- authorship, manager rights и selected workspace не смешиваются.

### 4. Проверь Cross-Cutting Вещи

Для любого заметного change-set отдельно проверь:
- permissions и role matrix;
- analytics events и отсутствие тихих breaking changes в telemetry;
- feature flags и honest fallback при выключенной функции;
- data contracts, enum values и API payloads;
- cache invalidation;
- exactOptionalPropertyTypes;
- очистку `undefined` из Zod payloads перед сервисами и репозиториями;
- отсутствие необоснованных `any` и `@ts-expect-error`.

### 5. Исправь Найденные Ошибки И Синхронизируй Docs

Если во время проверки сделаны fixes, не забудь:
- обновить `docs/ROADMAP.md`, если изменился статус работ;
- обновить overview-док модуля, если поменялось поведение или контракт;
- обновить `docs/platform/roles-permissions.md` и `docs/platform/analytics-events.md`, если изменились права или telemetry;
- обновить `CONTINUITY.md`, если задача была заметной и следующий агент должен понимать текущую точку остановки.

## Task-Specific Addendum

Если handoff относится к конкретному эпiku или audit pass, добавь перед запуском короткий блок:

```md
## Task-Specific Focus

- Контекст: <что именно проверяем>
- Критичные сценарии:
  - <scenario 1>
  - <scenario 2>
  - <scenario 3>
- Известные риски:
  - <risk 1>
  - <risk 2>
- Ограничения окружения:
  - <например, нет локальной БД или выключен WebSocket>
```

Такой блок полезен. Огромный список временных деталей внутри основного playbook обычно только устаревает.

## Формат Отчёта Пользователю

Отчёт должен быть коротким и проверяемым.

Укажи:
- что именно проверено;
- какие команды запускались;
- что найдено и что исправлено;
- что не проверялось и почему;
- какие риски или follow-up остались.

Шаблон:

```md
## Проверено
- ...

## Исправлено
- ...

## Не Проверялось
- ... — причина

## Остаточные Риски
- ...
```

## Антипаттерны

Не надо:
- слепо запускать весь verify pipeline для любой маленькой правки;
- дублировать сюда временный контекст конкретной миграции;
- превращать handoff в длинный prompt про “лайфхаки” и “опыт аналогичных проектов”;
- писать “всё ок”, если часть сценариев не проверялась из-за окружения;
- придумывать новые продуктовые правила по ходу тестирования.

## Короткий Вывод

Хороший testing handoff должен отвечать на четыре вопроса:
- что читать;
- что запускать;
- что проверить руками;
- как отчитаться.

Если документ не помогает быстрее ответить на эти вопросы, его нужно упростить.

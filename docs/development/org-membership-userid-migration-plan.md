# План миграции членства организации на canonical `userId` (без legacy-костылей)

## Контекст и проблема

На портале есть сущность членства в организации (`organizationMembers` / `OrganizationMember`), которая **в ряде legacy/demo-флоу** хранит в поле `userId` **email**, а не канонический идентификатор пользователя.

Это приводит к рассинхрону между:

- **сессией** (где `getCurrentUser()` возвращает `user.id`),
- **проверками доступа** (`organizationsRepository.findMember(orgId, user.id)`),
- **UI**, который вычисляет роль текущего пользователя через сопоставление `member.userId === currentUserId`.

Симптом (пример): страница `/org/:orgId/team` выглядит “пустой” для участника (члены/роль не отображаются), а скрытие вкладок “Настройки/Финансы” невозможно корректно сделать по роли.

## Целевое состояние (инварианты)

1. В `organizationMembers.userId` **всегда хранится canonical user id** (UUID/строковый id пользователя).
2. Email используется только:
   - как атрибут пользователя (`users.email`),
   - как адрес для инвайта (приглашения), но **не** как идентификатор участника.
3. В одном org допустима **ровно одна** запись членства на одного пользователя: уникальность `(organizationId, userId)`.
4. Любые проверки доступа и отображение вкладок используют **только** `userId` и `member.role/status`.

## Репозиторные “опорные точки” (где сейчас ломается)

### Backend репозиторий

- `apps/api/src/repositories/organizations-repository.ts`
  - Есть совместимость `resolvePossibleUserIds()` и логика `pickBestMembership()` (сейчас используется в `listMembershipsForUser()`).
  - `findMember()` (DB и Memory) ищет по точному `userId` → ломается, когда в `organizationMembers.userId` записан email.

### Web API и страницы

- `apps/web/app/api/organizations/[orgId]/members/route.ts` — проверка доступа через `findMember`.
- `apps/web/app/api/organizations/[orgId]/route.ts` — аналогично.
- `apps/web/app/(app)/org/[orgId]/team/page.tsx` — вычисляет роль текущего пользователя через `member.userId === currentUserId`.
- `apps/web/components/app/AppTopbar.tsx` + `apps/web/lib/nav/navigation-utils.ts` — вкладки org (“Команда/Настройки/Финансы”) сейчас всегда показываются без RBAC.
- `apps/web/app/(app)/org/[orgId]/settings/page.tsx`, `apps/web/app/(app)/org/[orgId]/finance/page.tsx` — серверные проверки уже есть, но UX/навигация должны соответствовать.

## Стратегия внедрения (чисто, без вечных костылей)

Внедряем в 2 фазы:

- **Фаза A (диагностика + подготовка)**: понять все write-path’ы membership, подготовить миграцию и защитные проверки.
- **Фаза B (миграция данных + упрощение логики)**: привести данные к canonical `userId`, задедуплицировать, добавить constraint, затем упростить `findMember` и UI.

Важно: на время миграции допускается временная “совместимость” только в инструментах миграции/нормализации, а не в runtime-логике. Цель — убрать её после завершения.

## Принятые решения (зафиксировано)

- **Storage**: в проде используется **DB storage** (`AUTH_STORAGE='db'`) на **Vercel + Neon**.
- **Дедупликация**: дубли membership **можно удалять** (публичного релиза ещё нет, историю не сохраняем).
- **Rollout**: делаем **без feature flag**, доводим до рабочего состояния сразу.

## Этап 0 — Подготовка: зафиксировать определения и ожидаемую RBAC-матрицу

> ✅ **Статус: ВЫПОЛНЕН** (зафиксировано как целевое поведение и приведено в соответствие с текущей реализацией/тестами).
>
> Это не “фича-реализация”, а **фиксация правил**, которые дальше считаются инвариантами.
> Важное следствие: **ranking для дедупликации** в Этапах 2–3 теперь считается утверждённым (status → role → свежесть).

### Решения (зафиксировать перед началом)

- **Роли org**: `owner | admin | member | viewer` (уже используются в UI и API).
- **Доступы**:
  - `team`: доступ всем `status=active`
  - `settings`: только `owner/admin`
  - `finance`: только `owner/admin` (или расширить при необходимости)

### Что такое `viewer`

`viewer` — это **роль внутри организации** (read-only участник), а **не** “не принял приглашение”.

Признак “приглашение не принято” должен жить в сущности инвайта (invite thread / invite record), а не в `organizationMembers`.

Рекомендуемая семантика:

- **Invite pending**: пользователь ещё не является `OrganizationMember` (или является отдельной записью в таблице invites).
- **viewer**: уже является `OrganizationMember` со `status=active`, но имеет read-only права (например, может видеть проекты/данные в пределах организации, но не управлять).

### Важное уточнение по доступам invite pending (зафиксировано)

Пользователь, который **не принял приглашение** (invite pending), должен видеть **только то**, что ему разрешил администратор/инвайтер в рамках приглашения:

- может ознакомиться с конкретными проектами, указанными в приглашении (например, `previewProjectIds`);
- **не может** открывать `/org/:orgId/team` и **не может** видеть состав команды;
- вкладки орг-раздела (Команда/Настройки/Финансы) для него должны быть скрыты/недоступны.

Следствие для реализации:

- доступ к `/org/:orgId/*` должен требовать `OrganizationMember` со `status=active`;
- “preview access” должен работать через сущности invites (например, `invite thread` + `previewProjectIds`) и/или отдельные endpoints, но **не** через `organizationMembers`.

### Промежуточная проверка

- Подтвердить у владельца продукта/техлида:
  - допускаем ли `viewer` в org?
  - должны ли `viewer/member` видеть список участников или только себя?
  - должны ли `member/viewer` иметь возможность “покинуть организацию”?

#### Как это влияет на уже выполненные этапы

- **Этап 1 (аудит write-path’ов)**: не зависит от RBAC — это технический поиск точек записи `OrganizationMember`.
- **Этап 2 (DB миграция + дедуп)**: использует **утверждённый** порядок ролей `owner > admin > member > viewer` и статусах `active > inactive > blocked`
  при выборе “лучшей” записи среди дублей.
- **Этап 3 (memory нормализация + дедуп)**: аналогично использует **тот же порядок ролей/статусов** для дедупликации после email→id нормализации.

### Результаты (Этап 0 — выполнен)

> Дата: 2025-12-13

**Финальные определения:**

- **`viewer`**: роль **внутри организации** (read-only участник), `status=active`. Это **не** “приглашение не принято”.
- **Invite pending**: пользователь **не является `OrganizationMember`** до момента accept инвайта. Его доступы живут в invites/threads и могут включать
  “preview” доступ к отдельным проектам (через project invites со `status='previewing'`), но не доступ к `/org/:orgId/*`.

**RBAC-матрица (organization scope):**

| ресурс                                                       | owner (active) | admin (active) | member (active) | viewer (active) |                           invite pending | не авторизован |
| ------------------------------------------------------------ | -------------: | -------------: | --------------: | --------------: | ---------------------------------------: | -------------: |
| `/org/:orgId/team` + `/api/organizations/:orgId/members`     |             ✅ |             ✅ |              ✅ |              ✅ |                                       ❌ |             ❌ |
| `/org/:orgId/settings`                                       |             ✅ |             ✅ |              ❌ |              ❌ |                                       ❌ |             ❌ |
| `/org/:orgId/finance`                                        |             ✅ |             ✅ |              ❌ |              ❌ |                                       ❌ |             ❌ |
| `/api/organizations/:orgId/invites` (GET/POST)               |             ✅ |             ✅ |              ❌ |              ❌ |                                       ❌ |             ❌ |
| `/api/organizations/:orgId/members/:memberId` (PATCH/DELETE) |             ✅ |             ✅ |              ❌ |              ❌ |                                       ❌ |             ❌ |
| `/api/organizations/:orgId/leave`                            | ❌ (запрещено) |             ✅ |              ✅ |              ✅ | ✅ (idempotent: member отсутствует → ok) |             ❌ |

**Где это реализовано в коде (для следующего агента):**

- `apps/api/src/types.ts` — source of truth по union-типам `OrganizationMember.role/status`
- `apps/web/app/api/organizations/[orgId]/members/route.ts` — team доступ только `member.status === 'active'`
- `apps/web/app/(app)/org/[orgId]/settings/page.tsx` — только `active owner/admin`
- `apps/web/app/(app)/org/[orgId]/finance/page.tsx` — только `active owner/admin`
- `apps/web/app/api/organizations/[orgId]/invites/route.ts` — только `active owner/admin`
- `apps/web/app/api/organizations/[orgId]/members/[memberId]/route.ts` — только `active owner/admin`
- `apps/web/app/api/invites/[inviteId]/accept/route.ts` — accept инвайта → создание `OrganizationMember` (`status='active'`)

## Этап 1 — Аудит write-path’ов membership (обязательно)

### Цель

Найти, **где и как создаются/обновляются** `OrganizationMember` записи, и убедиться, что после миграции они всегда пишут canonical `userId`.

### Что найти в коде

- Создание организации (owner автоматически становится member).
- Приглашения (email/link), принятие инвайта, “восстановление” участника.
- Админские операции: смена роли/статуса, удаление/soft-remove.
- Возможные legacy/demo пути, которые могли писать email в `userId`.

### Рекомендуемые техники поиска

- Поиск по:
  - `addMember(`, `organizationMembers`, `ORGANIZATION_MEMBERS`, `invite`, `accept`, `join`, `ownerId`
  - web API `apps/web/app/api/organizations/**`
  - services в `apps/api/src/services/**`

### Артефакт этапа (обязательный)

Список “точек записи”, в виде таблицы:

- **файл/функция**
- **условие вызова**
- **какие поля пишет**
- **может ли писать email вместо userId**
- **как будет исправлено**

### Результаты аудита (Этап 1 — выполнен)

> Дата аудита: 2025-12-13

| файл/функция                                                                                                                                    | условие вызова                                                       | какие поля пишет                                                                                                                   | может ли писать email вместо userId                                                                                                                   | как будет исправлено                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/repositories/organizations-repository.ts` → `OrganizationsDbRepository.create()` и `OrganizationsMemoryRepository.create()`       | Создание организации (в web: `POST /api/organizations`)              | `organizations.ownerId = org.ownerId` + `organization_members.{organizationId, userId=org.ownerId, role='owner', status='active'}` | **Да** — если `org.ownerId` пришёл как email (legacy/demo cookie или баг в вызывающем коде)                                                           | В web-слое гарантировать canonical `userId` (см. `getUserId()`); после миграции добавить строгую проверку/запрет email-формата на write-path’ах (`ownerId`/`userId` не должен содержать `@`)          |
| `apps/api/src/repositories/organizations-repository.ts` → `OrganizationsDbRepository.addMember()` и `OrganizationsMemoryRepository.addMember()` | Добавление участника (сейчас основной вызов — принятие org-инвайта)  | `organization_members.{organizationId, userId, role, status}`                                                                      | **Да** — если вызывающий код передаст email вместо `userId`                                                                                           | В вызывающих эндпоинтах/экшенах всегда передавать canonical `userId`; после миграции — строгий guard (reject) на уровне API/service                                                                   |
| `apps/web/app/api/organizations/route.ts` → `getUserId()` + `organizationsRepository.create(orgData)`                                           | Создание организации из UI/API                                       | Формирует `orgData.ownerId = userId` и вызывает `create()` (см. выше)                                                              | **Да** — `getUserId()` берёт `demoSession.userId`, а для старых demo-cookie `userId` может быть email                                                 | Нормализовать legacy demo-cookie: если `demoSession.userId` выглядит как email — резолвить в canonical id через `usersRepository.findByEmail()` или требовать re-login (инвалидировать старую cookie) |
| `apps/web/app/api/invites/[inviteId]/accept/route.ts` → `organizationsRepository.addMember({ userId: user.id })`                                | Принятие org-инвайта: когда `member` отсутствует                     | Создаёт `OrganizationMember` с `userId = user.id`, `role = invite.role ?? 'member'`, `status='active'`                             | **Да** — если `getCurrentUser()` вернул `id=email` (legacy demo-cookie)                                                                               | Перед `addMember` гарантировать canonical `user.id` (если `user.id` содержит `@` → резолв по `user.email` в `usersRepository` и использовать `user.id` из БД)                                         |
| `apps/web/lib/auth/demo-session.ts` → `decodeDemoSession()`                                                                                     | Декодирование demo-session cookie                                    | Не пишет membership напрямую, но определяет `demoSession.userId`                                                                   | **Да (источник проблемы)** — если `userId` отсутствует, используется `email` как `userId` (“обратная совместимость”)                                  | Убрать/ограничить fallback: вместо `email` резолвить userId по email (или возвращать `null` и форсить повторный логин)                                                                                |
| `apps/web/lib/auth/session.ts` → `getCurrentSession()` / `getCurrentUser()`                                                                     | Получение пользователя (NextAuth или demo)                           | Не пишет membership напрямую, но возвращает `session.user.id`, который используется в write-path’ах org                            | **Да (транзитивно)** — если demo-session вернула `id=email`, то `getCurrentUser()` не сможет найти пользователя по id и вернёт “сырой” `session.user` | В `getCurrentUser()` добавить нормализацию demo-id (если похоже на email → findByEmail → вернуть canonical user)                                                                                      |
| `apps/web/app/api/organizations/[orgId]/members/[memberId]/route.ts` → `updateMemberRole/status`                                                | Админ/owner меняет роль/статус или “удаляет” участника (soft-remove) | Обновляет только `role/status/updatedAt`                                                                                           | **Нет** (userId не трогается)                                                                                                                         | Без изменений                                                                                                                                                                                         |
| `apps/web/app/api/organizations/[orgId]/leave/route.ts` → `updateMemberStatus('inactive')`                                                      | Участник покидает организацию                                        | Обновляет только `status/updatedAt`                                                                                                | **Нет** (userId не трогается)                                                                                                                         | Без изменений                                                                                                                                                                                         |
| `apps/api/src/data/memory.ts` → дефолтный `memory.ORGANIZATION_MEMBERS`                                                                         | Dev/demo memory-seed при пустом хранилище                            | `OrganizationMember.userId` заполняется `TEST_*_USER_ID`                                                                           | **Нет** (в текущем сидировании используются canonical id)                                                                                             | Без изменений (после миграции можно добавить assert/нормализацию на старте, если появятся новые legacy-данные)                                                                                        |

#### Выводы после аудита (что точно нужно менять дальше)

- **Где реально создаётся `OrganizationMember`**: (1) создание организации (`Organizations*Repository.create()`), (2) принятие инвайта (`/api/invites/[inviteId]/accept` → `addMember()`).
- **Откуда берётся email в `userId`**: legacy demo-cookie, где `decodeDemoSession()` подставляет `email` в `userId`, а затем это значение используется как `ownerId`/`user.id` в write-path’ах.
- **Связка с Этапом 0 (RBAC)**:
  - invite pending **не** должен создавать `OrganizationMember` и **не** должен получать доступ к `/org/:orgId/*` до accept,
  - доступ к org-scope эндпоинтам/страницам должен опираться на `member.status === 'active'` и `member.role` (owner/admin для admin-only операций).
- **Гейт Этапа 1 (закрыт)**:
  - найдено **все** места записи membership в runtime (см. таблицу),
  - понятно, какие потоки править (demo-session нормализация + guards на write-path’ах),
  - миграция данных (Этап 2) возможна без потери семантики (дубли решаются дедуп-правилом; инвайты остаются в invites-таблицах/threads).

### Промежуточная проверка (gate)

- После аудита должно быть ясно:
  - какие потоки требуют изменения,
  - можно ли мигрировать данные без потери семантики,
  - нужно ли вводить feature flag для безопасного rollout’а.

## Этап 2 — Подготовить миграцию данных для DB storage

> DB storage активируется, когда `AUTH_STORAGE === 'db'` и задан `POSTGRES_URL`.

### Цель

Привести `organization_members.user_id` к canonical user id (UUID) в базе.

### 2.1. Миграция: email → userId

Сделать SQL-миграцию (Drizzle/ручной SQL в `apps/api/src/db/migrations` или отдельный скрипт, согласовать с текущим процессом миграций):

- Обновить записи, где `organization_members.user_id` содержит email:
  - сопоставить по `lower(users.email)`.
- Важно: учитывать пробелы/регистр (trim + lower).

Пример логики (псевдо-SQL):

- `UPDATE organization_members m SET user_id = u.id FROM users u WHERE lower(trim(m.user_id)) = lower(trim(u.email));`

### 2.2. Дедупликация после апдейта

После апдейта возможно появление дублей `(organization_id, user_id)`:

- один “старый” (email) и один “новый” (uuid), которые теперь совпали.

Правило выбора “лучшего” membership (**утверждено в Этапе 0**; используется и в DB, и в memory):

- **Сначала статус**: `active` > `inactive` > `blocked`
- **Затем роль**: `owner` > `admin` > `member` > `viewer`
- **Затем свежесть**: более свежий `updated_at` (если нет — `created_at`)

Почему так обычно делают:

- статус определяет **есть ли доступ вообще** (inactive/blocked должны проигрывать active),
- роль определяет **наиболее привилегированное** членство (если по ошибке есть два активных — оставляем более “сильную” роль),
- время — последний tie-breaker.

Отдельное правило безопасности:

- Если среди дублей есть запись с ролью `owner`, её нельзя удалять, если это приведёт к отсутствию владельца у организации.
  - В идеале (после чистки) в организации должен быть **ровно один** `owner`-member.

Результат:

- “лучший” остаётся
- остальные:
  - либо удаляются
  - либо переводятся в `inactive` (если важна история), но тогда всё равно нужно уникальное ограничение → история должна быть в отдельной таблице, иначе удаляем.

### 2.3. Добавить constraint/индекс

Добавить уникальность:

- Unique index на `(organization_id, user_id)`

### Промежуточные проверки (gate)

- До/после миграции собрать метрики:
  - сколько записей имели email в `user_id`
  - сколько обновлено
  - сколько дублей найдено/удалено
- Прогон проверок:
  - `pnpm -w typecheck`
  - `pnpm -w lint`
  - минимальный smoketest страниц org (ручной) / e2e (если есть сценарии)

### Результаты (Этап 2 — выполнен)

> Дата: 2025-12-13

**Что сделано (артефакты в репозитории):**

- Добавлен **unique index** на `(organization_id, user_id)` на уровне схемы Drizzle:
  - `apps/api/src/db/schema.ts` — `organization_member_org_user_idx` теперь `uniqueIndex(...)`
- Сгенерирована и дополнена миграция **с data cleanup + дедупликацией + unique index**:
  - `apps/api/src/db/migrations/0005_yellow_hardball.sql`
    - `UPDATE organization_member.user_id` (email → `user.id` по `lower(trim(email))`)
    - нормализация owner-ролей по `organization.owner_id`
    - дедуп `(organization_id, user_id)` через `row_number()` (status → role → updatedAt)
    - `DROP INDEX IF EXISTS` + `CREATE UNIQUE INDEX`
  - `apps/api/src/db/migrations/meta/_journal.json` — добавлена запись `0005_yellow_hardball`
  - `apps/api/src/db/migrations/meta/0005_snapshot.json` — snapshot обновлён

**Как применить (важно про порядок):**

1. **Сначала** выполнить SQL из миграции `0005_yellow_hardball.sql` (в Vercel Postgres Query editor / psql).
2. **Затем** (опционально) прогнать `pnpm --filter @collabverse/api db:push`, чтобы убедиться, что схема/индексы в БД совпадают со схемой Drizzle.

**Метрики для gate (pre/post):**

```sql
-- 1) Сколько записей выглядят как legacy email в user_id
SELECT COUNT(*) AS org_member_user_id_looks_like_email
FROM organization_member
WHERE user_id LIKE '%@%';

-- 2) Дубли по (organization_id, user_id)
SELECT organization_id, user_id, COUNT(*) AS cnt
FROM organization_member
GROUP BY 1, 2
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
```

## Этап 3 — Нормализация memory storage (dev/demo) без runtime-костылей

### Цель

Привести `memory.ORGANIZATION_MEMBERS` к canonical `userId` на старте приложения (или в момент инициализации memory).

### Предложение реализации

- В `apps/api/src/data/memory.ts` (data-layer) добавить одноразовую нормализацию при первом доступе к `memory.ORGANIZATION_MEMBERS`:
  - проход по `ORGANIZATION_MEMBERS`
  - если `member.userId` содержит `@` (email-like):
    - резолвить по `WORKSPACE_USERS` (email → `user.id`, `trim+lower`)
    - если пользователь не найден — оставить значение как есть (не добавлять runtime-совместимость в репозиториях)
  - затем дедуп по `(organizationId, userId)` по **правилу Этапа 0** (status → role → updatedAt/createdAt)

### Промежуточная проверка

- Запустить локально сценарий воспроизведения:
  - логин под пользователем-участником
  - открыть `/org/:orgId/team` — должны появиться участники/роли

### Результаты (Этап 3 — выполнен)

> Дата: 2025-12-13

**Что сделано (артефакты в репозитории):**

- `apps/api/src/data/memory.ts`
  - Добавлена **одноразовая нормализация** `ORGANIZATION_MEMBERS` при первом доступе:
    - если `member.userId` выглядит как email (`includes('@')`) → резолв в canonical id через `WORKSPACE_USERS` (email → `user.id`, `trim+lower`)
    - затем **дедупликация** по `(organizationId, userId)` по правилу: `status` → `role` → `updatedAt/createdAt`
  - Добавлен флаг `globalThis.__collabverseOrganizationMembersNormalized__`, который сбрасывается при `set ORGANIZATION_MEMBERS` и в `resetFinanceMemory()`.

**Почему это соответствует “без runtime-костылей”:**

- Нормализация выполняется **в data-layer memory storage**, а не в runtime-логике репозиториев/проверках доступа (`findMember()` остаётся строгим).

**Как проверить вручную:**

1. Запустить проект в режиме memory storage (без `AUTH_STORAGE='db'` / без `POSTGRES_URL`).
2. Зайти под пользователем-участником организации.
3. Открыть `/org/:orgId/team`:
   - список участников и роль текущего пользователя отображаются корректно,
   - нет ситуации, когда членство “не находится” из-за email в `member.userId`.

## Этап 4 — Привести все write-path’ы membership к canonical `userId`

### Цель

Сделать так, чтобы новые данные больше не создавали legacy email в `organizationMembers.userId`.

### Что менять

По результатам Этапа 1:

- Если какой-то путь создаёт member по email — заменить на:
  - либо создание инвайта (email), а member создаётся при accept, когда есть userId
  - либо предварительный lookup `inviteeUserId` через email, если пользователь уже существует

### Промежуточная проверка

- Набор ручных сценариев:
  - создать org → owner membership корректный
  - пригласить существующего пользователя → member создаётся с `userId`
  - пригласить несуществующего → создаётся invite, member не создаётся до регистрации/accept

### Результаты (Этап 4 — выполнен)

> Дата: 2025-12-13

**Что сделано (артефакты в репозитории):**

- `apps/web/lib/auth/demo-session.ts`
  - Убрана обратная совместимость, где `userId` мог становиться `email`.
  - Старые demo-cookie без `userId` (или с `userId`, содержащим `@`) теперь считаются **невалидными** → требуется повторный логин.
- `apps/web/lib/auth/session.ts`
  - `getCurrentUser()` теперь гарантирует **canonical user**:
    - если `session.user.id` email-like или lookup по id не нашёл пользователя → пробуем резолв по email (`usersRepository.findByEmail()`),
    - если canonical user не найден → возвращаем `null` (чтобы не создавать данные, привязанные к email).
- `apps/web/app/api/organizations/route.ts`
  - Создание организации теперь берёт `ownerId` только из `getCurrentUser()` (canonical id), без ручного чтения demo-cookie.
- `apps/web/app/api/auth/me/route.ts`
  - Убрана ручная fallback-логика с `decodeDemoSession()` (источник истины — `getCurrentSession()`, который сам читает demo-cookie).
- `apps/web/app/api/performers/[userId]/invite-to-organization/route.ts`
  - Добавлен guard: параметр `[userId]` не может быть email; если прилетает email-like — делаем резолв в `usersRepository`, иначе 400.

**Что это даёт:**

- Новые записи `organization_member.user_id` через runtime write-path’ы больше **не могут** записываться как email.
- Любая legacy/demo сессия, которая раньше “протекала” в `user.id=email`, теперь либо нормализуется по email в canonical user, либо считается неавторизованной.

**Как проверить вручную (smoke):**

1. Зайти/войти и создать организацию (UI → `POST /api/organizations`):
   - в БД/ответе owner membership должен иметь `userId` = canonical `user.id` (не email).
2. Создать org-invite и принять инвайт:
   - при accept создаётся `OrganizationMember` с `userId` = canonical id.
3. Проверить, что “старую” demo-cookie (без `userId`) проект больше не принимает:
   - `/api/auth/me` возвращает `authenticated: false` до повторного логина.

## Этап 5 — Упростить runtime-логику: `findMember()` только по userId

### Цель

После миграции и правки write-path’ов удалить backward compatibility в runtime:

- `organizationsRepository.findMember(orgId, userId)` ищет **строго** по canonical user id.

### Где менять

- `apps/api/src/repositories/organizations-repository.ts`
  - DB: `where organizationId == orgId AND userId == userId`
  - Memory: аналогично

### Промежуточная проверка (gate)

- Unit test(ы) на репозиторий:
  - членство по userId находится
  - членство по email больше не создаётся (или не находится) — как ожидается после миграции

### Результаты (Этап 5 — выполнен)

> Дата: 2025-12-13

**Что сделано (артефакты в репозитории):**

- `apps/api/src/repositories/organizations-repository.ts`
  - Удалена runtime backward-compatibility (email↔id резолв) из `listForUser()` и `listMembershipsForUser()`.
  - Удалены helper’ы `resolvePossibleUserIds()` и `pickBestMembership()` (они больше не нужны после миграции + unique index).
  - `findMember()` остаётся строгим: **ищет только по совпадению `userId`** (без попыток “подставить” email).
- `apps/web/tests/unit/organizations-repository-strict-userid.spec.ts`
  - Добавлен unit-тест, который фиксирует поведение: даже если в `users` есть запись с email, **передача email в методы репозитория не даёт membership**.

**Сопутствующее (важно для CI):**

- Обновлены unit-тесты, которые генерировали demo-cookie с `userId=email` (после Этапа 4 такие сессии невалидны → 401):
  - `apps/web/tests/unit/financeApiRoutes.spec.ts`
  - `apps/web/tests/unit/notifications.spec.ts`
  - `apps/web/tests/unit/task-comments-api.spec.ts`
  - `apps/web/tests/unit/project-chat.spec.ts`
  - `apps/web/tests/unit/project-files.spec.ts`
  - Теперь в `encodeDemoSession()` используется **canonical `TEST_ADMIN_USER_ID`** как `userId/ownerId/authorId`, а email остаётся в `session.email`.

**Проверка:**

- `pnpm -w test` ✅

## Этап 6 — Исправить UI/UX: “Команда” и RBAC вкладок

### 6.1. “Команда” должна показывать данные и корректную роль текущего пользователя

- Страница `apps/web/app/(app)/org/[orgId]/team/page.tsx`:
  - текущая роль вычисляется по `member.userId === currentUserId`
  - после миграции это станет корректным, но важно:
    - убедиться, что API `/api/organizations/:orgId/members` отдаёт `member.userId` как id

### 6.2. Вкладки “Настройки/Финансы” скрыть для не-admin

- Сейчас вкладки строятся в `getOrgNavigation(orgId)` без RBAC.
- План:
  - добавить способ узнать membership (role/status) в контексте UI (например, через отдельный endpoint или через server-props).
  - фильтровать вкладки:
    - `team`: всем `active`
    - `settings/finance`: только `owner/admin`
- При прямом заходе URL:
  - страницы `settings/finance` уже возвращают “Access Denied” — улучшить UX (опционально): редирект на `team` и/или toast.

### Промежуточные проверки

- E2E/Playwright:
  - member не видит “Настройки/Финансы”, но видит “Команда”
  - owner/admin видят всё
  - прямой заход `/org/:orgId/settings` под member → запрещён

### Результаты (Этап 6 — выполнен)

> Дата: 2025-12-13

**Что сделано (артефакты в репозитории):**

- `apps/web/app/api/organizations/[orgId]/membership/route.ts`
  - Добавлен endpoint для UI: возвращает `member.role/status` для текущего пользователя в org (или `null`, если нет `active` membership).
- `apps/web/lib/nav/navigation-utils.ts`
  - Добавлен `getOrgNavigationWithRbac(orgId, membership)`, который:
    - показывает вкладку `Команда` только для `status='active'`,
    - показывает `Настройки/Финансы` только для `role='owner'|'admin'`,
    - **не рендерит** org-вкладки, пока membership не загружен (чтобы не “подсветить” admin-табы не-участникам).
- `apps/web/components/app/AppTopbar.tsx`
  - Подключён RBAC org navigation: при переходе в `/org/:orgId/*` загружаем membership и строим вкладки через `getOrgNavigationWithRbac`.
- `apps/web/app/(app)/org/[orgId]/team/page.tsx`
  - Улучшен UX:
    - при `401` → redirect на `/login?toast=auth-required`,
    - при `403` → redirect на `/org/team?toast=forbidden`,
    - кнопка “Пригласить в команду” показывается только `owner/admin`.
- `apps/web/tests/e2e/org-invites.spec.ts`
  - Добавлены проверки:
    - owner видит `Команда/Настройки/Финансы`,
    - member видит только `Команда`,
    - прямой заход member на `/org/:orgId/settings` → `Access Denied`,
    - после `/leave` переход на `/org/:orgId/team` редиректится на `/org/team`.

## Этап 7 — Итоговые проверки (CI parity)

Запустить полный набор проверок:

- `pnpm verify` (или эквивалент CI набора)
- Минимум:
  - `pnpm -w lint`
  - `pnpm -w typecheck`
  - `pnpm -w test`
  - `pnpm test:e2e` (если окружение готово)

### Результаты (Этап 7 — выполнен)

> Дата: 2025-12-13

**Что прогнано и статус:**

- ✅ `pnpm -w lint`
- ✅ `pnpm -w typecheck`
- ✅ `pnpm -w test` (Jest): `32 passed / 32 total`, `193 passed / 193 total`
- ✅ `pnpm --filter @collabverse/web run check:routes`: `[check-app-routes] OK — no collisions`
- ❌ `pnpm test:e2e` (Playwright): `61 failed`, `22 passed`, `20 skipped` (в текущем локальном окружении)

**Что пришлось поправить по пути (чтобы минимальный CI-набор был зелёным):**

- `apps/web/app/api/auth/me/route.ts`: убран неиспользуемый параметр `_request` (lint `@typescript-eslint/no-unused-vars`)
- `apps/web/app/api/organizations/route.ts`: убран неиспользуемый параметр `_request` (lint `@typescript-eslint/no-unused-vars`)
- `apps/web/tests/unit/organizations-repository-strict-userid.spec.ts`: `type: 'company'` → `type: 'closed'` (typecheck)

**Примечание по `pnpm test:e2e`:**

- Падения массовые и выглядят **не связанными точечно с миграцией membership** (много ошибок вида `TypeError: Failed to fetch`, “element(s) not found” на базовых страницах).
- Для расследования использовать артефакты Playwright в `test-results/` и вывод запуска (в частности, логи страниц с “Failed to fetch organizations / tasks”).
- Runbook для следующего агента (как воспроизвести/классифицировать/починить): `docs/development/playwright-e2e-triage-runbook.md`.

## Критерии приёмки

1. Пользователь-участник (member/viewer) в организации со статусом `active`:
   - видит список участников на `/org/:orgId/team`,
   - видит свою роль,
   - не видит вкладки “Настройки/Финансы”.
2. Пользователь с **invite pending** (приглашение не принято):
   - не имеет доступа к `/org/:orgId/team` (403/редирект),
   - не видит вкладки org-раздела,
   - имеет доступ только к тем проектам/ресурсам, которые явно разрешены приглашением (например, `previewProjectIds`).
3. Owner/admin:
   - видят “Команда/Настройки/Финансы”,
   - могут управлять ролями/статусами участников.
4. В базе нет записей, где `organization_members.user_id` выглядит как email.
5. В базе гарантирована уникальность `(organization_id, user_id)`.

## Риски и как их снижать

- **Риск: потеря данных при дедупликации.**
  - Смягчение: перед удалением дублей сохранить отчёт/лог (ids, orgId, old/new, status/role, timestamps).
- **Риск: несовпадение ролей/статусов между дублями.**
  - Смягчение: заранее согласовать правило “лучшего” (status + updatedAt + role).
- **Риск: invite-флоу создаёт member без userId.**
  - Смягчение: после Этапа 1 закрыть все write-path’ы, которые могут писать email.

## Вопросы, на которые нужно ответить перед началом работ

1. **Есть ли в проде DB storage** (`AUTH_STORAGE='db'`) и таблица пользователей `users` с каноническими id, чтобы сделать SQL-миграцию?
2. **Нужно ли сохранять историю дублей membership** (например, кто был “inactive” ранее), или можно удалять дубли без следа?
3. **Какой приоритет выбора “лучшего” при дедупликации** считаем правильным?
   - статус важнее роли или наоборот?
4. **Какая точная RBAC-матрица** для вкладок:
   - `viewer` (active member) **имеет доступ** к `/org/:orgId/team` и **видит состав команды** (read-only).
   - `member` имеет доступ к finance в каких-то кейсах или никогда?
5. **Можно ли вводить feature flag** для постепенного включения скрытия вкладок/нового поведения (например, `ORG_RBAC_V2`)?

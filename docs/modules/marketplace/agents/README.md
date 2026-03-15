# Каталог — Пакет документов для субагентов

**Статус:** active  
**Создан:** 2026-03-09  
**Последнее обновление:** 2026-03-09

## Назначение

Этот пакет документов используется lead-агентом для раздачи изолированных workstream-задач.

Правило простое:

- lead-агент работает по `marketplace-implementation-plan.md`;
- каждый субагент получает только один документ из этого пакета;
- после завершения workstream lead-агент принимает результат и обновляет общий ledger.

## Порядок запуска

1. `01-feed-navigation-and-discovery.md`
2. `02-author-profile-and-public-pages.md`
3. `03-publication-and-management.md`
4. `04-apply-flow-and-deal-layer.md`
5. `05-cross-cutting-and-doc-sync.md`

## Общие требования ко всем субагентам

- не переименовывать внутренние `marketplace_*` контракты;
- не ломать `/market/*` маршруты без отдельной фазы миграции;
- не смешивать PM-проекты и публичные публикации;
- не вводить новые статусы, если можно reuse текущие `draft`, `published`, `rejected`;
- до начала работы перечитать `AGENTS.md`, `CONTINUITY.md`, `docs/ROADMAP.md`, `docs/modules/marketplace/marketplace-overview.md`, `docs/modules/marketplace/marketplace-implementation-plan.md`.

## Пакет workstreams

- [Subagent 01 — IA, навигация и discovery-first feed](./01-feed-navigation-and-discovery.md)
- [Subagent 02 — публичная страница автора](./02-author-profile-and-public-pages.md)
- [Subagent 03 — публикация и кабинет автора](./03-publication-and-management.md)
- [Subagent 04 — apply/import flow и secondary deal-layer](./04-apply-flow-and-deal-layer.md)
- [Subagent 05 — cross-cutting sync, QA, docs](./05-cross-cutting-and-doc-sync.md)

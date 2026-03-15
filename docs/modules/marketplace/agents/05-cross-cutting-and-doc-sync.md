# Subagent 05 — Cross-cutting sync, QA и docs

**Статус:** completed  
**Владелец:** lead agent/product/qa  
**Последнее обновление:** 2026-03-09

## Миссия

Закрыть платформенные последствия реорганизации `Каталога` и убедиться, что модуль не остался в противоречивом состоянии.

## Зависимости

- принятые результаты workstreams 01-04.

## Scope

- `docs/ROADMAP.md`;
- `CONTINUITY.md`;
- `docs/README.md`;
- `docs/INDEX.md`;
- `docs/platform/overview.md`;
- проверка прав, аналитики, dashboard impacts, docs sync;
- фиксация residual risks и testing gaps.

## Out of Scope

- реализация продуктовых фаз вместо проверки;
- переоткрытие или пересмотр принятых продуктовых контрактов C1-C4;
- изменение user-facing IA `Каталога`, canonical author-route `/p/:handle`, publish/apply contracts или person-vs-team rules без отдельного нового этапа;
- переименование внутренних analytics namespaces.

## Guardrails

- C5 работает как audit/sync layer, а не как новая продуктовая фаза;
- если найден дефект в C1-C4, его нужно зафиксировать как residual risk или отдельный corrective task, а не незаметно переделывать предыдущие этапы в рамках C5;
- нельзя смешивать PM-проект и public publication;
- нельзя возвращать CTA на discovery-карточки и ломать detail-first discovery contract;
- нельзя публиковать team-owned publication на person-route `/p/:handle`.

## Пошаговая работа

1. Сверить overview/implementation-plan/subagent docs.
2. Сверить `ROADMAP` с реальным статусом фаз.
3. Сверить `CONTINUITY.md` с фактическим handoff-state.
4. Зафиксировать analytics/permissions impact.
5. Зафиксировать testing and rollout checklist.
6. Выписать остаточные риски.

## Артефакты

- синхронизированные индексы и платформенные overview;
- зафиксированные permissions / analytics contracts;
- ручной QA checklist, known gaps и residual risks;
- updated roadmap and continuity;
- summary of open risks.

## DoD

- документация не противоречит сама себе;
- следующий агент может продолжить работу без отдельного устного контекста;
- residual risks и недостающие этапы перечислены явно.

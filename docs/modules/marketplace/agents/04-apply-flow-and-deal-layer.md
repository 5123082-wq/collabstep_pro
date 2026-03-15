# Subagent 04 — Apply/import flow и secondary deal-layer

**Статус:** completed  
**Владелец:** product/backend/finance  
**Последнее обновление:** 2026-03-09

## Миссия

Сохранить существующую reuse-механику каталога и одновременно убрать коммерческий слой со стартового экрана.

## Зависимости

- workstream 03;
- docs по PM-проектам и финансам.

## Scope

- `Использовать в проекте`;
- создание проекта на базе шаблона/готового решения;
- `Запросить адаптацию` для услуг;
- вторичный слой `Корзина и оформление`;
- вторичный слой `Сделки и доступ`.

## Out of Scope

- полноценный escrow;
- миграция на новые payment contracts;
- финальный billing UI.

## Пошаговая работа

1. Зафиксировать reuse-flow для шаблонов.
2. Зафиксировать reuse-flow для готовых решений из PM.
3. Зафиксировать inquiry-flow для услуг.
4. Зафиксировать, где корзина и заказы остаются обязательными, а где нет.
5. Описать связь `Каталог -> PM -> Docs -> Finance`.

## Артефакты

- обновлённые docs по шаблонам, готовым решениям, услугам, корзине и доступу;
- список обязательных интеграций с PM/Finance/Docs.

## Что реализовано

- `Использовать в проекте` для шаблонов и ready solutions теперь открывает project-first flow:
  - создать новый PM-проект;
  - импортировать reusable block в существующий проект;
- corrective bridge-fix для `создать новый проект`:
  - selected organization стала каноническим PM context нового проекта;
  - universal `DEFAULT_WORKSPACE_ID` убран из catalog apply-flow;
  - team path получил минимальный access bridge через `project_members`, без PM redesign;
- apply/import идёт через единый route и не трогает publish-layer C3;
- `Запросить адаптацию` переведён в brief/inquiry modal для шаблонов, готовых решений и услуг;
- `/market/orders` принимает inquiry submissions как secondary deal-layer;
- `/market/cart` остаётся вторичным checkout surface и не перехватывает reuse-flow.

## DoD

- reuse-flow задокументирован как приоритетный;
- услуги ведут в brief/inquiry, а не только в покупку;
- оформление и доступ описаны как secondary surface.

## Handoff Checklist

- выписать аналитические и permission implications для workstream 05;
- перечислить unresolved UX questions.

## Handoff в C5

- analytics contract для apply/import/inquiry ещё не зафиксирован;
- import-rights для team/admin/member требуют отдельного platform-wide permission review;
- inquiry/access/delivery пока не переведены в Finance/Docs contracts и остаются локальным transitional layer.

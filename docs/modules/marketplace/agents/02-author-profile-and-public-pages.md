# Subagent 02 — Публичная страница автора

**Статус:** completed  
**Владелец:** product/frontend/backend  
**Последнее обновление:** 2026-03-09

## Миссия

Сделать `/p/:handle` канонической публичной страницей автора каталога и не вводить для этого новую несогласованную author-сущность.

Этап принят после доработки safe author attribution: ложная PM-based author attribution через `project.ownerId` убрана из public author-page.

## Итоговое состояние C2

- `/p/:handle` зафиксирован как canonical author-page для карточек каталога;
- author-page в Phase 1 reuse-ит `performer_profile`, `handle` и `isPublic`;
- добавлен блок `Решения автора`;
- в блок попадают только публичные сущности каталога;
- PM-based `MarketplaceListing` не попадают в блок, если автор выводится только через `project.ownerId`; в текущем C2 они скрыты на author-page до C3;
- `/market/seller` оставлен приватным кабинетом управления публикациями;
- добавлен fallback author-shell по тому же `handle`, чтобы карточки из C1 не вели в тупик, даже если performer-profile ещё не публичен или discovery пока работает на mock/demo данных.

## Явно зафиксированные решения

### Где управляется `handle`

- `/settings/performer`
- source of truth: `performer_profile.handle`

### Где управляется публичность страницы автора

- расширенный author-profile layer управляется `performer_profile.isPublic`
- сами публикации управляют своей публичностью отдельно и на страницу автора попадают только в public state

### Как C3 получает список публикаций автора

- временное safe rule C2: PM-based `MarketplaceListing` не используется как source для author-page, если авторство выводится только через `project.ownerId`
- temporary demo source: текущие mock/public catalog items, сгруппированные по `handle`
- C3 должен собрать это в единый author-publications query с явным author contract

### Как маппится mock/demo author

- canonical author id в discovery Phase 1: `seller.handle`
- если живой публичный `performer_profile` ещё не найден или выключен, `/p/:handle` показывает минимальную author-shell по тому же `handle`
- это fallback, а не новая модель

### Что обязательно в первом экране

- имя автора
- `@handle`
- краткая identity-summary
- `Решения автора`

### Что остаётся progressive layer

- портфолио
- кейсы
- отзывы
- дополнительные trust signals и author-facing controls

## Проверка DoD

- клик по автору из каталога имеет один canonical target
- author-page не дублирует `/market/seller`
- никакая PM-based публикация не показывается на author-page с недостоверным авторством
- приватные PM-проекты не попадают в public layer
- reuse текущего `performer_profile` зафиксирован как Phase 1 решение

## Handoff Note для C3

1. Построить единый author-publications source для `MarketplaceListing`, шаблонов и услуг.
2. Добавить author-facing visibility controls для страницы автора.
3. Убрать временную зависимость от demo aggregation там, где появляются реальные publish records.
4. Сохранить `/p/:handle` единственной canonical author surface.
5. Зафиксировать author entity каталога как человека или команду; это обязательный design/input topic следующего этапа.

## Следующий практический шаг оркестратора

Corrective task по discovery-карточкам C1 завершён 2026-03-09:

- плитки `Шаблоны`, `Готовые решения`, `Услуги` упрощены;
- CTA убраны из ленты и оставлены только в detail surface;
- строка автора и demo-метрики `лайки / просмотры / использования` добавлены без нового backend/source.

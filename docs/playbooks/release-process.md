# Release Process

**Статус:** stable  
**Владелец:** engineering  
**Создан:** 2026-01-06  
**Последнее обновление:** 2026-03-08

## Назначение

Этот документ описывает процесс релиза и то, как при релизе синхронизируются `ROADMAP`, модульные overview-документы, implementation plans, `CONTINUITY` и `changelog`.

> **См. также:**
> - [Docs PR Checklist](./docs-pr-checklist.md)
> - [Agent Docs Guide](./agent-docs-guide.md)
> - [Documentation Rules](../../.cursor/rules/documentation.mdc)

## Роли Документов В Релизном Процессе

- `docs/ROADMAP.md` — что было запланировано и какой у этого статус реализации.
- `docs/modules/<module>/<module>-overview.md` — как выглядит актуальное состояние модуля.
- `docs/modules/<module>/<module>-implementation-plan.md` — подробные этапы, если они ведутся отдельно.
- `CONTINUITY.md` — актуальный рабочий handoff во время реализации.
- `docs/platform/changelog.md` — что реально вышло.

## 1. Перед Релизом

### Синхронизировать Реальный Статус Реализации

- обновить `docs/ROADMAP.md`;
- обновить соответствующий `docs/modules/<module>/<module>-overview.md`;
- обновить `docs/modules/<module>/<module>-implementation-plan.md`, если такой файл существует;
- обновить `CONTINUITY.md`, если нужно завершить active handoff по большой задаче.

### Проверить Cross-Cutting Docs

- `docs/platform/roles-permissions.md`
- `docs/platform/analytics-events.md`
- `docs/platform/overview.md`
- `docs/README.md` и `docs/INDEX.md`, если менялась навигация или карта docs

## 2. В Момент Релиза

- создать или обновить запись в `docs/platform/changelog.md`;
- использовать раздел `Unreleased` или версионированную запись `## [Версия] - YYYY-MM-DD`;
- указывать конкретные shipped changes.

## 3. После Релиза

- убедиться, что `ROADMAP` не противоречит changelog;
- архивировать временные планы и stage reports, если они больше не нужны как активные документы;
- при необходимости обновить `CONTINUITY.md`, если active handoff завершён и контекст можно убрать из верхней active-section.

## Связь ROADMAP, CONTINUITY И Changelog

- `ROADMAP` отвечает на вопрос: что планировалось и в каком статусе находится реализация?
- `CONTINUITY` отвечает на вопрос: где остановилась текущая активная работа?
- `changelog` отвечает на вопрос: что уже реально вышло?

## Минимальный Релизный Чеклист

- [ ] `ROADMAP` синхронизирован
- [ ] module overview синхронизирован
- [ ] implementation plan синхронизирован, если существует
- [ ] `CONTINUITY.md` больше не содержит устаревший active handoff
- [ ] `changelog` отражает shipped changes
- [ ] cross-cutting docs обновлены, если менялись права, события или структура платформы

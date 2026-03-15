# Руководство По Работе С Документацией

**Статус:** stable  
**Владелец:** product + engineering  
**Создан:** 2026-01-07  
**Последнее обновление:** 2026-03-08

## Назначение

Это практическое руководство по обновлению документации при реализации фич, изменении планов и синхронизации статусов между `ROADMAP`, модульными overview-документами, implementation plans, `CONTINUITY` и `changelog`.

> **См. также:**
> - [Docs PR Checklist](./docs-pr-checklist.md)
> - [Agent Docs Guide](./agent-docs-guide.md)
> - [Documentation Rules](../../.cursor/rules/documentation.mdc)

## Структура Документации

```text
docs/
├── platform/
│   ├── overview.md
│   ├── glossary.md
│   ├── roles-permissions.md
│   ├── analytics-events.md
│   ├── vision-scope.md
│   └── changelog.md
├── modules/
│   ├── <module>/
│   │   ├── <module>-overview.md
│   │   ├── <module>-implementation-plan.md   # опционально
│   │   └── <module>-<feature>.md
├── architecture/
├── playbooks/
└── ROADMAP.md
```

## Роли Документов

- `docs/ROADMAP.md` — планы и статусы реализации.
- `docs/modules/<module>/<module>-overview.md` — текущее состояние модуля.
- `docs/modules/<module>/<module>-implementation-plan.md` — детализация этапов и зависимостей.
- `CONTINUITY.md` — активный handoff текущей работы.
- `docs/platform/changelog.md` — только релизная история.

## Как Обновлять Module Overview

Файл: `docs/modules/<module>/<module>-overview.md`

Обновляй его, когда:
- появляется новая capability;
- меняется статус существующей функции;
- появляются новые user scenarios;
- меняется связка с другими модулями.

Обычно проверяются секции:
- `Purpose`
- `Key objects`
- `Top user scenarios`
- `Functional catalog`
- `Implementation status`
- `TODO / Future improvements`

## Как Обновлять Module Implementation Plan

Файл: `docs/modules/<module>/<module>-implementation-plan.md`

Используй его для крупных реализаций с этапами, зависимостями и DoD.

При старте этапа:
- меняй `⏳` на `🔄`;
- ставь дату начала.

При завершении этапа:
- меняй `🔄` на `✅`;
- ставь дату завершения.

Если плана нет, не создавай его автоматически без необходимости. Для небольшой фичи достаточно `ROADMAP + overview`.

## Как Обновлять ROADMAP

Файл: `docs/ROADMAP.md`

Используй как master-документ статусов.

### Когда Добавлять Запись

- новая идея;
- новый этап крупной фичи;
- изменение приоритета или зависимости;
- переход статуса `planned → in progress → done`.

### Что Должно Быть В ROADMAP

- статус;
- приоритет;
- дата начала и завершения;
- зависимость, если есть;
- future improvements по модулю.

## Как Обновлять CONTINUITY

Файл: `CONTINUITY.md`

Используй только для активного контекста текущей работы.

Правила:
- читать и обновлять по умолчанию только часть выше `STOP LINE`;
- фиксировать только актуальные факты, open threads и handoff-состояние;
- не складывать туда всю историю развития фичи;
- исторические continuity snapshots хранить в `docs/archive/continuity/`.

## Как Обновлять Changelog

Файл: `docs/platform/changelog.md`

Обновляй только если изменение реально вышло или оформляется в release-ready `Unreleased`.

Не используй changelog для:
- backlog;
- статусной доски реализации;
- handoff-заметок;
- незавершённых идей.

## Cross-Cutting Обновления

При изменении поведения фичи проверь:
- `docs/platform/roles-permissions.md` — если меняются права;
- `docs/platform/analytics-events.md` — если меняются события;
- `docs/platform/overview.md` — если меняется карта модулей;
- `docs/README.md` и `docs/INDEX.md` — если появляется новый модуль или новая точка входа в документацию.

## Пример Lifecycle

### Новая Идея

- добавить в `ROADMAP`;
- при module-specific контексте добавить в `TODO / Future improvements` overview-документа.

### Начало Реализации

- поставить `🔄` в `ROADMAP`;
- обновить overview-документ;
- обновить детальный plan, если он есть;
- обновить `CONTINUITY.md`.

### Пауза

- оставить честный статус в `ROADMAP`;
- записать точку остановки в `CONTINUITY.md`.

### Завершение

- поставить `✅` в `ROADMAP`;
- обновить overview, поддоки и implementation plan;
- обновить cross-cutting docs;
- обновить `CONTINUITY.md`.

### Релиз

- добавить запись в `changelog`.

## Проверка Перед Завершением

- [ ] правильный модульный overview обновлён
- [ ] `ROADMAP` отражает реальный статус
- [ ] `*-implementation-plan.md` синхронизирован, если существует
- [ ] `CONTINUITY.md` отражает актуальный handoff
- [ ] `changelog` обновлён только для реально выпущенных изменений
- [ ] метаданные и ссылки актуальны

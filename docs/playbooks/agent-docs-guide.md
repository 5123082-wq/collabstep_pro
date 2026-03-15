# Руководство Для AI Агентов По Обновлению Документации

**Статус:** stable  
**Владелец:** product + engineering  
**Создан:** 2026-01-07  
**Последнее обновление:** 2026-03-08

## Назначение

Этот документ описывает, как агентам поддерживать документацию в синхронном состоянии при работе с фичами, архитектурой и платформенными изменениями.

> **Приоритет источников:**
> - [Правила работы с документацией](../../.cursor/rules/documentation.mdc)
> - `AGENTS.md`
> - этот playbook

## Каноническая Модель Документов

Используй документы по ролям:

- [docs/ROADMAP.md](../ROADMAP.md) — единый источник истины для статусов идей, этапов и крупных фич.
- `docs/modules/<module>/<module>-overview.md` — основной документ модуля.
- `docs/modules/<module>/<module>-implementation-plan.md` — детальный план, если он существует.
- [docs/platform/changelog.md](../platform/changelog.md) — только реально вышедшие изменения.
- [`CONTINUITY.md`](../../CONTINUITY.md) — активный handoff и текущий рабочий контекст, а не долгосрочный план.

## Что Должно Быть Понятно После Любой Правки

После обновления docs должно быть понятно:
- что только планируется;
- что уже начато;
- что завершено в реализации;
- что уже попало в релиз;
- где остановилась текущая активная работа.

## Базовый Workflow Для Агента

### 1. Определи Зону Изменения

Перед правкой найди:
- затронутый модуль;
- связанные платформенные документы;
- есть ли уже запись в `ROADMAP`;
- есть ли `*-implementation-plan.md`;
- нужен ли update `CONTINUITY.md`.

### 2. Если Появилась Новая Идея

- добавь её в `docs/ROADMAP.md` в `Текущие планы` или `Будущие улучшения`;
- для module-specific идеи добавь запись в `TODO / Future improvements` соответствующего `*-overview.md`;
- укажи приоритет, дату и контекст;
- если есть неопределённость, используй `NEEDS_CONFIRMATION`.

### 3. Если Реализация Началась

Обязательно проверь и обнови:
- `docs/ROADMAP.md` — статус `🔄`, дата начала;
- `docs/modules/<module>/<module>-overview.md` — описание и статус функции;
- `docs/modules/<module>/<module>-implementation-plan.md` — если файл существует;
- `CONTINUITY.md` — если задача существенная или может быть прервана.

### 4. Если Работа Поставлена На Паузу

- не ставь `✅` раньше времени;
- зафиксируй честный статус в `ROADMAP.md` и/или `*-implementation-plan.md`;
- обнови `CONTINUITY.md`, чтобы следующий агент понял точку остановки и next steps;
- не записывай это в `changelog`.

### 5. Если Реализация Завершена

Синхронизируй:
- `docs/ROADMAP.md`;
- `docs/modules/<module>/<module>-overview.md`;
- поддокументы модуля;
- `docs/modules/<module>/<module>-implementation-plan.md`, если есть;
- `docs/platform/roles-permissions.md` и `docs/platform/analytics-events.md`, если применимо;
- `docs/platform/overview.md`, `docs/README.md`, `docs/INDEX.md`, если поменялась карта платформы;
- `CONTINUITY.md`, если изменение заметное для handoff.

### 6. Если Изменение Ушло В Релиз

- добавь запись в `docs/platform/changelog.md`;
- не используй changelog как backlog, planning board или working memory.

## Как Обновлять Основные Документы

### `docs/ROADMAP.md`

Используй для статусов `planned / in progress / done`.

При обновлении:
- меняй статус этапа (`⏳ → 🔄 → ✅`);
- добавляй даты начала и завершения;
- фиксируй новые идеи в `Будущие улучшения`;
- при необходимости указывай зависимости и контекст.

### `docs/modules/<module>/<module>-overview.md`

Это основной документ модуля. Обычно обновляются:
- `Purpose`;
- `Key objects`;
- `Top user scenarios`;
- `Functional catalog`;
- `Implementation status`;
- `TODO / Future improvements`.

### `docs/modules/<module>/<module>-implementation-plan.md`

Если файл существует, он должен быть детальнее `ROADMAP`, но не противоречить ему.

Обновляй:
- этапы;
- статусы;
- даты;
- зависимости;
- DoD;
- историю изменений.

### `CONTINUITY.md`

Используй только для активного рабочего состояния.

Правила:
- по умолчанию работай только с частью выше `STOP LINE`;
- держи запись короткой и factual;
- не превращай файл в долгий журнал релизов или полный roadmap;
- если деталь устарела, переноси её в `docs/archive/continuity/`.

### `docs/platform/changelog.md`

Обновляй только для реально вышедших изменений или подготовленного release bucket `Unreleased`.

Не добавляй туда:
- идеи;
- незавершённую работу;
- временные заметки;
- handoff-детали.

## NEEDS_CONFIRMATION

Если нет подтверждённого факта, используй:

```markdown
> **NEEDS_CONFIRMATION:** [что нужно подтвердить]
> **Владелец:** product
> **Дедлайн:** YYYY-MM-DD | TBD
> **Контекст:** [почему это важно]
```

Никогда не придумывай бизнес-правила, роли или analytics events.

## Шаблоны

Доступные шаблоны:
- `docs/modules/_template-module.md` — использовать как шаблон для нового `*-overview.md`;
- `docs/modules/_template-implementation-plan.md` — использовать как шаблон для нового `*-implementation-plan.md`;
- `docs/architecture/adr/_template-adr.md` — для ADR.

## Минимальный Чеклист Для Агента

Перед завершением задачи проверь:
- [ ] `ROADMAP` синхронизирован
- [ ] overview-док модуля синхронизирован
- [ ] implementation plan синхронизирован, если существует
- [ ] cross-cutting docs обновлены, если это нужно
- [ ] `CONTINUITY.md` обновлён для handoff, если задача значимая
- [ ] `changelog` обновлён только если изменение реально вышло
- [ ] статусы и даты актуальны
- [ ] неопределённости помечены как `NEEDS_CONFIRMATION`

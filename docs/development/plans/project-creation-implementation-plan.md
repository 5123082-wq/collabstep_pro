# План улучшения формы создания проекта

## Статус: Черновик

## Источник

- `docs/archive/analysis/2024-XX-XX-project-creation-analysis.md` (архив)

## Цели

- Дать пользователю выбор `visibility`, `type`, `stage`, `deadline` при создании проекта.
- Сохранить новые поля в PM-данных и использовать их в последующих экранах/фильтрах.
- Сделать шаг 2 полезным (настройки, а не просто подтверждение).

## Не в рамках

- Полная переработка проектных шаблонов.
- Масштабный редизайн страниц проекта/каталога.
- Роль/права для публикации проектов (если сейчас нет ограничений).

## Принятые решения

- Оставляем два шага: шаг 1 — детали, шаг 2 — настройки проекта.
- На шаге 2 добавляем `visibility`, `type`, `stage`, `deadline` + краткое резюме.
- Опциональные поля не блокируют создание, дефолты задаются на фронте и проверяются на API.

## План работ

### Этап 0 — Инвентаризация входных точек (P0)

- Проверить активные entrypoints создания проекта (модалка и/или wizard).
- Решить: поддерживаем оба UI (`CreateProjectModal`, `ProjectCreateWizardClient`) или оставляем один.

**Файлы для проверки**
- `apps/web/components/pm/CreateProjectModal.tsx`
- `apps/web/app/(app)/projects/create/ProjectCreateWizardClient.tsx`
- `apps/web/app/(app)/pm/projects/create/page.tsx`

### Этап 1 — API и данные (P0)

- Разрешить передачу `visibility` и `stage` при создании проекта на API.
- Пропускать `type`/`deadline` как валидированные опции (значения из allow-list).
- Привести дефолты: `visibility=private`, `stage=discovery` (если поле отсутствует).
- Пробросить новые поля в `projectsRepository.create` вместо жестко заданных значений.
- Синхронизировать запись в `project`-таблице (если поле есть) только для `visibility` и `stage`.

**Файлы**
- `apps/web/app/api/pm/projects/route.ts`
- `apps/api/src/repositories/projects-repository.ts`
- `apps/api/src/db/schema.ts` (при необходимости схемы)

### Этап 2 — UI создания (P0)

- Добавить на шаг 2 блок "Настройки":
  - `visibility`: segmented control или select (private/public).
  - `type`: select (`product`, `marketing`, `operations`, `service`, `internal`).
  - `stage`: select (`discovery`, `design`, `build`, `launch`, `support`).
  - `deadline`: date picker (ISO date).
- Показать summary выбранных значений перед кнопкой "Создать проект".
- Поддержать дефолты для новых полей и отразить в summary.

**Файлы**
- `apps/web/components/pm/CreateProjectModal.tsx`
- `apps/web/app/(app)/projects/create/ProjectCreateWizardClient.tsx` (если остаётся)

### Этап 3 — Валидация и UX (P1)

- Валидация на фронте: отображение подсказок при неверных значениях (например, пустая дата).
- Валидация на API: отвергать неизвестные `type`/`stage`, нормализовать `visibility`.
- Обновить тексты в хедере создания (не "приватный по умолчанию", если выбор доступен).

**Файлы**
- `apps/web/components/pm/CreateProjectModal.tsx`
- `apps/web/app/api/pm/projects/route.ts`

### Этап 4 — Телеметрия и тесты (P1)

- Добавить в `project_created` параметры `visibility`, `type`, `stage`, `deadline` (если есть).
- Обновить e2e/юнит-тесты на создание проекта с новыми полями.

**Файлы**
- `apps/web/components/pm/CreateProjectModal.tsx`
- `apps/web/app/(app)/projects/create/ProjectCreateWizardClient.tsx`
- `apps/web/tests/e2e/admin-access-smoke.spec.ts`
- `apps/web/tests/e2e/project-chat-files.spec.ts`

### Этап 5 — Дополнительные улучшения (P2)

- Выбор стартовой команды проекта.
- Иконка/цвет проекта.
- Автозаполнение `type`/`stage` из шаблона (если в шаблонах появятся метаданные).

## Критерии готовности (DoD)

- Пользователь выбирает `visibility`, `type`, `stage`, `deadline` при создании.
- Новые значения сохраняются в проекте и возвращаются API.
- Создание остаётся доступным даже без заполнения опциональных полей.
- UI шага 2 содержит настройки и summary, а не только подтверждение.

## Риски и зависимости

- В репозитории `projectsRepository` сейчас фиксируется `visibility=private`; нужно аккуратно менять без регрессий.
- В `project`-таблице нет `type`/`deadline` — хранить эти поля только в PM-хранилище или расширить схему (отдельное решение).

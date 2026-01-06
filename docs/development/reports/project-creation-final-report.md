# Итоговый отчет: улучшение создания проекта

## Что сделано

- Stage 1: расширен API создания проекта (visibility/type/stage/deadline), добавлена валидация и дефолты, stage сохраняется в `project` таблицу.
- Stage 2+3: шаг 2 превращен в «Настройки проекта» с выбором visibility/type/stage/deadline, добавлен summary, обновлены тексты, поля уходят в POST и телеметрию.
- Stage 4: добавлены unit-тесты для POST `/api/pm/projects` с проверкой allow-list и дефолтов.

## Основные изменения

- `apps/web/app/api/pm/projects/route.ts`: валидация allow-list, дефолты, проброс stage в `upsertOrganizationProject`.
- `apps/api/src/repositories/projects-repository.ts`: дефолт stage=discovery, нормализация visibility.
- `apps/web/components/pm/CreateProjectModal.tsx`: новые поля настроек, summary, payload, telemetry.
- `apps/web/app/(app)/projects/create/ProjectCreateWizardClient.tsx`: зеркальные изменения на случай восстановления wizard.
- `apps/web/tests/unit/pm-projects-create.spec.ts`: проверки allow-list и дефолтов.

## Поведение полей по умолчанию

- visibility = `private`
- stage = `discovery`
- type = опционально
- deadline = опционально (не отправляется при пустом значении)

## Stage 5 (опционально)

- Иконка/цвет проекта и выбор стартовой команды не реализованы.
- Требуется отдельное решение по хранению и API (нет текущих полей/эндпоинтов).

## Тесты

- Не запускались (изменения UI + добавлены unit-тесты, но не прогонялись).

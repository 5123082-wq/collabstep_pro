# Задание: Аудит миграции блоков контента

## Контекст

Завершены все 6 этапов миграции блоков контента на единую систему стилей. Необходимо провести тщательный аудит для проверки:

1. Все ли задания выполнены полностью?
2. Как сейчас происходит обработка стилей по всей платформе?
3. Остались ли блоки основного контента, которые используют свой собственный стиль, а не глобальный?

## Цель

Провести комплексный аудит миграции блоков контента, выявить все оставшиеся использования старых стилей и составить полный отчет о текущем состоянии системы стилей.

---

## Задачи аудита

### 1. Проверка выполнения всех этапов миграции

#### 1.1. Этап 1: Компоненты PM (Project Management)

- [ ] Проверить все 17 компонентов PM:
  - `TasksListView.tsx`
  - `TasksCalendarView.tsx`
  - `TasksBoardView.tsx`
  - `LimitsLog.tsx`
  - `FinanceWidget.tsx`
  - `ProgressWidget.tsx`
  - `PulseWidget.tsx`
  - `ProjectLinks.tsx`
  - `BudgetBanner.tsx`
  - `ProjectActivity.tsx`
  - `ProjectTeam.tsx`
  - `ProjectHeader.tsx`
  - `ProjectsList.tsx`
  - `TaskDetailDrawer.tsx`
  - `TaskComments.tsx`
  - `TaskCommentForm.tsx`
  - `TaskCommentItem.tsx`
- [ ] Убедиться, что все используют `ContentBlock` или CSS классы `.content-block`
- [ ] Проверить отсутствие старых стилей: `rounded-2xl border border-neutral-800 bg-neutral-950/60`

**Файлы для проверки:** `apps/web/components/pm/*.tsx`

#### 1.2. Этап 2: Компоненты маркетплейса

- [ ] Проверить все 13 компонентов маркетплейса:
  - `TemplateCard.tsx`
  - `TemplateDetailModal.tsx`
  - `TemplatesCatalog.tsx`
  - `TemplatesToolbar.tsx`
  - `TemplateMetaGrid.tsx`
  - `EmptyTemplatesState.tsx`
  - `TemplatesSkeleton.tsx`
  - `TemplateFileList.tsx`
  - `FavoritesView.tsx`
  - `CartView.tsx`
  - `SpecialistsCatalog.tsx`
  - `VacancyDetail.tsx`
  - `VacanciesCatalog.tsx`
- [ ] Убедиться, что все используют единую систему стилей

**Файлы для проверки:** `apps/web/components/marketplace/*.tsx`

#### 1.3. Этап 3: Страницы приложения

- [ ] Проверить все 10 страниц приложения:
  - `app/(app)/pm/page.tsx`
  - `app/(app)/pm/tasks/page.tsx`
  - `app/(app)/pm/projects/[id]/page.tsx`
  - `app/(app)/marketing/research/page.tsx`
  - `app/(app)/marketing/campaigns/page.tsx`
  - `app/(app)/marketing/content-seo/page.tsx`
  - `app/(app)/marketing/analytics/page.tsx`
  - `app/(app)/marketing/overview/page.tsx`
  - `app/(app)/finance/expenses/page-client.tsx`
  - `app/(app)/ai-hub/agents/page.tsx`
- [ ] Убедиться, что все используют единую систему стилей

**Файлы для проверки:** `apps/web/app/(app)/**/*.tsx`

#### 1.4. Этап 4: Компоненты UI и утилиты

- [ ] Проверить компоненты правой панели:
  - `NotificationsPanel.tsx`
  - `AssistantDrawer.tsx`
  - `DocumentDrawer.tsx`
  - `RailSettingsDrawer.tsx`
  - `InviteDialog.tsx`
- [ ] Проверить компоненты приложения:
  - `CommandPalette.tsx`
  - `CreateMenu.tsx`
  - `RightActionsPanel.tsx`
  - `TopSubmenu.tsx`
  - `FeatureComingSoon.tsx`
- [ ] Проверить модальные окна:
  - `ProjectInviteModal.tsx`
  - `BudgetSettingsModal.tsx`

**Файлы для проверки:** `apps/web/components/right-rail/*.tsx`, `apps/web/components/app/*.tsx`

#### 1.5. Этап 5: Маркетинговые страницы

- [ ] Проверить все 11 маркетинговых страниц:
  - `app/(marketing)/blog/page.tsx`
  - `app/(marketing)/projects/page.tsx`
  - `app/(marketing)/projects/cases/page.tsx`
  - `app/(marketing)/product/page.tsx`
  - `app/(marketing)/product/pm/page.tsx`
  - `app/(marketing)/product/marketplace/page.tsx`
  - `app/(marketing)/product/ai/page.tsx`
  - `app/(marketing)/pricing/page.tsx`
  - `app/(marketing)/contractors/page.tsx`
  - `app/(marketing)/specialists/page.tsx`
  - `app/(marketing)/audience/page.tsx`
- [ ] Проверить компоненты маркетинга:
  - `marketing/sections/Features.tsx`
  - `marketing/sections/Audience.tsx`
  - `marketing/app/MarketingHeader.tsx`
  - `marketing/MarketingNavbar.tsx`

**Файлы для проверки:** `apps/web/app/(marketing)/**/*.tsx`, `apps/web/components/marketing/**/*.tsx`

#### 1.6. Этап 6: Страницы админки

- [ ] Проверить все 9 страниц админки:
  - `app/(app)/admin/page.tsx`
  - `app/(app)/admin/data/page.tsx`
  - `app/(app)/admin/users/page.tsx`
  - `app/(app)/admin/audit/page.tsx`
  - `app/(app)/admin/features/page.tsx`
  - `app/(app)/admin/releases/page.tsx`
  - `app/(app)/admin/roles/page.tsx`
  - `app/(app)/admin/segments/page.tsx`
  - `app/(app)/admin/support/page.tsx`
- [ ] Убедиться, что все используют единую систему стилей

**Файлы для проверки:** `apps/web/app/(app)/admin/**/*.tsx`

---

### 2. Поиск оставшихся использований старых стилей

#### 2.1. Поиск по паттернам старых стилей

- [ ] Найти все использования `rounded-2xl border border-neutral-800 bg-neutral-950/60`
- [ ] Найти все использования `rounded-3xl border border-neutral-900 bg-neutral-950/70`
- [ ] Найти все использования `rounded-3xl border border-neutral-900 bg-neutral-950/60`
- [ ] Найти все использования `rounded-xl border border-neutral-800 bg-neutral-950/60`
- [ ] Найти все использования `rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60`
- [ ] Найти все использования `rounded-2xl border border-neutral-800/70 bg-neutral-950/60`

**Команда для поиска:**
```bash

# Найти все использования старых стилей

grep -r "rounded-[23]xl border border-neutral-[89]00.*bg-neutral-950" apps/web --include="*.tsx" --include="*.ts" | grep -v "content-block" | grep -v "node_modules"
```

#### 2.2. Исключения из проверки

- [ ] Исключить из проверки:
  - Компонент `ContentBlock` и его использование
  - CSS-классы `.content-block*` в `globals.css`
  - Токены дизайн-системы в `design-tokens.ts`
  - Документацию (файлы `.md`)
  - Тесты (если они используют старые стили для тестирования)

#### 2.3. Категоризация найденных использований

Для каждого найденного использования определить:

- [ ] **Тип блока:**
  - Основной блок контента (требует миграции)
  - Вспомогательный элемент (кнопка, badge, и т.д.)
  - Специальный компонент (модальное окно, dropdown, и т.д.)
  - Другое (указать причину)

- [ ] **Приоритет миграции:**
  - Высокий (основной контент, часто используется)
  - Средний (вспомогательный контент)
  - Низкий (редко используется, специальные случаи)
  - Не требуется (не является блоком контента)

- [ ] **Расположение:**
  - Путь к файлу
  - Номер строки
  - Контекст использования

---

### 3. Анализ текущей системы стилей

#### 3.1. Проверка инфраструктуры

- [ ] Проверить наличие и корректность компонента `ContentBlock`:
  - `apps/web/components/ui/content-block.tsx`
  - Все пропсы работают корректно
  - Все варианты (`size`, `variant`, `interactive`) реализованы

- [ ] Проверить CSS-классы:
  - `apps/web/styles/globals.css`
  - Все классы `.content-block*` определены
  - Все варианты стилей работают

- [ ] Проверить токены дизайн-системы:
  - `apps/web/design-tokens.ts`
  - Все токены для блоков контента определены
  - CSS переменные корректно используются

- [ ] Проверить интеграцию с Tailwind:
  - `apps/web/tailwind.config.ts`
  - Токены интегрированы в конфигурацию

#### 3.2. Проверка документации

- [ ] Проверить актуальность документации:
  - `apps/web/docs/ui/content-blocks.md`
  - Все примеры работают
  - Все варианты описаны

- [ ] Проверить roadmap:
  - `docs/development/content-blocks-migration-roadmap.md`
  - Статистика актуальна
  - История изменений полная

#### 3.3. Анализ использования единой системы

- [ ] Подсчитать количество использований `ContentBlock`:
  ```bash
  grep -r "ContentBlock" apps/web --include="*.tsx" --include="*.ts" | wc -l
  ```

- [ ] Подсчитать количество использований CSS-классов `.content-block`:
  ```bash
  grep -r "content-block" apps/web --include="*.tsx" --include="*.ts" | wc -l
  ```

- [ ] Подсчитать количество использований старых стилей (после исключений):
  ```bash
  grep -r "rounded-[23]xl border border-neutral-[89]00.*bg-neutral-950" apps/web --include="*.tsx" --include="*.ts" | grep -v "content-block" | grep -v "node_modules" | wc -l
  ```

---

### 4. Поиск блоков с собственными стилями

#### 4.1. Поиск кастомных стилей блоков контента

- [ ] Найти все блоки с кастомными `className` для блоков контента:
  ```bash
  grep -r "className.*rounded.*border.*bg-" apps/web --include="*.tsx" | grep -v "ContentBlock" | grep -v "content-block"
  ```

- [ ] Проверить каждый найденный блок:
  - Является ли он блоком основного контента?
  - Можно ли его мигрировать на `ContentBlock`?
  - Есть ли причина для использования кастомных стилей?

#### 4.2. Проверка компонентов с inline стилями

- [ ] Найти компоненты с `style={{}}` для блоков контента
- [ ] Определить, можно ли заменить на `ContentBlock` или CSS-классы

#### 4.3. Проверка компонентов с условными стилями

- [ ] Найти компоненты с условными стилями (через `clsx`, `cn`, и т.д.)
- [ ] Определить, можно ли использовать варианты `ContentBlock` вместо условных стилей

---

### 5. Проверка консистентности

#### 5.1. Проверка использования размеров

- [ ] Убедиться, что `size="sm"` используется для вложенных элементов
- [ ] Убедиться, что `size="md"` (по умолчанию) используется для основных блоков
- [ ] Проверить, нет ли смешивания размеров без причины

#### 5.2. Проверка использования вариантов

- [ ] Убедиться, что `variant="dashed"` используется для пустых состояний
- [ ] Убедиться, что `variant="error"` используется для блоков с ошибками
- [ ] Убедиться, что `variant="muted"` используется для прозрачных блоков
- [ ] Проверить, нет ли неправильного использования вариантов

#### 5.3. Проверка использования интерактивности

- [ ] Убедиться, что `interactive` используется для кликабельных блоков
- [ ] Проверить, что hover эффекты работают корректно

---

### 6. Составление отчета

#### 6.1. Сводная таблица результатов

Создать таблицу с результатами проверки:

| Категория | Всего файлов | Проверено | Мигрировано | Осталось | Статус |
|-----------|--------------|-----------|-------------|----------|--------|
| Компоненты PM | 17 | ? | ? | ? | ? |
| Компоненты маркетплейса | 13 | ? | ? | ? | ? |
| Страницы приложения | 10 | ? | ? | ? | ? |
| Компоненты UI | 24 | ? | ? | ? | ? |
| Маркетинговые страницы | 11 | ? | ? | ? | ? |
| Страницы админки | 9 | ? | ? | ? | ? |
| **ИТОГО** | **84** | **?** | **?** | **?** | **?** |

#### 6.2. Список найденных проблем

Для каждой найденной проблемы указать:

- **Файл:** путь к файлу
- **Строка:** номер строки
- **Проблема:** описание проблемы
- **Тип:** основной блок / вспомогательный / специальный
- **Приоритет:** высокий / средний / низкий / не требуется
- **Рекомендация:** что нужно сделать

#### 6.3. Статистика использования

- **Использований `ContentBlock`:** ?
- **Использований CSS-классов `.content-block`:** ?
- **Использований старых стилей (требуют миграции):** ?
- **Использований старых стилей (не требуют миграции):** ?
- **Процент миграции:** ?%

#### 6.4. Рекомендации

- [ ] Составить список рекомендаций по дальнейшим действиям
- [ ] Определить приоритеты для оставшихся задач
- [ ] Предложить улучшения системы стилей (если нужно)

---

## Инструменты для аудита

### Команды для поиска

```bash

# Найти все использования старых стилей блоков контента

grep -r "rounded-[23]xl border border-neutral-[89]00.*bg-neutral-950" apps/web --include="*.tsx" --include="*.ts" | grep -v "content-block" | grep -v "node_modules" | grep -v ".md"

# Найти все использования ContentBlock

grep -r "ContentBlock" apps/web --include="*.tsx" --include="*.ts" | grep -v "node_modules"

# Найти все использования CSS-классов content-block

grep -r "content-block" apps/web --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v ".md"

# Найти все файлы с блоками контента

find apps/web -name "*.tsx" -o -name "*.ts" | xargs grep -l "rounded.*border.*bg-" | grep -v "node_modules"
```

### Скрипт для автоматизации

Создать скрипт `scripts/audit-content-blocks.ts` для автоматизации проверки:

```typescript
// Скрипт для аудита блоков контента
// - Сканирует все файлы
// - Находит использования старых стилей
// - Генерирует отчет
```

---

## Критерии успешного аудита

### ✅ Аудит считается успешным, если

1. **Все этапы проверены:**
   - Все 6 этапов миграции проверены
   - Все файлы из roadmap проверены
   - Все компоненты и страницы проверены

2. **Все проблемы выявлены:**
   - Все оставшиеся использования старых стилей найдены
   - Все блоки с собственными стилями идентифицированы
   - Все несоответствия выявлены

3. **Отчет составлен:**
   - Сводная таблица результатов
   - Список всех найденных проблем
   - Статистика использования
   - Рекомендации по дальнейшим действиям

4. **Документация обновлена:**
   - Roadmap обновлен с результатами аудита
   - Создан отчет о результатах аудита
   - Обновлена статистика миграции

---

## Ожидаемые результаты

### Отчет должен содержать

1. **Сводку результатов:**
   - Общий процент миграции
   - Количество оставшихся использований старых стилей
   - Количество блоков с собственными стилями

2. **Детальный список проблем:**
   - Все найденные использования старых стилей
   - Все блоки с собственными стилями
   - Рекомендации по миграции

3. **Анализ системы стилей:**
   - Текущее состояние инфраструктуры
   - Консистентность использования
   - Проблемы и улучшения

4. **План дальнейших действий:**
   - Приоритеты для оставшихся задач
   - Рекомендации по улучшению
   - Следующие шаги

---

## Файлы для создания

1. **Отчет о результатах аудита:**
   - `docs/development/content-blocks-migration-audit-report.md`

2. **Скрипт для автоматизации (опционально):**
   - `scripts/audit-content-blocks.ts`

---

## Временные рамки

- **Оценка времени:** 4-6 часов
- **Приоритет:** Высокий
- **Зависимости:** Завершение всех 6 этапов миграции

---

**Дата создания:** 2024-12-19  
**Статус:** К выполнению  
**Приоритет:** Высокий


# Задание: Миграция блоков контента — Этап 3: Компоненты UI и утилиты

## Контекст

Продолжаем миграцию блоков контента на единую систему стилей. Завершены:

- ✅ Компоненты PM (Project Management) — 17 компонентов
- ✅ Компоненты маркетплейса — 13 компонентов
- ✅ Страницы приложения — 10 страниц

Прогресс: ~20% (мигрировано ~70 компонентов и страниц из ~500+ использований)

## Задача

Мигрировать компоненты UI и утилиты на использование `ContentBlock` и `ContentBlockTitle` из `@/components/ui/content-block`.

## Важные замечания

- **НЕ трогать левое и правое меню** (Sidebar, HoverRail и т.д.) — они будут мигрированы в другом этапе
- Тестировать каждый компонент после миграции
- Обновлять roadmap после завершения каждого компонента
- Использовать `ContentBlock` и `ContentBlockTitle` из `@/components/ui/content-block`

## Документы для изучения

1. **Roadmap миграции:** `docs/development/content-blocks-migration-roadmap.md`
   - Инструкции по миграции
   - Примеры замены стилей
   - Чек-лист для каждого компонента

2. **Документация компонента:** `apps/web/docs/ui/content-blocks.md`
   - API `ContentBlock` и `ContentBlockTitle`
   - Варианты и размеры
   - Примеры использования

3. **Компонент:** `apps/web/components/ui/content-block.tsx`
   - Исходный код компонента
   - Доступные пропсы

4. **Примеры миграции:**
   - `apps/web/components/marketplace/templates/TemplateCard.tsx` — интерактивная карточка
   - `apps/web/components/marketplace/SpecialistsCatalog.tsx` — фильтры с заголовком
   - `apps/web/app/(app)/marketing/overview/page.tsx` — страница с множеством блоков

## Приоритет миграции (по порядку)

### 1. Компоненты правой панели (HoverRail)

- [ ] `components/right-rail/NotificationsPanel.tsx` — заменить блоки
- [ ] `components/right-rail/ChatPanel.tsx` — заменить блоки
- [ ] `components/right-rail/AssistantDrawer.tsx` — заменить блоки
- [ ] `components/right-rail/DocumentDrawer.tsx` — заменить блоки
- [ ] `components/right-rail/CommunicationDrawer.tsx` — заменить блоки
- [ ] `components/right-rail/RailSettingsDrawer.tsx` — заменить блоки
- [ ] `components/right-rail/InviteDialog.tsx` — заменить блоки
- [ ] `components/right-rail/RailItem.tsx` — заменить блоки

**Примечание:** `HoverRail.tsx` — проверить блоки, но не трогать основную структуру меню

### 2. Компоненты приложения

- [ ] `components/app/AppTopbar.tsx` — заменить `rounded-2xl border border-neutral-800 bg-neutral-900/60`
- [ ] `components/app/CommandPalette.tsx` — заменить блоки
- [ ] `components/app/CreateMenu.tsx` — заменить блоки
- [ ] `components/app/RightActionsPanel.tsx` — заменить блоки
- [ ] `components/app/AccountMenu.tsx` — заменить блоки
- [ ] `components/app/TopSubmenu.tsx` — заменить блоки
- [ ] `components/app/ToastHub.tsx` — заменить блоки
- [ ] `components/app/FeatureComingSoon.tsx` — заменить блоки

**Примечание:** `Sidebar.tsx` — проверить блоки, но не трогать основную структуру меню

### 3. Модальные окна и формы

- [ ] `components/ui/modal.tsx` — проверить, возможно уже использует правильные стили
- [ ] `components/ui/sheet.tsx` — проверить блоки
- [ ] `components/pm/ProjectInviteModal.tsx` — заменить блоки
- [ ] `components/pm/CreateTaskModal.tsx` — заменить блоки
- [ ] `components/pm/BudgetSettingsModal.tsx` — заменить блоки
- [ ] `components/pm/BulkOperationsPanel.tsx` — заменить блоки
- [ ] `components/pm/RestoreProjectDialog.tsx` — заменить блоки

## Инструкции по миграции

### Шаг 1: Найти блоки для миграции

Искать паттерны:

- `rounded-3xl border border-neutral-900 bg-neutral-950/70 p-6` — основной блок
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6` — вложенный блок
- `rounded-xl border border-neutral-800 bg-neutral-950/60 p-4` — маленький блок

Команда для поиска:

```bash
grep -r "rounded-\(2xl\|3xl\).*border.*bg-neutral" apps/web/components/
```

### Шаг 2: Заменить на ContentBlock

#### Основной блок

```tsx
// До
<section className="rounded-3xl border border-neutral-900 bg-neutral-950/70 p-6">
  <h2 className="text-lg font-semibold text-white">Заголовок</h2>
  Контент
</section>

// После
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

<ContentBlock header={<ContentBlockTitle>Заголовок</ContentBlockTitle>}>
  Контент
</ContentBlock>
```

#### Вложенный блок

```tsx
// До
<div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6">
  Контент
</div>

// После
<ContentBlock size="sm">
  Контент
</ContentBlock>
```

#### Пустое состояние

```tsx
// До
<div className="rounded-2xl border border-dashed border-neutral-800/80 bg-neutral-900/40 p-16">
  Пусто
</div>

// После
<ContentBlock variant="dashed" size="sm" className="p-16">
  Пусто
</ContentBlock>
```

#### Интерактивный блок

```tsx
// До
<div
  className="rounded-3xl border border-neutral-900 bg-neutral-950/70 p-6 transition hover:border-indigo-500/40 cursor-pointer"
  onClick={handleClick}
>
  Контент
</div>

// После
<ContentBlock interactive onClick={handleClick}>
  Контент
</ContentBlock>
```

### Шаг 3: Проверить результат

- [ ] Визуально блок выглядит корректно
- [ ] Hover-эффекты работают (если были)
- [ ] Адаптивность сохранена
- [ ] Нет ошибок линтера
- [ ] Компонент работает корректно
- [ ] Протестировано в браузере

## Чек-лист для каждого компонента

- [ ] Добавлен импорт `ContentBlock` или `ContentBlockTitle`
- [ ] Заменены все старые классы на компонент
- [ ] Сохранена функциональность
- [ ] Сохранена адаптивность
- [ ] Нет ошибок линтера
- [ ] Визуально выглядит корректно
- [ ] Протестировано в браузере
- [ ] Обновлен roadmap (отметить `[x]`)

## Обновление roadmap

После миграции каждого компонента:

1. Отметить компонент как выполненный (заменить `[ ]` на `[x]`)
2. Обновить статистику миграции
3. Добавить заметки о проблемах или особенностях (если есть)

Файл: `docs/development/content-blocks-migration-roadmap.md`

## Особые случаи

### Модальные окна

Если блок находится внутри модального окна:
- Проверить, не является ли это частью структуры модального окна
- Если это контент внутри модального окна — мигрировать
- Если это обертка модального окна — не трогать

### Компоненты меню

- **НЕ трогать** основную структуру Sidebar и HoverRail
- Мигрировать только внутренние блоки контента
- Если компонент является частью навигации — проверить контекст

### ToastHub и уведомления

- Проверить, не конфликтует ли миграция с существующими стилями уведомлений
- Сохранить функциональность всплывающих сообщений

## Начать с

Рекомендуется начать с компонентов правой панели (`NotificationsPanel.tsx` или `ChatPanel.tsx`), так как они часто используются и имеют четкую структуру блоков.

---

**Дата создания:** 2024-12-19  
**Этап:** 3 из 5  
**Приоритет:** Средний


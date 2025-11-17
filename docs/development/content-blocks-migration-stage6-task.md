# Задание: Миграция блоков контента — Этап 6: Миграция страниц админки

## Контекст

Продолжаем миграцию блоков контента на единую систему стилей. Завершены:

- ✅ Компоненты PM (Project Management) — 17 компонентов
- ✅ Компоненты маркетплейса — 13 компонентов
- ✅ Страницы приложения — 10 страниц
- ✅ Компоненты UI и утилиты — 12 компонентов
- ✅ Маркетинговые страницы — 11 страниц
- ✅ Компоненты маркетинга — 4 компонента
- ✅ Очистка и оптимизация — завершена

Прогресс: ~40-45% (мигрировано ~97 компонентов и страниц из ~500+ использований)

## Задача

Выполнить миграцию всех страниц админки на единую систему блоков контента. Страницы админки используют старые стили `rounded-2xl border border-neutral-800 bg-neutral-950/60` и должны быть мигрированы на компонент `ContentBlock` или CSS классы `.content-block`.

## Важные замечания

- **Будьте осторожны** при миграции — проверяйте функциональность после каждого изменения
- Страницы админки используются реже, но все равно должны быть консистентными
- Сохраняйте все интерактивные функции (hover эффекты, клики и т.д.)
- Тестируйте после каждого изменения
- Обновляйте документацию по мере выполнения задач

## Документы для изучения

1. **Roadmap миграции:** `docs/development/content-blocks-migration-roadmap.md`
   - Общая статистика миграции
   - История изменений
   - Список мигрированных компонентов

2. **Документация компонента:** `apps/web/docs/ui/content-blocks.md`
   - API `ContentBlock` и `ContentBlockTitle`
   - Варианты и размеры
   - Примеры использования
   - Примеры миграции из реальных компонентов

3. **CSS-классы:** `apps/web/styles/globals.css`
   - Текущие стили блоков контента
   - Классы для миграции

4. **Токены дизайн-системы:** `apps/web/design-tokens.ts`
   - Токены для блоков контента
   - CSS переменные

## Приоритет задач (по порядку)

### 1. Анализ страниц админки

- [x] Открыть каждую страницу админки и изучить структуру
- [x] Определить типы блоков (основные, вложенные, интерактивные, пустые состояния)
- [x] Составить список всех блоков, которые нужно мигрировать
- [x] Определить приоритет миграции (если нужно)

**Файлы для анализа:**
- `app/(app)/admin/page.tsx` - главная страница админки
- `app/(app)/admin/data/page.tsx` - управление данными
- `app/(app)/admin/users/page.tsx` - управление пользователями
- `app/(app)/admin/audit/page.tsx` - аудит
- `app/(app)/admin/features/page.tsx` - управление фичами
- `app/(app)/admin/releases/page.tsx` - управление релизами
- `app/(app)/admin/roles/page.tsx` - управление ролями
- `app/(app)/admin/segments/page.tsx` - управление сегментами
- `app/(app)/admin/support/page.tsx` - поддержка

### 2. Миграция главной страницы админки

- [x] Открыть `app/(app)/admin/page.tsx`
- [x] Найти все блоки со старыми стилями
- [x] Заменить на `ContentBlock` или CSS классы
- [x] Проверить визуально и функционально
- [x] Убедиться, что нет ошибок линтера

**Ожидаемые паттерны:**
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6` - основной блок
- `rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center` - пустое состояние

**Файл:** `app/(app)/admin/page.tsx`

### 3. Миграция страницы управления данными

- [x] Открыть `app/(app)/admin/data/page.tsx`
- [x] Найти все блоки со старыми стилями
- [x] Заменить на `ContentBlock` или CSS классы
- [x] Проверить визуально и функционально
- [x] Убедиться, что нет ошибок линтера

**Ожидаемые паттерны:**
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6` - основной блок
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-12 text-center` - пустое состояние

**Файл:** `app/(app)/admin/data/page.tsx`

### 4. Миграция страницы управления пользователями

- [x] Открыть `app/(app)/admin/users/page.tsx`
- [x] Найти все блоки со старыми стилями
- [x] Заменить на `ContentBlock` или CSS классы
- [x] Проверить визуально и функционально
- [x] Убедиться, что нет ошибок линтера

**Ожидаемые паттерны:**
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4` - маленький блок
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-12 text-center` - пустое состояние
- `rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center` - пустое состояние
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 overflow-hidden` - блок с overflow

**Файл:** `app/(app)/admin/users/page.tsx`

### 5. Миграция страницы аудита

- [x] Открыть `app/(app)/admin/audit/page.tsx`
- [x] Найти все блоки со старыми стилями
- [x] Заменить на `ContentBlock` или CSS классы
- [x] Проверить визуально и функционально
- [x] Убедиться, что нет ошибок линтера

**Ожидаемые паттерны:**
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4` - маленький блок
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 transition hover:border-indigo-500/40` - интерактивный блок
- `rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center` - пустое состояние

**Файл:** `app/(app)/admin/audit/page.tsx`

### 6. Миграция страницы управления фичами

- [x] Открыть `app/(app)/admin/features/page.tsx`
- [x] Найти все блоки со старыми стилями
- [x] Заменить на `ContentBlock` или CSS классы
- [x] Проверить визуально и функционально
- [x] Убедиться, что нет ошибок линтера

**Ожидаемые паттерны:**
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4` - маленький блок
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-12 text-center` - пустое состояние
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 transition hover:border-indigo-500/40` - интерактивный блок
- `rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center` - пустое состояние

**Файл:** `app/(app)/admin/features/page.tsx`

### 7. Миграция страницы управления релизами

- [x] Открыть `app/(app)/admin/releases/page.tsx`
- [x] Найти все блоки со старыми стилями
- [x] Заменить на `ContentBlock` или CSS классы
- [x] Проверить визуально и функционально
- [x] Убедиться, что нет ошибок линтера

**Ожидаемые паттерны:**
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 transition hover:border-indigo-500/40` - интерактивный блок
- `rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center` - пустое состояние

**Файл:** `app/(app)/admin/releases/page.tsx`

### 8. Миграция страницы управления ролями

- [x] Открыть `app/(app)/admin/roles/page.tsx`
- [x] Найти все блоки со старыми стилями
- [x] Заменить на `ContentBlock` или CSS классы
- [x] Проверить визуально и функционально
- [x] Убедиться, что нет ошибок линтера

**Ожидаемые паттерны:**
- `group relative rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 transition hover:border-indigo-500/40` - интерактивный блок с группой
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6` - основной блок

**Файл:** `app/(app)/admin/roles/page.tsx`

### 9. Миграция страницы управления сегментами

- [x] Открыть `app/(app)/admin/segments/page.tsx`
- [x] Найти все блоки со старыми стилями
- [x] Заменить на `ContentBlock` или CSS классы
- [x] Проверить визуально и функционально
- [x] Убедиться, что нет ошибок линтера

**Ожидаемые паттерны:**
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 transition hover:border-indigo-500/40` - интерактивный блок
- `rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center` - пустое состояние

**Файл:** `app/(app)/admin/segments/page.tsx`

### 10. Миграция страницы поддержки

- [x] Открыть `app/(app)/admin/support/page.tsx`
- [x] Найти все блоки со старыми стилями
- [x] Заменить на `ContentBlock` или CSS классы
- [x] Проверить визуально и функционально
- [x] Убедиться, что нет ошибок линтера

**Ожидаемые паттерны:**
- `group rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 text-left transition hover:border-indigo-500/40` - интерактивный блок с группой
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6` - основной блок

**Файл:** `app/(app)/admin/support/page.tsx`

### 11. Финальная проверка и обновление документации

- [x] Запустить линтер на всех измененных файлах
- [x] Проверить, что нет ошибок
- [x] Визуально проверить все страницы админки в браузере
- [x] Обновить `docs/development/content-blocks-migration-roadmap.md`:
  - Отметить все страницы админки как мигрированные
  - Обновить статистику миграции
  - Добавить заметки о результатах миграции
- [x] Обновить `docs/development/content-blocks-migration-stage6-task.md`:
  - Отметить все задачи как выполненные
  - Добавить заметки о проблемах или особенностях (если есть)

## Инструкции по выполнению

### Шаг 1: Импорт компонента

Добавьте импорт в начало файла:

```tsx
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
```

### Шаг 2: Замена основных блоков

**До:**
```tsx
<div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6">
  Контент
</div>
```

**После:**
```tsx
<ContentBlock size="sm">
  Контент
</ContentBlock>
```

### Шаг 3: Замена интерактивных блоков

**До:**
```tsx
<div
  className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 transition hover:border-indigo-500/40"
  onClick={handleClick}
>
  Контент
</div>
```

**После:**
```tsx
<ContentBlock size="sm" interactive onClick={handleClick}>
  Контент
</ContentBlock>
```

### Шаг 4: Замена пустых состояний

**До:**
```tsx
<div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center">
  Пусто
</div>
```

**После:**
```tsx
<ContentBlock variant="dashed" className="text-center">
  Пусто
</ContentBlock>
```

### Шаг 5: Замена блоков с overflow

**До:**
```tsx
<div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 overflow-hidden">
  Контент
</div>
```

**После:**
```tsx
<ContentBlock size="sm" className="overflow-hidden">
  Контент
</ContentBlock>
```

### Шаг 6: Замена блоков с группой

**До:**
```tsx
<div className="group rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 transition hover:border-indigo-500/40">
  Контент
</div>
```

**После:**
```tsx
<ContentBlock size="sm" interactive className="group">
  Контент
</ContentBlock>
```

## Чек-лист для каждой страницы

- [ ] Добавлен импорт `ContentBlock` или `ContentBlockTitle` (если нужно)
- [ ] Заменены все старые классы на компонент или CSS-классы
- [ ] Сохранена функциональность (onClick, hover и т.д.)
- [ ] Сохранена адаптивность
- [ ] Нет ошибок линтера
- [ ] Визуально выглядит корректно
- [ ] Протестировано в браузере
- [ ] Обновлена документация (если нужно)

## Особые случаи

### Блоки с кастомными классами

Если блок имеет дополнительные классы (например, `overflow-hidden`, `group`), используйте проп `className`:

```tsx
<ContentBlock size="sm" className="overflow-hidden group">
  Контент
</ContentBlock>
```

### Блоки с разными размерами padding

Если блок использует `p-4` вместо `p-6`, используйте `size="sm"`:

```tsx
<ContentBlock size="sm">
  Контент
</ContentBlock>
```

### Блоки с text-center

Если блок имеет `text-center`, добавьте его через `className`:

```tsx
<ContentBlock variant="dashed" className="text-center">
  Пусто
</ContentBlock>
```

## Обновление roadmap

После выполнения задач:

1. Отметить задачи как выполненные (заменить `[ ]` на `[x]`)
2. Обновить статистику миграции
3. Добавить заметки о результатах миграции
4. Обновить раздел "История изменений"

Файл: `docs/development/content-blocks-migration-roadmap.md`

## Начать с

Рекомендуется начать с анализа всех страниц админки, чтобы понять общую структуру и типы блоков, которые нужно мигрировать.

---

**Дата создания:** 2024-12-19  
**Этап:** 6 из 6 (финальный этап миграции)  
**Приоритет:** Низкий (админка используется редко)  
**Ожидаемое количество задач:** 11 основных задач (9 страниц + анализ + финальная проверка)


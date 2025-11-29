# Единая система блоков контента

## Обзор

Все блоки контента в приложении используют единую систему стилей, основанную на эталонном блоке:
- `rounded-3xl` (24px)
- `border border-neutral-900`
- `bg-neutral-950/70`
- `p-6` (24px)
- `space-y-6` (24px между элементами)
- `shadow-[0_0_12px_rgba(0,0,0,0.12)]`

Это обеспечивает визуальную согласованность всего портала.

## Использование компонента ContentBlock

### Базовое использование

```tsx
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

<ContentBlock>
  <ContentBlockTitle>Заголовок блока</ContentBlockTitle>
  <p>Содержимое блока</p>
</ContentBlock>
```

### Размеры

```tsx
<ContentBlock size="md">Средний блок (padding: 1.5rem) - по умолчанию</ContentBlock>
<ContentBlock size="sm">Маленький блок (padding: 1rem) - для вложенных элементов</ContentBlock>
```

### Варианты

```tsx
<ContentBlock variant="default">Обычный блок</ContentBlock>
<ContentBlock variant="primary">Блок с акцентом</ContentBlock>
<ContentBlock variant="muted">Приглушенный блок</ContentBlock>
<ContentBlock variant="error">Блок с ошибкой</ContentBlock>
<ContentBlock variant="borderless">Блок без обводки</ContentBlock>
<ContentBlock variant="dashed">Блок с пунктирной обводкой (для пустых состояний)</ContentBlock>
```

### Интерактивные блоки

```tsx
<ContentBlock interactive onClick={handleClick}>
  Кликабельный блок с hover эффектом
</ContentBlock>
```

### С заголовком и футером

```tsx
<ContentBlock
  header={<ContentBlockTitle>Заголовок</ContentBlockTitle>}
  footer={<div>Футер</div>}
>
  Основной контент
</ContentBlock>
```

### Заголовок с описанием и действиями

```tsx
<ContentBlock
  header={
    <ContentBlockTitle 
      description="Описание блока"
      actions={<Button>Действие</Button>}
    >
      Заголовок
    </ContentBlockTitle>
  }
>
  Контент
</ContentBlock>
```

## Использование CSS классов напрямую

Если компонент не подходит, используйте CSS классы:

```tsx
<section className="content-block">
  <div className="content-block-header">
    <h3>Заголовок</h3>
  </div>
  <div className="content-block-body">
    Контент
  </div>
</section>
```

### Доступные классы

- `.content-block` - базовый блок (эталонный стиль)
- `.content-block-sm` - меньший размер для вложенных элементов
- `.content-block-interactive` - интерактивный блок с hover
- `.content-block-primary` - вариант с акцентом
- `.content-block-muted` - приглушенный вариант
- `.content-block-error` - блок с ошибкой
- `.content-block-borderless` - без обводки
- `.content-block-dashed` - пунктирная обводка
- `.content-block-header` - заголовок блока
- `.content-block-body` - тело блока
- `.content-block-footer` - футер блока

## Стандарты

### Радиус скругления

- **Основной блок**: `1.5rem` (24px) - `rounded-3xl`
- **Вложенные элементы**: `1rem` (16px) - `rounded-2xl`

### Отступы

- **Основной блок**: `1.5rem` (24px) - `p-6`
- **Вложенные элементы**: `1rem` (16px) - `p-4`

### Обводка

- **Толщина**: `1px`
- **Цвет**: Используется токен `--content-block-border`
- **Hover**: Используется токен `--content-block-border-hover`

### Фон

- **Обычный**: Токен `--content-block-bg` (rgba(13, 13, 13, 0.7))
- **Hover**: Токен `--content-block-bg-hover`

### Тени

- **Обычная**: `0 0 12px rgba(0,0,0,0.12)`
- **Hover**: `0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)`

### Отступы между блоками

- **Стандартный**: `1.5rem` (24px)

## Сетка для карточек

Используйте класс `.content-grid` для сетки карточек:

```tsx
<div className="content-grid">
  <ContentBlock>Карточка 1</ContentBlock>
  <ContentBlock>Карточка 2</ContentBlock>
  <ContentBlock>Карточка 3</ContentBlock>
</div>
```

## Миграция существующих компонентов

### До (неправильно)

```tsx
<div className="rounded-3xl border border-neutral-900 bg-neutral-950/60 p-6">
  <h3 className="text-lg font-semibold text-white">Заголовок</h3>
  <p className="text-sm text-neutral-400">Контент</p>
</div>
```

### После (правильно)

```tsx
<ContentBlock>
  <ContentBlockTitle>Заголовок</ContentBlockTitle>
  <p>Контент</p>
</ContentBlock>
```

## Примеры использования

### Карточка проекта

```tsx
<ContentBlock interactive as="article">
  <ContentBlockTitle>Название проекта</ContentBlockTitle>
  <p>Описание проекта</p>
</ContentBlock>
```

### Пустое состояние

```tsx
<ContentBlock variant="dashed">
  <p className="text-center">Здесь пока ничего нет</p>
</ContentBlock>
```

### Блок с ошибкой

```tsx
<ContentBlock variant="error">
  <p>Произошла ошибка при загрузке данных</p>
</ContentBlock>
```

### Блок с действиями

```tsx
<ContentBlock
  header={
    <ContentBlockTitle 
      description="Описание"
      actions={<Button>Действие</Button>}
    >
      Заголовок
    </ContentBlockTitle>
  }
>
  Контент
</ContentBlock>
```

### Вложенные элементы

```tsx
<ContentBlock>
  <ContentBlockTitle>Основной блок</ContentBlockTitle>
  <div className="content-block-sm">
    Вложенный блок с меньшими отступами
  </div>
</ContentBlock>
```

## Токены дизайн-системы

Все параметры блоков определены в `design-tokens.ts`:

- `--content-block-radius` - радиус скругления (1.5rem)
- `--content-block-radius-sm` - радиус для вложенных (1rem)
- `--content-block-padding` - отступы (1.5rem)
- `--content-block-padding-sm` - отступы для вложенных (1rem)
- `--content-block-gap` - отступы между элементами (1.5rem)
- `--content-block-bg` - фон блока
- `--content-block-border` - цвет обводки
- `--content-block-shadow` - тень

## Примеры миграции из реальных компонентов

### Пример 1: Блок фильтров (ProjectsOverviewPageClient.tsx)

**До:**
```tsx
<section className="rounded-3xl border border-neutral-900 bg-neutral-950/70 p-6">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
    {/* Фильтры */}
  </div>
</section>
```

**После:**
```tsx
<ContentBlock>
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
    {/* Фильтры */}
  </div>
</ContentBlock>
```

### Пример 2: Интерактивная карточка (TemplateCard.tsx)

**До:**
```tsx
<div
  className="rounded-2xl border border-neutral-800/70 bg-neutral-950/60 p-6 transition hover:border-indigo-500/40"
  onClick={handleClick}
>
  {/* Контент карточки */}
</div>
```

**После:**
```tsx
<ContentBlock size="sm" interactive onClick={handleClick}>
  {/* Контент карточки */}
</ContentBlock>
```

### Пример 3: Пустое состояние (EmptyTemplatesState.tsx)

**До:**
```tsx
<div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center">
  <p>Здесь пока ничего нет</p>
</div>
```

**После:**
```tsx
<ContentBlock variant="dashed" className="text-center">
  <p>Здесь пока ничего нет</p>
</ContentBlock>
```

### Пример 4: Блок с заголовком и действиями (ProjectKPIs.tsx)

**До:**
```tsx
<section className="rounded-3xl border border-neutral-900 bg-neutral-950/70 p-6">
  <div className="mb-4 flex items-center justify-between">
    <h3 className="text-lg font-semibold text-white">KPI</h3>
    <Button>Действие</Button>
  </div>
  {/* Контент */}
</section>
```

**После:**
```tsx
<ContentBlock
  header={
    <ContentBlockTitle actions={<Button>Действие</Button>}>
      KPI
    </ContentBlockTitle>
  }
>
  {/* Контент */}
</ContentBlock>
```

## Часто задаваемые вопросы

### Когда использовать компонент ContentBlock, а когда CSS классы

- **Используйте компонент** для новых блоков и при миграции существующих
- **Используйте CSS классы** только если компонент не подходит по каким-то причинам (например, нужна специфичная структура)

### Можно ли комбинировать ContentBlock с другими классами

Да, вы можете передать дополнительные классы через проп `className`:

```tsx
<ContentBlock className="my-custom-class">
  Контент
</ContentBlock>
```

### Как мигрировать блок с кастомными стилями

Если блок имеет кастомные стили, которые не покрываются вариантами ContentBlock, используйте проп `className`:

```tsx
<ContentBlock className="bg-custom-color border-custom-border">
  Контент
</ContentBlock>
```

## Известные проблемы

### Страницы админки

Страницы админки (`app/(app)/admin/*`) еще не полностью мигрированы. Они используют старые стили `rounded-2xl border border-neutral-800 bg-neutral-950/60`, но это не критично, так как админка используется редко. Миграция админки может быть выполнена отдельно.

### Документация и примеры

Некоторые файлы документации содержат примеры старых стилей (например, `marketing-glow.md`). Это нормально, так как это примеры использования, а не реальный код.

## Важные замечания

1. **Всегда используйте** `.content-block` или компонент `ContentBlock` для новых блоков
2. **Не используйте** прямые Tailwind классы типа `rounded-2xl`, `rounded-3xl` для блоков контента
3. **Для вложенных элементов** используйте `size="sm"` или класс `.content-block-sm`
4. **Для интерактивных блоков** используйте проп `interactive` или класс `.content-block-interactive`
5. **При миграции** проверяйте визуально, что блок выглядит так же или лучше после миграции


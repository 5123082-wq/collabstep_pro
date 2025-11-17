# Унифицированная система типографики

## Обзор

Централизованная система размеров шрифтов для всей платформы. Все размеры определены в `design-tokens.ts` и используются через CSS-переменные, что обеспечивает консистентность и простоту обновления.

---

## Минимальный набор размеров

### Основные размеры (используются везде)

| Размер | Класс Tailwind | Размер (px) | Назначение | Где использовать |
|--------|---------------|-------------|------------|------------------|
| **xs** | `text-xs` | 12px | Метки, подписи, вторичная информация | Бейджи, метки статусов, вспомогательный текст |
| **sm** | `text-sm` | 14px | Основной текст в блоках | Параграфы в content-block, кнопки, формы, описания |
| **base** | `text-base` | 16px | Базовый размер | Body, стандартный текст (используется редко, т.к. body уже имеет этот размер) |
| **lg** | `text-lg` | 18px | Заголовки блоков контента | ContentBlockTitle, заголовки форм, модальных окон |
| **xl** | `text-xl` | 24px | Заголовки разделов | Заголовки страниц, секций, важные значения |

### Дополнительные размеры (только для маркетинга)

| Размер | Класс Tailwind | Размер (px) | Назначение | Где использовать |
|--------|---------------|-------------|------------|------------------|
| **2xl** | `text-2xl` | 30px | Большие заголовки | Маркетинговые заголовки секций |
| **3xl** | `text-3xl` | 36px | Очень большие заголовки | Hero секции (только для больших экранов) |

**⚠️ Важно:** Размеры `2xl` и `3xl` используются **только** в маркетинговых секциях (Hero, Features, CTA). В основном контенте приложения эти размеры **не используются**.

---

## Line Heights

| Класс | Значение | Использование |
|-------|----------|---------------|
| `leading-tight` | 1.2 | Заголовки |
| `leading-normal` | 1.5 | Обычный текст |
| `leading-relaxed` | 1.7 | Параграфы, длинный текст |

---

## Правила использования

### ✅ Что использовать для блоков контента:

```tsx
// ✅ Правильно - заголовок блока
<ContentBlockTitle>Заголовок</ContentBlockTitle> // автоматически text-lg

// ✅ Правильно - описание
<p className="text-sm">Описание блока</p>

// ✅ Правильно - метка
<span className="text-xs">Статус</span>

// ✅ Правильно - важное значение
<div className="text-xl font-semibold">100%</div>

// ✅ Правильно - обычный текст в блоке
<p className="text-sm text-[color:var(--text-secondary)]">Основной текст</p>
```

### ❌ Что НЕ использовать:

```tsx
// ❌ Неправильно - нестандартный размер
<span className="text-[10px]">Статус</span> // использовать text-xs

// ❌ Неправильно - слишком большой размер для контента
<h2 className="text-3xl">Заголовок</h2> // использовать text-xl или text-lg

// ❌ Неправильно - использование text-base вместо text-sm в блоках
<p className="text-base">Текст</p> // использовать text-sm

// ❌ Неправильно - использование text-xl для заголовка блока
<h3 className="text-xl">Заголовок блока</h3> // использовать text-lg
```

---

## Стандартные паттерны

### 1. Заголовки блоков контента

**Всегда используйте `ContentBlockTitle`** или `text-lg`:

```tsx
// ✅ Рекомендуется
<ContentBlockTitle>Заголовок блока</ContentBlockTitle>

// ✅ Альтернатива
<h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
  Заголовок блока
</h3>
```

### 2. Основной текст в блоках

**Всегда используйте `text-sm`**:

```tsx
// ✅ Правильно
<p className="text-sm text-[color:var(--text-secondary)]">
  Основной текст блока
</p>

// ✅ В content-block автоматически применяется
<ContentBlock>
  <p>Текст автоматически будет text-sm</p>
</ContentBlock>
```

### 3. Метки и подписи

**Всегда используйте `text-xs`**:

```tsx
// ✅ Правильно
<span className="text-xs text-[color:var(--text-tertiary)]">Метка</span>
<div className="text-xs uppercase tracking-wide">СТАТУС</div>
```

### 4. Заголовки разделов/страниц

**Используйте `text-xl`**:

```tsx
// ✅ Правильно
<h1 className="text-xl font-semibold">Заголовок страницы</h1>
<h2 className="text-xl font-semibold">Заголовок раздела</h2>
```

### 5. Важные значения (KPI, метрики)

**Используйте `text-xl`**:

```tsx
// ✅ Правильно
<div className="text-xl font-semibold">{value}%</div>
<div className="text-xl font-semibold">{count}</div>
```

---

## Миграция существующих компонентов

### Шаги миграции:

1. **Заменить все `text-[10px]` на `text-xs`**
   ```tsx
   // Было
   <span className="text-[10px]">Статус</span>
   
   // Стало
   <span className="text-xs">Статус</span>
   ```

2. **Стандартизировать заголовки блоков на `text-lg`**
   ```tsx
   // Было
   <h3 className="text-xl">Заголовок</h3>
   
   // Стало
   <h3 className="text-lg">Заголовок</h3>
   ```

3. **Убрать использование `text-base` в блоках контента (заменить на `text-sm`)**
   ```tsx
   // Было
   <p className="text-base">Текст</p>
   
   // Стало
   <p className="text-sm">Текст</p>
   ```

4. **Ограничить использование `text-2xl` и `text-3xl` только маркетингом**
   - В основном контенте использовать `text-xl` для больших заголовков
   - Только Hero, Features, CTA секции могут использовать `text-2xl`/`text-3xl`

---

## CSS-переменные

Все размеры доступны как CSS-переменные:

```css
--font-size-xs: 12px;
--font-size-sm: 14px;
--font-size-base: 16px;
--font-size-lg: 18px;
--font-size-xl: 24px;
--font-size-2xl: 30px;
--font-size-3xl: 36px;

--line-height-tight: 1.2;
--line-height-normal: 1.5;
--line-height-relaxed: 1.7;
```

Использование в CSS:

```css
.custom-element {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
}
```

---

## Примеры по модулям

### PM (Project Management)

```tsx
// Заголовок проекта
<h1 className="text-xl font-semibold">{project.name}</h1>

// Ключ проекта
<span className="text-xs font-mono">{project.key}</span>

// Значение метрики
<div className="text-xl font-semibold">{progress}%</div>

// Описание метрики
<div className="text-xs text-[color:var(--text-tertiary)]">Прогресс</div>

// Карточка задачи
<div className="text-sm">{task.title}</div>
<div className="text-xs text-[color:var(--text-secondary)]">{task.description}</div>
```

### UI компоненты

```tsx
// ContentBlockTitle (автоматически text-lg)
<ContentBlockTitle>Заголовок</ContentBlockTitle>

// Кнопки (автоматически text-sm для sm/md, text-base для lg)
<Button size="md">Действие</Button>

// Badge (автоматически text-xs)
<Badge>Новый</Badge>

// Input/Textarea (автоматически text-sm)
<Input placeholder="Введите текст" />
```

### Маркетинг

```tsx
// Hero секция
<h1 className="text-3xl sm:text-4xl lg:text-5xl">Главный заголовок</h1>
<p className="text-lg">Подзаголовок</p>

// Секция Features
<h2 className="text-2xl sm:text-3xl">Заголовок</h2>
<p className="text-sm">Описание</p>
```

---

## Чек-лист для проверки компонентов

При создании или обновлении компонента проверьте:

- [ ] Используются только стандартные размеры (`xs`, `sm`, `lg`, `xl`)
- [ ] Нет использования `text-[10px]` или других нестандартных размеров
- [ ] Заголовки блоков используют `text-lg`
- [ ] Основной текст использует `text-sm`
- [ ] Метки используют `text-xs`
- [ ] `text-2xl`/`text-3xl` используются только в маркетинге
- [ ] Используются правильные line-height классы

---

## Файлы системы

1. **`apps/web/design-tokens.ts`** - определение всех размеров
2. **`apps/web/tailwind.config.ts`** - конфигурация Tailwind с размеров
3. **`apps/web/styles/globals.css`** - глобальные стили с CSS-переменными
4. **`apps/web/components/ui/content-block.tsx`** - компонент блока с автоматическими размерами

---

## Преимущества новой системы

1. ✅ **Минимальный набор** - всего 5 основных размеров вместо 10+
2. ✅ **Централизованное управление** - все размеры в одном месте
3. ✅ **Консистентность** - единый стиль по всей платформе
4. ✅ **Простота обновления** - изменение одного значения обновляет всю платформу
5. ✅ **Доступность** - базовый размер 16px соответствует стандартам
6. ✅ **Типобезопасность** - через CSS-переменные можно гарантировать корректность


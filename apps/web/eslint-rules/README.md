# ESLint правила для проекта

## no-old-content-block-styles

Правило для предотвращения использования старых стилей блоков контента.

### Описание

Это правило предупреждает о использовании старых паттернов блоков контента, которые должны быть заменены на компонент `ContentBlock` или CSS классы `.content-block`.

### Использование

Правило создано, но пока не интегрировано в конфигурацию ESLint. Для интеграции:

1. Установите необходимые зависимости для кастомных правил ESLint
2. Добавьте правило в `.eslintrc.cjs`:

```js
const noOldContentBlockStyles = require('./apps/web/eslint-rules/no-old-content-block-styles');

module.exports = {
  // ... существующая конфигурация
  rules: {
    // ... существующие правила
    "no-old-content-block-styles/no-old-content-block-styles": "warn"
  },
  plugins: {
    "no-old-content-block-styles": {
      rules: {
        "no-old-content-block-styles": noOldContentBlockStyles
      }
    }
  }
};
```

### Обнаруживаемые паттерны

Правило обнаруживает следующие старые паттерны:

- `rounded-3xl border border-neutral-900 bg-neutral-950/70 p-6` - основной блок
- `rounded-2xl border border-neutral-800 bg-neutral-950/60` - вложенный блок
- `rounded-2xl border border-neutral-900 bg-neutral-900/40` - маркетинговый блок
- `rounded-2xl border border-neutral-900 bg-neutral-900/50` - маркетинговый блок
- `rounded-xl border border-neutral-800 bg-neutral-950/60 p-4` - маленький блок

### Замена

Вместо старых стилей используйте:

```tsx
// Вместо старых классов
<ContentBlock>
  Контент
</ContentBlock>

// Или CSS классы
<div className="content-block">
  Контент
</div>
```

См. документацию: `apps/web/docs/ui/content-blocks.md`


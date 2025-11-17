# Задание: Миграция блоков контента — Этап 4: Маркетинговые страницы

## Контекст

Продолжаем миграцию блоков контента на единую систему стилей. Завершены:

- ✅ Компоненты PM (Project Management) — 17 компонентов
- ✅ Компоненты маркетплейса — 13 компонентов
- ✅ Страницы приложения — 10 страниц
- ✅ Компоненты UI и утилиты — 12 компонентов

Прогресс: ~30% (мигрировано ~82 компонента и страницы из ~500+ использований)

## Задача

Мигрировать маркетинговые страницы и компоненты маркетинга на использование `ContentBlock` и `ContentBlockTitle` из `@/components/ui/content-block`.

## Важные замечания

- **НЕ трогать навигацию** (MarketingNavbar, MobileMenu) — проверить блоки, но не трогать основную структуру меню
- Тестировать каждый компонент после миграции
- Обновлять roadmap после завершения каждого компонента
- Использовать `ContentBlock` и `ContentBlockTitle` из `@/components/ui/content-block`
- Маркетинговые страницы могут иметь специфические стили — сохранить визуальную согласованность

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
   - `apps/web/components/app/FeatureComingSoon.tsx` — пустое состояние

## Приоритет миграции (по порядку)

### 1. Маркетинговые страницы (11 страниц)

- [ ] `app/(marketing)/blog/page.tsx` — заменить блоки статей и вебинаров
- [ ] `app/(marketing)/projects/page.tsx` — заменить блоки проектов
- [ ] `app/(marketing)/projects/cases/page.tsx` — заменить блоки кейсов
- [ ] `app/(marketing)/product/page.tsx` — заменить блоки продуктов
- [ ] `app/(marketing)/product/pm/page.tsx` — заменить блоки PM-продукта
- [ ] `app/(marketing)/product/marketplace/page.tsx` — заменить блоки маркетплейса
- [ ] `app/(marketing)/product/ai/page.tsx` — заменить блоки AI-продукта
- [ ] `app/(marketing)/pricing/page.tsx` — заменить блоки тарифов и FAQ
- [ ] `app/(marketing)/contractors/page.tsx` — заменить блоки преимуществ
- [ ] `app/(marketing)/specialists/page.tsx` — заменить блоки категорий и рейтинга
- [ ] `app/(marketing)/audience/page.tsx` — заменить блоки аудитории

**Примечание:** Проверить также `app/(marketing)/page.tsx` и другие страницы в этой директории, если они содержат блоки контента.

### 2. Компоненты маркетинга (7 компонентов)

- [ ] `components/marketing/sections/Features.tsx` — заменить блоки функций
- [ ] `components/marketing/sections/Audience.tsx` — заменить `rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6`
- [ ] `components/marketing/sections/CTA.tsx` — заменить блоки призыва к действию
- [ ] `components/marketing/sections/Footer.tsx` — заменить блоки футера
- [ ] `components/marketing/sections/Hero.tsx` — заменить блоки героя
- [ ] `components/marketing/MarketingNavbar.tsx` — проверить блоки (не трогать структуру меню)
- [ ] `components/marketing/MobileMenu.tsx` — проверить блоки (не трогать структуру меню)

**Примечание:** `MarketingNavbar.tsx` и `MobileMenu.tsx` — проверить блоки, но не трогать основную структуру навигации.

## Инструкции по миграции

### Шаг 1: Найти блоки для миграции

Искать паттерны:

- `rounded-3xl border border-neutral-900 bg-neutral-950/70 p-6` — основной блок
- `rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6` — вложенный блок
- `rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6` — маркетинговый блок
- `rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6` — маркетинговый блок
- `rounded-xl border border-neutral-800 bg-neutral-950/60 p-4` — маленький блок

Команда для поиска:

```bash
grep -r "rounded-\(2xl\|3xl\).*border.*bg-neutral" apps/web/app/\(marketing\)/
grep -r "rounded-\(2xl\|3xl\).*border.*bg-neutral" apps/web/components/marketing/
```

### Шаг 2: Заменить на ContentBlock

#### Основной блок

```tsx
// До
<article className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
  <h3 className="text-lg font-semibold text-white">Заголовок</h3>
  Контент
</article>

// После
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

<ContentBlock as="article" size="sm">
  <ContentBlockTitle>Заголовок</ContentBlockTitle>
  Контент
</ContentBlock>
```

#### Маркетинговый блок (с прозрачностью)

```tsx
// До
<section className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6">
  Контент
</section>

// После
<ContentBlock size="sm" variant="muted">
  Контент
</ContentBlock>
```

#### Интерактивный блок (карточка)

```tsx
// До
<article
  className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6 transition hover:border-indigo-500/40 cursor-pointer"
  onClick={handleClick}
>
  Контент
</article>

// После
<ContentBlock as="article" size="sm" interactive onClick={handleClick}>
  Контент
</ContentBlock>
```

#### Блок с заголовком и описанием

```tsx
// До
<article className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
  <h3 className="text-lg font-semibold text-white">Заголовок</h3>
  <p className="text-sm text-neutral-400 mt-2">Описание</p>
  Контент
</article>

// После
<ContentBlock as="article" size="sm">
  <ContentBlockTitle description="Описание">Заголовок</ContentBlockTitle>
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
- [ ] Сохранена визуальная согласованность с маркетинговым дизайном

## Чек-лист для каждого компонента

- [ ] Добавлен импорт `ContentBlock` или `ContentBlockTitle`
- [ ] Заменены все старые классы на компонент
- [ ] Сохранена функциональность
- [ ] Сохранена адаптивность
- [ ] Сохранена визуальная согласованность
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

### Маркетинговые страницы

- Маркетинговые страницы могут иметь специфические стили (например, `bg-neutral-900/40` или `bg-neutral-900/50`)
- Использовать `variant="muted"` для более прозрачных блоков
- Сохранить визуальную иерархию и акценты
- Проверить, что блоки выглядят согласованно с общим дизайном

### Компоненты навигации

- **НЕ трогать** основную структуру MarketingNavbar и MobileMenu
- Мигрировать только внутренние блоки контента
- Если компонент является частью навигации — проверить контекст

### Секции маркетинга

- Секции (Hero, Features, CTA, Footer, Audience) могут иметь специфические стили
- Проверить, что миграция не нарушает визуальную иерархию
- Сохранить все hover-эффекты и интерактивность

### Карточки и статьи

- Карточки проектов, кейсов, статей — использовать `interactive` проп для hover-эффектов
- Сохранить структуру заголовков и описаний
- Использовать `ContentBlockTitle` для заголовков с описанием

## Начать с

Рекомендуется начать с простых страниц (`blog/page.tsx` или `projects/page.tsx`), так как они имеют четкую структуру блоков, а затем перейти к более сложным компонентам секций.

---

**Дата создания:** 2024-12-19  
**Этап:** 4 из 5  
**Приоритет:** Низкий  
**Ожидаемое количество компонентов:** 18 (11 страниц + 7 компонентов)


> **Статус:** Архив  
> **Дата создания:** 2026-01-07  
> **Дата архивирования:** 2026-03-09  
> **Причина архивирования:** Marketplace-first документация заменена новой discovery-first моделью user-facing раздела `Каталог`.

# Legacy Marketplace Structure

Этот документ фиксирует структуру и продуктовые допущения старой версии модуля до начала реорганизации.

## Legacy user-facing модель

Старый модуль описывался как `Маркетплейс` и воспринимался прежде всего как торговая поверхность.

Ключевые признаки старой модели:

- раздел начинался с каталога шаблонов;
- в первом слое навигации были `Корзина`, `Мои заказы`, `Мои продажи`;
- роли описывались через `покупатель` и `продавец`;
- шаблоны, проекты и услуги подавались как объекты покупки;
- publish-flow описывался как магазинная публикация, а не как публичная витрина решения.

## Legacy IA

- `/market/templates` — каталог шаблонов
- `/market/projects` — готовые проекты
- `/market/services` — пакеты услуг
- `/market/categories` — категории и подборки
- `/market/favorites` — избранное
- `/market/cart` — корзина
- `/market/orders` — мои заказы
- `/market/publish` — опубликовать
- `/market/seller` — мои продажи

## Legacy продуктовые допущения

- главным контуром UX считались `каталог -> корзина -> заказ`;
- публичная страница автора не была канонической частью модуля;
- reuse-механика существовала, но была вторичной относительно магазинной подачи;
- коммерческие термины доминировали над discovery/portfolio language.

## Что перенесено в новую модель

Из legacy-модели сохранены:

- единый модуль для шаблонов, готовых решений и услуг;
- возможность брать готовое решение и применять его в проект;
- возможность публиковать PM-проект в модуль;
- внутренние технические контракты `marketplace_*` и `/market/*`.

## Что изменено в новой модели

- user-facing имя: `Каталог`;
- главный вход: discovery-first лента решений;
- добавлена каноническая роль страницы автора;
- публикация описывается как публичная витрина решения;
- корзина и сделки уходят во второй слой.

## Документы, которые были концептуально заменены

- `docs/modules/marketplace/marketplace-overview.md`
- `docs/modules/marketplace/marketplace-templates.md`
- `docs/modules/marketplace/marketplace-ready-projects.md`
- `docs/modules/marketplace/marketplace-services.md`
- `docs/modules/marketplace/marketplace-categories.md`
- `docs/modules/marketplace/marketplace-favorites.md`
- `docs/modules/marketplace/marketplace-cart.md`
- `docs/modules/marketplace/marketplace-orders.md`
- `docs/modules/marketplace/marketplace-publish.md`
- `docs/modules/marketplace/marketplace-seller.md`

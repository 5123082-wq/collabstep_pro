# Справочник модальных окон

Документ содержит актуальную информацию о всех модальных окнах, всплывающих окнах и диалогах в проекте. Документ обновляется при изменении размеров, типов или местоположения компонентов.

**Дата последнего обновления:** 2024-12-20

---

## Группа 1: LargeContentModal (крупные модальные окна)

Универсальный компонент для отображения крупного контента в полноэкранном модальном окне. Использует `LargeContentModal` из `@/components/ui/large-content-modal`.

| №   | Компонент             | Файл                                                       | Размер                  | Где используется                         | Описание                        |
| --- | --------------------- | ---------------------------------------------------------- | ----------------------- | ---------------------------------------- | ------------------------------- |
| 1   | `TemplateDetailModal` | `components/marketplace/templates/TemplateDetailModal.tsx` | Полноэкранное с padding | `/market/templates`                      | Детали шаблона маркетплейса     |
| 2   | `ProjectDetailModal`  | `components/pm/ProjectDetailModal.tsx`                     | Полноэкранное с padding | `/projects` (ProjectsOverviewPageClient) | Детали проекта в модальном окне |
| 3   | `TaskDetailModal`     | `components/pm/TaskDetailModal.tsx`                        | Полноэкранное с padding | `/pm/tasks`                              | Детали задачи с комментариями   |

**Особенности:**

- Все используют базовый компонент `LargeContentModal`
- Полноэкранное отображение с padding `px-[72px] py-6 lg:px-[88px] lg:py-8`
- Закрытие по Escape или клику на overlay
- Автоматическая блокировка скролла body при открытии
- Плавные анимации появления/исчезновения

---

## Группа 2: ContentBlock модалы (унифицированные)

Все компоненты этой группы используют `ContentBlock` с оберткой `max-w-[70vw]` и `max-h-[90vh]`. Высота минимальная, но вмещает весь контент благодаря `overflow-y-auto`.

| №   | Компонент             | Файл                                     | Размер                                    | Где используется                          | Описание                  |
| --- | --------------------- | ---------------------------------------- | ----------------------------------------- | ----------------------------------------- | ------------------------- |
| 1   | `ProjectInviteModal`  | `components/pm/ProjectInviteModal.tsx`   | `max-w-[70vw]`, `max-h-[90vh]`            | `/pm/projects/[id]`, `ProjectDetailModal` | Приглашение в проект      |
| 2   | `InviteDialog`        | `components/right-rail/InviteDialog.tsx` | `max-w-[70vw]`, `max-h-[90vh]`            | HoverRail → DialogManager (глобально)     | Приглашение участника     |
| 3   | `BudgetSettingsModal` | `components/pm/BudgetSettingsModal.tsx`  | `max-w-[70vw]`, `max-h-[90vh]`            | `/pm/projects/[id]`, `ProjectDetailModal` | Настройки бюджета проекта |
| 4   | `CommandPalette`      | `components/app/CommandPalette.tsx`      | `max-w-[70vw]`, `max-h-[90vh]`, `z-[120]` | AppLayoutClient (глобально)               | Командная палитра поиска  |
| 5   | `CsvImportModal`      | `components/finance/CsvImportModal.tsx`  | `max-w-[70vw]`, `max-h-[90vh]`            | `/finance/expenses`                       | Импорт расходов из CSV    |

**Особенности:**

- Все используют обертку `<div style={{ maxWidth: '70vw', width: 'auto' }}>` для гарантированного ограничения ширины
- Высота автоматически подстраивается под контент, но не превышает 90vh
- При переполнении контента появляется вертикальная прокрутка

---

## Группа 3: Modal компоненты (базовые)

Используют компонент `Modal` из `@/components/ui/modal`. По умолчанию имеют размер `max-w-xl` (576px), если не указано иное.

| №   | Компонент                    | Файл                                            | Размер по умолчанию        | Где используется                          | Описание                               |
| --- | ---------------------------- | ----------------------------------------------- | -------------------------- | ----------------------------------------- | -------------------------------------- |
| 1   | `CreateTaskWithProjectModal` | `components/pm/CreateTaskWithProjectModal.tsx`  | `max-w-xl` (576px)         | AppLayoutClient (глобально)               | Создание задачи с выбором проекта      |
| 2   | `CreateTaskModal`            | `components/pm/CreateTaskModal.tsx`             | `max-w-xl` (576px)         | `/pm/projects/[id]`, `ProjectDetailModal` | Создание задачи в проекте              |
| 3   | `PlatformSettingsModal`      | `components/settings/PlatformSettingsModal.tsx` | `max-w-[95vw]`, `h-[90vh]` | AppLayoutClient (глобально)               | Настройки платформы (полноэкранный)    |
| 4   | `RestoreProjectDialog`       | `components/pm/RestoreProjectDialog.tsx`        | `max-w-xl` (576px)         | ArchivedProjectsList                      | Восстановление архивированного проекта |

**Особенности:**

- Базовый компонент `ModalContent` автоматически применяет `max-w-xl`, если не указан класс `max-w-[95vw]` или `max-w-7xl`
- Все имеют `max-h-[90vh]` по умолчанию
- Центрируются на экране с padding `p-4 sm:p-6`

---

## Группа 4: Sheet компоненты (боковые панели)

Используют компонент `Sheet` из `@/components/ui/sheet`. Могут открываться с разных сторон экрана.

### 4.1. Sheet справа (right)

| №   | Компонент             | Файл                                            | Размер                         | Где используется                                               | Описание                 |
| --- | --------------------- | ----------------------------------------------- | ------------------------------ | -------------------------------------------------------------- | ------------------------ |
| 1   | `CommunicationDrawer` | `components/right-rail/CommunicationDrawer.tsx` | `max-w-[420px]` (по умолчанию) | HoverRail → DrawerManager (глобально)                          | Чаты и уведомления       |
| 2   | `RailSettingsDrawer`  | `components/right-rail/RailSettingsDrawer.tsx`  | `max-w-[420px]` (по умолчанию) | HoverRail → DrawerManager (глобально)                          | Настройки правого рельса |
| 3   | `AssistantDrawer`     | `components/right-rail/AssistantDrawer.tsx`     | `max-w-[420px]` (по умолчанию) | HoverRail → DrawerManager (глобально)                          | Ассистент                |
| 4   | `DocumentDrawer`      | `components/right-rail/DocumentDrawer.tsx`      | `max-w-[420px]` (по умолчанию) | HoverRail → DrawerManager (глобально)                          | Документы                |
| 5   | `ExpenseDrawer`       | `components/finance/ExpenseDrawer.tsx`          | `max-w-[420px]` (по умолчанию) | `/pm/projects/[id]`, `ProjectDetailModal`, `/finance/expenses` | Управление расходами     |

### 4.2. Sheet снизу (bottom)

| №   | Компонент   | Файл                                  | Размер                              | Где используется            | Описание         |
| --- | ----------- | ------------------------------------- | ----------------------------------- | --------------------------- | ---------------- |
| 6   | `HoverRail` | `components/right-rail/HoverRail.tsx` | `max-w-2xl` (672px), `max-h-[80vh]` | AppLayoutClient (глобально) | Hover-меню снизу |

**Особенности:**

- Sheet справа/слева: по умолчанию `max-w-[420px]`, высота на весь экран
- Sheet сверху/снизу: по умолчанию `max-w-2xl` (672px)
- Могут иметь кастомные размеры через `style` prop или `className`

---

---

**Примечание:** `TaskDetailDrawer` больше не используется. Заменен на `TaskDetailModal` (Группа 1).

---

## Сводная статистика

### По типам

- **LargeContentModal:** 3 компонента (полноэкранные модальные окна для крупного контента)
- **ContentBlock модалы:** 5 компонентов (унифицированы: `max-w-[70vw]`, `max-h-[90vh]`)
- **Modal компоненты:** 4 компонента (`max-w-xl` по умолчанию, кроме `PlatformSettingsModal`)
- **Sheet компоненты:** 6 компонентов (5 справа, 1 снизу)

**Всего: 18 компонентов модальных окон**

### По размерам

- Полноэкранное с padding: **3 компонента** (LargeContentModal: TemplateDetailModal, ProjectDetailModal, TaskDetailModal)
- `max-w-[70vw]` + `max-h-[90vh]`: **5 компонентов** (ContentBlock модалы)
- `max-w-xl` (576px): **3 компонента** (Modal по умолчанию)
- `max-w-[95vw]` + `h-[90vh]`: **1 компонент** (PlatformSettingsModal)
- `max-w-[420px]`: **5 компонентов** (Sheet справа)
- `max-w-2xl` (672px): **1 компонент** (Sheet снизу)

### По страницам использования

- **Глобально (AppLayoutClient):** 5 модальных окон
- **`/projects`:** 1 модальное окно (ProjectDetailModal)
- **`/pm/projects/[id]`:** 5 модальных окон
- **`/pm/tasks`:** 1 модальное окно (TaskDetailModal)
- **`/finance/expenses`:** 1 модальное окно
- **`/market/templates`:** 1 модальное окно (TemplateDetailModal)
- **HoverRail (глобально):** 5 модальных окон через менеджеры

---

## История изменений

### 2024-12-20

- ✅ Создан универсальный компонент `LargeContentModal` для крупных модальных окон
- ✅ Обновлен `TemplateDetailModal` для использования `LargeContentModal`
- ✅ Создан `ProjectDetailModal` для открытия проектов в модальном окне (заменяет навигацию на `/pm/projects/[id]`)
- ✅ Создан `TaskDetailModal` для открытия задач в модальном окне (заменяет `TaskDetailDrawer`)
- ✅ Обновлена навигация: проекты и задачи теперь открываются в модальных окнах
- ✅ Модернизирован модал импорта CSV: перенесен из Sheet в ContentBlock модал (`CsvImportModal`)
- ✅ Создан отдельный компонент `components/finance/CsvImportModal.tsx` в стиле Группы 2
- ✅ Обновлена документация: добавлена Группа 1 (LargeContentModal), обновлены все группы

### 2024-12-19

- ✅ Унифицированы все ContentBlock модалы: установлен единый размер `max-w-[70vw]` и `max-h-[90vh]`
- ✅ Добавлена обертка с inline-стилями для гарантированного ограничения ширины
- ✅ Создан справочный документ для отслеживания изменений

---

## Примечания для разработчиков

### При добавлении нового модального окна

1. Определите тип (Modal/Sheet/ContentBlock/Кастомный)
2. Выберите подходящий размер согласно группе
3. Обновите этот документ с информацией о новом компоненте
4. Если используете ContentBlock, следуйте паттерну с оберткой `max-w-[70vw]`

### При изменении размеров существующего окна

1. Внесите изменения в код компонента
2. Обновите соответствующую строку в таблице этого документа
3. Добавьте запись в раздел "История изменений"

### Рекомендации по размерам

- **Малые формы** (инвайты, подтверждения): `max-w-[70vw]` или `max-w-xl` (576px)
- **Средние формы** (настройки, создание): `max-w-xl` (576px) или `max-w-2xl` (672px)
- **Большие формы** (настройки платформы): `max-w-[95vw]` или полноэкранное
- **Боковые панели:** `max-w-[420px]` для правой/левой стороны

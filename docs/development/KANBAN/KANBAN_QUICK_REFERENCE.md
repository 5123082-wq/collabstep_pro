# Kanban Drag & Drop - Быстрая справка

## 🚀 Быстрый старт

### 1. Установка
```bash
npm install @angular/cdk
```

### 2. Импорт модуля
```typescript
import { DragDropModule } from '@angular/cdk/drag-drop';
```

### 3. Базовая структура

```html
<!-- Контейнер -->
<div cdkDropListGroup>
  <!-- Колонка -->
  <div cdkDropList [cdkDropListData]="tasks" [id]="status">
    <!-- Карточка -->
    <div cdkDrag [cdkDragData]="task">Task</div>
  </div>
</div>
```

### 4. Обработка Drop

```typescript
drop(event: CdkDragDrop<Task[]>) {
  if (event.previousContainer !== event.container) {
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    // Обновить статус
    const task = { ...event.item.data };
    task.status = event.container.id;
    this.updateTask(task);
  }
}
```

---

## 📋 Ключевые директивы

| Директива | Описание |
|-----------|----------|
| `cdkDropListGroup` | Группирует контейнеры для перетаскивания между ними |
| `cdkDropList` | Делает элемент контейнером для drop |
| `[cdkDropListData]` | Привязывает массив данных к контейнеру |
| `[id]` | Уникальный ID контейнера (для определения целевой колонки) |
| `cdkDrag` | Делает элемент перетаскиваемым |
| `[cdkDragData]` | Данные элемента для события drop |

---

## 🎨 Минимальные стили

```scss
.column {
  height: 100%;
  
  .column-list {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
}

.cdk-drag-placeholder {
  opacity: 0.3;
}

.cdk-drag-animating {
  transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
}
```

---

## ⚡ Моментальное обновление счетчика

```typescript
issues$ = this.store.select(getAllIssues)
  .pipe(
    map(issues => issues.filter(i => i.status === this.status)),
    tap(issues => this.count$ = of(issues.length))
  );
```

```html
{{ count$ | async }}
```

---

## 👥 Иконки пользователей (NG-ZORRO)

```html
<nz-avatar-group>
  <nz-avatar
    *ngFor="let user of task.assignees"
    nzSrc="{{ user.avatarUrl }}"
    nz-tooltip
    nzTooltipTitle="{{ user.name }}"
  ></nz-avatar>
</nz-avatar-group>
```

---

## 🔄 NgRx Flow

```
drop() → dispatch(updateTask) → Effect → HTTP → Success Action → Reducer → UI Update
```

---

## 📝 Чек-лист реализации

- [ ] Установлен `@angular/cdk`
- [ ] Импортирован `DragDropModule`
- [ ] Добавлен `cdkDropListGroup` на контейнер
- [ ] Добавлен `cdkDropList` на колонки
- [ ] Добавлен `cdkDrag` на карточки
- [ ] Реализован метод `drop()`
- [ ] Использован `transferArrayItem` для перемещения
- [ ] Обновление статуса через state management
- [ ] Добавлены стили для анимаций
- [ ] Реализованы счетчики

---

## 🎯 Ключевые функции

### transferArrayItem
```typescript
transferArrayItem(
  from: any[],
  to: any[],
  fromIndex: number,
  toIndex: number
)
```
**Оптимистично обновляет UI** - перемещает элемент сразу, без ожидания сервера.

### moveItemInArray
```typescript
moveItemInArray(
  array: any[],
  fromIndex: number,
  toIndex: number
)
```
Перемещает элемент внутри одного массива (сортировка в колонке).

---

## 💡 Важные моменты

1. **ChangeDetectionStrategy.OnPush** - для производительности
2. **Оптимистичное обновление** - UI обновляется сразу
3. **Observable счетчики** - автоматическое обновление
4. **Flexbox для высоты** - `height: 100%` на колонках
5. **Cubic-bezier анимации** - плавные переходы

---

**Полная документация:** см. [KANBAN_DRAG_DROP_PROTOTYPE.md](./KANBAN_DRAG_DROP_PROTOTYPE.md)


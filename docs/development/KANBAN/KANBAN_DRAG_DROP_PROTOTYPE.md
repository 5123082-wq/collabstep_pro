# Прототип Kanban Drag & Drop - Подробная Документация

## 📋 Оглавление

1. [Обзор функциональности](#обзор-функциональности)
2. [Архитектура решения](#архитектура-решения)
3. [Компоненты и их взаимодействие](#компоненты-и-их-взаимодействие)
4. [Реализация Drag & Drop](#реализация-drag--drop)
5. [Моментальное обновление состояния](#моментальное-обновление-состояния)
6. [Счетчики задач](#счетчики-задач)
7. [Адаптивная высота колонок](#адаптивная-высота-колонок)
8. [Иконки пользователей на карточках](#иконки-пользователей-на-карточках)
9. [Анимации и плавность](#анимации-и-плавность)
10. [Полные примеры кода](#полные-примеры-кода)
11. [Интеграция в другой проект](#интеграция-в-другой-проект)

---

## Обзор функциональности

### Ключевые особенности реализации:

1. **Плавный Drag & Drop** - Перетаскивание задач между колонками с плавными анимациями
2. **Моментальное обновление** - Статус задачи обновляется сразу при перетаскивании, без ожидания ответа сервера
3. **Автоматический пересчет счетчиков** - Количество задач в колонке обновляется мгновенно
4. **Адаптивная высота колонок** - Колонки автоматически подстраиваются под количество задач
5. **Круглые иконки пользователей** - Визуальное отображение назначенных пользователей на карточках

---

## Архитектура решения

### Технологический стек:

- **Angular CDK Drag & Drop** - для функциональности перетаскивания
- **NgRx Store** - для управления состоянием
- **RxJS Observables** - для реактивного обновления UI
- **Change Detection Strategy: OnPush** - для оптимизации производительности

### Поток данных:

```
Пользователь перетаскивает задачу
    ↓
CdkDragDrop event срабатывает
    ↓
Компонент колонки обновляет локальный массив (оптимистично)
    ↓
Dispatch NgRx Action (updateIssue)
    ↓
Effect отправляет HTTP запрос на сервер
    ↓
Reducer обновляет глобальное состояние
    ↓
Селекторы автоматически пересчитывают данные
    ↓
UI обновляется через async pipe
```

---

## Компоненты и их взаимодействие

### Структура компонентов:

```
board-kanban (контейнер)
    ↓
board-kanban-column (колонка) × 4
    ↓
issue-card (карточка задачи) × N
```

### 1. BoardKanbanComponent (Контейнер)

**Роль:** Определяет структуру доски и статусы колонок

**Файл:** `board-kanban.component.ts`

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IssueStatus } from '@core/interfaces/issue';

@Component({
  selector: 'app-board-kanban',
  templateUrl: './board-kanban.component.html',
  styleUrls: ['./board-kanban.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoardKanbanComponent {
  issuesStatuses: IssueStatus[] = [
    IssueStatus.BACKLOG,
    IssueStatus.IN_PROGRESS,
    IssueStatus.IN_REVIEW,
    IssueStatus.DONE,
  ];
}
```

**Шаблон:** `board-kanban.component.html`

```html
<div class="kanban" cdkDropListGroup>
  <div
    class="kanban-column"
    app-board-kanban-column
    *ngFor="let status of issuesStatuses"
    [status]="status"
  ></div>
</div>
```

**Ключевой момент:** `cdkDropListGroup` - связывает все колонки в одну группу для перетаскивания между ними.

**Стили:** `board-kanban.component.scss`

```scss
.kanban {
  display: inline-flex;
  width: 100%;
  padding: 16px 24px;

  .kanban-column {
    width: 25%; // Равномерное распределение колонок
    padding: 0.75rem;
    margin-left: 0.75rem;
    border-radius: 0.375rem;
    background-color: rgba(243, 244, 246, 1);

    &:first-of-type {
      margin-left: 0;
    }
  }
}
```

---

### 2. BoardKanbanColumnComponent (Колонка)

**Роль:** Управляет задачами в одной колонке, обрабатывает drop события, обновляет счетчики

**Файл:** `board-kanban-column.component.ts`

```typescript
import { 
  ChangeDetectionStrategy, 
  Component, 
  Input, 
  OnInit, 
  ViewEncapsulation, 
  OnDestroy 
} from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { tap, map, switchMap, takeUntil } from 'rxjs/operators';

import { Issue, IssueStatus } from '@core/interfaces/issue';
import { getAllIssues } from '@features/issues/state/selectors/issue.selectors';
import { IssuePageActions } from '@features/issues/state/actions';
import { AppState } from '@core/interfaces/app.state';

@Component({
  selector: '[app-board-kanban-column]',
  templateUrl: './board-kanban-column.component.html',
  styleUrls: ['./board-kanban-column.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoardKanbanColumnComponent implements OnInit, OnDestroy {
  @Input() status: IssueStatus;
  issues$: Observable<Issue[]>;
  issuesCount$: Observable<number>;
  anyFilter: Observable<boolean>;
  totalIssuesFiltered: Observable<number>;

  private destroy$ = new Subject();

  constructor(private store: Store<AppState>) { }

  ngOnInit(): void {
    // Получаем все задачи и фильтруем по статусу
    this.issues$ = this.store.select(getAllIssues)
      .pipe(
        map(issues => issues
          .filter(i => i.status === this.status)
          .sort((a, b) => a.listPosition - b.listPosition)
        ),
        // Моментально обновляем счетчик при изменении задач
        tap(issues => this.issuesCount$ = of(issues.length))
      );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // КЛЮЧЕВАЯ ФУНКЦИЯ: Обработка drop события
  drop(event: CdkDragDrop<Issue[]>) {
    const newIssue: Issue = { ...event.item.data };

    // Если задача перемещена внутри той же колонки
    if (event.previousContainer === event.container) {
      // Просто меняем порядок в массиве
      moveItemInArray(
        event.container.data, 
        event.previousIndex, 
        event.currentIndex
      );
    } else {
      // Если задача перемещена в другую колонку
      // 1. Перемещаем задачу в новый массив (оптимистичное обновление UI)
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      
      // 2. Обновляем статус задачи
      newIssue.status = event.container.id as IssueStatus;
      
      // 3. Отправляем action для обновления на сервере
      // UI уже обновлен, это для синхронизации с backend
      this.store.dispatch(IssuePageActions.updateIssue({ issue: newIssue }));
    }
  }
}
```

**Ключевые моменты:**

1. **Оптимистичное обновление:** `transferArrayItem` сразу перемещает задачу в UI, не дожидаясь ответа сервера
2. **Моментальное обновление счетчика:** `issuesCount$` обновляется через `tap` оператор при каждом изменении массива
3. **Автоматическая сортировка:** Задачи сортируются по `listPosition` для сохранения порядка

**Шаблон:** `board-kanban-column.component.html`

```html
<div *ngIf="issues$ | async as issues" class="column">
  <!-- Заголовок колонки с счетчиком -->
  <h3 class="column-title">
    {{ status | issueStatus }}
    <ng-container *ngIf="anyFilter | async">
      {{ totalIssuesFiltered | async }} of
    </ng-container>
    {{ issuesCount$ | async }}
  </h3>
  
  <!-- Контейнер для перетаскивания -->
  <div
    cdkDropList
    [cdkDropListData]="issues"
    [id]="status"
    (cdkDropListDropped)="drop($event)"
    class="column-list"
  >
    <!-- Карточки задач -->
    <app-issue-card
      *ngFor="let issue of issues"
      [issue]="issue"
      cdkDrag
      [cdkDragData]="issue"
    ></app-issue-card>
  </div>
</div>
```

**Важные директивы:**

- `cdkDropList` - делает контейнер зоной для drop
- `[cdkDropListData]="issues"` - привязывает массив задач к контейнеру
- `[id]="status"` - уникальный ID для идентификации колонки
- `cdkDrag` - делает карточку перетаскиваемой
- `[cdkDragData]="issue"` - передает данные задачи в событие drop

**Стили:** `board-kanban-column.component.scss`

```scss
.column {
  height: 100%; // Адаптивная высота
  
  // Анимации при перетаскивании
  .cdk-drop-list-dragging {
    transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);

    .cdk-drag:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  }

  .column-title {
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    color: rgba(17, 24, 39, 1);
  }
  
  .column-list {
    display: flex;
    flex-direction: column;
    height: 100%; // Занимает всю доступную высоту
    
    app-issue-card {
      margin-top: 1rem;
      &:first-child {
        margin-top: 0;
      }
    }
  }
}

// Placeholder при перетаскивании
.cdk-drag-placeholder {
  .issue-card {
    background-color: rgba(150, 150, 200, 0.1);
    border: 1px dashed #abc;
    margin: 5px;

    .issue {
      opacity: 0;
    }
  }
}

// Анимация элементов при сортировке
.cdk-drop-list-dragging .cdk-drag {
  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
}

// Анимация после drop
.cdk-drag-animating {
  transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
}
```

---

### 3. IssueCardComponent (Карточка задачи)

**Роль:** Отображает информацию о задаче, включая иконки пользователей

**Файл:** `issue-card.component.ts`

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';

import { Issue } from '@core/interfaces/issue';
import { AppState } from '@core/interfaces/app.state';
import { IssueUtil } from '@core/utils/issue';

@Component({
  selector: 'app-issue-card',
  templateUrl: './issue-card.component.html',
  styleUrls: ['./issue-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCardComponent implements OnInit {
  @Input() issue: Issue;
  issueTypeIcon: Observable<string>;
  priorityIcon: Observable<string>;

  constructor(
    private store: Store<AppState>,
    private modalService: NzModalService
  ) {}

  ngOnInit(): void {
    this.issueTypeIcon = of(IssueUtil.getIssueTypeIcon(this.issue.type));
    this.priorityIcon = of(IssueUtil.getIssuePriorityIcon(this.issue.priority));
  }

  openIssueDetailModal(issueId: string): void {
    // Открытие модального окна с деталями задачи
  }
}
```

**Шаблон:** `issue-card.component.html`

```html
<div class="issue-card">
  <div (click)="openIssueDetailModal(issue.id)" class="issue">
    <p>{{ issue.title }}</p>
    
    <div class="bottom-section">
      <!-- Иконки типа и приоритета -->
      <div class="status">
        <app-svg-icon
          [name]="issueTypeIcon | async"
          nz-tooltip
          [nzTooltipTitle]="issue.type"
          [size]="20"
        ></app-svg-icon>
        <app-svg-icon
          [name]="priorityIcon | async"
          nz-tooltip
          [nzTooltipTitle]="issue.priority"
          [size]="20"
        ></app-svg-icon>
      </div>
      
      <!-- Номер задачи и иконки пользователей -->
      <div class="assignee">
        <span class="issue-name">
          {{ issue.projectKey | uppercase }}-{{ issue.key }}
        </span>
        
        <!-- КРУГЛЫЕ ИКОНКИ ПОЛЬЗОВАТЕЛЕЙ -->
        <nz-avatar-group>
          <nz-avatar
            *ngFor="let user of issue.assignees"
            nzIcon="user"
            nzSrc="{{ user?.avatarUrl }}"
            nz-tooltip
            nzTooltipTitle="Assignee: {{ user?.name }}"
            nzTooltipPlacement="bottom"
          ></nz-avatar>
        </nz-avatar-group>
      </div>
    </div>
  </div>
</div>
```

**Стили:** `issue-card.component.scss`

```scss
.issue-card {
  touch-action: manipulation; // Оптимизация для touch устройств
  cursor: grab; // Курсор "рука" при наведении
  flex-grow: 1;
  display: flex;

  .issue {
    padding: 1.25rem;
    flex-grow: 1;
    border-radius: 0.375rem;
    background-color: rgba(255, 255, 255, 1);
    box-shadow: 0 0 #0000, 0 0 #0000, 0 1px 3px 0 rgba(0, 0, 0, 0.1), 
                0 1px 2px 0 rgba(0, 0, 0, 0.06);

    &:hover {
      background: #ebecf0;
    }

    p {
      color: rgba(17, 34, 39, 1);
      line-height: 1.375;
      font-weight: 500;
      display: block;
      height: 4.28571429em;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 3; // Ограничение до 3 строк
      -webkit-box-orient: vertical;
    }

    .bottom-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;

      .status {
        display: inline-flex;
        align-items: center;

        app-svg-icon:first-child {
          margin-right: 0.5rem;
        }
      }

      .assignee {
        display: inline-flex;
        align-items: center;

        .issue-name {
          margin-right: 0.5em;
        }
      }
    }
  }
}

// Стили для круглых иконок пользователей
nz-avatar {
  width: 24px;
  height: 24px;
  border-width: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
}
```

---

## Реализация Drag & Drop

### Пошаговый процесс:

#### 1. Установка зависимостей

```bash
npm install @angular/cdk
```

#### 2. Импорт модуля

```typescript
import { DragDropModule } from '@angular/cdk/drag-drop';

@NgModule({
  imports: [
    DragDropModule,
    // ... другие модули
  ]
})
export class BoardModule { }
```

#### 3. Настройка контейнера (колонки)

```html
<div
  cdkDropList
  [cdkDropListData]="issues"
  [id]="status"
  (cdkDropListDropped)="drop($event)"
  class="column-list"
>
```

**Параметры:**
- `cdkDropList` - делает элемент зоной для drop
- `[cdkDropListData]` - массив данных, связанный с контейнером
- `[id]` - уникальный идентификатор (используется для определения целевой колонки)
- `(cdkDropListDropped)` - обработчик события drop

#### 4. Настройка перетаскиваемого элемента (карточки)

```html
<app-issue-card
  *ngFor="let issue of issues"
  [issue]="issue"
  cdkDrag
  [cdkDragData]="issue"
></app-issue-card>
```

**Параметры:**
- `cdkDrag` - делает элемент перетаскиваемым
- `[cdkDragData]` - данные, передаваемые в событие drop

#### 5. Группировка контейнеров

```html
<div class="kanban" cdkDropListGroup>
  <!-- Колонки -->
</div>
```

`cdkDropListGroup` позволяет перетаскивать элементы между всеми контейнерами внутри группы.

#### 6. Обработка события Drop

```typescript
drop(event: CdkDragDrop<Issue[]>) {
  const newIssue: Issue = { ...event.item.data };

  if (event.previousContainer === event.container) {
    // Перемещение внутри той же колонки
    moveItemInArray(
      event.container.data, 
      event.previousIndex, 
      event.currentIndex
    );
  } else {
    // Перемещение в другую колонку
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    
    // Обновление статуса
    newIssue.status = event.container.id as IssueStatus;
    
    // Отправка на сервер
    this.store.dispatch(IssuePageActions.updateIssue({ issue: newIssue }));
  }
}
```

**Свойства события CdkDragDrop:**

- `event.previousContainer` - исходный контейнер
- `event.container` - целевой контейнер
- `event.previousIndex` - исходная позиция
- `event.currentIndex` - новая позиция
- `event.item.data` - данные перетаскиваемого элемента
- `event.container.id` - ID целевого контейнера

---

## Моментальное обновление состояния

### Стратегия оптимистичного обновления:

1. **UI обновляется сразу** - `transferArrayItem` мгновенно перемещает задачу
2. **Запрос отправляется асинхронно** - через NgRx Effect
3. **При ошибке** - можно откатить изменения (в данном проекте не реализовано)

### NgRx Actions:

**Файл:** `issue-page.actions.ts`

```typescript
import { createAction, props } from "@ngrx/store";
import { Issue } from "@core/interfaces/issue";

export const updateIssue = createAction(
  '[Issue Page] Update Issue',
  props<{ issue: Issue }>()
);
```

### NgRx Effects:

**Файл:** `issue.effects.ts`

```typescript
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

import { IssueService } from '@features/issues/services/issue.service';
import { IssueApiActions, IssuePageActions } from '@features/issues/state/actions';

@Injectable()
export class IssueEffects {
  constructor(
    private actions$: Actions,
    private issueService: IssueService
  ) {}

  updateIssue$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(IssuePageActions.updateIssue),
      mergeMap((action) => {
        // Отправка HTTP запроса
        return this.issueService.update(action.issue.id, action.issue).pipe(
          map((issue) => IssueApiActions.updateIssueSuccess({ issue })),
          catchError((error) => {
            // Обработка ошибки
            return of(IssueApiActions.updateIssueFailure({ error }));
          })
        );
      })
    );
  });
}
```

### NgRx Reducer:

**Файл:** `issue.reducer.ts`

```typescript
import { createReducer, on } from '@ngrx/store';
import { IssueApiActions } from '@features/issues/state/actions';

export interface State {
  issues: Issue[];
  isEditing: boolean;
  error: string;
}

const initialState: State = {
  issues: [],
  isEditing: false,
  error: null
}

export const reducer = createReducer<State>(
  initialState,
  // Обновление задачи после успешного ответа сервера
  on(IssueApiActions.updateIssueSuccess, (state, action): State => {
    const updatedIssues = state.issues.map(
      issue => action.issue.id === issue.id ? action.issue : issue
    );
    return {
      ...state,
      issues: updatedIssues
    }
  })
);
```

---

## Счетчики задач

### Реализация реактивного счетчика:

```typescript
export class BoardKanbanColumnComponent implements OnInit {
  issues$: Observable<Issue[]>;
  issuesCount$: Observable<number>;

  ngOnInit(): void {
    this.issues$ = this.store.select(getAllIssues)
      .pipe(
        map(issues => issues
          .filter(i => i.status === this.status)
          .sort((a, b) => a.listPosition - b.listPosition)
        ),
        // КЛЮЧЕВОЙ МОМЕНТ: Счетчик обновляется при каждом изменении
        tap(issues => this.issuesCount$ = of(issues.length))
      );
  }
}
```

**В шаблоне:**

```html
<h3 class="column-title">
  {{ status | issueStatus }}
  {{ issuesCount$ | async }}
</h3>
```

### Почему это работает моментально:

1. `transferArrayItem` сразу изменяет массив `issues`
2. Observable `issues$` автоматически эмитит новое значение
3. `tap` оператор пересчитывает длину массива
4. `async` pipe в шаблоне автоматически обновляет отображение

### Альтернативный подход (через селектор):

```typescript
// Селектор
export const getIssuesCountByStatus = createSelector(
  getAllIssues,
  (issues: Issue[], props: { status: IssueStatus }) =>
    issues.filter(i => i.status === props.status).length
);

// В компоненте
issuesCount$ = this.store.select(getIssuesCountByStatus, { status: this.status });
```

---

## Адаптивная высота колонок

### Реализация через Flexbox:

**Структура стилей:**

```scss
// Контейнер страницы (app.component.scss)
.app-layout {
  height: 100vh; // Полная высота экрана
}

nz-content {
  flex: 1 1 0%;
  overflow: auto;
  background: #fff;
}

// Колонка (board-kanban-column.component.scss)
.column {
  height: 100%; // Занимает всю доступную высоту родителя
}

.column-list {
  display: flex;
  flex-direction: column;
  height: 100%; // Занимает всю высоту колонки
  
  app-issue-card {
    margin-top: 1rem;
    &:first-child {
      margin-top: 0;
    }
  }
}
```

### Как это работает:

1. **Родительский контейнер** имеет фиксированную высоту (`100vh` или `100%`)
2. **Колонка** наследует высоту через `height: 100%`
3. **Список задач** использует `flex-direction: column`, что позволяет ему растягиваться
4. **Карточки** добавляются динамически, колонка автоматически подстраивается

### Важные моменты:

- Используйте `flex-direction: column` для вертикального расположения
- Не задавайте фиксированную `max-height` для колонок
- Позвольте контейнеру растягиваться естественным образом

---

## Иконки пользователей на карточках

### Использование NG-ZORRO Avatar Group:

**Установка:**

```bash
npm install ng-zorro-antd
```

**Импорт модуля:**

```typescript
import { NzAvatarModule } from 'ng-zorro-antd/avatar';

@NgModule({
  imports: [NzAvatarModule]
})
```

**В шаблоне:**

```html
<nz-avatar-group>
  <nz-avatar
    *ngFor="let user of issue.assignees"
    nzIcon="user"
    nzSrc="{{ user?.avatarUrl }}"
    nz-tooltip
    nzTooltipTitle="Assignee: {{ user?.name }}"
    nzTooltipPlacement="bottom"
  ></nz-avatar>
</nz-avatar-group>
```

**Стили:**

```scss
nz-avatar {
  width: 24px;
  height: 24px;
  border-width: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### Альтернатива без NG-ZORRO:

```html
<div class="avatar-group">
  <div 
    *ngFor="let user of issue.assignees"
    class="avatar"
    [title]="user.name"
  >
    <img [src]="user.avatarUrl" [alt]="user.name" />
  </div>
</div>
```

```scss
.avatar-group {
  display: flex;
  align-items: center;
  gap: -8px; // Перекрытие аватаров
  
  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid white;
    overflow: hidden;
    margin-left: -8px;
    
    &:first-child {
      margin-left: 0;
    }
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}
```

---

## Анимации и плавность

### CSS анимации для Drag & Drop:

```scss
// Анимация при перетаскивании
.cdk-drop-list-dragging {
  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);

  .cdk-drag:not(.cdk-drag-placeholder) {
    transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
  }
}

// Placeholder (призрачный элемент)
.cdk-drag-placeholder {
  .issue-card {
    background-color: rgba(150, 150, 200, 0.1);
    border: 1px dashed #abc;
    margin: 5px;

    .issue {
      opacity: 0;
    }
  }
}

// Анимация элементов при сортировке
.cdk-drop-list-dragging .cdk-drag {
  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
}

// Анимация после drop
.cdk-drag-animating {
  transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
}
```

### Ключевые моменты:

1. **Cubic-bezier timing function** - обеспечивает плавное ускорение/замедление
2. **Короткие переходы** (250-300ms) - быстрая реакция без задержек
3. **Placeholder** - визуальная обратная связь при перетаскивании
4. **Transform вместо position** - более производительная анимация

### Дополнительные эффекты:

```scss
// Эффект при наведении на карточку
.issue-card {
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
  
  .issue {
    transition: background-color 0.2s ease;
    
    &:hover {
      background: #ebecf0;
    }
  }
}
```

---

## Полные примеры кода

### Полный код BoardKanbanColumnComponent:

```typescript
import { 
  ChangeDetectionStrategy, 
  Component, 
  Input, 
  OnInit, 
  ViewEncapsulation, 
  OnDestroy 
} from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { tap, map, switchMap, takeUntil } from 'rxjs/operators';

import { Issue, IssueStatus } from '@core/interfaces/issue';
import { getAllIssues } from '@features/issues/state/selectors/issue.selectors';
import { IssuePageActions } from '@features/issues/state/actions';
import { AppState } from '@core/interfaces/app.state';
import * as fromFilterSelectors from '@features/board/state/filter.selectors';
import * as fromFilter from '@features/board/state/filter.reducer';
import * as fromUserSelectors from '@features/user/state/user.selectors';

@Component({
  selector: '[app-board-kanban-column]',
  templateUrl: './board-kanban-column.component.html',
  styleUrls: ['./board-kanban-column.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoardKanbanColumnComponent implements OnInit, OnDestroy {
  @Input() status: IssueStatus;
  issues$: Observable<Issue[]>;
  issuesCount$: Observable<number>;
  anyFilter: Observable<boolean>;
  totalIssuesFiltered: Observable<number>;

  currentUserId: string;
  private destroy$ = new Subject();

  constructor(private store: Store<AppState>) { }

  ngOnInit(): void {
    this.store.select(fromUserSelectors.getCurrentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(currentUserId => this.currentUserId = currentUserId);

    this.anyFilter = this.store.select(fromFilterSelectors.isAnyFilter);

    this.issues$ = combineLatest([
      this.store.select(getAllIssues)
        .pipe(
          map(issues => issues
            .filter(i => i.status === this.status)
            .sort((a, b) => a.listPosition - b.listPosition)
          ),
          tap(issues => this.issuesCount$ = of(issues.length))
        ),
      this.store.select(fromFilterSelectors.getFilterState)
    ]).pipe(
      switchMap(([issues, filterState]) => this.filterIssues(issues, filterState)),
      tap(issues => this.totalIssuesFiltered = of(issues.length))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  drop(event: CdkDragDrop<Issue[]>) {
    const newIssue: Issue = { ...event.item.data };

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex);
      newIssue.status = event.container.id as IssueStatus;
      this.store.dispatch(IssuePageActions.updateIssue({ issue: newIssue }));
    }
  }

  private filterIssues(issues: Issue[], filter: fromFilter.State): Observable<Issue[]> {
    const { searchTerm, userIds, onlyMyIssues, recentlyUpdated } = filter;
    return of(issues.filter(issue => {
      const isMatchTerm = searchTerm
        ? issue.title.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase())
        : true;

      const issueUserIds = issue.assignees.map(u => u.id);

      if (!issueUserIds.length) {
        issueUserIds.push('unassigned');
      }
      const isIncludeUsers = userIds.length
        ? issueUserIds.some(userId => userIds.includes(userId))
        : true;

      const areMyIssues = onlyMyIssues
        ? this.currentUserId && issueUserIds.includes(this.currentUserId)
        : true;

      const areRecentlyUpdated = recentlyUpdated
        ? DateUtil.getDays(new Date(issue.updatedAt)) === 0
        : true;

      return isMatchTerm && isIncludeUsers && areMyIssues && areRecentlyUpdated;
    }));
  }
}
```

---

## Интеграция в другой проект

### Пошаговый план:

#### Шаг 1: Установка зависимостей

```bash
npm install @angular/cdk
# Если используете NG-ZORRO
npm install ng-zorro-antd
```

#### Шаг 2: Импорт модулей

```typescript
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NzAvatarModule } from 'ng-zorro-antd/avatar'; // Опционально

@NgModule({
  imports: [
    DragDropModule,
    NzAvatarModule, // Опционально
    // ... другие модули
  ]
})
export class YourKanbanModule { }
```

#### Шаг 3: Создание интерфейсов

```typescript
// interfaces/task.ts
export enum TaskStatus {
  BACKLOG = 'Backlog',
  IN_PROGRESS = 'InProgress',
  IN_REVIEW = 'InReview',
  DONE = 'Done',
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assignees: User[];
  listPosition: number;
  // ... другие поля
}
```

#### Шаг 4: Создание компонента колонки

Скопируйте код `BoardKanbanColumnComponent`, адаптировав под ваши интерфейсы.

#### Шаг 5: Настройка NgRx (если используется)

```typescript
// actions
export const updateTask = createAction(
  '[Task Page] Update Task',
  props<{ task: Task }>()
);

// effects
updateTask$ = createEffect(() => {
  return this.actions$.pipe(
    ofType(TaskPageActions.updateTask),
    mergeMap((action) => {
      return this.taskService.update(action.task.id, action.task).pipe(
        map((task) => TaskApiActions.updateTaskSuccess({ task })),
        catchError((error) => of(TaskApiActions.updateTaskFailure({ error })))
      );
    })
  );
});
```

#### Шаг 6: Адаптация стилей

Скопируйте SCSS файлы и адаптируйте под ваш дизайн.

### Ключевые моменты для успешной интеграции:

1. **Совместимость версий Angular CDK** - убедитесь, что версия совместима с вашим Angular
2. **Change Detection Strategy** - используйте `OnPush` для производительности
3. **Оптимистичное обновление** - сначала обновляйте UI, потом отправляйте на сервер
4. **Обработка ошибок** - предусмотрите откат изменений при ошибке
5. **Мобильная поддержка** - добавьте `touch-action: manipulation` для карточек

### Чек-лист интеграции:

- [ ] Установлен `@angular/cdk`
- [ ] Импортирован `DragDropModule`
- [ ] Создан компонент колонки с `cdkDropList`
- [ ] Создан компонент карточки с `cdkDrag`
- [ ] Реализован метод `drop()` с `transferArrayItem`
- [ ] Настроено обновление состояния (NgRx или другой state management)
- [ ] Добавлены стили для анимаций
- [ ] Реализованы счетчики через Observable
- [ ] Настроена адаптивная высота колонок
- [ ] Добавлены иконки пользователей
- [ ] Протестировано на разных устройствах

---

## Дополнительные улучшения

### 1. Обработка ошибок с откатом:

```typescript
drop(event: CdkDragDrop<Issue[]>) {
  const previousData = [...event.container.data];
  const newIssue: Issue = { ...event.item.data };

  if (event.previousContainer !== event.container) {
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    
    newIssue.status = event.container.id as IssueStatus;
    
    this.store.dispatch(IssuePageActions.updateIssue({ issue: newIssue }))
      .pipe(
        catchError((error) => {
          // Откат изменений при ошибке
          event.container.data = previousData;
          return of(null);
        })
      );
  }
}
```

### 2. Визуальная обратная связь:

```scss
.cdk-drag-preview {
  box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
              0 8px 10px 1px rgba(0, 0, 0, 0.14),
              0 3px 14px 2px rgba(0, 0, 0, 0.12);
  opacity: 0.8;
}
```

### 3. Ограничение перетаскивания:

```typescript
// Только определенные статусы могут принимать задачи
canDrop = (drag: CdkDrag, drop: CdkDropList) => {
  return drop.id !== 'DONE' || drag.data.priority === 'HIGH';
};

// В шаблоне
<div
  cdkDropList
  [cdkDropListDisabled]="!canDrop"
  [cdkDropListEnterPredicate]="canDrop"
>
```

---

## Заключение

Эта реализация Kanban Drag & Drop обеспечивает:

✅ **Плавность** - благодаря CSS анимациям и оптимизации  
✅ **Моментальность** - оптимистичное обновление UI  
✅ **Реактивность** - автоматическое обновление счетчиков  
✅ **Адаптивность** - гибкая высота колонок  
✅ **Визуальная обратная связь** - иконки пользователей, placeholder, hover эффекты  

Используйте этот документ как прототип для реализации аналогичной функциональности в вашем проекте.

---

**Автор документации:** На основе анализа проекта Kanban Project Management  
**Дата:** 2024  
**Версия:** 1.0


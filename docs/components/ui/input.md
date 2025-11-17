# Input

## Описание
Компонент `Input` стилизует текстовые поля с учётом токенов (`--surface-base`, `--surface-border-subtle`, `--text-primary`). Контрол поддерживает плавные переходы и адаптируется к состояниям формы.

## Состояния
- **Hover** — усиливает контур за счёт токена `--surface-border-strong`.
- **Focus** — подсвечивает контур токеном `--accent-border` и добавляет обводку `--accent-border-strong`.
- **Disabled** — меняет фон на `--surface-muted`, текст и плейсхолдер — на `--text-tertiary`, отключает курсор.

## Пример использования
```tsx
import { Input } from '@/components/ui/input';

export function NameField() {
  return (
    <label className="flex flex-col gap-2 text-sm text-[color:var(--text-secondary)]">
      Имя проекта
      <Input placeholder="Укажите название" />
    </label>
  );
}
```

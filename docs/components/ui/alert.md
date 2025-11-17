# Alert

## Описание
`Alert` отображает статусные сообщения с цветным индикатором слева. Компонент использует токены поверхностей (`--surface-base`, `--surface-border-strong`, `--text-primary`) и поддерживает вариации `info`, `success`, `warning`, `danger`.

## Состояния
- **Hover** — наследуется от контейнера: фон и бордер остаются стабильными, чтобы сохранить читаемость.
- **Active** — не применяется (алерты не кликабельны по умолчанию).
- **Disabled** — не требуется; компонент предоставляет статическую информацию.

## Пример использования
```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function Notifications() {
  return (
    <Alert variant="warning">
      <AlertTitle>Требуется внимание</AlertTitle>
      <AlertDescription>
        Баланс эскроу счёта опустился ниже безопасного порога. Пополните счёт в течение суток.
      </AlertDescription>
    </Alert>
  );
}
```

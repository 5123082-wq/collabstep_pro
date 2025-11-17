# Form

## Описание
`Form` собирает стандартизированную обёртку для форм: фон `--surface-base`, обводка `--surface-border-subtle`, тени и внутренние отступы. Дополнительные элементы (`FormField`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `FormActions`) помогают строить вертикальные и горизонтальные формы с единым стилем.

## Состояния
- **Hover** — усиливает тень контейнера, подчёркивая активную область.
- **Focus within** — поле подсвечивает границу токеном `--accent-border` и меняет фон на `--surface-muted`.
- **Disabled** — следует поведению вложенных контролов (`Input`, `Button` и т.д.), сохраняя стили токенов.

## Пример использования
```tsx
import { Button } from '@/components/ui/button';
import {
  Form,
  FormActions,
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export function ProfileForm() {
  return (
    <Form layout="horizontal" onSubmit={(event) => event.preventDefault()}>
      <FormField>
        <FormLabel htmlFor="name">Имя</FormLabel>
        <FormControl>
          <Input id="name" placeholder="Укажите имя" required />
          <FormDescription>Имя увидят участники команды.</FormDescription>
        </FormControl>
      </FormField>
      <FormField>
        <FormLabel htmlFor="email">Почта</FormLabel>
        <FormControl>
          <Input id="email" type="email" placeholder="work@example.com" />
          <FormMessage>Подтвердите корпоративный адрес.</FormMessage>
        </FormControl>
      </FormField>
      <FormActions>
        <Button variant="ghost" type="reset">
          Сбросить
        </Button>
        <Button type="submit">Сохранить</Button>
      </FormActions>
    </Form>
  );
}
```

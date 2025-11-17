# Modal

## Описание
Компонент `Modal` реализует диалоговое окно с блокировкой прокрутки, обработкой клавиши `Escape` и плавными анимациями появления. Он использует токены поверхностей (`--surface-popover`, `--surface-overlay`) и текста (`--text-primary`, `--text-secondary`) для согласованного оформления.

## Состояния
- **Hover** — фон и кнопка закрытия реагируют на наведение, подчёркивая интерактивные элементы.
- **Active** — при нажатии оверлей плавно исчезает, а контент сдвигается вниз.
- **Disabled** — модалка блокирует взаимодействие с фоном до закрытия.

## Пример использования
```tsx
import { useState } from 'react';
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export function DemoModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Открыть модалку</Button>
      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Подтвердите действие</ModalTitle>
            <ModalDescription>Это действие нельзя отменить.</ModalDescription>
          </ModalHeader>
          <ModalBody>
            Проверьте настройки проекта и убедитесь, что подключены все участники.
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button>Продолжить</Button>
          </ModalFooter>
          <ModalClose />
        </ModalContent>
      </Modal>
    </>
  );
}
```

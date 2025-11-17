'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ContentBlock } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
import { useUI } from '@/stores/ui';

const REVIEW_STEPS = [
  { id: 'legal', title: 'Юридический отдел', description: 'Проверка договора и NDA' },
  { id: 'owner', title: 'Владелец проекта', description: 'Подтверждение условий и бюджета' },
  { id: 'partner', title: 'Партнёр', description: 'Встречная подпись и финализация' }
];

export default function DocumentDrawer() {
  const drawer = useUI((state) => state.drawer);
  const closeDrawer = useUI((state) => state.closeDrawer);
  const isOpen = drawer === 'document';
  const [comment, setComment] = useState('');
  const [withSignature, setWithSignature] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setComment('');
      setWithSignature(true);
    }
  }, [isOpen]);

  const handleApprove = () => {
    toast('Документ отправлен на подпись');
    closeDrawer();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(next) => (!next ? closeDrawer() : undefined)}>
      <SheetContent className="flex h-full flex-col bg-neutral-900/95 p-0 text-neutral-50 shadow-2xl" side="right">
        <SheetHeader className="px-6 py-4">
          <SheetTitle>Документ проекта</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-100">Сводка</h3>
            <ContentBlock size="sm">
              <p className="text-sm text-neutral-300">
                Эскроу договор для подрядчика «Print Studio». Сумма: 750 000 ₽. Срок действия — 30 дней.
              </p>
            </ContentBlock>
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-100">Маршрут согласования</h3>
            <ol className="space-y-2">
              {REVIEW_STEPS.map((step, index) => (
                <li key={step.id}>
                  <ContentBlock size="sm">
                    <p className="text-sm font-semibold text-neutral-100">
                      {index + 1}. {step.title}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">{step.description}</p>
                  </ContentBlock>
                </li>
              ))}
            </ol>
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-100">Комментарий</h3>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="min-h-[120px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
              placeholder="Добавьте детали для подрядчика или юриста"
            />
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-100">Дополнительно</h3>
            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={withSignature}
                onChange={(event) => setWithSignature(event.target.checked)}
                className="h-4 w-4 rounded border border-neutral-700 bg-neutral-900 text-indigo-500 focus:ring-2 focus:ring-indigo-400"
              />
              Требуется квалифицированная подпись
            </label>
            <ContentBlock variant="dashed" size="sm">
              <p className="text-xs text-neutral-400">
                Файлы прикреплены автоматически. Подписанты получат уведомления после публикации.
              </p>
            </ContentBlock>
          </section>
          <div className="mt-auto flex flex-col gap-3 border-t border-neutral-800 pt-6">
            <button
              type="button"
              onClick={handleApprove}
              className="w-full rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            >
              Отправить на подпись
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm font-medium text-neutral-300 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            >
              Закрыть
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


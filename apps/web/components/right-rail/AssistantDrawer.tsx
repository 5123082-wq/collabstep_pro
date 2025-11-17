'use client';

import { useMemo, useState } from 'react';
import AssistantIcon from './AssistantIcon';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ContentBlock } from '@/components/ui/content-block';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/ui/toast';
import { useUI } from '@/stores/ui';

const SUGGESTIONS = [
  { id: 'next-steps', title: 'Предложить следующие шаги', description: 'AI составит чек-лист на неделю' },
  { id: 'estimate', title: 'Оценить смету', description: 'Сгенерировать оценку задач и сроки' },
  { id: 'summary', title: 'Собрать саммари встречи', description: 'Конспект по заметкам и чатам' }
];

export default function AssistantDrawer() {
  const drawer = useUI((state) => state.drawer);
  const closeDrawer = useUI((state) => state.closeDrawer);
  const isOpen = drawer === 'assistant';
  const [prompt, setPrompt] = useState('');

  const placeholder = useMemo(() => 'Например: Подготовь апдейт для команды к пятнице', []);

  const handleSend = () => {
    const text = prompt.trim();
    if (!text) {
      toast('Введите запрос для помощника');
      return;
    }
    toast('AI-ассистент готовит ответ…');
    setPrompt('');
  };

  const handleSuggestion = (message: string) => {
    setPrompt(message);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(next) => (!next ? closeDrawer() : undefined)}>
      <SheetContent className="flex h-full flex-col bg-neutral-900/95 p-0 text-neutral-50 shadow-2xl" side="right">
        <SheetHeader className="flex items-center gap-3 px-6 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-200">
            <AssistantIcon className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
          </span>
          <div>
            <SheetTitle>AI-помощник</SheetTitle>
            <p className="text-xs text-neutral-400">Отвечает на вопросы по проекту и предлагает сценарии</p>
          </div>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-100">Рекомендуем попробовать</h3>
            <div className="grid gap-3">
              {SUGGESTIONS.map((item) => (
                <ContentBlock
                  key={item.id}
                  as="button"
                  size="sm"
                  interactive
                  type="button"
                  onClick={() => handleSuggestion(item.title)}
                  className="flex flex-col items-start text-left"
                >
                  <span className="text-sm font-semibold text-neutral-100">{item.title}</span>
                  <span className="text-xs text-neutral-400">{item.description}</span>
                </ContentBlock>
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-100">История</h3>
            <div className="space-y-3">
              <ContentBlock as="article" size="sm">
                <p className="text-xs uppercase tracking-wide text-indigo-200">AI</p>
                <p className="mt-2 text-sm text-neutral-300">
                  Я подготовил план запуска мерча. Готов отправить команде?
                </p>
              </ContentBlock>
              <ContentBlock as="article" size="sm" variant="muted">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Вы</p>
                <p className="mt-2 text-sm text-neutral-300">Сделай сравнительную таблицу подрядчиков по стоимости.</p>
              </ContentBlock>
            </div>
          </section>
        </div>
        <div className="border-t border-neutral-800 bg-neutral-950/80 px-6 py-5">
          <ContentBlock size="sm">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={placeholder}
              className="h-24 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="text-xs text-neutral-400 underline-offset-2 transition hover:text-neutral-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={handleSend}
                className={cn(
                  'rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                  prompt.trim()
                    ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                    : 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                )}
                disabled={!prompt.trim()}
              >
                Отправить
              </button>
            </div>
          </ContentBlock>
        </div>
      </SheetContent>
    </Sheet>
  );
}


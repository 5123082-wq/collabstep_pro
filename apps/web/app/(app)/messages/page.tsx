'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Maximize2, MessageSquarePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type Thread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  unread?: number;
  tags?: string[];
  participants?: string[];
};

type Message = {
  id: string;
  author: string;
  text: string;
  time: string;
  isOwn?: boolean;
  status?: 'sent' | 'delivered' | 'read';
};

const mockThreads: Thread[] = [
  {
    id: 'pm-964',
    title: 'ПМ-964: Световые ниши',
    preview: 'Проверить отверстия под светильники, ширина 84?',
    updatedAt: 'Сегодня, 16:18',
    unread: 3,
    tags: ['Проект'],
    participants: ['Кузнецова А.', 'Шелепнев В.']
  },
  {
    id: 'support-ops',
    title: 'Поддержка / Согласования',
    preview: 'Файл с размерами и гибами обновили',
    updatedAt: 'Сегодня, 15:02',
    unread: 0,
    tags: ['Сервис'],
    participants: ['Каракян А.', 'Команда тех.']
  },
  {
    id: 'design-team',
    title: 'Дизайн команда',
    preview: 'Отгружено 29.07, проверьте чертежи',
    updatedAt: 'Вчера, 19:44',
    unread: 0,
    tags: ['Внутренний'],
    participants: ['Буданова А.', 'Команда']
  }
];

const mockMessages: Record<string, Message[]> = {
  'pm-964': [
    { id: '1', author: 'Кузнецова А.', text: 'В чертеже ширина 84 или 82?', time: '16:18' },
    {
      id: '2',
      author: 'Шелепнев В.',
      text: 'Смотрю по вашим чертежам — накинуто по 2 мм',
      time: '16:20',
      isOwn: true,
      status: 'read'
    },
    {
      id: '3',
      author: 'Кузнецова А.',
      text: 'Ок, подтвердите итоговое значение и отверстия 10.6С',
      time: '16:22'
    }
  ],
  'support-ops': [
    {
      id: '1',
      author: 'Каракян А.',
      text: 'Файл с размерами и гибами обновили',
      time: '15:02'
    }
  ],
  'design-team': [
    { id: '1', author: 'Буданова А.', text: 'Отгружено 29.07', time: '19:44' },
    { id: '2', author: 'Шелепнев В.', text: 'Приму к проверке', time: '19:48', isOwn: true, status: 'delivered' }
  ]
};

export default function MessagesPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(mockThreads[0]?.id ?? null);
  const [loadState, setLoadState] = useState<'ready' | 'loading' | 'error'>('ready');

  const activeThread = useMemo(
    () => mockThreads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId]
  );
  const messages = activeThread ? mockMessages[activeThread.id] ?? [] : [];

  const renderThreadList = () => {
    if (loadState === 'loading') {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-16 animate-pulse rounded-xl bg-neutral-900/70" />
          ))}
        </div>
      );
    }

    if (loadState === 'error') {
      return (
        <div className="rounded-xl border border-red-900/50 bg-red-900/10 p-4 text-sm text-red-200">
          Не удалось загрузить чаты. Попробуйте обновить страницу.
        </div>
      );
    }

    if (mockThreads.length === 0) {
      return <div className="text-sm text-neutral-500">Пока нет переписок.</div>;
    }

    return (
      <ul className="space-y-2">
        {mockThreads.map((thread) => {
          const isActive = thread.id === activeThread?.id;
          return (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={cn(
                  'w-full rounded-xl border px-4 py-3 text-left transition hover:border-indigo-400/60 hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                  isActive
                    ? 'border-indigo-400/60 bg-indigo-500/10 text-white'
                    : 'border-transparent bg-neutral-900/70 text-neutral-100'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold">{thread.title}</div>
                    <div className="text-xs text-neutral-400 line-clamp-1">{thread.preview}</div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                      {thread.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-neutral-800/80 px-2 py-[2px] text-[11px] text-neutral-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {thread.participants ? <span>{thread.participants.join(', ')}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-neutral-400">
                    <span>{thread.updatedAt}</span>
                    {thread.unread ? (
                      <span className="flex h-6 min-w-[28px] items-center justify-center rounded-full bg-indigo-500/90 px-2 text-[11px] font-semibold text-white">
                        {thread.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderMessages = () => {
    if (loadState === 'loading') {
      return (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Загружаем сообщения...
        </div>
      );
    }

    if (loadState === 'error') {
      return (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-red-900/50 bg-red-900/10 px-4 py-6 text-sm text-red-200">
          Не удалось загрузить чат. Попробуйте позже.
        </div>
      );
    }

    if (!activeThread) {
      return <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">Выберите чат из списка</div>;
    }

    if (messages.length === 0) {
      return <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">В этом чате пока нет сообщений</div>;
    }

    return (
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-4">
          {messages.map((message) => {
            const align = message.isOwn ? 'items-end text-right' : 'items-start';
            const bubble = message.isOwn
              ? 'bg-indigo-600 text-white'
              : 'bg-neutral-900/80 text-neutral-100 border border-neutral-800/70';

            return (
              <div key={message.id} className={cn('flex flex-col gap-1', align)}>
                <div className="text-xs text-neutral-500">{message.author}</div>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm', bubble)}>
                  {message.text}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <span>{message.time}</span>
                  {message.isOwn && message.status ? <span className="text-indigo-200">{message.status}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  const simulateLoading = () => {
    setLoadState('loading');
    window.setTimeout(() => setLoadState('ready'), 800);
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-140px)] flex-col gap-4 bg-[color:var(--surface-main,#0f1115)] px-4 pb-6 pt-2 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="hidden h-10 w-10 items-center justify-center rounded-xl border border-neutral-800/70 bg-neutral-900/70 text-indigo-300 lg:flex">
            <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Чаты</h1>
            <p className="text-sm text-neutral-400">Полноэкранный мессенджер со всеми переписками</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-800/70 bg-neutral-900/70 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:border-indigo-400/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            Полноэкранный режим
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            onClick={simulateLoading}
            aria-label="Новый чат"
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            Новый чат
          </button>
        </div>
      </div>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-4 rounded-2xl border border-neutral-800/70 bg-neutral-950/60 p-3 shadow-2xl lg:grid-cols-[340px_1fr]">
        <section className="flex min-h-0 flex-col rounded-xl border border-neutral-800/70 bg-neutral-950/80 p-3">
          <div className="flex items-center gap-2 pb-3">
            <Input
              placeholder="Поиск по чатам"
              aria-label="Поиск по чатам"
              className="h-10 border-neutral-800 bg-neutral-900/80 text-sm text-white placeholder:text-neutral-500"
            />
          </div>
          <ScrollArea className="flex-1 pr-2">{renderThreadList()}</ScrollArea>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border border-neutral-800/70 bg-neutral-950/80">
          <header className="flex items-center justify-between gap-3 border-b border-neutral-800/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800/70 text-neutral-300 transition hover:border-indigo-500/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 lg:hidden"
                onClick={() => setSelectedThreadId(null)}
                aria-label="Назад к списку"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div>
                <div className="text-sm font-semibold text-white">{activeThread?.title ?? 'Выберите чат'}</div>
                <div className="text-xs text-neutral-400">{activeThread?.participants?.join(', ') ?? 'Список переписок справа'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>{activeThread?.updatedAt}</span>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
            {renderMessages()}

            <div className="mt-auto flex items-center gap-2 rounded-xl border border-neutral-800/70 bg-neutral-900/70 px-3 py-2">
              <Input
                placeholder="Напишите сообщение..."
                aria-label="Напишите сообщение"
                className="flex-1 border-none bg-transparent text-sm text-white placeholder:text-neutral-500 focus-visible:ring-0"
              />
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
              >
                Отправить
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

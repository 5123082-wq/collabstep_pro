'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatsModal } from '@/stores/chatsModal';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Project, Task, ProjectChatMessage } from '@collabverse/api';

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
};

type ApiMessage = ProjectChatMessage & {
  author?: {
    id: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
};

export function AllChatsModal() {
  const { isOpen, close, activeThreadId, setActiveThread, open } = useChatsModal();
  const [state, setState] = useState<'ready' | 'loading' | 'error'>('ready');
  const [query, setQuery] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditingLoading, setIsEditingLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const normalizeMessages = (items: Message[]): Message[] => {
    const byId = new Map<string, Message>();
    items.forEach((m) => byId.set(m.id, m));
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  };

  const scrollToBottom = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    // Используем двойной requestAnimationFrame для гарантии, что DOM полностью обновлен
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  };

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; payload?: { command?: string; threadId?: string } }>).detail;
      if (!detail) return;
      if (detail.id === 'chats' || detail.payload?.command === 'open-chats-modal') {
        open(detail.payload?.threadId ?? null);
      }
    };
    window.addEventListener('rail:command', handleCommand as EventListener);
    return () => window.removeEventListener('rail:command', handleCommand as EventListener);
  }, [open]);

  useEffect(() => {
    if (!isOpen) return;
    const loadMe = async () => {
      try {
        const res = await fetch('/api/auth/me', { headers: { 'cache-control': 'no-store' } });
        if (res.ok) {
          const data = await res.json();
          setCurrentUserId(data?.user?.id ?? null);
        }
      } catch {
        setCurrentUserId(null);
      }
    };
    void loadMe();

    // Обработка ESC для закрытия модалки
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    setState('loading');
    const loadThreads = async () => {
      try {
        const res = await fetch('/api/chat/threads', { headers: { 'cache-control': 'no-store' } });
        let baseThreads: Thread[] = [];
        if (res.ok) {
          const data = await res.json();
          baseThreads = data?.data?.threads ?? data?.threads ?? [];
        }

        // Фолбэк: если пусто, пробуем получить проекты/задачи и построить треды
        if (baseThreads.length === 0) {
          try {
            const projectsRes = await fetch('/api/pm/projects?scope=all&pageSize=100', {
              headers: { 'cache-control': 'no-store' }
            });
            if (projectsRes.ok) {
              const projectsData = await projectsRes.json();
              const items = (projectsData?.items ?? projectsData?.data?.items ?? []) as Project[];
              baseThreads.push(
                ...items.map((p) => ({
                  id: `project-${p.id}`,
                  title: p.title || 'Проект',
                  preview: 'Чат проекта',
                  updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
                  tags: ['Проект'],
                  participants: []
                }))
              );
            }

            const tasksRes = await fetch('/api/pm/tasks?pageSize=100', { headers: { 'cache-control': 'no-store' } });
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json();
              const tasks = (tasksData?.items ?? tasksData?.data?.items ?? []) as Task[];
              baseThreads.push(
                ...tasks.map((t) => ({
                  id: `task-${t.id}`,
                  title: t.title || 'Задача',
                  preview: 'Чат задачи',
                  updatedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
                  tags: ['Задача'],
                  participants: []
                }))
              );
            }
          } catch (fallbackErr) {
            console.error('Fallback threads load failed', fallbackErr);
          }
        }

        if (activeThreadId && !baseThreads.some((t) => t.id === activeThreadId)) {
          const [kind, id] = activeThreadId.split('-', 2);
          baseThreads.push({
            id: activeThreadId,
            title: kind === 'task' ? `Задача ${id}` : 'Проект',
            preview: kind === 'task' ? 'Чат задачи' : 'Чат проекта',
            updatedAt: new Date().toISOString(),
            tags: [kind === 'task' ? 'Задача' : 'Проект'],
            participants: []
          });
        }

        setThreads(baseThreads);
        setState('ready');
      } catch (err) {
        console.error(err);
        setState('error');
      }
    };
    void loadThreads();
  }, [activeThreadId, isOpen]);

  const filteredThreads = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return threads;
    return threads.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.preview.toLowerCase().includes(q) ||
        item.participants?.some((p) => p.toLowerCase().includes(q))
    );
  }, [query, threads]);

  const activeThread = useMemo(() => {
    // Если задан конкретный тред, ждём его появления и не подставляем другой,
    // чтобы не показать чужие сообщения (исправляет смешение тредов при загрузке).
    if (activeThreadId) {
      return filteredThreads.find((thread) => thread.id === activeThreadId) ?? null;
    }
    // Если тред не задан — можно выбрать первый доступный.
    return filteredThreads[0] ?? null;
  }, [activeThreadId, filteredThreads]);

  // При смене треда загружаем сообщения (объединяем логику в один useEffect)
  useEffect(() => {
    const loadMessages = async () => {
      // Сброс состояния перед загрузкой
      setMessages([]);
      setEditingId(null);
      setEditValue('');
      setIsEditingLoading(false);
      setInputValue(''); // Очищаем поле ввода при смене треда
      setSendingMessage(false);

      if (!activeThread) {
        return;
      }

      try {
        setState('loading');
        const res = await fetch(`/api/chat/threads/${activeThread.id}/messages?page=1&pageSize=50`, {
          headers: { 'cache-control': 'no-store' }
        });
        if (!res.ok) throw new Error('Не удалось загрузить чат');
        const data = await res.json();
        const msgs = ((data.data?.messages ?? data.messages ?? []) as ApiMessage[]).map((m) => ({
          id: m.id,
          author: m.author?.name || m.author?.email || 'Без имени',
          text: m.body,
          time: m.createdAt ?? m.updatedAt ?? new Date().toISOString(),
          isOwn: m.author?.id === currentUserId
        }));
        setMessages(normalizeMessages(msgs));
        setState('ready');
      } catch (err) {
        console.error(err);
        setState('error');
      }
    };
    void loadMessages();
    // Загружаем при смене треда или currentUserId (для правильного флага isOwn)
  }, [activeThread, currentUserId]);
  const handleStartEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditValue(text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
    setIsEditingLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!activeThread || !editingId || !editValue.trim()) return;
    setIsEditingLoading(true);
    try {
      const res = await fetch(`/api/chat/threads/${activeThread.id}/messages/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editValue.trim() })
      });
      if (!res.ok) throw new Error('Не удалось обновить сообщение');
      const data = await res.json();
      const m = data.data?.message ?? data.message;
      if (m) {
        setMessages((prev) => prev.map((msg) => (msg.id === editingId ? { ...msg, text: m.body } : msg)));
      }
      setEditingId(null);
      setEditValue('');
      setIsEditingLoading(false);
    } catch (err) {
      console.error(err);
      setIsEditingLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeThread) return;
    const confirmed = window.confirm('Удалить сообщение?');
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/chat/threads/${activeThread.id}/messages/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Не удалось удалить сообщение');
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
      setState('error');
    }
  };

  const handleSendMessage = async () => {
    if (!activeThread || !inputValue.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/chat/threads/${activeThread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: inputValue.trim() })
      });
      if (!res.ok) throw new Error('Не удалось отправить сообщение');
      const data = await res.json();
      const m = data.data?.message ?? data.message;
      if (m) {
        setMessages((prev) =>
          normalizeMessages([
            ...prev,
            {
              id: m.id,
              author: m.author?.name || m.author?.email || 'Вы',
              text: m.body,
              time: m.createdAt ?? new Date().toISOString(),
              isOwn: true
            }
          ])
        );
      }
      setInputValue('');
    } catch (err) {
      console.error('[AllChatsModal] Error sending message:', err);
      alert('Не удалось отправить сообщение');
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-[1200px] rounded-3xl border border-neutral-800/80 bg-neutral-950/90 shadow-2xl backdrop-blur">
        <header className="flex items-center justify-between gap-3 border-b border-neutral-800/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800/70 bg-neutral-900/70 text-indigo-300">
              <MessageSquare className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">Все чаты</div>
              <div className="text-xs text-neutral-400">Быстрое переключение между переписками</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={close} className="text-neutral-300 hover:text-white">
              Закрыть
            </Button>
          </div>
        </header>

        <div className="flex h-[calc(100vh-200px)] min-h-[520px] flex-col gap-4 px-4 py-4 lg:flex-row">
          <section className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-neutral-800/70 bg-neutral-950/80 p-3 overflow-hidden lg:w-[360px] lg:flex-shrink-0">
            <div className="flex items-center gap-2 pb-3 flex-shrink-0">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по чатам"
                aria-label="Поиск по чатам"
                className="h-10 border-neutral-800 bg-neutral-900/80 text-sm text-white placeholder:text-neutral-500"
              />
            </div>
            <ScrollArea className="flex-1 min-h-0 pr-2">
              {state === 'loading' ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-16 animate-pulse rounded-xl bg-neutral-900/70" />
                  ))}
                </div>
              ) : state === 'error' ? (
                <div className="rounded-xl border border-red-900/50 bg-red-900/10 p-4 text-sm text-red-200">
                  Не удалось загрузить чаты. Попробуйте обновить страницу.
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-sm text-neutral-500">Нет доступных чатов</div>
              ) : (
                <ul className="space-y-2">
                  {filteredThreads.map((thread) => {
                    const isActive = thread.id === activeThread?.id;
                    return (
                      <li key={thread.id}>
                        <button
                          type="button"
                          onClick={() => setActiveThread(thread.id)}
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
                              <span>
                                {thread.updatedAt
                                  ? formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true, locale: ru })
                                  : '—'}
                              </span>
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
              )}
            </ScrollArea>
          </section>

          <section className="flex h-full min-h-0 flex-1 flex-col rounded-2xl border border-neutral-800/70 bg-neutral-950/80 overflow-hidden">
            <header className="flex items-center justify-between gap-3 border-b border-neutral-800/70 px-4 py-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800/70 text-neutral-300 transition hover:border-indigo-500/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 lg:hidden"
                  onClick={() => setActiveThread(null)}
                  aria-label="Назад к списку"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <div>
                  <div className="text-sm font-semibold text-white">{activeThread?.title ?? 'Выберите чат'}</div>
                  <div className="text-xs text-neutral-400">
                    {activeThread?.participants?.join(', ') ?? 'Список переписок слева'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span>{activeThread?.updatedAt}</span>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {state === 'loading' ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-400 p-4">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Загружаем сообщения...
                </div>
              ) : state === 'error' ? (
                <div className="flex flex-1 items-center justify-center p-4">
                  <div className="rounded-xl border border-red-900/50 bg-red-900/10 px-4 py-6 text-sm text-red-200">
                    Не удалось загрузить чат. Попробуйте позже.
                  </div>
                </div>
              ) : !activeThread ? (
                <div className="flex flex-1 items-center justify-center text-sm text-neutral-500 p-4">Выберите чат слева</div>
              ) : messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-neutral-500 p-4">В этом чате пока нет сообщений</div>
              ) : (
                <div ref={messagesScrollRef} className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2">
                  <div className="space-y-4 p-4 pb-4">
                    {messages.map((message) => {
                      const align = message.isOwn ? 'items-end text-right' : 'items-start';
                      const bubble = message.isOwn
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-900/80 text-neutral-100 border border-neutral-800/70';

                      return (
                        <div key={message.id} className={cn('flex flex-col gap-1', align)}>
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <span>{message.author}</span>
                            {message.isOwn ? (
                              <span className="flex items-center gap-2 text-[11px] text-neutral-400">
                                <button
                                  type="button"
                                  className="underline-offset-2 hover:underline"
                                  onClick={() => handleStartEdit(message.id, message.text)}
                                >
                                  Редактировать
                                </button>
                                <button
                                  type="button"
                                  className="text-rose-300 underline-offset-2 hover:underline"
                                  onClick={() => handleDelete(message.id)}
                                >
                                  Удалить
                                </button>
                              </span>
                            ) : null}
                          </div>
                          {editingId === message.id ? (
                            <div className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                aria-label="Редактировать сообщение"
                                className="h-10 border-neutral-800 bg-neutral-950 text-sm text-white"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveEdit} disabled={isEditingLoading}>
                                  Сохранить
                                </Button>
                                <Button size="sm" variant="secondary" onClick={handleCancelEdit} disabled={isEditingLoading}>
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm', bubble)}>
                              {message.text}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                            <span>{message.time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex-shrink-0 flex items-center gap-2 rounded-xl border border-neutral-800/70 bg-neutral-900/70 px-3 py-2 m-4 mt-0">
                <Input
                  placeholder="Напишите сообщение..."
                  aria-label="Напишите сообщение"
                  className="flex-1 border-none bg-transparent text-sm text-white placeholder:text-neutral-500 focus-visible:ring-0"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  disabled={!activeThread || sendingMessage}
                />
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={handleSendMessage}
                  disabled={!activeThread || !inputValue.trim() || sendingMessage}
                >
                  {sendingMessage ? 'Отправка...' : 'Отправить'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

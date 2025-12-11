'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useChatsModal } from '@/stores/chatsModal';
import type { ProjectChatMessage } from '@collabverse/api';

type InlineChatProps = {
  contextId: string;
  contextType: 'project' | 'task';
  currentUserId?: string;
  title?: string;
  className?: string;
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

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

export function InlineChat({ contextId, contextType, currentUserId, title, className }: InlineChatProps) {
  const { open } = useChatsModal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendState, setSendState] = useState<'idle' | 'sending'>('idle');
  const [value, setValue] = useState('');
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [meId, setMeId] = useState<string | null>(null);

  const normalizeMessages = (items: Message[]): Message[] => {
    const byId = new Map<string, Message>();
    items.forEach((m) => byId.set(m.id, m));
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  };

  const threadId = useMemo(() => `${contextType}-${contextId}`, [contextId, contextType]);

  const scrollToBottom = () => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // Загрузка userId один раз
  useEffect(() => {
    if (currentUserId) return;
    const loadMe = async () => {
      try {
        const res = await fetch('/api/auth/me', { headers: { 'cache-control': 'no-store' } });
        if (res.ok) {
          const data = await res.json();
          setMeId(data?.user?.id ?? null);
        }
      } catch {
        setMeId(null);
      }
    };
    void loadMe();
  }, [currentUserId]);

  // Загрузка сообщений при смене контекста
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setMessages([]); // полностью очищаем перед загрузкой нового треда
        const thread = `${contextType}-${contextId}`;
        const res = await fetch(`/api/chat/threads/${thread}/messages`, {
          headers: { 'cache-control': 'no-store' }
        });
        if (!res.ok) throw new Error('Не удалось загрузить чат');
        const data = await res.json();
        const msgsRaw = (data.data?.messages ?? data.messages ?? []) as ApiMessage[];
        const userId = currentUserId ?? meId;
        const msgs = msgsRaw.map((m) => ({
          id: m.id,
          author: m.author?.name || m.author?.email || 'Без имени',
          text: m.body,
          time: m.createdAt ?? m.updatedAt ?? new Date().toISOString(),
          isOwn: userId ? m.author?.id === userId : false
        }));
        setMessages(normalizeMessages(msgs));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки чата');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [contextId, contextType, currentUserId, meId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!value.trim()) return;
    setSendState('sending');
    try {
      const thread = `${contextType}-${contextId}`;
      const res = await fetch(`/api/chat/threads/${thread}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: value.trim() })
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
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки сообщения');
    } finally {
      setSendState('idle');
    }
  };

  const handleStartEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditValue(current);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    setSendState('sending');
    try {
      const thread = `${contextType}-${contextId}`;
      const res = await fetch(`/api/chat/threads/${thread}/messages/${editingId}`, {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления сообщения');
    } finally {
      setSendState('idle');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Удалить сообщение?');
    if (!confirmed) return;
    try {
      const thread = `${contextType}-${contextId}`;
      const res = await fetch(`/api/chat/threads/${thread}/messages/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось удалить сообщение');
      }
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка удаления сообщения';
      setError(msg);
    }
  };

  const participantsLabel =
    contextType === 'project'
      ? 'Участники проекта'
      : 'Участники задачи';

  return (
    <div
      className={cn(
        'flex h-full min-h-[360px] max-h-[calc(100vh-220px)] flex-col gap-3 overflow-hidden rounded-2xl border border-neutral-800/70 bg-neutral-950/80 p-4',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800/70 bg-neutral-900/70 text-indigo-300">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{title ?? 'Чат'}</div>
            <div className="text-xs text-neutral-400">{participantsLabel}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => open(threadId)}
          className="text-xs font-semibold text-indigo-300 transition hover:text-indigo-200"
        >
          Открыть все чаты
        </button>
      </div>

      <div className="text-[11px] text-neutral-500">Обновлено: {messages.at(-1)?.time ? formatTime(messages.at(-1)!.time) : '—'}</div>

      <div className="flex min-h-0 flex-1">
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Загружаем сообщения...
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center text-sm text-rose-200">{error}</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">Пока нет сообщений</div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 pr-1">
            <div ref={messagesRef} className="space-y-4 pb-2">
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
                          <Button size="sm" onClick={handleSaveEdit} disabled={sendState === 'sending'}>
                            Сохранить
                          </Button>
                          <Button size="sm" variant="secondary" onClick={handleCancelEdit} disabled={sendState === 'sending'}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className={cn('max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm', bubble)}>
                        {message.text}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                      <span>{formatTime(message.time)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-neutral-800/70 bg-neutral-900/70 px-3 py-2">
        <Input
          placeholder="Напишите сообщение..."
          aria-label="Напишите сообщение"
          className="flex-1 border-none bg-transparent text-sm text-white placeholder:text-neutral-500 focus-visible:ring-0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          disabled={sendState === 'sending'}
          onClick={handleSend}
          className="gap-2"
        >
          {sendState === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Отправить
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/ui/toast';
import { useProjectEvents } from '@/lib/websocket/hooks';
import { handleAgentMentionInChat } from '@/lib/ai/agent-responses';
import type { ProjectChatMessage } from '@collabverse/api';

type ChatMessage = {
  id: string;
  projectId: string;
  authorId: string;
  body: string;
  attachments: string[];
  attachmentsFiles?: Array<{ id: string; filename: string; url?: string }>;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  } | null;
};

type ProjectChatProps = {
  projectId: string;
  currentUserId: string;
};

export default function ProjectChat({ projectId, currentUserId }: ProjectChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const normalizeMessages = useCallback((incoming: ChatMessage[]): ChatMessage[] => {
    const byId = new Map<string, ChatMessage>();
    // Later entries override earlier to keep freshest data
    incoming.forEach((message) => {
      byId.set(message.id, message);
    });
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, []);

  const loadMessages = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `/api/chat/threads/project-${projectId}/messages?page=${pageNum}&pageSize=50`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось загрузить сообщения');
      }

      const data = await response.json();
      const newMessages = data.data?.messages || [];
      const pagination = data.data?.pagination || { totalPages: 1 };
      const normalized = normalizeMessages(newMessages);

      if (append) {
        setMessages((prev) => normalizeMessages([...prev, ...normalized]));
      } else {
        setMessages(normalizeMessages(normalized));
        // Автопрокрутка к новым сообщениям только при первой загрузке
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }

      setHasMore(pageNum < pagination.totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading messages:', err);
      toast(err instanceof Error ? err.message : 'Неизвестная ошибка', 'warning');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [normalizeMessages, projectId]);

  useEffect(() => {
    void loadMessages(1, false);

    // Fallback polling для новых сообщений каждые 30 секунд (если WebSocket недоступен)
    pollingIntervalRef.current = setInterval(() => {
      void loadMessages(1, false);
    }, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [projectId, loadMessages]);

  // Подписка на WebSocket события для чата
  useProjectEvents(projectId, currentUserId, 'chat.message', (event) => {
    if (!event.data || typeof event.data !== 'object') {
      return;
    }
    const payload = event.data as { message?: ProjectChatMessage; projectId?: string };
    if (payload.message && payload.projectId === projectId) {
      const newMessage = payload.message;
      const enrichedMessage: ChatMessage = {
        ...newMessage,
        attachments: newMessage.attachments ?? [],
        attachmentsFiles: (newMessage as ChatMessage).attachmentsFiles ?? [],
        author: (newMessage as ChatMessage).author ?? {
          id: newMessage.authorId,
          name: 'AI',
          email: ''
        }
      };
      // Проверяем, нет ли уже такого сообщения
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === enrichedMessage.id);
        if (exists) {
          return prev;
        }
        // Новые сообщения добавляем в конец, чтобы сохранять порядок по времени
        return normalizeMessages([...prev, enrichedMessage]);
      });
      // Автопрокрутка к новому сообщению
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim() && attachments.length === 0) {
      toast('Введите сообщение или прикрепите файл', 'warning');
      return;
    }

    try {
      setSending(true);

      const response = await fetch(`/api/chat/threads/project-${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          attachments
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось отправить сообщение');
      }

      const data = await response.json();
      const newMessage = data.data?.message;

      if (newMessage) {
        setMessages((prev) => normalizeMessages([...prev, newMessage]));
        setBody('');
        setAttachments([]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        // Проверить упоминания AI-агентов и отправить ответы
        try {
          await handleAgentMentionInChat(projectId, body.trim(), currentUserId);
        } catch (error) {
          console.error('Error handling agent mentions:', error);
          // Не показываем ошибку пользователю, так как это фоновый процесс
        }
      }

      // Перезагружаем сообщения для получения актуального списка
      void loadMessages(1, false);
    } catch (err) {
      console.error('Error sending message:', err);
      toast(err instanceof Error ? err.message : 'Неизвестная ошибка', 'warning');
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      void loadMessages(page + 1, true);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось загрузить файл');
      }

      const data = await response.json();
      const fileId = data.data?.file?.id;

      if (fileId) {
        setAttachments((prev) => [...prev, fileId]);
        toast('Файл прикреплён', 'success');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      toast(err instanceof Error ? err.message : 'Не удалось загрузить файл', 'warning');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'только что';
    }
    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'минуту' : diffMins < 5 ? 'минуты' : 'минут'} назад`;
    }
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'} назад`;
    }
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'} назад`;
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950/40">
        <div className="text-center text-sm text-neutral-400">Загрузка сообщений...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[600px] flex-col rounded-xl border border-neutral-800 bg-neutral-950/40">
      {/* История сообщений */}
      <div
        ref={messagesContainerRef}
        className="flex-1 space-y-4 overflow-y-auto p-6"
        onScroll={(e) => {
          const target = e.currentTarget;
          // Загрузка старых сообщений при прокрутке вверх
          if (target.scrollTop === 0 && hasMore && !loadingMore) {
            handleLoadMore();
          }
        }}
      >
        {loadingMore && (
          <div className="text-center text-sm text-neutral-400">Загрузка старых сообщений...</div>
        )}

        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-sm text-neutral-400">Пока нет сообщений. Начните общение!</div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.authorId === currentUserId ? 'flex-row-reverse' : ''}`}
            >
              {/* Аватар */}
              {message.author && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-medium text-white">
                  {message.author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={message.author.avatarUrl} alt={message.author.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    message.author.name.charAt(0).toUpperCase()
                  )}
                </div>
              )}

              {/* Сообщение */}
              <div className={`flex flex-1 flex-col gap-1 ${message.authorId === currentUserId ? 'items-end' : 'items-start'}`}>
                {/* Автор и время */}
                <div className={`flex items-center gap-2 ${message.authorId === currentUserId ? 'flex-row-reverse' : ''}`}>
                  {message.author && (
                    <span className="text-sm font-medium text-white">{message.author.name}</span>
                  )}
                  <span className="text-xs text-neutral-400">{formatTime(message.createdAt)}</span>
                </div>

                {/* Текст сообщения */}
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    message.authorId === currentUserId
                      ? 'bg-indigo-500 text-white'
                      : 'bg-neutral-800 text-neutral-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                </div>

                {/* Вложения */}
                {message.attachmentsFiles && message.attachmentsFiles.length > 0 && (
                  <div className={`mt-2 flex flex-wrap gap-2 ${message.authorId === currentUserId ? 'justify-end' : 'justify-start'}`}>
                    {message.attachmentsFiles.map((file) => (
                      <a
                        key={file.id}
                        href={file.url || `/api/files/${file.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-700"
                      >
                        📎 {file.filename}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Форма отправки */}
      <div className="border-t border-neutral-800 p-4">
        {/* Прикреплённые файлы */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((fileId) => (
              <div
                key={fileId}
                className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1 text-sm text-neutral-300"
              >
                <span>📎 Файл {fileId.slice(0, 8)}...</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((id) => id !== fileId))}
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-3">
          <div className="flex-1">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Введите сообщение..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend(e);
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleFileUpload(file);
                  }
                }}
              />
              <Button type="button" variant="secondary" size="sm">
                📎
              </Button>
            </label>
            <Button type="submit" variant="primary" size="sm" loading={sending} disabled={(!body.trim() && attachments.length === 0) || sending}>
              Отправить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

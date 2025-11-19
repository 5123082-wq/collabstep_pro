'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContentBlock } from '@/components/ui/content-block';
import type { Notification } from '@collabverse/api';
import { wsClient } from '@/lib/websocket/client';

type NotificationsPanelProps = {
  onMarkAllRead: () => void;
};

function formatTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function getNotificationLink(notification: Notification): string | null {
  if (notification.taskId && notification.projectId) {
    return `/pm/projects/${notification.projectId}/tasks/${notification.taskId}`;
  }
  if (notification.projectId) {
    return `/pm/projects/${notification.projectId}`;
  }
  return null;
}

export default function NotificationsPanel({ onMarkAllRead }: NotificationsPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?pageSize=20');
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.data) {
          setNotifications(data.data.notifications || []);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Подписка на WebSocket события для уведомлений
  // wsClient уже подключен глобально в useUnreadNotifications
  useEffect(() => {
    const unsubscribe = wsClient.onEventType('notification.new', (event) => {
      if (event.data?.notification) {
        const newNotification = event.data.notification as Notification;
        // Добавляем новое уведомление в начало списка
        setNotifications((prev) => {
          const exists = prev.some((n) => n.id === newNotification.id);
          if (exists) {
            return prev;
          }
          return [newNotification, ...prev];
        });
        // Обновляем счетчик через callback
        onMarkAllRead();
      }
    });

    return unsubscribe;
  }, [onMarkAllRead]);

  const handleNotificationClick = async (notification: Notification) => {
    // Отмечаем как прочитанное
    if (notification.status === 'unread') {
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH'
        });
        // Обновляем локальное состояние
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, status: 'read' as const, readAt: new Date().toISOString() }
              : n
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Переход к связанной сущности
    const link = getNotificationLink(notification);
    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      });
      if (response.ok) {
        // Обновляем локальное состояние
        setNotifications((prev) =>
          prev.map((n) =>
            n.status === 'unread'
              ? { ...n, status: 'read' as const, readAt: new Date().toISOString() }
              : n
          )
        );
        onMarkAllRead();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1 px-6 pb-6 pr-4 pt-6">
        {notifications.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Нет уведомлений
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <ContentBlock
                  as="div"
                  size="sm"
                  interactive
                  onClick={() => handleNotificationClick(notification)}
                  className={`cursor-pointer ${
                    notification.status === 'unread' ? 'border-indigo-500/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[color:var(--text-primary)]">
                        {notification.title}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--text-secondary)]">
                        {notification.message}
                      </div>
                      <div className="mt-2 text-xs text-[color:var(--text-tertiary)]">
                        {formatTime(notification.createdAt)}
                      </div>
                    </div>
                    {notification.status === 'unread' && (
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    )}
                  </div>
                </ContentBlock>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
      {notifications.length > 0 && (
        <div className="border-t border-[color:var(--surface-border-subtle)] px-6 pb-6 pt-4">
          <button
            type="button"
            className="w-full rounded-xl border border-transparent bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200 transition hover:border-indigo-500/50 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            onClick={handleMarkAllRead}
          >
            Отметить все как прочитанные
          </button>
        </div>
      )}
    </div>
  );
}


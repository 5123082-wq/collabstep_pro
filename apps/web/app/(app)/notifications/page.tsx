'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppSection from '@/components/app/AppSection';
import type { Notification, NotificationStatus } from '@collabverse/api';

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
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
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

function getTypeLabel(type: Notification['type']): string {
  const labels: Record<Notification['type'], string> = {
    task_assigned: 'Назначение задачи',
    task_updated: 'Обновление задачи',
    comment_added: 'Новый комментарий',
    deadline_approaching: 'Приближается дедлайн',
    project_invite: 'Приглашение в проект'
  };
  return labels[type] || type;
}

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | 'all'>('all');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      params.set('page', String(pagination.page));
      params.set('pageSize', String(pagination.pageSize));

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.data) {
          setNotifications(data.data.notifications || []);
          if (data.data.pagination) {
            setPagination(data.data.pagination);
          }
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pagination.page, pagination.pageSize]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    // Отмечаем как прочитанное
    if (notification.status === 'unread') {
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH'
        });
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

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.status === 'unread'
              ? { ...n, status: 'read' as const, readAt: new Date().toISOString() }
              : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <AppSection
      title="Уведомления"
      description="Контролируйте важные события, дедлайны и алерты."
      actions={[
        {
          label: 'Отметить все как прочитанные',
          message: 'mark-all-read',
          onClick: handleMarkAllRead
        }
      ]}
    >
      <div className="mt-6">
        {/* Фильтры */}
        <div className="mb-6 flex gap-2">
          {(['all', 'unread', 'read', 'archived'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setStatusFilter(status);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                statusFilter === status
                  ? 'bg-indigo-500/20 text-indigo-200'
                  : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-border-subtle)]'
              }`}
            >
              {status === 'all' ? 'Все' : status === 'unread' ? 'Непрочитанные' : status === 'read' ? 'Прочитанные' : 'Архив'}
            </button>
          ))}
        </div>

        {/* Список уведомлений */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-neutral-400">
            Загрузка...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-neutral-400">
            Нет уведомлений
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group cursor-pointer rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-4 transition hover:bg-[color:var(--surface-border-subtle)] ${
                    notification.status === 'unread' ? 'border-indigo-500/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[color:var(--text-tertiary)]">
                          {getTypeLabel(notification.type)}
                        </span>
                        {notification.status === 'unread' && (
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <div className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">
                        {notification.title}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--text-secondary)]">
                        {notification.message}
                      </div>
                      <div className="mt-2 text-xs text-[color:var(--text-tertiary)]">
                        {formatTime(notification.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(notification.id, e)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      title="Удалить"
                    >
                      <span className="text-xs text-[color:var(--text-tertiary)]">×</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Пагинация */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="rounded-lg px-3 py-1 text-sm disabled:opacity-50"
                >
                  Назад
                </button>
                <span className="text-sm text-[color:var(--text-secondary)]">
                  Страница {pagination.page} из {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg px-3 py-1 text-sm disabled:opacity-50"
                >
                  Вперёд
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppSection>
  );
}

import { memory } from '../data/memory';
import type { Notification, NotificationStatus, ID } from '../types';

export type CreateNotificationInput = {
  userId: ID;
  type: Notification['type'];
  title: string;
  message: string;
  projectId?: ID;
  taskId?: ID;
  relatedEntityId?: ID;
  status?: NotificationStatus;
  createdAt?: string;
};

export type ListNotificationsOptions = {
  status?: NotificationStatus;
  page?: number;
  pageSize?: number;
};

function cloneNotification(notification: Notification): Notification {
  return {
    ...notification,
    ...(notification.readAt ? { readAt: notification.readAt } : {})
  };
}

export class NotificationsRepository {
  create(input: CreateNotificationInput): Notification {
    const now = new Date().toISOString();
    const createdAt = input.createdAt ?? now;
    const status: NotificationStatus = input.status ?? 'unread';

    const notification: Notification = {
      id: crypto.randomUUID(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      status,
      createdAt,
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.taskId ? { taskId: input.taskId } : {}),
      ...(input.relatedEntityId ? { relatedEntityId: input.relatedEntityId } : {})
    };

    memory.NOTIFICATIONS.push(notification);
    return cloneNotification(notification);
  }

  findById(id: ID): Notification | null {
    const notification = memory.NOTIFICATIONS.find((n) => n.id === id);
    return notification ? cloneNotification(notification) : null;
  }

  listByUser(userId: ID, options: ListNotificationsOptions = {}): Notification[] {
    const { status, page = 1, pageSize = 20 } = options;
    let filtered = memory.NOTIFICATIONS.filter((n) => n.userId === userId);

    if (status) {
      filtered = filtered.filter((n) => n.status === status);
    }

    // Сортировка по дате создания (новые сначала)
    filtered.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    // Пагинация
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginated = filtered.slice(start, end);

    return paginated.map(cloneNotification);
  }

  countUnreadByUser(userId: ID): number {
    return memory.NOTIFICATIONS.filter(
      (n) => n.userId === userId && n.status === 'unread'
    ).length;
  }

  markAsRead(id: ID): Notification | null {
    const notification = memory.NOTIFICATIONS.find((n) => n.id === id);
    if (!notification) {
      return null;
    }

    notification.status = 'read';
    notification.readAt = new Date().toISOString();
    return cloneNotification(notification);
  }

  markAllAsRead(userId: ID): number {
    const now = new Date().toISOString();
    let count = 0;

    for (const notification of memory.NOTIFICATIONS) {
      if (notification.userId === userId && notification.status === 'unread') {
        notification.status = 'read';
        notification.readAt = now;
        count++;
      }
    }

    return count;
  }

  archive(id: ID): Notification | null {
    const notification = memory.NOTIFICATIONS.find((n) => n.id === id);
    if (!notification) {
      return null;
    }

    notification.status = 'archived';
    return cloneNotification(notification);
  }

  delete(id: ID): boolean {
    const index = memory.NOTIFICATIONS.findIndex((n) => n.id === id);
    if (index === -1) {
      return false;
    }
    memory.NOTIFICATIONS.splice(index, 1);
    return true;
  }
}

export const notificationsRepository = new NotificationsRepository();


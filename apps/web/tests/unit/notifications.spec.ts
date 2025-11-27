import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  tasksRepository,
  notificationsRepository,
  resetFinanceMemory,
  memory
} from '@collabverse/api';
import { GET as getNotifications } from '@/app/api/notifications/route';
import { PATCH as markRead } from '@/app/api/notifications/[id]/route';
import { POST as markAllRead } from '@/app/api/notifications/mark-all-read/route';
import { NextRequest } from 'next/server';

describe('Notifications API', () => {
  const userId = 'admin.demo@collabverse.test';
  const session = encodeDemoSession({
    email: userId,
    userId,
    role: 'admin',
    issuedAt: Date.now()
  });
  const headers = {
    cookie: `cv_session=${session}`,
    'content-type': 'application/json'
  };

  beforeEach(() => {
    resetFinanceMemory();
    // Очищаем все уведомления
    memory.NOTIFICATIONS = [];

    // Создаем задачу для тестов
    tasksRepository.create({
      projectId: 'project-1',
      title: 'Test Task',
      status: 'new'
    });
  });

  describe('GET /api/notifications', () => {
    it('should return empty array when no notifications exist', async () => {
      const response = await getNotifications(
        new NextRequest('http://localhost/api/notifications', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.notifications).toEqual([]);
    });

    it('should return notifications for user', async () => {
      // Создаем уведомление
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Notification 1',
        message: 'Message 1'
      });

      const response = await getNotifications(
        new NextRequest('http://localhost/api/notifications', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      const userNotifications = data.data.notifications;
      expect(userNotifications).toHaveLength(1);
      expect(userNotifications[0]!.title).toBe('Notification 1');
    });

    it('should filter unread notifications', async () => {
      // Создаем прочитанное и непрочитанное уведомление
      const n1 = notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Unread',
        message: 'Message 1',
        status: 'unread'
      });

      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Read',
        message: 'Message 2',
        status: 'read'
      });

      const response = await getNotifications(
        new NextRequest('http://localhost/api/notifications?status=unread', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      const unread = data.data.notifications;
      expect(unread).toHaveLength(1);
      expect(unread[0]!.id).toBe(n1.id);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await getNotifications(
        new NextRequest('http://localhost/api/notifications', {
          method: 'GET'
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      // Создаем несколько непрочитанных уведомлений
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'N1',
        message: 'M1',
        status: 'unread'
      });

      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'N2',
        message: 'M2',
        status: 'unread'
      });

      const response = await markAllRead(
        new NextRequest('http://localhost/api/notifications/mark-all-read', {
          method: 'POST',
          headers
        })
      );

      expect(response.status).toBe(200);

      // Проверяем, что все уведомления прочитаны
      const all = notificationsRepository.listByUser(userId);
      expect(all.every(n => n.status === 'read')).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await markAllRead(
        new NextRequest('http://localhost/api/notifications/mark-all-read', {
          method: 'POST'
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/[id]', () => {
    it('should mark single notification as read', async () => {
      const n1 = notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'N1',
        message: 'M1',
        status: 'unread'
      });

      const response = await markRead(
        new NextRequest(`http://localhost/api/notifications/${n1.id}`, {
          method: 'PATCH',
          headers
        }),
        { params: { id: n1.id } }
      );

      expect(response.status).toBe(200);

      const updated = notificationsRepository.listByUser(userId).find(n => n.id === n1.id);
      expect(updated?.status).toBe('read');
    });

    it('should return 404 if notification not found', async () => {
      const response = await markRead(
        new NextRequest('http://localhost/api/notifications/non-existent', {
          method: 'PATCH',
          headers
        }),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });
  });
});

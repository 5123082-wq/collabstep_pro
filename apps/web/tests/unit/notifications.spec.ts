import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  notificationsRepository,
  tasksRepository,
  projectsRepository,
  commentsRepository,
  resetFinanceMemory
} from '@collabverse/api';
import { GET as getNotifications } from '@/app/api/notifications/route';
import { PATCH as markAsRead, DELETE as deleteNotification } from '@/app/api/notifications/[id]/route';
import { POST as markAllRead } from '@/app/api/notifications/mark-all-read/route';
import { GET as getUnreadCount } from '@/app/api/notifications/unread-count/route';
import {
  notifyTaskAssigned,
  notifyTaskUpdated,
  notifyCommentAdded,
  notifyProjectInvite
} from '@/lib/notifications/event-generator';

describe('Notifications System', () => {
  let projectId: string;
  let taskId: string;
  const userId = 'admin.demo@collabverse.test';
  const otherUserId = 'user.demo@collabverse.test';
  const session = encodeDemoSession({
    email: userId,
    role: 'admin',
    issuedAt: Date.now()
  });
  const headers = {
    cookie: `cv_session=${session}`,
    'content-type': 'application/json'
  };

  beforeEach(() => {
    resetFinanceMemory();
    
    // Создаем проект и задачу для тестов
    const project = projectsRepository.list()[0];
    if (!project) {
      throw new Error('No project found');
    }
    projectId = project.id;

    const tasks = tasksRepository.list({ projectId });
    if (tasks.length === 0) {
      const task = tasksRepository.create({
        projectId,
        title: 'Test Task',
        status: 'new',
        assigneeId: userId
      });
      taskId = task.id;
    } else {
      taskId = tasks[0].id;
    }
  });

  describe('NotificationsRepository', () => {
    it('should create a notification', () => {
      const notification = notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Test Notification',
        message: 'Test message'
      });

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(userId);
      expect(notification.type).toBe('task_assigned');
      expect(notification.status).toBe('unread');
    });

    it('should list notifications by user', () => {
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Notification 1',
        message: 'Message 1'
      });
      notificationsRepository.create({
        userId: otherUserId,
        type: 'task_assigned',
        title: 'Notification 2',
        message: 'Message 2'
      });

      const userNotifications = notificationsRepository.listByUser(userId);
      expect(userNotifications).toHaveLength(1);
      expect(userNotifications[0].title).toBe('Notification 1');
    });

    it('should filter notifications by status', () => {
      const n1 = notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Unread',
        message: 'Message',
        status: 'unread'
      });
      const n2 = notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Read',
        message: 'Message',
        status: 'read'
      });

      const unread = notificationsRepository.listByUser(userId, { status: 'unread' });
      expect(unread).toHaveLength(1);
      expect(unread[0].id).toBe(n1.id);

      const read = notificationsRepository.listByUser(userId, { status: 'read' });
      expect(read).toHaveLength(1);
      expect(read[0].id).toBe(n2.id);
    });

    it('should mark notification as read', () => {
      const notification = notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Test',
        message: 'Message'
      });

      const updated = notificationsRepository.markAsRead(notification.id);
      expect(updated?.status).toBe('read');
      expect(updated?.readAt).toBeDefined();
    });

    it('should mark all notifications as read', () => {
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Notification 1',
        message: 'Message',
        status: 'unread'
      });
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Notification 2',
        message: 'Message',
        status: 'unread'
      });

      const count = notificationsRepository.markAllAsRead(userId);
      expect(count).toBe(2);

      const unread = notificationsRepository.listByUser(userId, { status: 'unread' });
      expect(unread).toHaveLength(0);
    });

    it('should count unread notifications', () => {
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Unread 1',
        message: 'Message',
        status: 'unread'
      });
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Unread 2',
        message: 'Message',
        status: 'unread'
      });
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Read',
        message: 'Message',
        status: 'read'
      });

      const count = notificationsRepository.countUnreadByUser(userId);
      expect(count).toBe(2);
    });

    it('should delete notification', () => {
      const notification = notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Test',
        message: 'Message'
      });

      const deleted = notificationsRepository.delete(notification.id);
      expect(deleted).toBe(true);

      const found = notificationsRepository.findById(notification.id);
      expect(found).toBeNull();
    });
  });

  describe('Event Generators', () => {
    it('should generate notification when task is assigned', async () => {
      await notifyTaskAssigned(taskId, otherUserId, projectId);

      const notifications = notificationsRepository.listByUser(otherUserId);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toBe('task_assigned');
    });

    it('should generate notification when task is updated', async () => {
      await notifyTaskUpdated(taskId, projectId, userId);

      const notifications = notificationsRepository.listByUser(userId);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toBe('task_updated');
    });

    it('should generate notification when comment is added', async () => {
      const comment = commentsRepository.create({
        projectId,
        taskId,
        authorId: userId,
        body: 'Test comment',
        mentions: [otherUserId]
      });

      await notifyCommentAdded(comment.id, taskId, projectId, userId);

      const notifications = notificationsRepository.listByUser(otherUserId);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toBe('comment_added');
    });

    it('should generate notification when project invite is sent', async () => {
      await notifyProjectInvite(projectId, otherUserId);

      const notifications = notificationsRepository.listByUser(otherUserId);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toBe('project_invite');
    });
  });

  describe('GET /api/notifications', () => {
    it('should return notifications for authenticated user', async () => {
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Test',
        message: 'Message'
      });

      const response = await getNotifications(
        new Request('http://localhost/api/notifications', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.notifications).toHaveLength(1);
    });

    it('should filter by status', async () => {
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Unread',
        message: 'Message',
        status: 'unread'
      });
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Read',
        message: 'Message',
        status: 'read'
      });

      const response = await getNotifications(
        new Request('http://localhost/api/notifications?status=unread', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.notifications).toHaveLength(1);
      expect(data.data.notifications[0].status).toBe('unread');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await getNotifications(
        new Request('http://localhost/api/notifications', {
          method: 'GET'
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/[id]', () => {
    it('should mark notification as read', async () => {
      const notification = notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Test',
        message: 'Message',
        status: 'unread'
      });

      const response = await markAsRead(
        new Request(`http://localhost/api/notifications/${notification.id}`, {
          method: 'PATCH',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: notification.id } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.notification.status).toBe('read');
      expect(data.data.notification.readAt).toBeDefined();
    });

    it('should return 404 if notification not found', async () => {
      const response = await markAsRead(
        new Request('http://localhost/api/notifications/non-existent', {
          method: 'PATCH',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 404 if notification belongs to another user', async () => {
      const notification = notificationsRepository.create({
        userId: otherUserId,
        type: 'task_assigned',
        title: 'Test',
        message: 'Message'
      });

      const response = await markAsRead(
        new Request(`http://localhost/api/notifications/${notification.id}`, {
          method: 'PATCH',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: notification.id } }
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Notification 1',
        message: 'Message',
        status: 'unread'
      });
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Notification 2',
        message: 'Message',
        status: 'unread'
      });

      const response = await markAllRead(
        new Request('http://localhost/api/notifications/mark-all-read', {
          method: 'POST',
          headers: { cookie: headers.cookie }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.count).toBe(2);
    });
  });

  describe('DELETE /api/notifications/[id]', () => {
    it('should delete notification', async () => {
      const notification = notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Test',
        message: 'Message'
      });

      const response = await deleteNotification(
        new Request(`http://localhost/api/notifications/${notification.id}`, {
          method: 'DELETE',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: notification.id } }
      );

      expect(response.status).toBe(200);

      const found = notificationsRepository.findById(notification.id);
      expect(found).toBeNull();
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Unread 1',
        message: 'Message',
        status: 'unread'
      });
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Unread 2',
        message: 'Message',
        status: 'unread'
      });
      notificationsRepository.create({
        userId,
        type: 'task_assigned',
        title: 'Read',
        message: 'Message',
        status: 'read'
      });

      const response = await getUnreadCount(
        new Request('http://localhost/api/notifications/unread-count', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.count).toBe(2);
    });
  });
});


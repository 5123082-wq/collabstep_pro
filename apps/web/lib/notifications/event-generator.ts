import {
  notificationsRepository,
  projectsRepository,
  tasksRepository,
  commentsRepository,
  projectChatRepository
} from '@collabverse/api';
import { broadcastToUser } from '@/lib/websocket/event-broadcaster';

/**
 * Генерирует уведомление о назначении задачи
 */
export async function notifyTaskAssigned(
  taskId: string,
  assigneeId: string,
  projectId: string
): Promise<void> {
  const task = tasksRepository.findById(taskId);
  if (!task) return;

  const project = projectsRepository.findById(projectId);
  if (!project) return;

  const notification = notificationsRepository.create({
    userId: assigneeId,
    type: 'task_assigned',
    title: `Вам назначена задача: ${task.title}`,
    message: `Задача "${task.title}" назначена вам в проекте "${project.title}"`,
    projectId,
    taskId,
    status: 'unread'
  });

  // Рассылаем событие через WebSocket
  await broadcastToUser(assigneeId, 'notification.new', {
    notification,
    projectId,
    taskId
  }, projectId);
}

/**
 * Генерирует уведомление об обновлении задачи
 */
export async function notifyTaskUpdated(
  taskId: string,
  projectId: string,
  updatedBy: string
): Promise<void> {
  const task = tasksRepository.findById(taskId);
  if (!task) return;

  const project = projectsRepository.findById(projectId);
  if (!project) return;

  // Уведомляем исполнителя задачи, если он есть и это не тот, кто обновил
  if (task.assigneeId && task.assigneeId !== updatedBy) {
    const notification = notificationsRepository.create({
      userId: task.assigneeId,
      type: 'task_updated',
      title: `Задача обновлена: ${task.title}`,
      message: `Задача "${task.title}" была обновлена в проекте "${project.title}"`,
      projectId,
      taskId,
      status: 'unread'
    });

    // Рассылаем событие через WebSocket
    await broadcastToUser(task.assigneeId, 'notification.new', {
      notification,
      projectId,
      taskId
    }, projectId);
  }

  // Уведомляем автора задачи (владельца проекта), если он не исполнитель и не тот, кто обновил
  if (project.ownerId && project.ownerId !== task.assigneeId && project.ownerId !== updatedBy) {
    const notification = notificationsRepository.create({
      userId: project.ownerId,
      type: 'task_updated',
      title: `Задача обновлена: ${task.title}`,
      message: `Задача "${task.title}" была обновлена в проекте "${project.title}"`,
      projectId,
      taskId,
      status: 'unread'
    });

    // Рассылаем событие через WebSocket
    await broadcastToUser(project.ownerId, 'notification.new', {
      notification,
      projectId,
      taskId
    }, projectId);
  }
}

/**
 * Генерирует уведомление о добавлении комментария
 */
export async function notifyCommentAdded(
  commentId: string,
  taskId: string,
  projectId: string,
  authorId: string
): Promise<void> {
  const comment = commentsRepository.listByTask(projectId, taskId).find((c) => c.id === commentId);
  if (!comment) return;

  const task = tasksRepository.findById(taskId);
  if (!task) return;

  const project = projectsRepository.findById(projectId);
  if (!project) return;

  const recipients = new Set<string>();

  // Добавляем исполнителя задачи
  if (task.assigneeId && task.assigneeId !== authorId) {
    recipients.add(task.assigneeId);
  }

  // Добавляем автора задачи (владельца проекта)
  if (project.ownerId && project.ownerId !== authorId) {
    recipients.add(project.ownerId);
  }

  // Добавляем упомянутых пользователей
  if (comment.mentions && comment.mentions.length > 0) {
    comment.mentions.forEach((userId) => {
      if (userId !== authorId) {
        recipients.add(userId);
      }
    });
  }

  // Создаём уведомления для всех получателей
  recipients.forEach(async (userId) => {
    const notification = notificationsRepository.create({
      userId,
      type: 'comment_added',
      title: `Новый комментарий к задаче: ${task.title}`,
      message: `Добавлен комментарий к задаче "${task.title}" в проекте "${project.title}"`,
      projectId,
      taskId,
      relatedEntityId: commentId,
      status: 'unread'
    });

    // Рассылаем событие через WebSocket
    await broadcastToUser(userId, 'notification.new', {
      notification,
      projectId,
      taskId
    }, projectId);
  });
}

/**
 * Генерирует уведомление о приближающемся дедлайне
 */
export async function notifyDeadlineApproaching(
  taskId: string,
  projectId: string,
  assigneeId: string
): Promise<void> {
  const task = tasksRepository.findById(taskId);
  if (!task || !task.dueAt) return;

  const project = projectsRepository.findById(projectId);
  if (!project) return;

  notificationsRepository.create({
    userId: assigneeId,
    type: 'deadline_approaching',
    title: `Приближается дедлайн: ${task.title}`,
    message: `Дедлайн задачи "${task.title}" приближается в проекте "${project.title}"`,
    projectId,
    taskId,
    status: 'unread'
  });
}

/**
 * Генерирует уведомление о приглашении в проект
 */
export async function notifyProjectInvite(
  projectId: string,
  userId: string
): Promise<void> {
  const project = projectsRepository.findById(projectId);
  if (!project) return;

  notificationsRepository.create({
    userId,
    type: 'project_invite',
    title: `Приглашение в проект: ${project.title}`,
    message: `Вас пригласили в проект "${project.title}"`,
    projectId,
    status: 'unread'
  });
}

/**
 * Генерирует уведомления о новом сообщении в чате проекта
 */
export async function notifyChatMessageAdded(
  messageId: string,
  projectId: string,
  authorId: string
): Promise<void> {
  const message = projectChatRepository.findById(messageId);
  if (!message) return;

  const project = await projectsRepository.findById(projectId);
  if (!project) return;

  // Получаем всех участников проекта
  const members = await projectsRepository.listMembers(projectId);
  const recipients = new Set<string>();

  // Добавляем всех участников проекта, кроме автора сообщения
  members.forEach((member) => {
    if (member.userId !== authorId) {
      recipients.add(member.userId);
    }
  });

  // Добавляем владельца проекта, если он не в списке участников
  if (project.ownerId && project.ownerId !== authorId) {
    recipients.add(project.ownerId);
  }

  // Создаём уведомления для всех получателей
  recipients.forEach(async (userId) => {
    const notification = notificationsRepository.create({
      userId,
      type: 'comment_added', // Используем существующий тип для совместимости
      title: `Новое сообщение в чате проекта: ${project.title}`,
      message: `Новое сообщение в чате проекта "${project.title}"`,
      projectId,
      relatedEntityId: messageId,
      status: 'unread'
    });

    // Рассылаем событие через WebSocket
    await broadcastToUser(userId, 'notification.new', {
      notification,
      projectId
    }, projectId);
  });
}


/**
 * AI Deadline Reminder Service
 * 
 * Проверяет задачи с приближающимися дедлайнами и генерирует
 * персонализированные напоминания через AI
 */

import { tasksRepository, usersRepository } from '@collabverse/api';
import { generateText } from './client';
import { generateDeadlineReminder } from '@collabverse/api/services/ai-service';
import { notifyDeadlineApproaching } from '../notifications/event-generator';

/**
 * Интерфейс задачи с приближающимся дедлайном
 */
export interface TaskWithDeadline {
  id: string;
  title: string;
  projectId: string;
  assigneeId?: string;
  dueAt: string;
  priority?: string;
  daysUntilDeadline: number;
}

/**
 * Проверка задач с приближающимися дедлайнами
 * 
 * @param daysThreshold - Количество дней до дедлайна для напоминания (default: 3)
 * @returns Список задач с приближающимися дедлайнами
 */
export function checkUpcomingDeadlines(daysThreshold = 3): TaskWithDeadline[] {
  const now = Date.now();
  const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
  const upcomingTasks: TaskWithDeadline[] = [];

  const allTasks = tasksRepository.list();

  for (const task of allTasks) {
    // Проверяем только незавершённые задачи с дедлайном
    if (task.status === 'done' || !task.dueAt) {
      continue;
    }

    const dueDate = new Date(task.dueAt).getTime();
    const timeUntilDeadline = dueDate - now;

    // Дедлайн в пределах порога или уже просрочен
    if (timeUntilDeadline <= thresholdMs && timeUntilDeadline >= -24 * 60 * 60 * 1000) {
      const daysUntilDeadline = Math.ceil(timeUntilDeadline / (24 * 60 * 60 * 1000));

      upcomingTasks.push({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        dueAt: task.dueAt,
        daysUntilDeadline,
        ...(task.assigneeId ? { assigneeId: task.assigneeId } : {}),
        ...(task.priority ? { priority: task.priority } : {})
      });
    }
  }

  return upcomingTasks;
}

/**
 * Генерация и отправка напоминаний о дедлайнах
 * 
 * @param useAI - Использовать ли AI для генерации текста напоминания (default: true)
 * @returns Количество отправленных напоминаний
 */
export async function sendDeadlineReminders(useAI = true): Promise<number> {
  const upcomingTasks = checkUpcomingDeadlines(3);
  let sentCount = 0;

  for (const task of upcomingTasks) {
    try {
      let reminderMessage: string;

      if (useAI) {
        // Генерация персонализированного напоминания через AI
        const assignee = task.assigneeId
          ? await usersRepository.findById(task.assigneeId)
          : null;

        const aiClient = {
          generateText: async (prompt: string, options?: any) => {
            return await generateText(prompt, options);
          }
        };

        reminderMessage = await generateDeadlineReminder(aiClient, {
          title: task.title,
          dueAt: new Date(task.dueAt).toLocaleDateString('ru-RU'),
          ...(assignee?.name ? { assignee: assignee.name } : {}),
          ...(task.priority ? { priority: task.priority } : {})
        });
      } else {
        // Простое напоминание без AI
        if (task.daysUntilDeadline === 0) {
          reminderMessage = `Дедлайн задачи "${task.title}" сегодня!`;
        } else if (task.daysUntilDeadline === 1) {
          reminderMessage = `Дедлайн задачи "${task.title}" завтра!`;
        } else if (task.daysUntilDeadline < 0) {
          reminderMessage = `Дедлайн задачи "${task.title}" просрочен!`;
        } else {
          reminderMessage = `Дедлайн задачи "${task.title}" через ${task.daysUntilDeadline} дн.`;
        }
      }

      // Отправка уведомления о приближающемся дедлайне
      if (task.assigneeId) {
        void notifyDeadlineApproaching(
          task.id,
          task.projectId,
          task.assigneeId
        );
        sentCount++;
      }

    } catch (error) {
      console.error(`Failed to send deadline reminder for task ${task.id}:`, error);
      // Продолжаем обработку остальных задач даже при ошибке
    }
  }

  return sentCount;
}

/**
 * Форматирование дедлайна для отображения
 */
export function formatDeadline(daysUntilDeadline: number): string {
  if (daysUntilDeadline < 0) {
    const daysPast = Math.abs(daysUntilDeadline);
    return `Просрочено на ${daysPast} ${daysPast === 1 ? 'день' : 'дней'}`;
  } else if (daysUntilDeadline === 0) {
    return 'Сегодня';
  } else if (daysUntilDeadline === 1) {
    return 'Завтра';
  } else if (daysUntilDeadline === 2) {
    return 'Послезавтра';
  } else {
    return `Через ${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'день' : 'дней'}`;
  }
}

/**
 * Получение приоритета напоминания на основе дней до дедлайна
 */
export function getReminderPriority(daysUntilDeadline: number): 'urgent' | 'high' | 'medium' {
  if (daysUntilDeadline < 0 || daysUntilDeadline === 0) {
    return 'urgent';
  } else if (daysUntilDeadline === 1) {
    return 'high';
  } else {
    return 'medium';
  }
}

/**
 * API endpoint helper для автоматической проверки дедлайнов
 * Может быть вызван через cron job или scheduled task
 */
export async function runDeadlineCheck(): Promise<{
  checked: number;
  reminded: number;
  errors: number;
}> {
  try {
    const upcomingTasks = checkUpcomingDeadlines(3);
    const remindedCount = await sendDeadlineReminders(true);

    return {
      checked: upcomingTasks.length,
      reminded: remindedCount,
      errors: upcomingTasks.length - remindedCount
    };
  } catch (error) {
    console.error('Deadline check failed:', error);
    throw error;
  }
}


/**
 * API endpoint для массовых операций с задачами
 * 
 * POST /api/pm/tasks/bulk-update
 * 
 * Выполняет массовое изменение задач согласно фильтрам и обновлениям
 */

import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { tasksRepository, projectsRepository, domainEventsRepository } from '@collabverse/api';
import type { BulkOperation } from '@/lib/ai/bulk-operations';
type TaskUpdatePatch = Parameters<typeof tasksRepository.update>[1];
type TaskStatus = NonNullable<TaskUpdatePatch['status']>;
type TaskPriority = NonNullable<TaskUpdatePatch['priority']>;

export async function POST(req: NextRequest) {
  try {
    // Проверка авторизации
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return jsonError('UNAUTHORIZED', { status: 401 });
    }

    // Парсинг тела запроса
    const body = await req.json();
    const { projectId, operation } = body as {
      projectId: string;
      operation: BulkOperation;
    };

    // Валидация
    if (!projectId || typeof projectId !== 'string') {
      return jsonError('INVALID_REQUEST', {
        status: 400
      });
    }

    if (!operation || !operation.type || !operation.filter || !operation.updates) {
      return jsonError('INVALID_REQUEST', {
        status: 400
      });
    }

    // Проверка доступа к проекту
    const project = await projectsRepository.findById(projectId);

    if (!project) {
      return jsonError('NOT_FOUND', {
        status: 404
      });
    }

    const members = await projectsRepository.listMembers(projectId);
    const currentMember = members.find((m) => m.userId === auth.userId);

    if (!currentMember) {
      return jsonError('FORBIDDEN', {
        status: 403
      });
    }

    // Only owners and admins can perform bulk operations
    if (currentMember.role !== 'owner' && currentMember.role !== 'admin') {
      return jsonError('FORBIDDEN', {
        status: 403
      });
    }

    // Получение задач проекта
    const allTasks = await tasksRepository.listByProject(projectId);

    // Фильтрация задач согласно фильтру операции
    const tasksToUpdate = allTasks.filter((task) => {
      const { filter } = operation;

      if (filter.status && task.status !== filter.status) {
        return false;
      }

      if (filter.assigneeId && task.assigneeId !== filter.assigneeId) {
        return false;
      }

      if (filter.priority && task.priority !== filter.priority) {
        return false;
      }

      if (filter.labels && filter.labels.length > 0) {
        const taskLabels = task.labels || [];
        const hasAllLabels = filter.labels.every((label) => taskLabels.includes(label));
        if (!hasAllLabels) {
          return false;
        }
      }

      if (filter.hasDeadline !== undefined) {
        const hasDeadline = !!task.dueAt;
        if (hasDeadline !== filter.hasDeadline) {
          return false;
        }
      }

      return true;
    });

    // Выполнение обновлений
    let updatedCount = 0;
    const allowedStatuses: TaskStatus[] = ['new', 'in_progress', 'review', 'done', 'blocked'];
    const allowedPriorities: TaskPriority[] = ['low', 'med', 'high', 'urgent'];

    for (const task of tasksToUpdate) {
      const updates: TaskUpdatePatch = {};

      // Применение обновлений согласно типу операции
      switch (operation.type) {
        case 'update_status':
          if (operation.updates.status) {
            const statusUpdate = operation.updates.status;
            if (allowedStatuses.includes(statusUpdate as TaskStatus)) {
              updates.status = statusUpdate as TaskStatus;
            }
          }
          break;

        case 'update_deadline':
          if (operation.updates.deadline) {
            updates.dueAt = operation.updates.deadline;
          }
          break;

        case 'update_priority':
          if (operation.updates.priority) {
            const priorityUpdate = operation.updates.priority;
            if (allowedPriorities.includes(priorityUpdate as TaskPriority)) {
              updates.priority = priorityUpdate as TaskPriority;
            }
          }
          break;

        case 'assign':
          if (operation.updates.assigneeId) {
            updates.assigneeId = operation.updates.assigneeId;
          }
          break;

        case 'add_labels':
          if (operation.updates.labels) {
            const currentLabels = task.labels || [];
            const newLabels = [...new Set([...currentLabels, ...operation.updates.labels])];
            updates.labels = newLabels;
          }
          break;

        case 'remove_labels':
          if (operation.updates.labels) {
            const currentLabels = task.labels || [];
            const newLabels = currentLabels.filter(
              (label) => !operation.updates.labels!.includes(label)
            );
            updates.labels = newLabels;
          }
          break;

        case 'update_estimatedTime':
          if (operation.updates.estimatedTime !== undefined) {
            updates.estimatedTime = operation.updates.estimatedTime;
          }
          break;

        default:
          console.warn(`Unknown operation type: ${operation.type}`);
          continue;
      }

      // Обновление задачи
      if (Object.keys(updates).length > 0) {
        const before = { ...task };
        const updated = await tasksRepository.update(task.id, updates);

        if (updated) {
          updatedCount++;

          // Создание доменного события
          domainEventsRepository.emit({
            id: crypto.randomUUID(),
            type: 'task.bulk_updated',
            entityId: task.id,
            payload: {
              projectId,
              taskId: task.id,
              operationType: operation.type,
              before,
              after: updated,
              updatedBy: auth.userId
            },
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    // Создание события о массовой операции
    domainEventsRepository.emit({
      id: crypto.randomUUID(),
      type: 'project.bulk_operation',
      entityId: projectId,
      payload: {
        projectId,
        operationType: operation.type,
        affectedTasksCount: updatedCount,
        filter: operation.filter,
        updates: operation.updates,
        executedBy: auth.userId
      },
      createdAt: new Date().toISOString()
    });

    return jsonOk({
      updatedCount,
      // Successfully updated tasks
    });
  } catch (error) {
    console.error('Error executing bulk operation:', error);
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      // Failed to execute bulk operation
    });
  }
}

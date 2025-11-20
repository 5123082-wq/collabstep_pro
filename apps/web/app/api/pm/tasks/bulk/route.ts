// NextRequest and NextResponse removed - using Request instead
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { tasksRepository, projectsRepository, type TaskStatus, aiAgentsRepository } from '@collabverse/api';
import { notifyTaskAssigned, notifyTaskUpdated } from '@/lib/notifications/event-generator';
import { broadcastToProject } from '@/lib/websocket/event-broadcaster';
import { handleAgentTaskAssignment } from '@/lib/ai/agent-task-actions';

export async function POST(request: Request) {
  // Проверяем feature flags - bulk endpoint доступен если включен хотя бы один из флагов задач
  if (!flags.PM_TASKS_BOARD && !flags.PM_TASKS_LIST && !flags.PM_TASKS_CALENDAR) {
    console.error('[Bulk Update] Feature flags not enabled:', {
      PM_TASKS_BOARD: flags.PM_TASKS_BOARD,
      PM_TASKS_LIST: flags.PM_TASKS_LIST,
      PM_TASKS_CALENDAR: flags.PM_TASKS_CALENDAR,
    });
    return jsonError('FEATURE_NOT_ENABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    console.error('[Bulk Update] Unauthorized request');
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Bulk Update] Failed to parse request body:', parseError);
      return jsonError('INVALID_JSON', { status: 400 });
    }

    const { taskIds, updates } = body;

    console.log('[Bulk Update] Request body:', JSON.stringify({ taskIds, updates }, null, 2));

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      console.error('[Bulk Update] Invalid taskIds:', taskIds);
      return jsonError('taskIds must be a non-empty array', { status: 400 });
    }

    if (!updates || typeof updates !== 'object') {
      console.error('[Bulk Update] Invalid updates:', updates);
      return jsonError('updates must be an object', { status: 400 });
    }

    // Проверяем доступ ко всем задачам
    const allTasks = tasksRepository.list();
    const tasksToUpdate = allTasks.filter((t) => taskIds.includes(t.id));

    // Проверяем, что все задачи найдены
    if (tasksToUpdate.length !== taskIds.length) {
      const foundIds = new Set(tasksToUpdate.map((t) => t.id));
      const missingIds = taskIds.filter((id) => !foundIds.has(id));
      console.error('[Bulk Update] Tasks not found:', missingIds);
      return jsonError(`Tasks not found: ${missingIds.join(', ')}`, { status: 404 });
    }

    for (const task of tasksToUpdate) {
      if (!projectsRepository.hasAccess(task.projectId, auth.userId)) {
        console.error('[Bulk Update] No access to task:', task.id, 'projectId:', task.projectId, 'userId:', auth.userId);
        return jsonError(`No access to task ${task.id}`, { status: 403 });
      }
    }

    // Применяем обновления
    const updatedTasks = [];
    for (const taskId of taskIds) {
      const taskBefore = tasksRepository.findById(taskId);
      const patch: Parameters<typeof tasksRepository.update>[1] = {};

      if ('status' in updates && updates.status) {
        const statusValue = updates.status;
        // Валидация статуса
        const validStatuses: TaskStatus[] = ['new', 'in_progress', 'review', 'done', 'blocked'];
        if (typeof statusValue === 'string' && validStatuses.includes(statusValue as TaskStatus)) {
          patch.status = statusValue as TaskStatus;
        } else {
          console.error('[Bulk Update] Invalid status value:', statusValue);
          // Не добавляем статус в patch, если он невалидный
        }
      }
      if ('assigneeId' in updates) {
        patch.assigneeId = updates.assigneeId || undefined;
      }
      if ('priority' in updates && updates.priority) {
        patch.priority = updates.priority;
      }
      if ('labels' in updates) {
        patch.labels = Array.isArray(updates.labels) ? updates.labels : [];
      }
      if ('startDate' in updates || 'startAt' in updates) {
        const startValue = updates.startDate || updates.startAt;
        // Проверяем, что значение не пустая строка
        if (startValue && typeof startValue === 'string' && startValue.trim() !== '') {
          patch.startDate = startValue;
        } else if (startValue === null || startValue === undefined) {
          // Явно удаляем дату, если передано null/undefined
          // Используем пустую строку, чтобы указать на удаление (репозиторий обработает это)
          patch.startDate = '';
        }
      }
      if ('dueAt' in updates) {
        const dueValue = updates.dueAt;
        // Проверяем, что значение не пустая строка
        if (dueValue && typeof dueValue === 'string' && dueValue.trim() !== '') {
          patch.dueAt = dueValue;
        } else if (dueValue === null || dueValue === undefined) {
          // Явно удаляем дату, если передано null/undefined
          // Используем пустую строку, чтобы указать на удаление (репозиторий обработает это)
          patch.dueAt = '';
        }
      }

      // Проверяем, что есть хотя бы одно поле для обновления
      const hasUpdates = Object.keys(patch).length > 0;
      if (!hasUpdates) {
        console.warn('[Bulk Update] No updates to apply for task:', taskId);
        // Если нет обновлений, просто пропускаем задачу
        continue;
      }

      console.log('[Bulk Update] Updating task:', taskId, 'with patch:', patch);
      const updated = tasksRepository.update(taskId, patch);
      if (!updated) {
        console.error('[Bulk Update] Task not found or update failed:', taskId);
        // Продолжаем обработку других задач, но логируем ошибку
        continue;
      }
      updatedTasks.push(updated);

      // Генерируем уведомления при изменении
      if (taskBefore) {
        // Уведомление при изменении исполнителя
        if ('assigneeId' in updates && updates.assigneeId && updates.assigneeId !== taskBefore.assigneeId && updates.assigneeId !== auth.userId) {
          await notifyTaskAssigned(updated.id, updates.assigneeId, updated.projectId);

          // Если назначен AI-агент, обработать назначение
          const agent = await aiAgentsRepository.findById(updates.assigneeId);
          if (agent) {
            handleAgentTaskAssignment(updated.id, updates.assigneeId).catch((error) => {
              console.error('Error handling agent task assignment:', error);
            });
          }
        }
        // Уведомление об обновлении задачи (если не менялся исполнитель)
        else if (updated.assigneeId && updated.assigneeId !== auth.userId) {
          await notifyTaskUpdated(updated.id, updated.projectId, auth.userId);
        }
      }

      // Рассылаем событие через WebSocket для каждой обновленной задачи
      await broadcastToProject(updated.projectId, 'task.updated', {
        task: updated,
        projectId: updated.projectId
      });
    }

    console.log('[Bulk Update] Successfully updated', updatedTasks.length, 'tasks');
    return jsonOk({ updated: updatedTasks.length, tasks: updatedTasks });
  } catch (error) {
    console.error('[Bulk Update] Error updating tasks:', error);
    if (error instanceof Error) {
      console.error('[Bulk Update] Error message:', error.message);
      console.error('[Bulk Update] Error stack:', error.stack);
    }
    return jsonError('INVALID_REQUEST', { status: 400 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  taskDependenciesRepository,
  tasksRepository,
} from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

/**
 * DELETE /api/pm/tasks/[id]/dependencies/[depId]
 * Удалить зависимость задачи
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; depId: string } }
): Promise<NextResponse> {
  // Проверка feature flag
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  // Проверка авторизации
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { id: taskId, depId } = params;

  try {
    // Получение задачи
    const task = tasksRepository.findById(taskId);
    if (!task) {
      return jsonError('TASK_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = await getProjectRole(task.projectId, auth.userId);
    if (!role || role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Получение всех зависимостей задачи для проверки принадлежности
    const taskDependencies = taskDependenciesRepository.listByTask(taskId);
    const dependency = taskDependencies.find((dep) => dep.id === depId);

    if (!dependency) {
      return jsonError('DEPENDENCY_NOT_FOUND', { status: 404 });
    }

    // Удаление зависимости
    const deleted = taskDependenciesRepository.delete(depId);
    if (!deleted) {
      return jsonError('DEPENDENCY_NOT_FOUND', { status: 404 });
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error('[DELETE /api/pm/tasks/[id]/dependencies/[depId]] Error:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


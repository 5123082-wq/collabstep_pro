import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  taskDependenciesRepository,
  tasksRepository,
} from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

/**
 * GET /api/pm/tasks/[id]/dependencies
 * Получить зависимости задачи
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

  const taskId = params.id;

  try {
    // Получение задачи
    const task = tasksRepository.findById(taskId);
    if (!task) {
      return jsonError('TASK_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = getProjectRole(task.projectId, auth.userId);
    if (!role || role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Получение зависимостей задачи
    const dependencies = taskDependenciesRepository.listByTask(taskId);

    return jsonOk({ dependencies });
  } catch (error) {
    console.error('[GET /api/pm/tasks/[id]/dependencies] Error:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

/**
 * POST /api/pm/tasks/[id]/dependencies
 * Создать зависимость задачи
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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

  const taskId = params.id;

  try {
    // Получение задачи
    const task = tasksRepository.findById(taskId);
    if (!task) {
      return jsonError('TASK_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = getProjectRole(task.projectId, auth.userId);
    if (!role || role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Получение и валидация body
    const body = await req.json().catch(() => null);
    if (!body || typeof body.blockerTaskId !== 'string') {
      return jsonError('INVALID_BODY', { status: 400 });
    }

    const { blockerTaskId, type } = body;

    // Проверка существования блокирующей задачи
    const blockerTask = tasksRepository.findById(blockerTaskId);
    if (!blockerTask) {
      return jsonError('BLOCKER_TASK_NOT_FOUND', { status: 404 });
    }

    // Проверка, что обе задачи в одном проекте
    if (blockerTask.projectId !== task.projectId) {
      return jsonError('TASKS_IN_DIFFERENT_PROJECTS', { status: 400 });
    }

    // Проверка, что не создаётся зависимость задачи от самой себя
    if (taskId === blockerTaskId) {
      return jsonError('SELF_DEPENDENCY_NOT_ALLOWED', { status: 400 });
    }

    // Создание зависимости
    // dependentTaskId - задача, которая блокируется (текущая задача)
    // blockerTaskId - задача, которая блокирует
    const dependency = taskDependenciesRepository.create({
      dependentTaskId: taskId,
      blockerTaskId,
      type: type === 'relates_to' ? 'relates_to' : 'blocks',
    });

    return jsonOk({ dependency }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Dependency already exists') {
        return jsonError('DEPENDENCY_ALREADY_EXISTS', { status: 409 });
      }
      if (error.message === 'Creating this dependency would create a circular dependency') {
        return jsonError('CIRCULAR_DEPENDENCY', { status: 400 });
      }
    }
    console.error('[POST /api/pm/tasks/[id]/dependencies] Error:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


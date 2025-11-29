import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  projectsRepository,
  tasksRepository,
  usersRepository,
  DEFAULT_WORKSPACE_ID,
  deletionService,
  isAdminUserId
} from '@collabverse/api';
import { isDemoAdminEmail } from '@/lib/auth/demo-session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { transformProjectAsync as transformProjectFromAggregator, buildTaskMetrics } from '@/lib/pm/stage2-aggregator';
// Project type removed as it was unused

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECT_CARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(_req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  // Логируем все проекты в памяти для отладки
  const allProjects = projectsRepository.list();
  console.log(`[Project API GET] Looking for project: id=${params.id}, userId=${auth.userId}, totalProjects=${allProjects.length}`);
  if (allProjects.length > 0) {
    console.log(`[Project API GET] Available project IDs: [${allProjects.map(p => p.id).join(', ')}]`);
  }

  // Try to find project by ID first
  let apiProject = await projectsRepository.findById(params.id);

  // If not found by ID, try to find by key (assuming default workspace)
  if (!apiProject) {
    console.log(`[Project API GET] Project not found by ID, trying findByKey: workspaceId=${DEFAULT_WORKSPACE_ID}, key=${params.id}`);
    apiProject = await projectsRepository.findByKey(DEFAULT_WORKSPACE_ID, params.id);
  }

  if (!apiProject) {
    console.error(`[Project API GET] Project not found: id=${params.id}, userId=${auth.userId}, totalProjects=${allProjects.length}`);
    return jsonError('NOT_FOUND', { status: 404 });
  }

  console.log(`[Project API GET] Project found: id=${apiProject.id}, workspaceId=${apiProject.workspaceId}, ownerId=${apiProject.ownerId}`);

  // Check if user has access to the project
  const hasAccess = await projectsRepository.hasAccess(apiProject.id, auth.userId);
  if (!hasAccess) {
    console.error(`[Project API] Access denied: projectId=${apiProject.id}, userId=${auth.userId}, ownerId=${apiProject.ownerId}, visibility=${apiProject.visibility}`);
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  // Получаем все необходимые данные для трансформации проекта
  const members = await projectsRepository.listMembers(apiProject.id);
  const allTasks = tasksRepository.list({ projectId: apiProject.id });
  const metricsMap = buildTaskMetrics(allTasks);
  const resolvedMetrics = metricsMap.get(apiProject.id) ?? {
    total: 0,
    inProgress: 0,
    overdue: 0,
    completed: 0,
    activity7d: 0,
    progressPct: 0
  };

  const owner = await usersRepository.findById(apiProject.ownerId);

  // Используем асинхронную функцию трансформации из aggregator
  // которая загружает имена пользователей через usersRepository
  const project = await transformProjectFromAggregator(
    apiProject,
    members,
    resolvedMetrics,
    owner ? {
      id: owner.id,
      name: owner.name,
      email: owner.email
    } : null
  );

  // Логирование для отладки
  console.log('[Project API] Project members:', project.members.map(m => ({
    userId: m.userId,
    name: m.name,
    role: m.role
  })));

  return jsonOk({ project });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECT_CARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  // Try to find project by ID first
  let apiProject = await projectsRepository.findById(params.id);

  // If not found by ID, try to find by key (assuming default workspace)
  if (!apiProject) {
    apiProject = await projectsRepository.findByKey(DEFAULT_WORKSPACE_ID, params.id);
  }

  if (!apiProject) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const isAdmin =
    isAdminUserId(auth.userId) ||
    isDemoAdminEmail(auth.email) ||
    isDemoAdminEmail(auth.userId);

  if (!isAdmin) {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  try {
    const body = await req.json();
    const updated = projectsRepository.update(apiProject.id, body);
    return jsonOk({ project: updated });
  } catch (error) {
    return jsonError('INVALID_REQUEST', { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  // Try to find project by ID first
  let apiProject = await projectsRepository.findById(params.id);

  // If not found by ID, try to find by key (assuming default workspace)
  if (!apiProject) {
    apiProject = await projectsRepository.findByKey(DEFAULT_WORKSPACE_ID, params.id);
  }

  if (!apiProject) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const role = await getProjectRole(apiProject.id, auth.userId);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const previewRequested = url.searchParams.get('preview') === 'true';

    if (previewRequested) {
      const preview = await deletionService.getProjectPreview(apiProject.id);
      if (!preview) {
        return jsonError('NOT_FOUND', { status: 404 });
      }
      return jsonOk({ preview });
    }

    const result = await deletionService.deleteProject(apiProject.id);
    if (!result) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    console.log(
      `[Project API DELETE] Project deleted: id=${apiProject.id}, tasks=${result.deletedTaskIds.length}, userId=${auth.userId}`
    );
    return jsonOk({ deleted: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Project API DELETE] Error deleting project: ${message}`);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

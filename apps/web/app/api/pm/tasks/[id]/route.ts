import { NextRequest } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { deletionService, tasksRepository, isAdminUserId } from '@collabverse/api';
import { isDemoAdminEmail } from '@/lib/auth/demo-session';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const isAdmin =
    isAdminUserId(auth.userId) ||
    isDemoAdminEmail(auth.email) ||
    isDemoAdminEmail(auth.userId);

  if (!isAdmin) {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  const task = tasksRepository.findById(params.id);
  if (!task) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const url = new URL(req.url);
  const previewRequested = url.searchParams.get('preview') === 'true';
  const scopeParam = url.searchParams.get('scope');

  if (previewRequested) {
    const preview = await deletionService.getTaskPreview(task.id);
    if (!preview) {
      return jsonError('NOT_FOUND', { status: 404 });
    }
    const projectPreview = await deletionService.getProjectPreview(task.projectId);
    if (!projectPreview) {
      return jsonError('NOT_FOUND', { status: 404 });
    }
    return jsonOk({ preview, projectPreview });
  }

  let scope: 'task' | 'project' = scopeParam === 'project' ? 'project' : 'task';
  const body = await req.json().catch(() => null);
  if (body && typeof body === 'object' && body !== null) {
    const parsedScope = (body as { scope?: string }).scope;
    if (parsedScope === 'project') {
      scope = 'project';
    } else if (parsedScope === 'task') {
      scope = 'task';
    }
  }

  if (scope === 'project') {
    const result = await deletionService.deleteProject(task.projectId);
    if (!result) {
      return jsonError('NOT_FOUND', { status: 404 });
    }
    return jsonOk({ deleted: true, scope, result });
  }

  const result = await deletionService.deleteTask(task.id);
  if (!result) {
    return jsonError('NOT_FOUND', { status: 404 });
  }
  return jsonOk({ deleted: true, scope, result });
}

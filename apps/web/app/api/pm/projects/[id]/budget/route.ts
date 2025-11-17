import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { projectsRepository } from '@collabverse/api';
import { trackEvent } from '@/lib/telemetry';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_PROJECT_CARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const role = getProjectRole(params.id, auth.userId);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  try {
    const project = projectsRepository.findById(params.id);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    const body = await req.json();
    const { budgetLimit } = body;

    // Валидация
    if (typeof budgetLimit !== 'number' || budgetLimit < 0) {
      return jsonError('INVALID_BUDGET_LIMIT', { status: 400 });
    }

    // Обновляем лимит бюджета
    const updatedProject = projectsRepository.update(params.id, {
      budgetPlanned: budgetLimit
    });

    if (!updatedProject) {
      return jsonError('FAILED_TO_UPDATE', { status: 500 });
    }

    // Аналитика события
    trackEvent('pm_budget_limit_updated', {
      workspaceId: project.workspaceId,
      projectId: params.id,
      userId: auth.userId,
      budgetLimit,
      source: 'api'
    });

    return jsonOk({ project: updatedProject });
  } catch (error) {
    console.error('[budget] Error updating budget limit:', error);
    return jsonError('INVALID_REQUEST', { status: 400 });
  }
}


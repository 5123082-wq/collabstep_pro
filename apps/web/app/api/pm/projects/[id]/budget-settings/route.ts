import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { projectsRepository, getFinanceService } from '@collabverse/api';
import { trackEvent } from '@/lib/telemetry';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.BUDGET_LIMITS) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const role = await getProjectRole(params.id, auth.userId);
  if (role === 'viewer') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  try {
    const project = await projectsRepository.findById(params.id);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    const financeService = getFinanceService();
    const budget = await financeService.getBudget(params.id);

    return jsonOk({ budget });
  } catch (error) {
    console.error('[budget-settings] Error getting budget:', error);
    return jsonError('INVALID_REQUEST', { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.BUDGET_LIMITS) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const role = await getProjectRole(params.id, auth.userId);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  try {
    const project = await projectsRepository.findById(params.id);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    const body = await req.json();
    const { currency, total, warnThreshold, categories } = body;

    // Валидация
    if (!currency || typeof currency !== 'string') {
      return jsonError('INVALID_CURRENCY', { status: 400 });
    }

    if (total !== undefined && (typeof total !== 'number' || total < 0)) {
      return jsonError('INVALID_TOTAL', { status: 400 });
    }

    if (warnThreshold !== undefined && (typeof warnThreshold !== 'number' || warnThreshold < 0 || warnThreshold > 100)) {
      return jsonError('INVALID_WARN_THRESHOLD', { status: 400 });
    }

    if (categories !== undefined && !Array.isArray(categories)) {
      return jsonError('INVALID_CATEGORIES', { status: 400 });
    }

    const financeService = getFinanceService();
    const budget = await financeService.upsertBudget(
      params.id,
      {
        currency,
        total: total !== undefined ? total : undefined,
        warnThreshold: warnThreshold !== undefined ? warnThreshold / 100 : undefined,
        categories: categories?.map((cat: { name: string; limit?: number }) => ({
          name: cat.name,
          limit: cat.limit !== undefined ? cat.limit : undefined
        }))
      },
      {
        actorId: auth.userId
      }
    );

    trackEvent('pm_budget_limit_updated', {
      workspaceId: project.workspaceId,
      projectId: params.id,
      userId: auth.userId,
      currency,
      total: total !== undefined ? total : null,
      warnThreshold: warnThreshold !== undefined ? warnThreshold : null,
      categoriesCount: categories?.length || 0,
      source: 'api'
    });

    return jsonOk({ budget });
  } catch (error) {
    console.error('[budget-settings] Error updating budget:', error);
    const message = error instanceof Error ? error.message : 'INVALID_REQUEST';
    return jsonError(message, { status: 400 });
  }
}


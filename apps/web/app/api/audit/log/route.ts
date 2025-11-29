import '@/lib/finance/bootstrap';
import { auditLogRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getAuthFromRequest } from '@/lib/api/finance-access';

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const url = new URL(request.url);
  const projectIdParam = url.searchParams.get('projectId');
  const entityTypeParam = url.searchParams.get('entityType');
  const entityIdParam = url.searchParams.get('entityId');
  const actionsParam = url.searchParams.get('actions');

  const filters: {
    projectId?: string;
    entityType?: string;
    entityId?: string;
    actions?: string[];
  } = {};

  if (projectIdParam) filters.projectId = projectIdParam;
  if (entityTypeParam) filters.entityType = entityTypeParam;
  if (entityIdParam) filters.entityId = entityIdParam;
  if (actionsParam) {
    filters.actions = actionsParam.split(',').filter(Boolean);
  }

  const events = auditLogRepository.list(filters);

  return jsonOk({ items: events });
}


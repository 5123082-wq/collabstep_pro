import '@/lib/finance/bootstrap';
import { auditLogRepository, financeService } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const expense = await financeService.findExpenseById(params.id);
  if (!expense) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const role = await getProjectRole(expense.projectId, auth.userId);
  if (role === 'viewer') {
    return jsonError('FORBIDDEN', { status: 403 });
  }
  if (role === 'member' && expense.createdBy !== auth.userId) {
    return jsonError('FORBIDDEN', { status: 403 });
  }

  const events = auditLogRepository
    .list()
    .filter((event) => event.entity.type === 'expense' && event.entity.id === params.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return jsonOk({ items: events });
}

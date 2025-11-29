import '@/lib/finance/bootstrap';
import { financeService, type UpdateExpenseInput, type ExpenseStatus } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';

type AttachmentInput = { filename: string; url: string };

function normalizeAttachments(value: unknown): AttachmentInput[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items: AttachmentInput[] = [];
  for (const raw of value as Array<{ filename?: unknown; url?: unknown }>) {
    if (raw && typeof raw.filename === 'string' && typeof raw.url === 'string') {
      items.push({ filename: raw.filename, url: raw.url });
    }
  }
  return items.length ? items : undefined;
}

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  switch (message) {
    case 'INVALID_AMOUNT':
    case 'INVALID_CURRENCY':
    case 'AMOUNT_NOT_POSITIVE':
    case 'INVALID_DATE':
    case 'INVALID_STATUS':
    case 'INVALID_STATUS_TRANSITION':
    case 'INVALID_TAX':
    case 'BUDGET_CURRENCY_MISMATCH':
      return jsonError(message, { status: 400 });
    case 'EXPENSE_NOT_FOUND':
      return jsonError('NOT_FOUND', { status: 404 });
    case 'ACCESS_DENIED':
      return jsonError('FORBIDDEN', { status: 403 });
    default:
      console.error('Finance API error', error);
      return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const current = await financeService.findExpenseById(params.id);
  if (!current) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const role = await getProjectRole(current.projectId, auth.userId);
  if (role === 'viewer') {
    return jsonError('FORBIDDEN', { status: 403 });
  }

  if (role === 'member' && current.createdBy !== auth.userId) {
    return jsonError('FORBIDDEN', { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const status = typeof body.status === 'string' ? (body.status as ExpenseStatus) : undefined;
    if (status && role === 'member' && ['approved', 'payable', 'closed'].includes(status)) {
      throw new Error('ACCESS_DENIED');
    }

    const updatePayload: UpdateExpenseInput = {
      amount: body.amount,
      currency: body.currency,
      category: typeof body.category === 'string' ? body.category : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      vendor: typeof body.vendor === 'string' ? body.vendor : undefined,
      paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : undefined,
      taxAmount: body.taxAmount
    };
    if (typeof body.taskId === 'string') {
      updatePayload.taskId = body.taskId;
    }
    if (typeof body.date === 'string') {
      updatePayload.date = body.date;
    }
    if (status) {
      updatePayload.status = status;
    }
    const attachments = normalizeAttachments(body.attachments);
    if (attachments) {
      updatePayload.attachments = attachments;
    }

    const patch = await financeService.updateExpense(params.id, updatePayload, { actorId: auth.userId });

    return jsonOk(patch);
  } catch (error) {
    return handleError(error);
  }
}

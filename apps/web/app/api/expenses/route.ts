import '@/lib/finance/bootstrap';
import {
  amountToCents,
  centsToAmount,
  createFinanceService,
  getExpenseStore,
  projectsRepository,
  type CreateExpenseInput,
  type ExpenseFilters,
  type ExpenseStatus,
  type Expense
} from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { assertProjectAccess, getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';

const expenseStore = getExpenseStore();
const financeService = createFinanceService(expenseStore);

function parsePagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
  const sizeParam = Number(url.searchParams.get('pageSize') ?? '20');
  const pageSize = Math.min(100, Math.max(1, Number.isFinite(sizeParam) ? sizeParam : 20));
  return { page, pageSize };
}

function parseFilters(url: URL) {
  const status = url.searchParams.get('status');
  const category = url.searchParams.get('category');
  const projectId = url.searchParams.get('projectId');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const search = url.searchParams.get('q');
  return {
    status: status as ExpenseStatus | null,
    category: category ?? undefined,
    projectId: projectId ?? undefined,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    search: search ?? undefined
  };
}

function applyPagination<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paginated = items.slice(start, start + pageSize);
  return { items: paginated, pagination: { page, pageSize, total, totalPages } };
}

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

function collectAccessibleProjects(userId: string) {
  const projects = projectsRepository.list();
  const accessMap = new Map<string, ReturnType<typeof getProjectRole>>();
  for (const project of projects) {
    const role = await getProjectRole(project.id, userId);
    if (role !== 'viewer') {
      accessMap.set(project.id, role);
    }
  }
  return accessMap;
}

function filterByAccess(
  expenses: Expense[],
  accessMap: Map<string, ReturnType<typeof getProjectRole>>,
  userId: string
) {
  return expenses.filter((expense) => {
    const role = accessMap.get(expense.projectId);
    if (!role) {
      return false;
    }
    if (role === 'owner' || role === 'admin') {
      return true;
    }
    return expense.createdBy === userId;
  });
}

function summarizeExpenses(expenses: Expense[]) {
  const totals = new Map<string, bigint>();
  for (const expense of expenses) {
    try {
      const cents = amountToCents(expense.amount);
      totals.set(expense.currency, (totals.get(expense.currency) ?? 0n) + cents);
    } catch (err) {
      console.error('Failed to aggregate expense amount', { expenseId: expense.id, error: err });
    }
  }
  return {
    totalCount: expenses.length,
    totalsByCurrency: Array.from(totals.entries()).map(([currency, cents]) => ({
      currency,
      amount: centsToAmount(cents)
    }))
  };
}

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const url = new URL(request.url);
  const { page, pageSize } = parsePagination(url);
  const filters = parseFilters(url);

  const accessMap = collectAccessibleProjects(auth.userId);

  if (filters.projectId) {
    const role = await getProjectRole(filters.projectId, auth.userId);
    if (role === 'viewer') {
      return jsonOk({ items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } });
    }
  }

  const serviceFilters: ExpenseFilters = {};
  if (filters.projectId) {
    serviceFilters.projectId = filters.projectId;
  }
  if (filters.status) {
    serviceFilters.status = filters.status;
  }
  if (filters.category) {
    serviceFilters.category = filters.category;
  }
  if (filters.dateFrom) {
    serviceFilters.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo) {
    serviceFilters.dateTo = filters.dateTo;
  }
  if (filters.search) {
    serviceFilters.search = filters.search;
  }

  const { items } = await financeService.listExpenses(serviceFilters);

  const filtered = filterByAccess(items, accessMap, auth.userId);
  const { items: paginated, pagination } = applyPagination(filtered, page, pageSize);

  return jsonOk({ items: paginated, pagination, summary: summarizeExpenses(filtered) });
}

export async function POST(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return jsonError('INVALID_BODY', { status: 400 });
  }

  const projectId = typeof payload.projectId === 'string' ? payload.projectId : '';
  const workspaceId = typeof payload.workspaceId === 'string' ? payload.workspaceId : '';
  if (!projectId || !workspaceId) {
    return jsonError('PROJECT_AND_WORKSPACE_REQUIRED', { status: 400 });
  }

  try {
    const role = await getProjectRole(projectId, auth.userId);
    assertProjectAccess(role, ['owner', 'admin', 'member']);

    const idempotencyKey = request.headers.get('x-idempotency-key');
    const expensePayload: CreateExpenseInput = {
      workspaceId,
      projectId,
      date: typeof payload.date === 'string' ? payload.date : new Date().toISOString(),
      amount: payload.amount,
      currency: payload.currency,
      category: typeof payload.category === 'string' ? payload.category : 'Uncategorized',
      description: typeof payload.description === 'string' ? payload.description : undefined,
      vendor: typeof payload.vendor === 'string' ? payload.vendor : undefined,
      paymentMethod: typeof payload.paymentMethod === 'string' ? payload.paymentMethod : undefined,
      taxAmount: payload.taxAmount
    };
    if (typeof payload.taskId === 'string' && payload.taskId) {
      expensePayload.taskId = payload.taskId;
    }
    if (typeof payload.status === 'string') {
      expensePayload.status = payload.status as ExpenseStatus;
    }
    const attachments = normalizeAttachments(payload.attachments);
    if (attachments) {
      expensePayload.attachments = attachments;
    }

    const expense = await financeService.createExpense(expensePayload, {
      actorId: auth.userId,
      idempotencyKey
    });

    // Проверяем, была ли трата автоматически переведена в pending из-за превышения лимита
    const wasAutomated = expense.status === 'pending' && expensePayload.status !== 'pending';
    if (wasAutomated) {
      // Отправляем телеметрию о срабатывании автоматизации
      const { trackEvent } = await import('@/lib/telemetry');
      trackEvent('pm_expense_limit_breached', {
        workspaceId,
        projectId,
        expenseId: expense.id,
        userId: auth.userId,
        amount: expense.amount,
        currency: expense.currency,
        source: 'api'
      });
      trackEvent('pm_automation_triggered', {
        workspaceId,
        projectId,
        expenseId: expense.id,
        userId: auth.userId,
        automationType: 'budget_limit_exceeded',
        source: 'api'
      });
    }

    return jsonOk(expense, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

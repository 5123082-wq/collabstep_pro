import { auditLogRepository } from '../repositories/audit-log-repository';
import { domainEventsRepository } from '../repositories/domain-events-repository';
import type { ExpenseFilters, ExpenseUpdatePatch, ExpenseStore } from '../repositories/expense-store';
import { projectBudgetsRepository } from '../repositories/project-budgets-repository';
import { getExpenseStore } from '../stores/expense-store-factory';
import type {
  AuditLogEntry,
  Expense,
  ExpenseStatus,
  ProjectBudget,
  ProjectBudgetCategoryLimit,
  ProjectBudgetSnapshot,
  ProjectBudgetUsageCategory
} from '../types';
import { amountToCents, centsToAmount, normalizeAmount, normalizeCurrency } from '../utils/money';

const ALLOWED_STATUS: ExpenseStatus[] = ['draft', 'pending', 'approved', 'payable', 'closed'];
const FINAL_STATUSES = new Set<ExpenseStatus>(['approved', 'payable', 'closed']);
const STATUS_FLOW: Record<ExpenseStatus, ExpenseStatus[]> = {
  draft: ['pending'],
  pending: ['approved', 'draft'],
  approved: ['payable', 'pending'],
  payable: ['closed', 'approved'],
  closed: []
};

function assertStatusTransition(from: ExpenseStatus, to: ExpenseStatus): void {
  if (from === to) {
    return;
  }
  const allowed = STATUS_FLOW[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error('INVALID_STATUS_TRANSITION');
  }
}

function assertValidStatus(status: ExpenseStatus): void {
  if (!ALLOWED_STATUS.includes(status)) {
    throw new Error('INVALID_STATUS');
  }
}

function assertDate(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    throw new Error('INVALID_DATE');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('INVALID_DATE');
  }
  const now = new Date();
  const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (parsed.getTime() > limit.getTime()) {
    throw new Error('INVALID_DATE');
  }
  return new Date(parsed.toISOString()).toISOString();
}

function assertWarnThreshold(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 1) {
    throw new Error('INVALID_WARN_THRESHOLD');
  }
  return num;
}

export interface CreateExpenseInput {
  workspaceId: string;
  projectId: string;
  taskId?: string;
  date: string;
  amount: unknown;
  currency: unknown;
  category: string;
  description?: string;
  vendor?: string;
  paymentMethod?: string;
  taxAmount?: unknown;
  attachments?: { filename: string; url: string }[];
  status?: ExpenseStatus;
}

export interface UpdateExpenseInput {
  taskId?: string;
  date?: string;
  amount?: unknown;
  currency?: unknown;
  category?: string;
  description?: string;
  vendor?: string;
  paymentMethod?: string;
  taxAmount?: unknown;
  status?: ExpenseStatus;
  attachments?: { filename: string; url: string }[];
}

export interface CreateBudgetInput {
  currency: unknown;
  total?: unknown;
  warnThreshold?: unknown;
  categories?: { name: string; limit?: unknown }[];
}

export interface FinanceListResult {
  items: Expense[];
  total: number;
}

interface OperationContext {
  actorId: string;
  idempotencyKey?: string | null;
}

function ensurePositive(amount: string): void {
  if (amountToCents(amount) <= 0n) {
    throw new Error('AMOUNT_NOT_POSITIVE');
  }
}

function normalizeTaxAmount(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const normalized = normalizeAmount(value);
  if (amountToCents(normalized) < 0n) {
    throw new Error('INVALID_TAX');
  }
  return normalized;
}

function buildCategoriesUsage(
  categories: ProjectBudget['categories'],
  spentPerCategory: Map<string, bigint>
): ProjectBudgetUsageCategory[] {
  if (!categories?.length) {
    return Array.from(spentPerCategory.entries()).map(([name, amount]) => ({
      name,
      spent: centsToAmount(amount)
    }));
  }
  return categories.map((category) => {
    const key = category.name.toLowerCase();
    const spent = spentPerCategory.get(key) ?? 0n;
    return {
      ...category,
      spent: centsToAmount(spent)
    };
  });
}

function createAuditEntry(params: {
  actorId: string;
  action: string;
  projectId?: string;
  workspaceId?: string;
  entity: { type: string; id: string };
  before?: unknown;
  after?: unknown;
}): void {
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    actorId: params.actorId,
    action: params.action,
    entity: params.entity,
    createdAt: new Date().toISOString()
  };

  if (params.projectId) {
    entry.projectId = params.projectId;
  }
  if (params.workspaceId) {
    entry.workspaceId = params.workspaceId;
  }
  if (params.before !== undefined) {
    entry.before = params.before;
  }
  if (params.after !== undefined) {
    entry.after = params.after;
  }

  auditLogRepository.record(entry);
}

function emitEvent<T>(type: string, entityId: string, payload: T): void {
  domainEventsRepository.emit({
    id: crypto.randomUUID(),
    type,
    entityId,
    payload,
    createdAt: new Date().toISOString()
  });
}

function ensureBudgetCurrency(budget: ProjectBudget | null, expenseCurrency: string): void {
  if (budget && budget.currency !== expenseCurrency) {
    throw new Error('BUDGET_CURRENCY_MISMATCH');
  }
}

export class FinanceService {
  constructor(private readonly expenseStore: ExpenseStore = getExpenseStore()) {}

  async listExpenses(filters: ExpenseFilters): Promise<FinanceListResult> {
    const items = await this.expenseStore.list(filters);
    return { items, total: items.length };
  }

  findExpenseById(id: string): Promise<Expense | null> {
    return this.expenseStore.getById(id);
  }

  async createExpense(input: CreateExpenseInput, context: OperationContext): Promise<Expense> {
    const idempotencyKey = context.idempotencyKey?.trim() ?? null;
    const amount = normalizeAmount(input.amount);
    ensurePositive(amount);
    const taxAmount = normalizeTaxAmount(input.taxAmount);
    const currency = normalizeCurrency(input.currency);
    const status: ExpenseStatus = input.status ?? 'draft';
    assertValidStatus(status);
    const date = assertDate(input.date);

    const budget = projectBudgetsRepository.find(input.projectId);
    ensureBudgetCurrency(budget, currency);

    const now = new Date().toISOString();
    const expense: Expense = {
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      date,
      amount,
      currency,
      category: input.category,
      status,
      createdBy: context.actorId,
      createdAt: now,
      updatedAt: now
    };

    if (typeof input.taskId === 'string' && input.taskId) {
      expense.taskId = input.taskId;
    }
    if (typeof input.description === 'string') {
      expense.description = input.description;
    }
    if (typeof input.vendor === 'string') {
      expense.vendor = input.vendor;
    }
    if (typeof input.paymentMethod === 'string') {
      expense.paymentMethod = input.paymentMethod;
    }
    if (taxAmount !== null) {
      expense.taxAmount = taxAmount;
    }

    return this.expenseStore.withIdempotency(idempotencyKey, async () => {
      const attachments = input.attachments?.map((file) => ({
        id: crypto.randomUUID(),
        expenseId: expense.id,
        filename: file.filename,
        url: file.url,
        uploadedAt: now
      }));

      const inserted = await this.expenseStore.create({
        expense,
        ...(attachments !== undefined ? { attachments } : {}),
        actorId: context.actorId
      });

      createAuditEntry({
        actorId: context.actorId,
        action: 'expense.created',
        projectId: inserted.projectId,
        workspaceId: inserted.workspaceId,
        entity: { type: 'expense', id: inserted.id },
        after: inserted
      });
      emitEvent('expense.created', inserted.id, inserted);

      await this.recalculateBudget(inserted.projectId);

      // Автоматизация: проверка превышения лимита бюджета
      const financeAutomationsEnabled =
        process.env.NEXT_PUBLIC_FEATURE_FINANCE_AUTOMATIONS === '1' ||
        process.env.FEATURE_FINANCE_AUTOMATIONS === '1' ||
        process.env.NEXT_PUBLIC_FEATURE_FINANCE_AUTOMATIONS?.toLowerCase() === 'true' ||
        process.env.FEATURE_FINANCE_AUTOMATIONS?.toLowerCase() === 'true';

      if (financeAutomationsEnabled) {
        const budgetSnapshot = await this.getBudget(inserted.projectId);
        if (budgetSnapshot && budgetSnapshot.total) {
          const spentCents = amountToCents(budgetSnapshot.spentTotal);
          const limitCents = amountToCents(budgetSnapshot.total);

          // Проверяем превышение общего лимита
          if (spentCents > limitCents && inserted.status !== 'pending') {
            // Переводим трату в pending
            const updatedExpense = await this.expenseStore.changeStatus(inserted.id, 'pending', {
              actorId: 'system'
            });

            if (updatedExpense) {
              // Записываем событие автоматизации
              createAuditEntry({
                actorId: 'system',
                action: 'automation.triggered',
                projectId: inserted.projectId,
                workspaceId: inserted.workspaceId,
                entity: { type: 'expense', id: inserted.id },
                after: {
                  automationType: 'budget_limit_exceeded',
                  expenseId: inserted.id,
                  previousStatus: inserted.status,
                  newStatus: 'pending',
                  budgetLimit: budgetSnapshot.total,
                  budgetSpent: budgetSnapshot.spentTotal,
                  exceededBy: centsToAmount(spentCents - limitCents)
                }
              });

              emitEvent('automation.triggered', inserted.id, {
                automationType: 'budget_limit_exceeded',
                expenseId: inserted.id,
                previousStatus: inserted.status,
                newStatus: 'pending',
                budgetLimit: budgetSnapshot.total,
                budgetSpent: budgetSnapshot.spentTotal
              });

              // Отправляем событие для телеметрии (будет обработано на клиенте)
              emitEvent('pm_expense_limit_breached', inserted.id, {
                expenseId: inserted.id,
                projectId: inserted.projectId,
                budgetLimit: budgetSnapshot.total,
                budgetSpent: budgetSnapshot.spentTotal,
                exceededBy: centsToAmount(spentCents - limitCents)
              });

              emitEvent('pm_automation_triggered', inserted.id, {
                automationType: 'budget_limit_exceeded',
                expenseId: inserted.id,
                projectId: inserted.projectId
              });

              return updatedExpense;
            }
          }
        }
      }

      return inserted;
    });
  }

  async updateExpense(id: string, patch: UpdateExpenseInput, context: OperationContext): Promise<Expense> {
    const current = await this.expenseStore.getById(id);
    if (!current) {
      throw new Error('EXPENSE_NOT_FOUND');
    }

    const updates: ExpenseUpdatePatch = {};
    let shouldRecalculate = false;

    if (patch.taskId !== undefined) {
      updates.taskId = typeof patch.taskId === 'string' && patch.taskId ? patch.taskId : null;
    }
    if (patch.category !== undefined) {
      updates.category = patch.category;
    }
    if (patch.description !== undefined) {
      updates.description = patch.description;
    }
    if (patch.vendor !== undefined) {
      updates.vendor = patch.vendor;
    }
    if (patch.paymentMethod !== undefined) {
      updates.paymentMethod = patch.paymentMethod;
    }
    if (patch.date !== undefined) {
      updates.date = assertDate(patch.date);
      shouldRecalculate = true;
    }
    if (patch.amount !== undefined) {
      const amount = normalizeAmount(patch.amount);
      ensurePositive(amount);
      updates.amount = amount;
      shouldRecalculate = true;
    }
    if (patch.currency !== undefined) {
      const currency = normalizeCurrency(patch.currency);
      const budget = projectBudgetsRepository.find(current.projectId);
      ensureBudgetCurrency(budget, currency);
      updates.currency = currency;
      shouldRecalculate = true;
    }
    if (patch.taxAmount !== undefined) {
      const taxValue = normalizeTaxAmount(patch.taxAmount);
      updates.taxAmount = taxValue;
      shouldRecalculate = true;
    }

    let pendingStatus: ExpenseStatus | null = null;
    if (patch.status) {
      assertValidStatus(patch.status);
      assertStatusTransition(current.status, patch.status);
      if (patch.status !== current.status) {
        pendingStatus = patch.status;
        shouldRecalculate = true;
      }
    }

    const timestamp = new Date().toISOString();
    const attachmentRecords = patch.attachments?.map((file) => ({
      id: crypto.randomUUID(),
      expenseId: current.id,
      filename: file.filename,
      url: file.url,
      uploadedAt: timestamp
    }));

    const updated = await this.expenseStore.update(id, {
      patch: { ...updates, updatedAt: timestamp },
      ...(attachmentRecords !== undefined ? { attachments: attachmentRecords } : {})
    });

    if (!updated) {
      throw new Error('EXPENSE_NOT_FOUND');
    }

    let result = updated;
    let statusChanged = false;

    if (pendingStatus) {
      const withStatus = await this.expenseStore.changeStatus(id, pendingStatus, { actorId: context.actorId });
      if (!withStatus) {
        throw new Error('EXPENSE_NOT_FOUND');
      }
      emitEvent('expense.status_changed', withStatus.id, { from: current.status, to: pendingStatus });
      result = withStatus;
      statusChanged = true;
    }

    createAuditEntry({
      actorId: context.actorId,
      action: statusChanged ? 'expense.status_changed' : 'expense.updated',
      projectId: result.projectId,
      workspaceId: result.workspaceId,
      entity: { type: 'expense', id: result.id },
      before: current,
      after: result
    });

    if (statusChanged || shouldRecalculate) {
      await this.recalculateBudget(result.projectId);
    }

    return result;
  }

  async getBudget(projectId: string): Promise<ProjectBudgetSnapshot | null> {
    const budget = projectBudgetsRepository.find(projectId);
    if (!budget) {
      return null;
    }
    return this.buildSnapshot(budget);
  }

  async upsertBudget(
    projectId: string,
    input: CreateBudgetInput,
    context: OperationContext
  ): Promise<ProjectBudgetSnapshot> {
    const currency = normalizeCurrency(input.currency);
    const total = input.total !== undefined ? normalizeAmount(input.total) : undefined;
    if (total !== undefined) {
      ensurePositive(total);
    }
    const warnThreshold = assertWarnThreshold(input.warnThreshold);

    const categories = input.categories?.map((category) => {
      const item: ProjectBudgetCategoryLimit = { name: category.name };
      if (category.limit !== undefined) {
        item.limit = normalizeAmount(category.limit);
      }
      return item;
    });

    const now = new Date().toISOString();
    const budget: ProjectBudget = {
      projectId,
      currency,
      updatedAt: now
    };

    if (total !== undefined) {
      budget.total = total;
    }
    if (warnThreshold !== undefined) {
      budget.warnThreshold = warnThreshold;
    }
    if (categories) {
      budget.categories = categories;
    }

    const stored = projectBudgetsRepository.upsert(budget);

    createAuditEntry({
      actorId: context.actorId,
      action: 'project_budget.updated',
      projectId,
      entity: { type: 'project_budget', id: projectId },
      after: stored
    });
    emitEvent('project_budget.updated', projectId, stored);

    const snapshot = await this.buildSnapshot(stored);
    await this.recalculateBudget(projectId);
    return snapshot;
  }

  private async buildSnapshot(budget: ProjectBudget): Promise<ProjectBudgetSnapshot> {
    const aggregated = await this.expenseStore.aggregateByCategory({
      projectId: budget.projectId,
      statuses: Array.from(FINAL_STATUSES)
    });

    let spentTotal = 0n;
    for (const cents of aggregated.values()) {
      spentTotal += cents;
    }

    const categoriesUsage = buildCategoriesUsage(budget.categories, aggregated);
    const snapshot: ProjectBudgetSnapshot = {
      ...budget,
      spentTotal: centsToAmount(spentTotal),
      categoriesUsage
    };

    if (budget.total !== undefined) {
      snapshot.remainingTotal = centsToAmount(amountToCents(budget.total) - spentTotal);
    }

    return snapshot;
  }

  async recalculateBudget(projectId: string): Promise<void> {
    const budget = projectBudgetsRepository.find(projectId);
    if (!budget) {
      return;
    }

    const snapshot = await this.buildSnapshot(budget);
    projectBudgetsRepository.upsert(snapshot);
  }
}

let financeServiceSingleton: FinanceService | null = null;

export function createFinanceService(expenseStore?: ExpenseStore): FinanceService {
  return new FinanceService(expenseStore ?? getExpenseStore());
}

export function getFinanceService(): FinanceService {
  if (!financeServiceSingleton) {
    financeServiceSingleton = createFinanceService();
  }
  return financeServiceSingleton;
}

export function resetFinanceService(): void {
  financeServiceSingleton = null;
}

export const financeService = getFinanceService();

import { memory } from '../data/memory';
import { amountToCents } from '../utils/money';
import type { Expense, ExpenseAttachment, ExpenseStatus } from '../types';

type GlobalIdempotencyScope = typeof globalThis & {
  __collabverseFinanceIdempotencyKeys__?: Map<string, string>;
};

const globalIdempotencyScope = globalThis as GlobalIdempotencyScope;

export interface ExpenseFilters {
  workspaceId?: string;
  projectId?: string;
  status?: ExpenseStatus;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ExpenseAggregationFilters extends ExpenseFilters {
  statuses?: ExpenseStatus[];
}

export type ExpenseUpdatePatch = Partial<
  Omit<Expense, 'id' | 'createdBy' | 'createdAt' | 'workspaceId' | 'projectId' | 'taskId' | 'taxAmount'>
> & {
  taxAmount?: string | null;
  taskId?: string | null;
};

export interface ExpenseUpdateInput {
  patch: ExpenseUpdatePatch & { updatedAt?: string };
  attachments?: ExpenseAttachment[];
}

export interface ExpenseCreateInput {
  expense: Expense;
  attachments?: ExpenseAttachment[];
  actorId: string;
}

export interface ExpenseStatusChangeContext {
  actorId: string;
}

export interface ExpenseStore {
  create(input: ExpenseCreateInput): Promise<Expense>;
  getById(id: string): Promise<Expense | null>;
  list(filters?: ExpenseFilters): Promise<Expense[]>;
  update(id: string, input: ExpenseUpdateInput): Promise<Expense | null>;
  changeStatus(id: string, status: ExpenseStatus, context: ExpenseStatusChangeContext): Promise<Expense | null>;
  aggregateByCategory(filters: ExpenseAggregationFilters): Promise<Map<string, bigint>>;
  withIdempotency(key: string | null | undefined, handler: () => Promise<Expense>): Promise<Expense>;
}

export interface ExpenseAggregationRow {
  category: string;
  totalCents: bigint;
}

export interface ExpenseEntityRepository {
  create(input: { data: Expense; attachments?: ExpenseAttachment[] }): Expense;
  findById(id: string): Expense | null;
  list(filters: ExpenseFilters): Expense[];
  update(id: string, input: { data: ExpenseUpdatePatch & { updatedAt?: string }; attachments?: ExpenseAttachment[] }): Expense | null;
  updateStatus(id: string, status: ExpenseStatus): Expense | null;
  aggregateByCategory(filters: ExpenseAggregationFilters): ExpenseAggregationRow[];
}

export interface ExpenseIdempotencyRepository {
  get(key: string): string | null;
  set(key: string, expenseId: string): void;
}

export interface ExpenseStoreCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
}

export interface DbExpenseStoreDependencies {
  expenses: ExpenseEntityRepository;
  idempotency: ExpenseIdempotencyRepository;
  cache?: ExpenseStoreCache;
  cacheTtlMs?: number;
}

function cloneExpense(expense: Expense): Expense {
  return { ...expense };
}

function cloneAttachment(attachment: ExpenseAttachment): ExpenseAttachment {
  return { ...attachment };
}

function matchesFilters(expense: Expense, filters: ExpenseFilters, statuses?: Set<ExpenseStatus>): boolean {
  const { workspaceId, projectId, status, category, dateFrom, dateTo, search } = filters;
  if (workspaceId && expense.workspaceId !== workspaceId) {
    return false;
  }
  if (projectId && expense.projectId !== projectId) {
    return false;
  }
  if (statuses) {
    if (!statuses.has(expense.status)) {
      return false;
    }
  } else if (status && expense.status !== status) {
    return false;
  }
  if (category && expense.category !== category) {
    return false;
  }
  if (dateFrom && expense.date < dateFrom) {
    return false;
  }
  if (dateTo && expense.date > dateTo) {
    return false;
  }
  if (search) {
    const haystack = `${expense.vendor ?? ''} ${expense.description ?? ''}`.toLowerCase();
    if (!haystack.includes(search.trim().toLowerCase())) {
      return false;
    }
  }
  return true;
}

export class MemoryExpenseStore implements ExpenseStore {
  private idempotencyKeys: Map<string, string>;

  constructor() {
    this.idempotencyKeys =
      globalIdempotencyScope.__collabverseFinanceIdempotencyKeys__ ?? memory.IDEMPOTENCY_KEYS;

    globalIdempotencyScope.__collabverseFinanceIdempotencyKeys__ = this.idempotencyKeys;

    if (memory.IDEMPOTENCY_KEYS !== this.idempotencyKeys) {
      memory.IDEMPOTENCY_KEYS = this.idempotencyKeys;
    }
  }

  private ensureIdempotencyMap(): Map<string, string> {
    const globalMap = globalIdempotencyScope.__collabverseFinanceIdempotencyKeys__;
    if (globalMap && globalMap !== this.idempotencyKeys) {
      this.idempotencyKeys = globalMap;
    }

    if (memory.IDEMPOTENCY_KEYS !== this.idempotencyKeys) {
      this.idempotencyKeys = memory.IDEMPOTENCY_KEYS;
      globalIdempotencyScope.__collabverseFinanceIdempotencyKeys__ = this.idempotencyKeys;
    }

    return this.idempotencyKeys;
  }

  async create(input: ExpenseCreateInput): Promise<Expense> {
    const stored = cloneExpense(input.expense);
    memory.EXPENSES.push(stored);

    if (input.attachments?.length) {
      for (const attachment of input.attachments) {
        memory.EXPENSE_ATTACHMENTS.push(cloneAttachment(attachment));
      }
    }

    console.info('[MemoryExpenseStore] create', { expenseId: stored.id, actorId: input.actorId });
    
    return cloneExpense(stored);
  }

  async getById(id: string): Promise<Expense | null> {
    const expense = memory.EXPENSES.find((item) => item.id === id);
    return expense ? cloneExpense(expense) : null;
  }

  async list(filters: ExpenseFilters = {}): Promise<Expense[]> {
    const normalizedSearch = filters.search?.trim().toLowerCase();
    const normalizedFilters: ExpenseFilters = {
      ...filters,
      ...(normalizedSearch !== undefined ? { search: normalizedSearch } : {})
    };
    return memory.EXPENSES.filter((expense) => matchesFilters(expense, normalizedFilters)).map(cloneExpense);
  }

  async update(id: string, input: ExpenseUpdateInput): Promise<Expense | null> {
    const index = memory.EXPENSES.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    const current = memory.EXPENSES[index];
    if (!current) {
      return null;
    }

    const { patch, attachments } = input;
    const { taskId, taxAmount, ...rest } = patch;
    const next: Expense = {
      ...current,
      ...(rest as Partial<
        Omit<Expense, 'id' | 'createdBy' | 'createdAt' | 'workspaceId' | 'projectId' | 'taskId' | 'taxAmount'>
      >),
      id: current.id,
      workspaceId: current.workspaceId,
      projectId: current.projectId,
      createdAt: current.createdAt,
      createdBy: current.createdBy
    };

    if (typeof taskId === 'string') {
      next.taskId = taskId;
    } else if (taskId === null) {
      delete (next as { taskId?: string }).taskId;
    }

    if (typeof taxAmount === 'string') {
      next.taxAmount = taxAmount;
    } else if (taxAmount === null) {
      delete (next as { taxAmount?: string }).taxAmount;
    }

    memory.EXPENSES[index] = next;

    if (attachments?.length) {
      for (const attachment of attachments) {
        memory.EXPENSE_ATTACHMENTS.push(cloneAttachment(attachment));
      }
    }
    
    return cloneExpense(next);
  }

  async changeStatus(
    id: string,
    status: ExpenseStatus,
    context: ExpenseStatusChangeContext
  ): Promise<Expense | null> {
    const index = memory.EXPENSES.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    const current = memory.EXPENSES[index];
    if (!current) {
      return null;
    }
    if (current.status === status) {
      return cloneExpense(current);
    }

    const next: Expense = {
      ...current,
      status,
      updatedAt: new Date().toISOString()
    };

    memory.EXPENSES[index] = next;
    console.info('[MemoryExpenseStore] changeStatus', { expenseId: id, actorId: context.actorId, status });
    
    return cloneExpense(next);
  }

  async aggregateByCategory(filters: ExpenseAggregationFilters): Promise<Map<string, bigint>> {
    const statuses = filters.statuses && filters.statuses.length ? new Set(filters.statuses) : undefined;
    const normalizedSearch = filters.search?.trim().toLowerCase();
    const normalizedFilters: ExpenseFilters = {
      ...filters,
      ...(normalizedSearch !== undefined ? { search: normalizedSearch } : {})
    };
    const result = new Map<string, bigint>();

    for (const expense of memory.EXPENSES) {
      if (!matchesFilters(expense, normalizedFilters, statuses)) {
        continue;
      }
      const key = expense.category.toLowerCase();
      const cents = amountToCents(expense.amount);
      result.set(key, (result.get(key) ?? 0n) + cents);
    }

    return result;
  }

  async withIdempotency(
    key: string | null | undefined,
    handler: () => Promise<Expense>
  ): Promise<Expense> {
    const normalizedKey = key?.trim();
    if (!normalizedKey) {
      return handler();
    }

    const store = this.ensureIdempotencyMap();
    const existingId = store.get(normalizedKey);
    if (existingId) {
      const existing = await this.getById(existingId);
      if (existing) {
        return existing;
      }
    }

    const created = await handler();
    store.set(normalizedKey, created.id);
    return created;
  }
}

export class DbExpenseStore implements ExpenseStore {
  private readonly expenses: ExpenseEntityRepository;
  private readonly idempotency: ExpenseIdempotencyRepository;
  private readonly cache: ExpenseStoreCache | undefined;
  private readonly cacheTtlMs: number;

  constructor(dependencies: DbExpenseStoreDependencies) {
    this.expenses = dependencies.expenses;
    this.idempotency = dependencies.idempotency;
    this.cache = dependencies.cache;
    this.cacheTtlMs = dependencies.cacheTtlMs ?? 60_000;
  }

  async create(input: ExpenseCreateInput): Promise<Expense> {
    const created = this.expenses.create({
      data: input.expense,
      ...(input.attachments !== undefined ? { attachments: input.attachments } : {})
    });
    console.info('[DbExpenseStore] create', { expenseId: created.id, actorId: input.actorId });
    return created;
  }

  async getById(id: string): Promise<Expense | null> {
    return this.expenses.findById(id);
  }

  async list(filters: ExpenseFilters = {}): Promise<Expense[]> {
    return this.expenses.list(filters);
  }

  async update(id: string, input: ExpenseUpdateInput): Promise<Expense | null> {
    return this.expenses.update(id, {
      data: input.patch,
      ...(input.attachments !== undefined ? { attachments: input.attachments } : {})
    });
  }

  async changeStatus(
    id: string,
    status: ExpenseStatus,
    context: ExpenseStatusChangeContext
  ): Promise<Expense | null> {
    const updated = this.expenses.updateStatus(id, status);
    if (updated) {
      console.info('[DbExpenseStore] changeStatus', { expenseId: id, actorId: context.actorId, status });
    }
    return updated;
  }

  async aggregateByCategory(filters: ExpenseAggregationFilters): Promise<Map<string, bigint>> {
    const cacheKey = this.cache ? JSON.stringify({ filters }) : null;
    if (cacheKey && this.cache) {
      const cached = this.cache.get<Array<[string, string]>>(cacheKey);
      if (cached) {
        return new Map(cached.map(([category, cents]) => [category, BigInt(cents)]));
      }
    }

    const rows = this.expenses.aggregateByCategory(filters);
    const entries = rows.map(({ category, totalCents }) => [category.toLowerCase(), totalCents] as [string, bigint]);
    const result = new Map(entries);

    if (cacheKey && this.cache) {
      this.cache.set(
        cacheKey,
        entries.map(([category, cents]) => [category, cents.toString()]) as Array<[string, string]>,
        this.cacheTtlMs
      );
    }

    return result;
  }

  async withIdempotency(
    key: string | null | undefined,
    handler: () => Promise<Expense>
  ): Promise<Expense> {
    const normalizedKey = key?.trim();
    if (!normalizedKey) {
      return handler();
    }

    const existingId = this.idempotency.get(normalizedKey);
    if (existingId) {
      const existing = this.expenses.findById(existingId);
      if (existing) {
        return existing;
      }
    }

    const created = await handler();

    try {
      this.idempotency.set(normalizedKey, created.id);
      return created;
    } catch (error) {
      const existingIdOnConflict = this.idempotency.get(normalizedKey);
      if (existingIdOnConflict) {
        const existing = this.expenses.findById(existingIdOnConflict);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }
}

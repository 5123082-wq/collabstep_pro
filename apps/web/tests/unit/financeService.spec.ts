import {
  DbExpenseStore,
  MemoryExpenseStore,
  createFinanceService,
  financeService,
  projectsRepository,
  resetFinanceMemory,
  TEST_PROJECT_DEMO_ID,
  type Expense,
  type ExpenseEntityRepository,
  type ExpenseIdempotencyRepository
} from '@collabverse/api';

describe('financeService', () => {
  let projectId: string;

  beforeEach(async () => {
    resetFinanceMemory();
    const projects = await projectsRepository.list();
    projectId = projects[0]?.id ?? TEST_PROJECT_DEMO_ID;
    await financeService.upsertBudget(
      projectId,
      {
        currency: 'USD',
        total: '1000',
        warnThreshold: 0.5,
        categories: [{ name: 'Design', limit: '600' }]
      },
      { actorId: 'admin.demo@collabverse.test' }
    );
  });

  it('validates currency when creating expenses', async () => {
    await expect(
      financeService.createExpense(
        {
          workspaceId: 'workspace',
          projectId,
          date: new Date().toISOString(),
          amount: '100',
          currency: 'US',
          category: 'Design'
        },
        { actorId: 'admin.demo@collabverse.test' }
      )
    ).rejects.toThrow('INVALID_CURRENCY');
  });

  it('prevents skipping status transitions', async () => {
    const expense = await financeService.createExpense(
      {
        workspaceId: 'workspace',
        projectId,
        date: new Date().toISOString(),
        amount: '100',
        currency: 'USD',
        category: 'Design'
      },
      { actorId: 'admin.demo@collabverse.test' }
    );

    await expect(
      financeService.updateExpense(
        expense.id,
        {
          status: 'approved'
        },
        { actorId: 'admin.demo@collabverse.test' }
      )
    ).rejects.toThrow('INVALID_STATUS_TRANSITION');
  });

  it('recalculates budget usage for approved expenses', async () => {
    const expense = await financeService.createExpense(
      {
        workspaceId: 'workspace',
        projectId,
        date: new Date().toISOString(),
        amount: '250',
        currency: 'USD',
        category: 'Design'
      },
      { actorId: 'admin.demo@collabverse.test' }
    );

    await financeService.updateExpense(
      expense.id,
      { status: 'pending' },
      { actorId: 'admin.demo@collabverse.test' }
    );
    await financeService.updateExpense(
      expense.id,
      { status: 'approved' },
      { actorId: 'admin.demo@collabverse.test' }
    );

    const budget = await financeService.getBudget(projectId);
    expect(budget?.spentTotal).toBe('250.00');
    const design = budget?.categoriesUsage.find((item) => item.name === 'Design');
    expect(design?.spent).toBe('250.00');
  });

  it('uses idempotency keys when memory store handles duplicates', async () => {
    resetFinanceMemory();
    const store = new MemoryExpenseStore();
    const service = createFinanceService(store);
    const context = { actorId: 'admin.demo@collabverse.test', idempotencyKey: 'mem-key' };
    const payload = {
      workspaceId: 'workspace',
      projectId,
      date: new Date().toISOString(),
      amount: '150',
      currency: 'USD',
      category: 'Design'
    } as const;

    const first = await service.createExpense({ ...payload }, context);
    const second = await service.createExpense({ ...payload, description: 'duplicate attempt' }, context);

    expect(second.id).toBe(first.id);
    expect((await service.listExpenses({ projectId })).items).toHaveLength(1);
  });

  it('uses idempotency keys when db store reports conflicts', async () => {
    resetFinanceMemory();
    const stored = new Map<string, Expense>();
    const repo: ExpenseEntityRepository = {
      create: jest.fn(({ data }) => {
        stored.set(data.id, { ...data });
        return { ...data };
      }),
      findById: jest.fn((id) => {
        const existing = stored.get(id);
        return existing ? { ...existing } : null;
      }),
      list: jest.fn(() => Array.from(stored.values()).map((item) => ({ ...item }))),
      update: jest.fn(() => null),
      updateStatus: jest.fn(() => null),
      aggregateByCategory: jest.fn(() => [])
    };

    const idempotencyKeys = new Map<string, string>();
    const idempotencyRepo: ExpenseIdempotencyRepository = {
      get: jest.fn((key) => idempotencyKeys.get(key) ?? null),
      set: jest.fn((key, value) => {
        if (idempotencyKeys.has(key)) {
          throw new Error('duplicate key');
        }
        idempotencyKeys.set(key, value);
      })
    };

    const service = createFinanceService(new DbExpenseStore({ expenses: repo, idempotency: idempotencyRepo }));
    const context = { actorId: 'admin.demo@collabverse.test', idempotencyKey: 'db-key' };
    const payload = {
      workspaceId: 'workspace',
      projectId,
      date: new Date().toISOString(),
      amount: '175',
      currency: 'USD',
      category: 'Design'
    } as const;

    const first = await service.createExpense({ ...payload }, context);
    expect(first).toBeDefined();
    expect(repo.create).toHaveBeenCalledTimes(1);

    const second = await service.createExpense({ ...payload }, context);
    expect(second.id).toBe(first.id);
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(idempotencyRepo.set).toHaveBeenCalledTimes(1);
  });
});

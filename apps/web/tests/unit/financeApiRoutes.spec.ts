import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  financeService,
  projectsRepository,
  resetFinanceMemory,
  TEST_PROJECT_DEMO_ID
} from '@collabverse/api';
import { POST as createExpense, GET as listExpenses } from '@/app/api/expenses/route';
import { PATCH as updateExpense } from '@/app/api/expenses/[id]/route';

describe('Finance API routes', () => {
  const projectId = projectsRepository.list()[0]?.id ?? TEST_PROJECT_DEMO_ID;
  const session = encodeDemoSession({
    email: 'admin.demo@collabverse.test',
    userId: 'admin.demo@collabverse.test',
    role: 'admin',
    issuedAt: Date.now()
  });
  const headers = {
    cookie: `cv_session=${session}`,
    'content-type': 'application/json'
  };

  beforeEach(async () => {
    resetFinanceMemory();
    await financeService.upsertBudget(
      projectId,
      { currency: 'USD', total: '2000', warnThreshold: 0.7 },
      { actorId: 'admin.demo@collabverse.test' }
    );
  });

  it('creates, updates and lists expenses', async () => {
    const createResponse = await createExpense(
      new Request('http://localhost/api/expenses', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspaceId: 'workspace',
          projectId,
          date: new Date().toISOString(),
          amount: '320.50',
          currency: 'USD',
          category: 'Design',
          vendor: 'Test Vendor'
        })
      })
    );

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()).data;
    expect(created.status).toBe('draft');

    const toPending = await updateExpense(
      new Request(`http://localhost/api/expenses/${created.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'pending' })
      }),
      { params: { id: created.id } }
    );
    expect(toPending.status).toBe(200);

    const toApproved = await updateExpense(
      new Request(`http://localhost/api/expenses/${created.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'approved' })
      }),
      { params: { id: created.id } }
    );
    expect(toApproved.status).toBe(200);

    const listResponse = await listExpenses(
      new Request(`http://localhost/api/expenses?projectId=${projectId}`, {
        method: 'GET',
        headers: { cookie: headers.cookie }
      })
    );
    const listBody = await listResponse.json();
    expect(listBody.data.items[0].status).toBe('approved');
  });
});

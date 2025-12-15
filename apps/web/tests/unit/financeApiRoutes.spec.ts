import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  financeService,
  projectsRepository,
  resetFinanceMemory,
  TEST_ADMIN_USER_ID
} from '@collabverse/api';
import { POST as createExpense, GET as listExpenses } from '@/app/api/expenses/route';
import { PATCH as updateExpense } from '@/app/api/expenses/[id]/route';

describe('Finance API routes', () => {
  let projectId: string;
  const adminEmail = 'admin.demo@collabverse.test';
  const adminUserId = TEST_ADMIN_USER_ID;
  const session = encodeDemoSession({
    email: adminEmail,
    userId: adminUserId,
    role: 'admin',
    issuedAt: Date.now()
  });
  const headers = {
    cookie: `cv_session=${session}`,
    'content-type': 'application/json'
  };

  beforeEach(async () => {
    resetFinanceMemory();
    // Создаём проект для теста, если его нет
    const existingProjects = projectsRepository.list();
    if (existingProjects.length === 0) {
      const project = projectsRepository.create({
        title: 'Test Project',
        ownerId: adminUserId,
        workspaceId: 'workspace',
        status: 'active'
      });
      projectId = project.id;
    } else {
      projectId = existingProjects[0]!.id;
    }
    
    await financeService.upsertBudget(
      projectId,
      { currency: 'USD', total: '2000', warnThreshold: 0.7 },
      { actorId: adminUserId }
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
    expect(listBody.data.items).toBeDefined();
    expect(listBody.data.items.length).toBeGreaterThan(0);
    expect(listBody.data.items[0]!.status).toBe('approved');
  });
});

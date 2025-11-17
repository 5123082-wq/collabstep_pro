import { financeService, projectsRepository, resetFinanceMemory, TEST_PROJECT_DEMO_ID, type ExpenseStatus } from '@collabverse/api';

async function main() {
  resetFinanceMemory();

  const projects = projectsRepository.list();
  const primaryProject = projects.find((project) => project.id === TEST_PROJECT_DEMO_ID) ?? projects[0];
  const secondaryProject = projects.find((project) => project.id !== primaryProject.id) ?? primaryProject;

  await financeService.upsertBudget(
    primaryProject.id,
    {
      currency: 'USD',
      total: '10000',
      warnThreshold: 0.8,
      categories: [
        { name: 'Design', limit: '2500' },
        { name: 'Development', limit: '5000' },
        { name: 'Operations', limit: '1500' }
      ]
    },
    { actorId: 'admin.demo@collabverse.test' }
  );

  const statuses: Array<{ status: ExpenseStatus; category: string }>[] = [
    [
      { status: 'draft', category: 'Design' },
      { status: 'pending', category: 'Development' },
      { status: 'approved', category: 'Design' },
      { status: 'payable', category: 'Operations' }
    ],
    [
      { status: 'draft', category: 'Research' },
      { status: 'pending', category: 'QA' },
      { status: 'approved', category: 'QA' },
      { status: 'closed', category: 'Marketing' }
    ]
  ];

  const projectsToSeed = [primaryProject.id, secondaryProject.id];

  for (let index = 0; index < projectsToSeed.length; index += 1) {
    const projectId = projectsToSeed[index];
    const config = statuses[index] ?? statuses[0];

    for (let position = 0; position < config.length; position += 1) {
      const item = config[position];
      const expense = await financeService.createExpense(
        {
          workspaceId: 'workspace-demo',
          projectId,
          date: new Date(Date.now() - position * 86400000).toISOString(),
          amount: (500 + position * 120).toString(),
          currency: projectId === primaryProject.id ? 'USD' : 'EUR',
          category: item.category,
          description: `Seed expense #${position + 1} for ${projectId}`,
          vendor: position % 2 === 0 ? 'Demo Vendor' : 'Local Supplier',
          paymentMethod: 'card'
        },
        { actorId: position % 2 === 0 ? 'admin.demo@collabverse.test' : 'user.demo@collabverse.test' }
      );

      if (item.status !== 'draft') {
        const flow: Record<ExpenseStatus, ExpenseStatus[]> = {
          draft: [],
          pending: ['pending'],
          approved: ['pending', 'approved'],
          payable: ['pending', 'approved', 'payable'],
          closed: ['pending', 'approved', 'payable', 'closed']
        };

        for (const status of flow[item.status]) {
          await financeService.updateExpense(
            expense.id,
            {
              status
            },
            { actorId: 'admin.demo@collabverse.test' }
          );
        }
      }
    }
  }

  console.log('Finance seed complete.');
  const { items } = await financeService.listExpenses({});
  console.table(
    items.map((expense) => ({
      id: expense.id,
      projectId: expense.projectId,
      status: expense.status,
      amount: expense.amount,
      category: expense.category
    }))
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

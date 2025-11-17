import {
  financeService,
  projectsRepository,
  tasksRepository,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_USER_ID,
  type ExpenseStatus,
  type TaskStatus
} from '@collabverse/api';

async function main() {
  console.log('Создание тестового проекта...');

  // Создаем проект
  const project = projectsRepository.create({
    title: 'Тестовый проект с задачами и тратами',
    description: 'Проект для тестирования функционала задач и финансов',
    ownerId: DEFAULT_WORKSPACE_USER_ID,
    workspaceId: DEFAULT_WORKSPACE_ID,
    status: 'active',
    stage: 'build',
    type: 'product',
    visibility: 'private',
    budgetPlanned: 50000
  });

  console.log(`✓ Проект создан: ${project.title} (${project.key})`);

  // Создаем бюджет для проекта
  await financeService.upsertBudget(
    project.id,
    {
      currency: 'RUB',
      total: '50000',
      warnThreshold: 0.8,
      categories: [
        { name: 'Разработка', limit: '25000' },
        { name: 'Дизайн', limit: '15000' },
        { name: 'Маркетинг', limit: '10000' }
      ]
    },
    { actorId: DEFAULT_WORKSPACE_USER_ID }
  );

  console.log('✓ Бюджет проекта создан');

  // Создаем 5 задач с разными статусами
  const tasks = [
    {
      title: 'Проектирование архитектуры системы',
      description: 'Создать архитектурную диаграмму и описать основные компоненты',
      status: 'done' as TaskStatus,
      priority: 'high' as const
    },
    {
      title: 'Разработка API для пользователей',
      description: 'Реализовать REST API для управления пользователями',
      status: 'in_progress' as TaskStatus,
      priority: 'high' as const
    },
    {
      title: 'Создание дизайн-макетов',
      description: 'Подготовить макеты основных экранов приложения',
      status: 'review' as TaskStatus,
      priority: 'med' as const
    },
    {
      title: 'Настройка CI/CD',
      description: 'Настроить автоматическую сборку и деплой',
      status: 'new' as TaskStatus,
      priority: 'med' as const
    },
    {
      title: 'Интеграция с платежной системой',
      description: 'Подключить платежный шлюз для обработки транзакций',
      status: 'blocked' as TaskStatus,
      priority: 'urgent' as const
    }
  ];

  const createdTasks = [];
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const createdTask = tasksRepository.create({
      projectId: project.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      startAt: new Date(Date.now() - (tasks.length - i) * 86400000).toISOString()
    });
    createdTasks.push(createdTask);
    console.log(`✓ Задача создана: ${createdTask.title} (статус: ${task.status})`);
  }

  // Создаем траты для проекта (некоторые связанные с задачами)
  const expenses = [
    {
      taskId: createdTasks[0].id, // Задача "done"
      amount: '15000',
      category: 'Разработка',
      description: 'Оплата работы разработчика за архитектуру',
      vendor: 'Внешний подрядчик',
      status: 'approved' as ExpenseStatus,
      date: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      taskId: createdTasks[1].id, // Задача "in_progress"
      amount: '8000',
      category: 'Разработка',
      description: 'Оплата за разработку API',
      vendor: 'Команда разработки',
      status: 'approved' as ExpenseStatus,
      date: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      taskId: createdTasks[2].id, // Задача "review"
      amount: '12000',
      category: 'Дизайн',
      description: 'Оплата услуг дизайнера',
      vendor: 'Дизайн-студия',
      status: 'payable' as ExpenseStatus,
      date: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      amount: '5000',
      category: 'Маркетинг',
      description: 'Рекламная кампания в соцсетях',
      vendor: 'Рекламное агентство',
      status: 'closed' as ExpenseStatus,
      date: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
      amount: '3000',
      category: 'Разработка',
      description: 'Покупка лицензий на инструменты разработки',
      vendor: 'Поставщик ПО',
      status: 'pending' as ExpenseStatus,
      date: new Date().toISOString()
    }
  ];

  for (let i = 0; i < expenses.length; i++) {
    const expenseData = expenses[i];
    // Создаем трату со статусом draft, затем переводим в нужный статус
    const expense = await financeService.createExpense(
      {
        workspaceId: DEFAULT_WORKSPACE_ID,
        projectId: project.id,
        ...(expenseData.taskId ? { taskId: expenseData.taskId } : {}),
        date: expenseData.date,
        amount: expenseData.amount,
        currency: 'RUB',
        category: expenseData.category,
        description: expenseData.description,
        vendor: expenseData.vendor,
        paymentMethod: 'card',
        status: 'draft' // Создаем всегда со статусом draft
      },
      { actorId: DEFAULT_WORKSPACE_USER_ID }
    );

    // Переводим трату в нужный статус через все промежуточные статусы
    if (expenseData.status !== 'draft') {
      const flow: Record<ExpenseStatus, ExpenseStatus[]> = {
        draft: [],
        pending: ['pending'],
        approved: ['pending', 'approved'],
        payable: ['pending', 'approved', 'payable'],
        closed: ['pending', 'approved', 'payable', 'closed']
      };

      for (const status of flow[expenseData.status]) {
        await financeService.updateExpense(
          expense.id,
          { status },
          { actorId: DEFAULT_WORKSPACE_USER_ID }
        );
      }
    }

    console.log(
      `✓ Трата создана: ${expenseData.description} (${expenseData.amount} руб., статус: ${expenseData.status})`
    );
  }

  // Получаем обновленный бюджет и обновляем budgetSpent проекта
  const budget = await financeService.getBudget(project.id);
  if (budget && budget.spentTotal) {
    // Обновляем budgetSpent проекта на основе фактических трат
    const spentAmount = parseFloat(budget.spentTotal);
    projectsRepository.update(project.id, {
      budgetSpent: spentAmount
    });
  }

  if (budget) {
    console.log('\n📊 Итоговый бюджет проекта:');
    console.log(`  Запланировано: ${budget.total} ${budget.currency}`);
    console.log(`  Потрачено: ${budget.spentTotal} ${budget.currency}`);
    if (budget.remainingTotal) {
      console.log(`  Осталось: ${budget.remainingTotal} ${budget.currency}`);
    }
    if (budget.categoriesUsage) {
      console.log('\n  Траты по категориям:');
      budget.categoriesUsage.forEach((cat) => {
        console.log(`    ${cat.name}: ${cat.spent} ${budget.currency} (лимит: ${cat.limit || 'не установлен'})`);
      });
    }
  }

  console.log('\n✅ Тестовый проект успешно создан!');
  console.log(`   Проект ID: ${project.id}`);
  console.log(`   Ключ проекта: ${project.key}`);
  console.log(`   Количество задач: ${createdTasks.length}`);
  console.log(`   Количество трат: ${expenses.length}`);
}

main().catch((error) => {
  console.error('Ошибка при создании тестового проекта:', error);
  process.exitCode = 1;
});


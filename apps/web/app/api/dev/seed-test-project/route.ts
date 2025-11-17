import { NextRequest } from 'next/server';
import {
  financeService,
  projectsRepository,
  tasksRepository,
  DEFAULT_WORKSPACE_ID,
  type ExpenseStatus,
  type TaskStatus
} from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getAuthFromRequest } from '@/lib/api/finance-access';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Проверяем, что это dev окружение
  if (process.env.NODE_ENV === 'production') {
    return jsonError('NOT_ALLOWED', { status: 403 });
  }

  try {
    console.log('Создание тестового проекта...');

    // Получаем текущего пользователя из запроса
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return jsonError('UNAUTHORIZED', { status: 401 });
    }
    
    const ownerId = auth.userId; // Используем email текущего пользователя
    console.log('Creating project for user:', ownerId);

    // Создаем проект как public, чтобы он был виден всем
    const project = projectsRepository.create({
      title: 'Тестовый проект с задачами и тратами',
      description: 'Проект для тестирования функционала задач и финансов',
      ownerId: ownerId, // Используем текущего пользователя
      workspaceId: DEFAULT_WORKSPACE_ID,
      status: 'active',
      stage: 'build',
      type: 'product',
      visibility: 'public', // Делаем public, чтобы проект был виден всем
      budgetPlanned: 50000
    });
    
    console.log('Project created:', { id: project.id, key: project.key, ownerId: project.ownerId, visibility: project.visibility });

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
      { actorId: ownerId }
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
      if (!task) continue;
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
        taskId: createdTasks[0]?.id, // Задача "done"
        amount: '15000',
        category: 'Разработка',
        description: 'Оплата работы разработчика за архитектуру',
        vendor: 'Внешний подрядчик',
        status: 'approved' as ExpenseStatus,
        date: new Date(Date.now() - 5 * 86400000).toISOString()
      },
      {
        taskId: createdTasks[1]?.id, // Задача "in_progress"
        amount: '8000',
        category: 'Разработка',
        description: 'Оплата за разработку API',
        vendor: 'Команда разработки',
        status: 'approved' as ExpenseStatus,
        date: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        taskId: createdTasks[2]?.id, // Задача "review"
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
      if (!expenseData) continue;
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
        { actorId: ownerId }
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
            { actorId: ownerId }
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

    // Проверяем, что данные действительно в памяти и доступны
    const verifyProjects = projectsRepository.list();
    const verifyTasks = tasksRepository.list({ projectId: project.id });
    const hasAccess = projectsRepository.hasAccess(project.id, ownerId);
    const foundProject = verifyProjects.find((p) => p.id === project.id);

    console.log('Verification:', {
      totalProjects: verifyProjects.length,
      projectFound: !!foundProject,
      hasAccess,
      projectVisibility: foundProject?.visibility,
      projectStatus: foundProject?.status,
      projectOwnerId: foundProject?.ownerId,
      currentUserId: ownerId
    });

    return jsonOk({
      success: true,
      project: {
        id: project.id,
        key: project.key,
        title: project.title,
        visibility: project.visibility,
        status: project.status,
        ownerId: project.ownerId
      },
      tasksCount: createdTasks.length,
      expensesCount: expenses.length,
      budget: budget
        ? {
            planned: budget.total,
            spent: budget.spentTotal,
            remaining: budget.remainingTotal,
            currency: budget.currency
          }
        : null,
      verification: {
        totalProjectsInMemory: verifyProjects.length,
        projectTasksInMemory: verifyTasks.length,
        projectFound: !!foundProject,
        hasAccess,
        currentUserId: ownerId,
        projectOwnerId: foundProject?.ownerId
      }
    });
  } catch (error) {
    console.error('Ошибка при создании тестового проекта:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


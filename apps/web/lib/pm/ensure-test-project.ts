/**
 * Ensures that there is at least one test project for admin users.
 * This function creates a test project with tasks and expenses if no admin projects exist.
 */

import {
  projectsRepository,
  tasksRepository,
  financeService,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_USER_ID,
  isAdminUserId,
  pmPgHydration,
  type ExpenseStatus,
  type TaskStatus
} from '@collabverse/api';
import { isDemoAdminEmail } from '@/lib/auth/demo-session';

async function createTestProject(ownerId: string, projectTitle: string, projectDescription: string) {
  const project = projectsRepository.create({
    title: projectTitle,
    description: projectDescription,
    ownerId: ownerId,
    workspaceId: DEFAULT_WORKSPACE_ID,
    status: 'active',
    stage: 'build',
    type: 'product',
    visibility: 'public',
    budgetPlanned: 50000
  });

  // Создаем бюджет
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

  // Создаем задачи
  const tasks = [
    { title: 'Проектирование архитектуры системы', description: 'Создать архитектурную диаграмму', status: 'done' as TaskStatus, priority: 'high' as const },
    { title: 'Разработка API для пользователей', description: 'Реализовать REST API', status: 'in_progress' as TaskStatus, priority: 'high' as const },
    { title: 'Создание дизайн-макетов', description: 'Подготовить макеты экранов', status: 'review' as TaskStatus, priority: 'med' as const },
    { title: 'Настройка CI/CD', description: 'Настроить автоматическую сборку', status: 'new' as TaskStatus, priority: 'med' as const },
    { title: 'Интеграция с платежной системой', description: 'Подключить платежный шлюз', status: 'blocked' as TaskStatus, priority: 'urgent' as const }
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
  }

  // Создаем траты
  const expenses = [
    { taskId: createdTasks[0]?.id, amount: '15000', category: 'Разработка', description: 'Оплата работы разработчика', vendor: 'Внешний подрядчик', status: 'approved' as ExpenseStatus },
    { taskId: createdTasks[1]?.id, amount: '8000', category: 'Разработка', description: 'Оплата за разработку API', vendor: 'Команда разработки', status: 'approved' as ExpenseStatus },
    { taskId: createdTasks[2]?.id, amount: '12000', category: 'Дизайн', description: 'Оплата услуг дизайнера', vendor: 'Дизайн-студия', status: 'payable' as ExpenseStatus },
    { amount: '5000', category: 'Маркетинг', description: 'Рекламная кампания', vendor: 'Рекламное агентство', status: 'closed' as ExpenseStatus },
    { amount: '3000', category: 'Разработка', description: 'Покупка лицензий', vendor: 'Поставщик ПО', status: 'pending' as ExpenseStatus }
  ];

  for (const expense of expenses) {
    const expensePayload = {
      workspaceId: DEFAULT_WORKSPACE_ID,
      projectId: project.id,
      ...(expense.taskId ? { taskId: expense.taskId } : {}),
      date: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      amount: expense.amount,
      currency: 'RUB' as const,
      category: expense.category,
      description: expense.description,
      vendor: expense.vendor,
      paymentMethod: 'card' as const,
      status: 'draft' as ExpenseStatus,
      dueAt: new Date(Date.now() + 7 * 86400000).toISOString() // через неделю
    };
    await financeService.createExpense(expensePayload, { actorId: ownerId });
  }

  return project;
}

/**
 * Ensures that there is at least one test project for admin users.
 * This should be called before loading data that depends on projects.
 */
export async function ensureTestProject(userId: string, email: string): Promise<void> {
  // Дожидаемся гидрации из Postgres, чтобы не создавать дубликаты на холодном старте
  try {
    await pmPgHydration;
  } catch (error) {
    console.error('[ensureTestProject] Failed to hydrate projects from Postgres before seed', error);
  }

  const allProjects = projectsRepository.list();

  // Проверяем, есть ли проект от администратора
  const hasAdminProject = allProjects.some(p => p.ownerId === DEFAULT_WORKSPACE_USER_ID || isAdminUserId(p.ownerId));

  // Если проектов нет и пользователь - администратор, создаем тестовый проект для админа
  if (!hasAdminProject && (isAdminUserId(userId) || isDemoAdminEmail(email))) {
    console.log('[ensureTestProject] Creating test project for admin user:', DEFAULT_WORKSPACE_USER_ID);

    const adminProject = await createTestProject(
      DEFAULT_WORKSPACE_USER_ID,
      'Тестовый проект с задачами и тратами',
      'Проект для тестирования функционала задач и финансов (администратор)'
    );
    console.log('[ensureTestProject] Admin test project created:', adminProject.id);
  }
}
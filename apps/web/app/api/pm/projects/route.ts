import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import {
  projectsRepository,
  tasksRepository,
  financeService,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_USER_ID,
  isAdminUserId,
  type ExpenseStatus,
  type TaskStatus
} from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { parseProjectFilters, type ProjectScope } from '@/lib/pm/filters';
import { getProjectsOverview } from '@/lib/pm/projects-overview.server';
import { isDemoAdminEmail } from '@/lib/auth/demo-session';
// Project type removed as it was unused

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

  for (const expenseData of expenses) {
    const expense = await financeService.createExpense(
      {
        workspaceId: DEFAULT_WORKSPACE_ID,
        projectId: project.id,
        ...(expenseData.taskId ? { taskId: expenseData.taskId } : {}),
        date: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
        amount: expenseData.amount,
        currency: 'RUB',
        category: expenseData.category,
        description: expenseData.description,
        vendor: expenseData.vendor,
        paymentMethod: 'card',
        status: 'draft'
      },
      { actorId: ownerId }
    );

    if (expenseData.status !== 'draft') {
      const flow: Record<ExpenseStatus, ExpenseStatus[]> = {
        draft: [],
        pending: ['pending'],
        approved: ['pending', 'approved'],
        payable: ['pending', 'approved', 'payable'],
        closed: ['pending', 'approved', 'payable', 'closed']
      };

      for (const status of flow[expenseData.status]) {
        await financeService.updateExpense(expense.id, { status }, { actorId: ownerId });
      }
    }
  }

  // Обновляем budgetSpent
  const budget = await financeService.getBudget(project.id);
  if (budget && budget.spentTotal) {
    projectsRepository.update(project.id, { budgetSpent: parseFloat(budget.spentTotal) });
  }

  return project;
}

async function ensureTestProject(userId: string) {
  const allProjects = projectsRepository.list();

  // Проверяем, есть ли проект от администратора
  const hasAdminProject = allProjects.some(p => p.ownerId === DEFAULT_WORKSPACE_USER_ID || isAdminUserId(p.ownerId));

  // Если проектов нет и пользователь - администратор, создаем тестовый проект для админа
  if (!hasAdminProject && (isAdminUserId(userId) || isDemoAdminEmail(userId))) {
    console.log('[Auto-seed] Creating test project for admin user:', DEFAULT_WORKSPACE_USER_ID);

    const adminProject = await createTestProject(
      DEFAULT_WORKSPACE_USER_ID,
      'Тестовый проект с задачами и тратами',
      'Проект для тестирования функционала задач и финансов (администратор)'
    );
    console.log('[Auto-seed] Admin test project created:', adminProject.id);
  }
}

export async function GET(request: NextRequest) {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECTS_LIST) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  // Автоматическое создание тестовых проектов
  await ensureTestProject(auth.userId);

  const searchParams = request.nextUrl.searchParams;
  const parsedFilters = parseProjectFilters(searchParams);
  const scopeParam = searchParams.get('scope');
  // По умолчанию показываем только проекты пользователя
  const scope: ProjectScope =
    scopeParam === 'owned' || scopeParam === 'member' || scopeParam === 'all'
      ? scopeParam
      : parsedFilters.scope ?? 'owned';

  // Логирование для отладки
  console.log(`[Projects API] Filters:`, {
    status: parsedFilters.status,
    scope,
    userId: auth.userId
  });

  let overview;
  try {
    overview = await getProjectsOverview(auth.userId, {
      ...parsedFilters,
      scope,
      page: parsedFilters.page,
      pageSize: parsedFilters.pageSize,
      ...(parsedFilters.sortBy ? { sortBy: parsedFilters.sortBy } : {}),
      ...(parsedFilters.sortOrder ? { sortOrder: parsedFilters.sortOrder } : {})
    });
  } catch (error) {
    console.error('[Projects API] Error getting projects overview:', error);
    // Возвращаем безопасную структуру данных в случае ошибки
    overview = {
      items: [],
      pagination: {
        page: parsedFilters.page ?? 1,
        pageSize: parsedFilters.pageSize ?? 12,
        total: 0,
        totalPages: 1
      },
      owners: []
    };
  }

  // Логирование для отладки
  const allProjects = projectsRepository.list();
  console.log(`[Projects API] User: ${auth.userId}, Total projects in memory: ${allProjects.length}, Accessible: ${overview.items.length}, Status filter: ${parsedFilters.status}`);

  // Убеждаемся, что всегда возвращаем правильную структуру
  return NextResponse.json(
    {
      items: Array.isArray(overview.items) ? overview.items : [],
      pagination: overview.pagination ?? {
        page: parsedFilters.page ?? 1,
        pageSize: parsedFilters.pageSize ?? 12,
        total: 0,
        totalPages: 1
      },
      owners: Array.isArray(overview.owners) ? overview.owners : []
    },
    {
      headers: {
        'cache-control': 'no-store'
      }
    }
  );
}

export async function POST(request: Request) {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECTS_LIST) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json();
    const title = (body.name ?? body.title ?? '').toString().trim();
    if (!title) {
      return jsonError('INVALID_REQUEST', { status: 400 });
    }
    const visibility = body.visibility === 'public' ? 'public' : 'private';
    const status = typeof body.status === 'string' ? body.status.toLowerCase() : 'draft';
    const allowedStatuses = ['draft', 'active', 'on_hold', 'completed', 'archived'] as const;
    const normalizedStatus = allowedStatuses.includes(status as (typeof allowedStatuses)[number])
      ? (status as (typeof allowedStatuses)[number])
      : 'draft';
    const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
    const organizationId = body.organizationId;
    console.log(`[Projects API POST] Creating project: title=${title}, ownerId=${auth.userId}, workspaceId=${workspaceId}, organizationId=${organizationId}, status=${status}, visibility=${visibility}`);

    const project = projectsRepository.create({
      title,
      description: typeof body.description === 'string' ? body.description : undefined,
      key: body.key,
      ownerId: auth.userId,
      workspaceId,
      status: normalizedStatus,
      visibility,
      type: body.type,
      deadline: body.deadline
    });

    // Проверяем, что проект действительно создан
    const verifyProject = await projectsRepository.findById(project.id);
    if (!verifyProject) {
      console.error(`[Projects API POST] Project was created but not found immediately: id=${project.id}`);
    } else {
      console.log(`[Projects API POST] Project verified: id=${verifyProject.id}, workspaceId=${verifyProject.workspaceId}`);
    }

    return jsonOk({ project });
  } catch (error) {
    return jsonError('INVALID_REQUEST', { status: 400 });
  }
}

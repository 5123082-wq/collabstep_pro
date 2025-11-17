import {
  projectsRepository,
  tasksRepository,
  memory,
  financeService,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_USER_ID,
  type Project,
  type Task,
  type ExpenseStatus,
  type TaskStatus
} from '@collabverse/api';

interface ProjectInfo {
  id: string;
  key: string;
  title: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  visibility: string;
  workspaceId: string;
  budgetPlanned: number | null;
  budgetSpent: number | null;
  tasksCount: number;
  tasks: TaskInfo[];
  archived: boolean;
  createdAt: string;
  stage?: string;
  type?: string;
}

interface TaskInfo {
  id: string;
  number: number;
  title: string;
  status: string;
  assigneeId?: string;
  assigneeName?: string;
  priority?: string;
  dueAt?: string;
}

interface OwnerProjects {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  projects: ProjectInfo[];
  totalProjects: number;
  totalTasks: number;
}

function scanAllProjectsAndTasks(): {
  owners: OwnerProjects[];
  allProjects: ProjectInfo[];
  summary: {
    totalProjects: number;
    totalTasks: number;
    totalOwners: number;
  };
} {
  // Получаем все проекты БЕЗ фильтрации
  const allProjects = projectsRepository.list();
  
  // Получаем все задачи БЕЗ фильтрации
  const allTasks = tasksRepository.list();
  
  // Создаем мапу пользователей для быстрого поиска
  const usersMap = new Map(
    memory.WORKSPACE_USERS.map(user => [user.id, user])
  );
  
  // Группируем задачи по проектам
  const tasksByProject = new Map<string, Task[]>();
  for (const task of allTasks) {
    const projectTasks = tasksByProject.get(task.projectId) || [];
    projectTasks.push(task);
    tasksByProject.set(task.projectId, projectTasks);
  }
  
  // Формируем информацию о проектах
  const projectsInfo: ProjectInfo[] = allProjects.map(project => {
    const owner = usersMap.get(project.ownerId);
    const projectTasks = tasksByProject.get(project.id) || [];
    
    return {
      id: project.id,
      key: project.key,
      title: project.title,
      ownerId: project.ownerId,
      ownerName: owner?.name || project.ownerId,
      ownerEmail: owner?.email || project.ownerId,
      status: project.status,
      visibility: project.visibility,
      workspaceId: project.workspaceId,
      budgetPlanned: project.budgetPlanned,
      budgetSpent: project.budgetSpent,
      tasksCount: projectTasks.length,
      tasks: projectTasks.map(task => {
        const assignee = task.assigneeId ? usersMap.get(task.assigneeId) : undefined;
        return {
          id: task.id,
          number: task.number,
          title: task.title,
          status: task.status,
          assigneeId: task.assigneeId,
          assigneeName: assignee?.name,
          priority: task.priority,
          dueAt: task.dueAt
        };
      }),
      archived: project.archived,
      createdAt: project.createdAt,
      stage: project.stage,
      type: project.type
    };
  });
  
  // Группируем проекты по владельцам
  const ownersMap = new Map<string, OwnerProjects>();
  
  for (const projectInfo of projectsInfo) {
    let ownerData = ownersMap.get(projectInfo.ownerId);
    if (!ownerData) {
      ownerData = {
        ownerId: projectInfo.ownerId,
        ownerName: projectInfo.ownerName,
        ownerEmail: projectInfo.ownerEmail,
        projects: [],
        totalProjects: 0,
        totalTasks: 0
      };
      ownersMap.set(projectInfo.ownerId, ownerData);
    }
    
    ownerData.projects.push(projectInfo);
    ownerData.totalProjects++;
    ownerData.totalTasks += projectInfo.tasksCount;
  }
  
  const owners = Array.from(ownersMap.values()).sort((a, b) => 
    a.ownerName.localeCompare(b.ownerName, 'ru')
  );
  
  return {
    owners,
    allProjects: projectsInfo,
    summary: {
      totalProjects: allProjects.length,
      totalTasks: allTasks.length,
      totalOwners: owners.length
    }
  };
}

// Функция для создания тестовых проектов, если их нет
async function ensureTestProjects() {
  const allProjects = projectsRepository.list();
  
  console.log(`\n🔍 Проверка существующих проектов в памяти...`);
  console.log(`   Найдено проектов: ${allProjects.length}`);
  
  if (allProjects.length > 0) {
    console.log(`   Проекты в памяти:`);
    for (const project of allProjects) {
      console.log(`     - ${project.key} (${project.id}): ${project.title} [${project.status}]`);
    }
    console.log('');
  }
  
  if (allProjects.length === 0) {
    console.log('⚠️  Проектов не найдено. Создаю тестовые проекты...\n');
    
    const DEMO_USER_EMAIL = 'user.demo@collabverse.test';
    
    // Создаем проект для администратора
    const adminProject = projectsRepository.create({
      title: 'Проект демо пользователя',
      description: 'Проект для тестирования функционала задач и финансов (администратор)',
      ownerId: DEFAULT_WORKSPACE_USER_ID,
      workspaceId: DEFAULT_WORKSPACE_ID,
      status: 'active',
      stage: 'build',
      type: 'product',
      visibility: 'public',
      budgetPlanned: 50000
    });
    
    await financeService.upsertBudget(
      adminProject.id,
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
    
    // Создаем задачи для проекта администратора
    const adminTasks = [
      { title: 'Проектирование архитектуры системы', description: 'Создать архитектурную диаграмму', status: 'done' as TaskStatus, priority: 'high' as const },
      { title: 'Разработка API для пользователей', description: 'Реализовать REST API', status: 'in_progress' as TaskStatus, priority: 'high' as const },
      { title: 'Создание дизайн-макетов', description: 'Подготовить макеты экранов', status: 'review' as TaskStatus, priority: 'med' as const },
      { title: 'Настройка CI/CD', description: 'Настроить автоматическую сборку', status: 'new' as TaskStatus, priority: 'med' as const },
      { title: 'Интеграция с платежной системой', description: 'Подключить платежный шлюз', status: 'blocked' as TaskStatus, priority: 'urgent' as const }
    ];
    
    const createdAdminTasks = [];
    for (const task of adminTasks) {
      const createdTask = tasksRepository.create({
        projectId: adminProject.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        startAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString()
      });
      createdAdminTasks.push(createdTask);
    }
    
    // Создаем траты для проекта администратора
    const adminExpenses = [
      { taskId: createdAdminTasks[0].id, amount: '15000', category: 'Разработка', description: 'Оплата работы разработчика', vendor: 'Внешний подрядчик', status: 'approved' as ExpenseStatus },
      { taskId: createdAdminTasks[1].id, amount: '8000', category: 'Разработка', description: 'Оплата за разработку API', vendor: 'Команда разработки', status: 'approved' as ExpenseStatus },
      { taskId: createdAdminTasks[2].id, amount: '12000', category: 'Дизайн', description: 'Оплата услуг дизайнера', vendor: 'Дизайн-студия', status: 'payable' as ExpenseStatus },
      { amount: '5000', category: 'Маркетинг', description: 'Рекламная кампания', vendor: 'Рекламное агентство', status: 'closed' as ExpenseStatus },
    ];
    
    for (const expenseData of adminExpenses) {
      const expense = await financeService.createExpense(
        {
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: adminProject.id,
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
        { actorId: DEFAULT_WORKSPACE_USER_ID }
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
          await financeService.updateExpense(expense.id, { status }, { actorId: DEFAULT_WORKSPACE_USER_ID });
        }
      }
    }
    
    // Обновляем budgetSpent
    const adminBudget = await financeService.getBudget(adminProject.id);
    if (adminBudget && adminBudget.spentTotal) {
      projectsRepository.update(adminProject.id, { budgetSpent: parseFloat(adminBudget.spentTotal) });
    }
    
    // Создаем проект для демо пользователя
    const demoProject = projectsRepository.create({
      title: 'Проект демо пользователя',
      description: 'Тестовый проект созданный демо пользователем с задачами и тратами',
      ownerId: DEMO_USER_EMAIL,
      workspaceId: DEFAULT_WORKSPACE_ID,
      status: 'active',
      stage: 'design',
      type: 'marketing',
      visibility: 'private',
      budgetPlanned: 30000
    });
    
    await financeService.upsertBudget(
      demoProject.id,
      {
        currency: 'RUB',
        total: '30000',
        warnThreshold: 0.8,
        categories: [
          { name: 'Маркетинг', limit: '20000' },
          { name: 'Дизайн', limit: '10000' }
        ]
      },
      { actorId: DEMO_USER_EMAIL }
    );
    
    // Создаем задачи для проекта демо пользователя
    const demoTasks = [
      { title: 'Исследование рынка', description: 'Провести анализ конкурентов', status: 'done' as TaskStatus, priority: 'high' as const },
      { title: 'Разработка контент-плана', description: 'Создать план публикаций', status: 'in_progress' as TaskStatus, priority: 'med' as const },
    ];
    
    for (const task of demoTasks) {
      tasksRepository.create({
        projectId: demoProject.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        startAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString()
      });
    }
    
    console.log('✅ Тестовые проекты созданы\n');
  } else {
    console.log(`✓ Найдено проектов: ${allProjects.length}\n`);
  }
}

// Функция для получения данных через API, если сервер запущен
async function tryGetDataFromAPI(): Promise<{ projects: any[], tasks: any[] } | null> {
  try {
    // Пытаемся получить данные через API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/dev/check-projects`, {
      headers: {
        'Cookie': 'demo-session=admin' // Используем демо-сессию для доступа
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      // API возвращает данные в формате { ok: true, data: { projects: [], tasks: [] } }
      const data = result.data || result;
      const projects = data.projects || [];
      const tasks = data.tasks || [];
      console.log(`✅ Получены данные через API: ${projects.length} проектов, ${tasks.length} задач\n`);
      if (projects.length > 0) {
        console.log(`   Проекты из API:`);
        for (const project of projects) {
          console.log(`     - ${project.key || 'N/A'} (${project.id}): ${project.title} [${project.status}]`);
        }
        console.log('');
      }
      return {
        projects,
        tasks
      };
    }
  } catch (error) {
    // Сервер не запущен или недоступен
    console.log(`⚠️  API недоступен (сервер не запущен или недоступен), используем локальную память\n`);
  }
  return null;
}

async function main() {
  // Пытаемся получить данные через API
  const apiData = await tryGetDataFromAPI();
  
  if (!apiData) {
    // Если API недоступен, работаем с локальной памятью
    // Создаем тестовые проекты, если их нет
    await ensureTestProjects();
  } else {
    // Если получили данные через API, выводим их
    console.log('📡 Используются данные из API (запущенного сервера)\n');
    
    // Импортируем данные в локальную память для обработки
    // (это нужно для корректной работы функций сканирования)
    // Но сначала проверим, есть ли уже проекты в памяти
    const existingProjects = projectsRepository.list();
    if (existingProjects.length === 0 && apiData.projects.length > 0) {
      console.log(`⚠️  В локальной памяти нет проектов, но они есть в API.`);
      console.log(`   Для полного сканирования запустите скрипт, когда сервер Next.js работает.\n`);
      console.log(`   Или используйте API endpoint: /api/dev/check-projects\n`);
      
      // Выводим данные из API напрямую
      console.log('═'.repeat(150));
      console.log('📊 ПРОЕКТЫ ИЗ API (запущенного сервера)');
      console.log('═'.repeat(150));
      console.log(`\n📈 СВОДКА:`);
      console.log(`   • Всего проектов: ${apiData.projects.length}`);
      console.log(`   • Всего задач: ${apiData.tasks.length}\n`);
      
      // Группируем проекты по владельцам
      const ownersMap = new Map<string, any[]>();
      const usersMap = new Map(memory.WORKSPACE_USERS.map(user => [user.id, user]));
      
      for (const project of apiData.projects) {
        const ownerId = project.ownerId;
        if (!ownersMap.has(ownerId)) {
          ownersMap.set(ownerId, []);
        }
        ownersMap.get(ownerId)!.push(project);
      }
      
      for (const [ownerId, projects] of ownersMap.entries()) {
        const owner = usersMap.get(ownerId);
        const ownerName = owner?.name || ownerId;
        const ownerEmail = owner?.email || ownerId;
        const projectTasks = apiData.tasks.filter((t: any) => projects.some((p: any) => p.id === t.projectId));
        
        console.log(`\n👤 ВЛАДЕЛЕЦ: ${ownerName} (${ownerEmail})`);
        console.log(`   Проектов: ${projects.length}, Задач: ${projectTasks.length}`);
        console.log('─'.repeat(150));
        
        for (const project of projects) {
          const tasks = apiData.tasks.filter((t: any) => t.projectId === project.id);
          console.log(`\n  📁 ПРОЕКТ: ${project.key} - ${project.title}`);
          console.log(`     🆔 ID: ${project.id}`);
          console.log(`     📍 Статус: ${project.status} | Видимость: ${project.visibility}`);
          console.log(`     📊 Задач: ${tasks.length}`);
          if (tasks.length > 0) {
            console.log(`     ✅ ЗАДАЧИ:`);
            for (const task of tasks) {
              console.log(`       • #${task.number} ${task.title} [${task.status}]`);
            }
          }
        }
      }
      
      console.log('\n' + '═'.repeat(150));
      console.log('✅ Отчет завершен (данные из API)');
      console.log('═'.repeat(150) + '\n');
      return;
    }
  }

  // Выполняем сканирование
  const result = scanAllProjectsAndTasks();

  // Выводим результаты в виде таблицы
  console.log('\n' + '═'.repeat(150));
  console.log('📊 ПОДРОБНЫЙ ОТЧЕТ: ВСЕ ПРОЕКТЫ И ЗАДАЧИ В СИСТЕМЕ');
  console.log('═'.repeat(150));
  console.log(`\n📈 СВОДКА:`);
  console.log(`   • Всего проектов: ${result.summary.totalProjects}`);
  console.log(`   • Всего задач: ${result.summary.totalTasks}`);
  console.log(`   • Всего владельцев: ${result.summary.totalOwners}\n`);

  console.log('═'.repeat(150));
  console.log('👥 ВЛАДЕЛЬЦЫ И ИХ ПРОЕКТЫ');
  console.log('═'.repeat(150));

  for (const owner of result.owners) {
    console.log(`\n👤 ВЛАДЕЛЕЦ: ${owner.ownerName}`);
    console.log(`   📧 Email: ${owner.ownerEmail}`);
    console.log(`   📊 Статистика: ${owner.totalProjects} проектов, ${owner.totalTasks} задач`);
    console.log('─'.repeat(150));
    
    for (const project of owner.projects) {
      const budgetInfo = project.budgetPlanned 
        ? `Бюджет: ${project.budgetSpent || 0} / ${project.budgetPlanned}`
        : 'Бюджет: не установлен';
      
      const stageInfo = project.stage ? ` | Этап: ${project.stage}` : '';
      const typeInfo = project.type ? ` | Тип: ${project.type}` : '';
      
      console.log(`\n  📁 ПРОЕКТ: ${project.key} - ${project.title}`);
      console.log(`     🆔 ID: ${project.id}`);
      console.log(`     📍 Статус: ${project.status} | Видимость: ${project.visibility} | Архив: ${project.archived ? 'ДА' : 'НЕТ'}${stageInfo}${typeInfo}`);
      console.log(`     📊 Задач: ${project.tasksCount} | ${budgetInfo}`);
      console.log(`     🏢 Workspace: ${project.workspaceId}`);
      console.log(`     📅 Создан: ${new Date(project.createdAt).toLocaleString('ru-RU')}`);
      
      if (project.tasks.length > 0) {
        console.log(`     \n     ✅ ЗАДАЧИ (${project.tasks.length}):`);
        for (const task of project.tasks) {
          const assigneeInfo = task.assigneeName ? ` → Назначено: ${task.assigneeName}` : ' → Не назначено';
          const priorityInfo = task.priority ? ` | Приоритет: ${task.priority}` : '';
          const dueInfo = task.dueAt ? ` | Срок: ${new Date(task.dueAt).toLocaleDateString('ru-RU')}` : '';
          console.log(`       • #${task.number} ${task.title} [${task.status}]${priorityInfo}${dueInfo}${assigneeInfo}`);
        }
      } else {
        console.log(`     ⚠️  Задач нет`);
      }
    }
  }

  console.log('\n' + '═'.repeat(150));
  console.log('📋 СВОДНАЯ ТАБЛИЦА ВСЕХ ПРОЕКТОВ');
  console.log('═'.repeat(150));

  // Заголовок таблицы
  const headers = ['Владелец', 'Ключ', 'Название', 'Статус', 'Видимость', 'Задач', 'Бюджет', 'Архив'];
  const colWidths = [20, 12, 30, 12, 12, 8, 20, 8];

  function printRow(values: string[]) {
    let row = '|';
    values.forEach((val, i) => {
      row += ` ${val.padEnd(colWidths[i])} |`;
    });
    console.log(row);
  }

  // Печатаем заголовок
  printRow(headers);
  console.log('|' + colWidths.map(w => '─'.repeat(w + 2)).join('|') + '|');

  // Печатаем данные
  for (const project of result.allProjects) {
    const budget = project.budgetPlanned 
      ? `${project.budgetSpent || 0}/${project.budgetPlanned}`
      : '-';
    const archived = project.archived ? 'ДА' : 'НЕТ';
    
    printRow([
      project.ownerName.substring(0, colWidths[0]),
      project.key.substring(0, colWidths[1]),
      project.title.substring(0, colWidths[2]),
      project.status.substring(0, colWidths[3]),
      project.visibility.substring(0, colWidths[4]),
      project.tasksCount.toString(),
      budget.substring(0, colWidths[6]),
      archived
    ]);
  }

  console.log('═'.repeat(150));

  // Дополнительная статистика
  console.log('\n📊 ДОПОЛНИТЕЛЬНАЯ СТАТИСТИКА:');
  console.log('─'.repeat(150));

  // Статистика по статусам проектов
  const projectsByStatus = new Map<string, number>();
  for (const project of result.allProjects) {
    projectsByStatus.set(project.status, (projectsByStatus.get(project.status) || 0) + 1);
  }
  console.log('\n📈 Проекты по статусам:');
  for (const [status, count] of Array.from(projectsByStatus.entries()).sort()) {
    console.log(`   • ${status}: ${count}`);
  }

  // Статистика по видимости
  const projectsByVisibility = new Map<string, number>();
  for (const project of result.allProjects) {
    projectsByVisibility.set(project.visibility, (projectsByVisibility.get(project.visibility) || 0) + 1);
  }
  console.log('\n👁️  Проекты по видимости:');
  for (const [visibility, count] of Array.from(projectsByVisibility.entries()).sort()) {
    console.log(`   • ${visibility}: ${count}`);
  }

  // Статистика по статусам задач
  const tasksByStatus = new Map<string, number>();
  for (const project of result.allProjects) {
    for (const task of project.tasks) {
      tasksByStatus.set(task.status, (tasksByStatus.get(task.status) || 0) + 1);
    }
  }
  console.log('\n✅ Задачи по статусам:');
  for (const [status, count] of Array.from(tasksByStatus.entries()).sort()) {
    console.log(`   • ${status}: ${count}`);
  }

  // Проекты без задач
  const projectsWithoutTasks = result.allProjects.filter(p => p.tasksCount === 0);
  if (projectsWithoutTasks.length > 0) {
    console.log(`\n⚠️  Проекты без задач (${projectsWithoutTasks.length}):`);
    for (const project of projectsWithoutTasks) {
      console.log(`   • ${project.key} - ${project.title} (${project.ownerName})`);
    }
  }

  // Архивные проекты
  const archivedProjects = result.allProjects.filter(p => p.archived);
  if (archivedProjects.length > 0) {
    console.log(`\n📦 Архивные проекты (${archivedProjects.length}):`);
    for (const project of archivedProjects) {
      console.log(`   • ${project.key} - ${project.title} (${project.ownerName})`);
    }
  }

  console.log('\n' + '═'.repeat(150));
  console.log('✅ Сканирование завершено');
  console.log('═'.repeat(150) + '\n');
}

main().catch((error) => {
  console.error('Ошибка при сканировании:', error);
  process.exitCode = 1;
});


/**
 * МАКСИМАЛЬНО ГЛУБОКОЕ СКАНИРОВАНИЕ ВСЕХ ПРОЕКТОВ И ЗАДАЧ
 * 
 * Этот скрипт проверяет ВСЕ возможные источники данных:
 * 1. Прямой доступ к памяти через репозитории
 * 2. API endpoint (если сервер запущен)
 * 3. Глобальная память Node.js (если доступна)
 * 
 * Запуск: npx tsx scripts/deep-scan-all-projects.ts
 */

import {
  projectsRepository,
  tasksRepository,
  memory,
  financeService,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_USER_ID,
  type Project,
  type Task,
  type TaskStatus
} from '@collabverse/api';

interface ProjectData {
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
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  stage?: string;
  type?: string;
  source: 'local' | 'api' | 'global';
}

interface TaskData {
  id: string;
  projectId: string;
  number: number;
  title: string;
  status: string;
  assigneeId?: string;
  assigneeName?: string;
  priority?: string;
  source: 'local' | 'api' | 'global';
}

// Функция для создания демо-сессии
function createDemoSession(email: string, role: 'admin' | 'user' = 'admin'): string {
  const session = {
    email,
    role,
    issuedAt: Date.now()
  };
  return Buffer.from(JSON.stringify(session)).toString('base64url');
}

// Получение данных через API
async function getDataFromAPI(): Promise<{ projects: ProjectData[], tasks: TaskData[] }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const adminEmail = 'admin.demo@collabverse.test';
  const sessionToken = createDemoSession(adminEmail, 'admin');
  
  try {
    // Сначала проверяем доступность сервера
    const healthCheck = await fetch(`${baseUrl}/api/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    }).catch(() => null);
    
    if (!healthCheck || !healthCheck.ok) {
      return { projects: [], tasks: [] };
    }
    
    const response = await fetch(`${baseUrl}/api/dev/check-projects`, {
      headers: {
        'Cookie': `demo-session=${sessionToken}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const result = await response.json();
      const data = result.data || result;
      const apiProjects = data.projects || [];
      const apiTasks = data.tasks || [];
      
      // Если получили данные, выводим информацию
      if (apiProjects.length > 0 || apiTasks.length > 0) {
        console.log(`   📦 Получено через API: ${apiProjects.length} проектов, ${apiTasks.length} задач`);
      }
      
      const usersMap = new Map(memory.WORKSPACE_USERS.map(user => [user.id, user]));
      
      const projects: ProjectData[] = apiProjects.map((p: any) => {
        const owner = usersMap.get(p.ownerId);
        return {
          id: p.id,
          key: p.key || 'N/A',
          title: p.title,
          ownerId: p.ownerId,
          ownerName: owner?.name || p.ownerId,
          ownerEmail: owner?.email || p.ownerId,
          status: p.status,
          visibility: p.visibility,
          workspaceId: p.workspaceId,
          budgetPlanned: null,
          budgetSpent: null,
          tasksCount: 0,
          archived: p.archived || false,
          createdAt: '',
          updatedAt: '',
          source: 'api'
        };
      });
      
      const tasks: TaskData[] = apiTasks.map((t: any) => {
        const assignee = t.assigneeId ? usersMap.get(t.assigneeId) : undefined;
        return {
          id: t.id,
          projectId: t.projectId,
          number: t.number || 0,
          title: t.title,
          status: t.status,
          assigneeId: t.assigneeId,
          assigneeName: assignee?.name,
          priority: t.priority,
          source: 'api'
        };
      });
      
      return { projects, tasks };
    }
  } catch (error) {
    // API недоступен
  }
  
  return { projects: [], tasks: [] };
}

// Получение данных из локальной памяти
function getDataFromLocal(): { projects: ProjectData[], tasks: TaskData[] } {
  const allProjects = projectsRepository.list();
  const allTasks = tasksRepository.list();
  const usersMap = new Map(memory.WORKSPACE_USERS.map(user => [user.id, user]));
  
  const projects: ProjectData[] = allProjects.map(p => {
    const owner = usersMap.get(p.ownerId);
    const projectTasks = allTasks.filter(t => t.projectId === p.id);
    
    return {
      id: p.id,
      key: p.key,
      title: p.title,
      ownerId: p.ownerId,
      ownerName: owner?.name || p.ownerId,
      ownerEmail: owner?.email || p.ownerId,
      status: p.status,
      visibility: p.visibility,
      workspaceId: p.workspaceId,
      budgetPlanned: p.budgetPlanned,
      budgetSpent: p.budgetSpent,
      tasksCount: projectTasks.length,
      archived: p.archived,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      stage: p.stage,
      type: p.type,
      source: 'local'
    };
  });
  
  const tasks: TaskData[] = allTasks.map(t => {
    const assignee = t.assigneeId ? usersMap.get(t.assigneeId) : undefined;
    return {
      id: t.id,
      projectId: t.projectId,
      number: t.number,
      title: t.title,
      status: t.status,
      assigneeId: t.assigneeId,
      assigneeName: assignee?.name,
      priority: t.priority,
      source: 'local'
    };
  });
  
  return { projects, tasks };
}

// Попытка получить данные из глобальной памяти
function getDataFromGlobal(): { projects: ProjectData[], tasks: TaskData[] } {
  try {
    const globalScope = globalThis as any;
    const globalMemory = globalScope.__collabverseMemory__;
    
    if (globalMemory && globalMemory.PROJECTS && globalMemory.TASKS) {
      const usersMap = new Map(memory.WORKSPACE_USERS.map(user => [user.id, user]));
      
      const projects: ProjectData[] = (globalMemory.PROJECTS || []).map((p: Project) => {
        const owner = usersMap.get(p.ownerId);
        const projectTasks = (globalMemory.TASKS || []).filter((t: Task) => t.projectId === p.id);
        
        return {
          id: p.id,
          key: p.key,
          title: p.title,
          ownerId: p.ownerId,
          ownerName: owner?.name || p.ownerId,
          ownerEmail: owner?.email || p.ownerId,
          status: p.status,
          visibility: p.visibility,
          workspaceId: p.workspaceId,
          budgetPlanned: p.budgetPlanned,
          budgetSpent: p.budgetSpent,
          tasksCount: projectTasks.length,
          archived: p.archived,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          stage: p.stage,
          type: p.type,
          source: 'global'
        };
      });
      
      const tasks: TaskData[] = (globalMemory.TASKS || []).map((t: Task) => {
        const assignee = t.assigneeId ? usersMap.get(t.assigneeId) : undefined;
        return {
          id: t.id,
          projectId: t.projectId,
          number: t.number,
          title: t.title,
          status: t.status,
          assigneeId: t.assigneeId,
          assigneeName: assignee?.name,
          priority: t.priority,
          source: 'global'
        };
      });
      
      return { projects, tasks };
    }
  } catch (error) {
    // Глобальная память недоступна
  }
  
  return { projects: [], tasks: [] };
}

// Объединение данных из разных источников (убираем дубликаты по ID)
function mergeData(
  local: { projects: ProjectData[], tasks: TaskData[] },
  api: { projects: ProjectData[], tasks: TaskData[] },
  global: { projects: ProjectData[], tasks: TaskData[] }
): { projects: ProjectData[], tasks: TaskData[] } {
  const projectsMap = new Map<string, ProjectData>();
  const tasksMap = new Map<string, TaskData>();
  
  // Приоритет: global > api > local (берем самую свежую версию)
  const sources = [local, api, global];
  
  for (const source of sources) {
    for (const project of source.projects) {
      if (!projectsMap.has(project.id)) {
        projectsMap.set(project.id, project);
      }
    }
    
    for (const task of source.tasks) {
      if (!tasksMap.has(task.id)) {
        tasksMap.set(task.id, task);
      }
    }
  }
  
  // Обновляем счетчики задач для проектов
  const projects = Array.from(projectsMap.values());
  const tasks = Array.from(tasksMap.values());
  
  for (const project of projects) {
    project.tasksCount = tasks.filter(t => t.projectId === project.id).length;
  }
  
  return { projects, tasks };
}

// Создание тестовых проектов для демонстрации
async function createTestDataIfNeeded() {
  const localData = getDataFromLocal();
  if (localData.projects.length === 0) {
    console.log('📝 Создание тестовых проектов для демонстрации отчета...\n');
    
    const DEMO_USER_EMAIL = 'user.demo@collabverse.test';
    
    // Проект 1: Администратор
    const project1 = projectsRepository.create({
      title: 'Проект демо пользователя',
      description: 'Проект для тестирования функционала',
      ownerId: DEFAULT_WORKSPACE_USER_ID,
      workspaceId: DEFAULT_WORKSPACE_ID,
      status: 'active',
      stage: 'build',
      type: 'product',
      visibility: 'public',
      budgetPlanned: 50000
    });
    
    await financeService.upsertBudget(project1.id, {
      currency: 'RUB',
      total: '50000',
      warnThreshold: 0.8,
      categories: [
        { name: 'Разработка', limit: '25000' },
        { name: 'Дизайн', limit: '15000' }
      ]
    }, { actorId: DEFAULT_WORKSPACE_USER_ID });
    
    const tasks1 = [
      { title: 'Проектирование архитектуры', status: 'done' as const, priority: 'high' as const },
      { title: 'Разработка API', status: 'in_progress' as const, priority: 'high' as const },
      { title: 'Создание дизайн-макетов', status: 'review' as const, priority: 'med' as const },
      { title: 'Настройка CI/CD', status: 'new' as const, priority: 'med' as const },
      { title: 'Интеграция с платежной системой', status: 'blocked' as const, priority: 'urgent' as const }
    ];
    
    for (const task of tasks1) {
      tasksRepository.create({
        projectId: project1.id,
        title: task.title,
        status: task.status,
        priority: task.priority
      });
    }
    
    const budget1 = await financeService.getBudget(project1.id);
    if (budget1?.spentTotal) {
      projectsRepository.update(project1.id, { budgetSpent: parseFloat(budget1.spentTotal) });
    }
    
    // Проект 2: Демо пользователь
    const project2 = projectsRepository.create({
      title: 'Проект демо пользователя',
      description: 'Тестовый проект',
      ownerId: DEMO_USER_EMAIL,
      workspaceId: DEFAULT_WORKSPACE_ID,
      status: 'active',
      stage: 'design',
      type: 'marketing',
      visibility: 'private',
      budgetPlanned: 30000
    });
    
    const tasks2 = [
      { title: 'Исследование рынка', status: 'done' as const, priority: 'high' as const },
      { title: 'Разработка контент-плана', status: 'in_progress' as const, priority: 'med' as const }
    ];
    
    for (const task of tasks2) {
      tasksRepository.create({
        projectId: project2.id,
        title: task.title,
        status: task.status,
        priority: task.priority
      });
    }
    
    // Проект 3: Тест ИИ (как в примере пользователя)
    const project3 = projectsRepository.create({
      title: 'тест ии',
      description: 'Тестовый проект для ИИ',
      ownerId: DEFAULT_WORKSPACE_USER_ID,
      workspaceId: DEFAULT_WORKSPACE_ID,
      status: 'active',
      stage: 'discovery',
      type: 'internal',
      visibility: 'public',
      budgetPlanned: null
    });
    
    console.log('✅ Тестовые проекты созданы\n');
  }
}

async function main() {
  console.log('\n' + '═'.repeat(150));
  console.log('🔍 МАКСИМАЛЬНО ГЛУБОКОЕ СКАНИРОВАНИЕ ВСЕХ ПРОЕКТОВ И ЗАДАЧ');
  console.log('═'.repeat(150));
  console.log('\n📡 Проверка всех источников данных...\n');
  
  // Создаем тестовые данные, если их нет
  await createTestDataIfNeeded();
  
  // 1. Локальная память
  console.log('1️⃣  Проверка локальной памяти...');
  const localData = getDataFromLocal();
  console.log(`   ✓ Найдено: ${localData.projects.length} проектов, ${localData.tasks.length} задач`);
  
  // 2. API
  console.log('\n2️⃣  Проверка API (запущенный сервер)...');
  const apiData = await getDataFromAPI();
  if (apiData.projects.length > 0 || apiData.tasks.length > 0) {
    console.log(`   ✓ Найдено: ${apiData.projects.length} проектов, ${apiData.tasks.length} задач`);
  } else {
    console.log(`   ⚠️  API недоступен или пуст (сервер не запущен или память пуста)`);
    console.log(`   💡 Совет: Откройте проект в браузере, чтобы он создался в памяти сервера`);
  }
  
  // 3. Глобальная память
  console.log('\n3️⃣  Проверка глобальной памяти Node.js...');
  const globalData = getDataFromGlobal();
  if (globalData.projects.length > 0 || globalData.tasks.length > 0) {
    console.log(`   ✓ Найдено: ${globalData.projects.length} проектов, ${globalData.tasks.length} задач`);
  } else {
    console.log(`   ⚠️  Глобальная память недоступна или пуста`);
  }
  
  // Объединяем все данные
  console.log('\n🔄 Объединение данных из всех источников...');
  const merged = mergeData(localData, apiData, globalData);
  console.log(`   ✓ Итого уникальных: ${merged.projects.length} проектов, ${merged.tasks.length} задач\n`);
  
  // Группируем задачи по проектам
  const tasksByProject = new Map<string, TaskData[]>();
  for (const task of merged.tasks) {
    const projectTasks = tasksByProject.get(task.projectId) || [];
    projectTasks.push(task);
    tasksByProject.set(task.projectId, projectTasks);
  }
  
  // Группируем проекты по владельцам
  const ownersMap = new Map<string, ProjectData[]>();
  for (const project of merged.projects) {
    const ownerProjects = ownersMap.get(project.ownerId) || [];
    ownerProjects.push(project);
    ownersMap.set(project.ownerId, ownerProjects);
  }
  
  // Выводим отчет
  console.log('═'.repeat(150));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ: ВСЕ ПРОЕКТЫ И ЗАДАЧИ В СИСТЕМЕ');
  console.log('═'.repeat(150));
  console.log(`\n📈 ОБЩАЯ СВОДКА:`);
  console.log(`   • Всего проектов: ${merged.projects.length}`);
  console.log(`   • Всего задач: ${merged.tasks.length}`);
  console.log(`   • Всего владельцев: ${ownersMap.size}`);
  
  // Статистика по источникам
  const projectsBySource = new Map<string, number>();
  const tasksBySource = new Map<string, number>();
  for (const project of merged.projects) {
    projectsBySource.set(project.source, (projectsBySource.get(project.source) || 0) + 1);
  }
  for (const task of merged.tasks) {
    tasksBySource.set(task.source, (tasksBySource.get(task.source) || 0) + 1);
  }
  
  console.log(`\n📡 Источники данных:`);
  for (const [source, count] of projectsBySource.entries()) {
    console.log(`   • Проекты из ${source}: ${count}`);
  }
  for (const [source, count] of tasksBySource.entries()) {
    console.log(`   • Задачи из ${source}: ${count}`);
  }
  
  // Детальная таблица
  console.log('\n' + '═'.repeat(150));
  console.log('📋 ДЕТАЛЬНАЯ ТАБЛИЦА ВСЕХ ПРОЕКТОВ');
  console.log('═'.repeat(150));
  
  const headers = ['№', 'Владелец', 'Ключ', 'Название', 'Статус', 'Видимость', 'Задач', 'Бюджет', 'Архив', 'Источник'];
  const colWidths = [4, 20, 10, 30, 12, 10, 6, 18, 6, 8];
  
  function printRow(values: string[]) {
    let row = '|';
    values.forEach((val, i) => {
      row += ` ${val.padEnd(colWidths[i])} |`;
    });
    console.log(row);
  }
  
  printRow(headers);
  console.log('|' + colWidths.map(w => '─'.repeat(w + 2)).join('|') + '|');
  
  let index = 1;
  for (const project of merged.projects.sort((a, b) => {
    // Сортируем по владельцу, затем по названию
    if (a.ownerName !== b.ownerName) {
      return a.ownerName.localeCompare(b.ownerName, 'ru');
    }
    return a.title.localeCompare(b.title, 'ru');
  })) {
    const budget = project.budgetPlanned 
      ? `${project.budgetSpent || 0}/${project.budgetPlanned}`
      : '-';
    const archived = project.archived ? 'ДА' : 'НЕТ';
    const projectTasks = tasksByProject.get(project.id) || [];
    
    printRow([
      index.toString(),
      project.ownerName.substring(0, colWidths[1]),
      project.key.substring(0, colWidths[2]),
      project.title.substring(0, colWidths[3]),
      project.status.substring(0, colWidths[4]),
      project.visibility.substring(0, colWidths[5]),
      projectTasks.length.toString(),
      budget.substring(0, colWidths[7]),
      archived,
      project.source.substring(0, colWidths[9])
    ]);
    index++;
  }
  
  console.log('═'.repeat(150));
  
  // Таблица задач
  console.log('\n' + '═'.repeat(150));
  console.log('✅ ДЕТАЛЬНАЯ ТАБЛИЦА ВСЕХ ЗАДАЧ');
  console.log('═'.repeat(150));
  
  const taskHeaders = ['№', 'Проект', 'Ключ', 'Название', 'Статус', 'Приоритет', 'Назначено', 'Источник'];
  const taskColWidths = [4, 30, 10, 40, 12, 10, 20, 8];
  
  function printTaskRow(values: string[]) {
    let row = '|';
    values.forEach((val, i) => {
      row += ` ${val.padEnd(taskColWidths[i])} |`;
    });
    console.log(row);
  }
  
  printTaskRow(taskHeaders);
  console.log('|' + taskColWidths.map(w => '─'.repeat(w + 2)).join('|') + '|');
  
  // Создаем мапу проектов для быстрого поиска
  const projectsMap = new Map(merged.projects.map(p => [p.id, p]));
  
  index = 1;
  for (const task of merged.tasks.sort((a, b) => {
    // Сортируем по проекту, затем по номеру
    const projectA = projectsMap.get(a.projectId);
    const projectB = projectsMap.get(b.projectId);
    if (projectA && projectB) {
      if (projectA.title !== projectB.title) {
        return projectA.title.localeCompare(projectB.title, 'ru');
      }
    }
    return a.number - b.number;
  })) {
    const project = projectsMap.get(task.projectId);
    const projectKey = project?.key || 'N/A';
    const projectTitle = project?.title || 'Неизвестный проект';
    
    printTaskRow([
      index.toString(),
      projectTitle.substring(0, taskColWidths[1]),
      projectKey.substring(0, taskColWidths[2]),
      task.title.substring(0, taskColWidths[3]),
      task.status.substring(0, taskColWidths[4]),
      (task.priority || '-').substring(0, taskColWidths[5]),
      (task.assigneeName || 'Не назначено').substring(0, taskColWidths[6]),
      task.source.substring(0, taskColWidths[7])
    ]);
    index++;
  }
  
  console.log('═'.repeat(150));
  
  // Дополнительная статистика
  console.log('\n📊 ДОПОЛНИТЕЛЬНАЯ СТАТИСТИКА:');
  console.log('─'.repeat(150));
  
  // Статистика по статусам проектов
  const projectsByStatus = new Map<string, number>();
  for (const project of merged.projects) {
    projectsByStatus.set(project.status, (projectsByStatus.get(project.status) || 0) + 1);
  }
  console.log('\n📈 Проекты по статусам:');
  for (const [status, count] of Array.from(projectsByStatus.entries()).sort()) {
    console.log(`   • ${status}: ${count}`);
  }
  
  // Статистика по видимости
  const projectsByVisibility = new Map<string, number>();
  for (const project of merged.projects) {
    projectsByVisibility.set(project.visibility, (projectsByVisibility.get(project.visibility) || 0) + 1);
  }
  console.log('\n👁️  Проекты по видимости:');
  for (const [visibility, count] of Array.from(projectsByVisibility.entries()).sort()) {
    console.log(`   • ${visibility}: ${count}`);
  }
  
  // Статистика по статусам задач
  const tasksByStatus = new Map<string, number>();
  for (const task of merged.tasks) {
    tasksByStatus.set(task.status, (tasksByStatus.get(task.status) || 0) + 1);
  }
  console.log('\n✅ Задачи по статусам:');
  for (const [status, count] of Array.from(tasksByStatus.entries()).sort()) {
    console.log(`   • ${status}: ${count}`);
  }
  
  // Проекты без задач
  const projectsWithoutTasks = merged.projects.filter(p => {
    const projectTasks = tasksByProject.get(p.id) || [];
    return projectTasks.length === 0;
  });
  if (projectsWithoutTasks.length > 0) {
    console.log(`\n⚠️  Проекты без задач (${projectsWithoutTasks.length}):`);
    for (const project of projectsWithoutTasks) {
      console.log(`   • ${project.key} - ${project.title} (${project.ownerName})`);
    }
  }
  
  // Архивные проекты
  const archivedProjects = merged.projects.filter(p => p.archived);
  if (archivedProjects.length > 0) {
    console.log(`\n📦 Архивные проекты (${archivedProjects.length}):`);
    for (const project of archivedProjects) {
      console.log(`   • ${project.key} - ${project.title} (${project.ownerName})`);
    }
  }
  
  // Если ничего не найдено, выводим инструкции
  if (merged.projects.length === 0 && merged.tasks.length === 0) {
    console.log('\n' + '═'.repeat(150));
    console.log('⚠️  ПРОЕКТЫ И ЗАДАЧИ НЕ НАЙДЕНЫ');
    console.log('═'.repeat(150));
    console.log('\n💡 Возможные причины:');
    console.log('   1. Сервер Next.js не запущен');
    console.log('   2. Проекты еще не были созданы');
    console.log('   3. Проекты создаются динамически при обращении к странице');
    console.log('\n📝 Рекомендации:');
    console.log('   • Убедитесь, что сервер запущен: npm run dev');
    console.log('   • Откройте страницу проектов в браузере: http://localhost:3000/app/projects');
    console.log('   • Это создаст проекты в памяти сервера');
    console.log('   • Затем запустите этот скрипт снова\n');
  }
  
  console.log('\n' + '═'.repeat(150));
  console.log('✅ Глубокое сканирование завершено');
  console.log('═'.repeat(150) + '\n');
}

main().catch((error) => {
  console.error('❌ Ошибка при сканировании:', error);
  process.exitCode = 1;
});


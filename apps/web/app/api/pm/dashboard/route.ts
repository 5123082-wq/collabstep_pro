import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { tasksRepository, usersRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getAccessibleProjects } from '@/lib/api/project-access';
import { ensureTestProject } from '@/lib/pm/ensure-test-project';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(_req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  // Очищаем возможные устаревшие демо-данные перед расчётом метрик
  await ensureTestProject(auth.userId, auth.email);

  const currentUserId = auth.userId;

  // Get all projects that user has access to (owned, member, or public)
  const userProjects = await getAccessibleProjects(currentUserId, auth.email);
  
  // Логирование для диагностики
  console.log('[pm/dashboard] GET request:', {
    userId: currentUserId,
    email: auth.email,
    accessibleProjectsCount: userProjects.length,
    projectIds: userProjects.map(p => ({ id: p.id, title: p.title, ownerId: p.ownerId }))
  });

  // Filter active projects (все, кроме архивных)
  const activeProjects = userProjects.filter(
    (project) => project.status !== 'archived' && !project.archived
  );

  // Черновиков больше нет, оставляем пустой массив для совместимости ответа
  const draftProjects: typeof userProjects = [];

  // Resolve owners to display human-friendly names/emails in the widget
  const ownerIds = Array.from(new Set(userProjects.map((project) => project.ownerId).filter(Boolean)));
  const owners = await usersRepository.findMany(ownerIds);
  const ownerLookup = new Map(owners.map((owner) => [owner.id, owner]));

  const buildOwnerProjects = (projects: typeof userProjects) =>
    projects.reduce<
      Array<{
        ownerId: string;
        ownerName: string;
        ownerEmail?: string;
        projects: Array<{ id: string; key: string; title: string; status: string }>;
      }>
    >((acc, project) => {
      const owner = ownerLookup.get(project.ownerId);
      const ownerName = owner?.name || 'Неизвестный пользователь';
      const ownerEmail = owner?.email;

      const existing = acc.find((item) => item.ownerId === project.ownerId);
      const projectInfo = {
        id: project.id,
        key: project.key,
        title: project.title,
        status: project.status
      };

      if (existing) {
        existing.projects.push(projectInfo);
        return acc;
      }

      acc.push({
        ownerId: project.ownerId,
        ownerName,
        ...(ownerEmail ? { ownerEmail } : {}),
        projects: [projectInfo]
      });
      return acc;
    }, []);

  const activeProjectsByOwner = buildOwnerProjects(activeProjects);
  const draftProjectsByOwner = buildOwnerProjects(draftProjects);

  // Get all tasks from user's projects
  const allTasks = await tasksRepository.list();
  const userProjectIds = new Set(userProjects.map((p) => p.id));
  const accessibleTasks = allTasks.filter((task) =>
    userProjectIds.has(task.projectId)
  );

  // Count open tasks (not done)
  const openTasks = accessibleTasks.filter(
    (task) => task.status !== 'done'
  ).length;

  // Count user's open tasks
  const myOpenTasks = accessibleTasks.filter(
    (task) => task.status !== 'done' && task.assigneeId === currentUserId
  ).length;

  // Count overdue tasks
  const now = Date.now();
  const overdue = accessibleTasks.filter((task) => {
    if (task.status === 'done') return false;
    const dueAt = task.dueAt;
    if (!dueAt) return false;
    const dueTime = new Date(dueAt).getTime();
    return !Number.isNaN(dueTime) && dueTime < now;
  }).length;

  // Count user's overdue tasks
  const myOverdue = accessibleTasks.filter((task) => {
    if (task.status === 'done' || task.assigneeId !== currentUserId) return false;
    const dueAt = task.dueAt;
    if (!dueAt) return false;
    const dueTime = new Date(dueAt).getTime();
    return !Number.isNaN(dueTime) && dueTime < now;
  }).length;

  // Get upcoming deadlines (next 7 days)
  const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
  const upcomingDeadlines = accessibleTasks
    .filter((task) => {
      if (task.status === 'done') return false;
      const dueAt = task.dueAt;
      if (!dueAt) return false;
      const dueTime = new Date(dueAt).getTime();
      return (
        !Number.isNaN(dueTime) &&
        dueTime >= now &&
        dueTime <= sevenDaysFromNow
      );
    })
    .map((task) => {
      const project = userProjects.find((p) => p.id === task.projectId);
      return {
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        projectKey: project?.key ?? 'UNK',
        dueAt: task.dueAt as string,
        status: task.status,
        assigneeId: task.assigneeId
      };
    })
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 5); // Limit to 5 upcoming deadlines

  // Count user's upcoming deadlines
  const myUpcomingDeadlines = upcomingDeadlines.filter(
    (deadline) => deadline.assigneeId === currentUserId
  ).length;

  // Calculate progress data (burnup and burndown)
  // Group tasks by date (last 30 days)
  const burnupData: Array<{ date: string; total: number; completed: number }> = [];
  const burndownData: Array<{ date: string; remaining: number }> = [];

  // Create date range
  const dates: string[] = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    if (dateStr) {
      dates.push(dateStr);
    }
  }

  // Calculate burnup (total tasks and completed tasks over time)
  let totalTasks = 0;
  let completedTasks = 0;

  for (const date of dates) {
    const dateTime = new Date(date).getTime();

    // Count tasks created before or on this date
    const tasksCreatedByDate = accessibleTasks.filter((task) => {
      const createdAt = new Date(task.createdAt).getTime();
      return createdAt <= dateTime;
    });
    totalTasks = tasksCreatedByDate.length;

    // Count tasks completed before or on this date
    const tasksCompletedByDate = tasksCreatedByDate.filter(
      (task) => task.status === 'done'
    );
    completedTasks = tasksCompletedByDate.length;

    burnupData.push({
      date,
      total: totalTasks,
      completed: completedTasks
    });

    // Burndown: remaining tasks (not done)
    const remainingTasks = totalTasks - completedTasks;
    burndownData.push({
      date,
      remaining: remainingTasks
    });
  }

  // Workload data (tasks per assignee)
  const workloadMap = new Map<
    string,
    { taskCount: number; projectIds: Set<string> }
  >();

  for (const task of accessibleTasks) {
    if (task.status === 'done' || !task.assigneeId) continue;

    const existing = workloadMap.get(task.assigneeId) ?? {
      taskCount: 0,
      projectIds: new Set<string>()
    };
    existing.taskCount += 1;
    existing.projectIds.add(task.projectId);
    workloadMap.set(task.assigneeId, existing);
  }

  const workload = Array.from(workloadMap.entries()).map(
    ([assigneeId, data]) => ({
      assigneeId,
      taskCount: data.taskCount,
      projectCount: data.projectIds.size,
      projects: Array.from(data.projectIds)
    })
  );

  // Finance data (simplified - can be enhanced later)
  const finance = {
    expenses: [] as Array<{
      projectId: string;
      projectKey: string;
      projectTitle: string;
      spent: string;
      limit?: string;
      remaining?: string;
      currency: string;
      categories: Array<{ name: string; spent: string; limit?: string }>;
    }>,
    totalSpent: '0',
    totalLimit: '0'
  };

  // Add finance data for projects with budgets
  for (const project of userProjects) {
    if (project.budgetPlanned !== null || project.budgetSpent !== null) {
      const spent = project.budgetSpent ?? 0;
      const limit = project.budgetPlanned ?? 0;
      const remaining = limit - spent;

      finance.expenses.push({
        projectId: project.id,
        projectKey: project.key,
        projectTitle: project.title,
        spent: spent.toString(),
        ...(limit > 0 ? { limit: limit.toString() } : {}),
        ...(remaining > 0 ? { remaining: remaining.toString() } : {}),
        currency: 'RUB', // Default currency
        categories: []
      });
    }
  }

  return jsonOk({
    pulse: {
      activeProjects: activeProjects.length,
      activeProjectsByOwner,
      draftProjects: draftProjects.length,
      draftProjectsByOwner,
      openTasks,
      myOpenTasks,
      overdue,
      myOverdue,
      upcomingDeadlines,
      myUpcomingDeadlines
    },
    progress: {
      burnup: burnupData,
      burndown: burndownData
    },
    workload,
    finance
  });
}

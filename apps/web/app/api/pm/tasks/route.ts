import { NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { tasksRepository, projectsRepository, type TaskStatus, aiAgentsRepository } from '@collabverse/api';
import type { ProjectScope } from '@/lib/pm/filters';
import { notifyTaskAssigned } from '@/lib/notifications/event-generator';
import { broadcastToProject } from '@/lib/websocket/event-broadcaster';
import { handleAgentTaskAssignment } from '@/lib/ai/agent-task-actions';

function parsePagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
  const sizeParam = Number(url.searchParams.get('pageSize') ?? '20');
  const pageSize = Math.min(100, Math.max(1, Number.isFinite(sizeParam) ? sizeParam : 20));
  return { page, pageSize };
}

function parseFilters(url: URL) {
  const projectId = url.searchParams.get('projectId') || undefined;
  const status = (url.searchParams.get('status') as TaskStatus | null) || undefined;
  const assigneeId = url.searchParams.get('assigneeId') || undefined;
  const priority = (url.searchParams.get('priority') as 'low' | 'med' | 'high' | 'urgent' | null) || undefined;
  const labels = url.searchParams.get('labels')?.split(',').filter(Boolean) || undefined;
  const dateFrom = url.searchParams.get('dateFrom') || undefined;
  const dateTo = url.searchParams.get('dateTo') || undefined;
  const search = url.searchParams.get('q') || undefined;
  const scopeParam = url.searchParams.get('scope');
  // По умолчанию показываем только проекты пользователя
  const scope: ProjectScope =
    scopeParam === 'owned' || scopeParam === 'member' || scopeParam === 'all'
      ? scopeParam
      : 'owned';
  return {
    projectId,
    status,
    assigneeId,
    priority,
    labels,
    dateFrom,
    dateTo,
    search,
    scope
  };
}

function applyPagination<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paginated = items.slice(start, start + pageSize);
  return { items: paginated, pagination: { page, pageSize, total, totalPages } };
}

function filterTasksByAccess(tasks: ReturnType<typeof tasksRepository.list>, userId: string) {
  // Фильтруем задачи по доступу к проектам
  return tasks.filter((task) => {
    return projectsRepository.hasAccess(task.projectId, userId);
  });
}

function applyTaskFilters(
  tasks: ReturnType<typeof tasksRepository.list>,
  filters: ReturnType<typeof parseFilters>
) {
  let filtered = [...tasks];

  if (filters.status) {
    filtered = filtered.filter((t) => t.status === filters.status);
  }

  if (filters.assigneeId) {
    filtered = filtered.filter((t) => t.assigneeId === filters.assigneeId);
  }

  if (filters.priority) {
    filtered = filtered.filter((t) => t.priority === filters.priority);
  }

  if (filters.labels && filters.labels.length > 0) {
    filtered = filtered.filter((t) => {
      if (!t.labels || t.labels.length === 0) return false;
      return filters.labels!.some((label) => t.labels!.includes(label));
    });
  }

  if (filters.dateFrom) {
    filtered = filtered.filter((t) => {
      const dueDate = t.dueAt || t.startAt || t.startDate;
      return dueDate && dueDate >= filters.dateFrom!;
    });
  }

  if (filters.dateTo) {
    filtered = filtered.filter((t) => {
      const dueDate = t.dueAt || t.startAt || t.startDate;
      return dueDate && dueDate <= filters.dateTo!;
    });
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        String(t.number).includes(query)
    );
  }

  return filtered;
}

type TaskProjectOption = {
  id: string;
  name: string;
  key: string;
  scope: ProjectScope;
  isOwner: boolean;
};

type TasksResponse = {
  items: ReturnType<typeof tasksRepository.list>;
  pagination: ReturnType<typeof applyPagination>['pagination'];
  meta: {
    projects: TaskProjectOption[];
    scopeCounts: Record<ProjectScope, number>;
  };
};

export async function GET(request: Request) {
  if (!flags.PM_TASKS_BOARD && !flags.PM_TASKS_LIST && !flags.PM_TASKS_CALENDAR) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const url = new URL(request.url);
  const { page, pageSize } = parsePagination(url);
  const filters = parseFilters(url);

  // Получаем ВСЕ проекты напрямую из репозитория (как в дашборде)
  const allProjects = projectsRepository.list();
  const accessibleProjects = allProjects.filter((project) =>
    projectsRepository.hasAccess(project.id, auth.userId)
  );

  // Получаем все задачи и фильтруем их по доступу к проектам
  const allTasks = tasksRepository.list();
  const accessibleTasks = filterTasksByAccess(allTasks, auth.userId);

  // Группируем доступные задачи по проектам
  const tasksByProject = new Map<string, ReturnType<typeof tasksRepository.list>>();
  for (const task of accessibleTasks) {
    const bucket = tasksByProject.get(task.projectId) ?? [];
    bucket.push(task);
    tasksByProject.set(task.projectId, bucket);
  }

  // Формируем projectOptions из ВСЕХ доступных проектов (не фильтруем по наличию задач)
  const projectOptions: TaskProjectOption[] = accessibleProjects.map((project) => {
    const members = projectsRepository.listMembers(project.id) ?? [];
    const isOwner = project.ownerId === auth.userId;
    const isMember = members.some((member) => member.userId === auth.userId);
    // Определяем scope: owned > member > all (для public проектов, где пользователь не member)
    const scope: ProjectScope = isOwner ? 'owned' : isMember ? 'member' : 'all';
    return {
      id: project.id,
      name: project.title,
      key: project.key,
      scope,
      isOwner
    };
  });

  const scopeCounts: Record<ProjectScope, number> = {
    all: projectOptions.length,
    owned: projectOptions.filter((option) => option.scope === 'owned').length,
    member: projectOptions.filter((option) => option.scope === 'member').length
  };

  // Получаем задачи в зависимости от фильтров
  let baseTasks: ReturnType<typeof tasksRepository.list> = [];
  
  if (filters.projectId) {
    // Конкретный проект выбран - проверяем доступ и scope
    const project = accessibleProjects.find((p) => p.id === filters.projectId);
    if (project) {
      const members = projectsRepository.listMembers(project.id) ?? [];
      const isOwner = project.ownerId === auth.userId;
      const isMember = members.some((member) => member.userId === auth.userId);
      const projectScope: ProjectScope = isOwner ? 'owned' : isMember ? 'member' : 'all';
      
      // Проверяем, подходит ли проект по scope
      if (filters.scope === 'all' || projectScope === filters.scope) {
        baseTasks = tasksByProject.get(filters.projectId) ?? [];
      }
    }
  } else if (filters.scope === 'all') {
    // Если scope = 'all' и проект не выбран, показываем все доступные задачи
    baseTasks = accessibleTasks;
  } else {
    // Фильтруем проекты по scope для получения задач
    const eligibleProjectIds = new Set(
      projectOptions
        .filter((option) => option.scope === filters.scope)
        .map((option) => option.id)
    );

    if (eligibleProjectIds.size > 0) {
      // Берем задачи из всех подходящих проектов по scope
      baseTasks = Array.from(eligibleProjectIds).flatMap((id) => tasksByProject.get(id) ?? []);
    }
  }

  // Применяем дополнительные фильтры
  const filtered = applyTaskFilters(baseTasks, filters);

  // Сортируем по дате обновления (новые сначала)
  filtered.sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });

  const { items: paginated, pagination } = applyPagination(filtered, page, pageSize);

  const response: TasksResponse = {
    items: paginated,
    pagination,
    meta: {
      projects: projectOptions,
      scopeCounts
    }
  };

  return jsonOk(response);
}

export async function POST(request: Request) {
  if (!flags.PM_TASKS_BOARD && !flags.PM_TASKS_LIST && !flags.PM_TASKS_CALENDAR) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, title, status, ...rest } = body;

    if (!projectId || !title || !status) {
      return jsonError('Missing required fields: projectId, title, status', { status: 400 });
    }

    // Проверяем доступ к проекту
    if (!projectsRepository.hasAccess(projectId, auth.userId)) {
      return jsonError('No access to project', { status: 403 });
    }

    const task = tasksRepository.create({
      projectId,
      title: String(title).trim(),
      status: status as TaskStatus,
      ...(rest.assigneeId ? { assigneeId: rest.assigneeId } : {}),
      ...(rest.priority ? { priority: rest.priority } : {}),
      ...(rest.startDate || rest.startAt ? { startDate: rest.startDate || rest.startAt } : {}),
      ...(rest.dueAt ? { dueAt: rest.dueAt } : {}),
      ...(rest.labels ? { labels: Array.isArray(rest.labels) ? rest.labels : [] } : {}),
      ...(rest.description ? { description: rest.description } : {}),
      ...(rest.estimatedTime !== undefined ? { estimatedTime: rest.estimatedTime } : {}),
      ...(rest.storyPoints !== undefined ? { storyPoints: rest.storyPoints } : {}),
      ...(rest.parentId !== undefined ? { parentId: rest.parentId || null } : {})
    });

    // Генерируем уведомление при назначении задачи
    if (rest.assigneeId && rest.assigneeId !== auth.userId) {
      await notifyTaskAssigned(task.id, rest.assigneeId, projectId);
      
      // Если назначен AI-агент, обработать назначение
      const agent = aiAgentsRepository.findById(rest.assigneeId);
      if (agent) {
        handleAgentTaskAssignment(task.id, rest.assigneeId).catch((error) => {
          console.error('Error handling agent task assignment:', error);
        });
      }
    }

    // Рассылаем событие через WebSocket
    await broadcastToProject(projectId, 'task.created', {
      task,
      projectId
    });

    return jsonOk({ task });
  } catch (error) {
    console.error('Error creating task:', error);
    return jsonError('INVALID_REQUEST', { status: 400 });
  }
}


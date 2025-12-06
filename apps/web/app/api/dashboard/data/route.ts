import { NextRequest } from 'next/server';
import { tasksRepository, taskDependenciesRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { flags } from '@/lib/flags';
import { DASHBOARD_WIDGET_TYPES, type WidgetData, type WidgetType } from '@/lib/dashboard/types';
import type { ProjectsTasksPayload } from '@/components/dashboard/widgets';
import { getAccessibleProjects } from '@/lib/api/project-access';
import { ensureTestProject } from '@/lib/pm/ensure-test-project';

type DashboardDataResponse = {
  widgets: Partial<Record<WidgetType, WidgetData>>;
  requested: WidgetType[];
  generatedAt: string;
};

const ALL_WIDGET_TYPES = new Set(DASHBOARD_WIDGET_TYPES);

function isWidgetType(value: string): value is WidgetType {
  return ALL_WIDGET_TYPES.has(value as WidgetType);
}

function parseRequestedWidgets(param: string | null): WidgetType[] {
  if (!param) {
    return [...ALL_WIDGET_TYPES];
  }

  const unique = new Set<WidgetType>();
  for (const item of param.split(',')) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (isWidgetType(trimmed)) {
      unique.add(trimmed);
    }
  }

  return unique.size > 0 ? [...unique] : [...ALL_WIDGET_TYPES];
}

function formatDueLabel(raw?: string): string {
  if (!raw) return 'Без дедлайна';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  const diffDays = Math.round((parsed.getTime() - startOfToday) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return `Просрочено на ${Math.abs(diffDays)} дн.`;
  }
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays <= 7) return `Через ${diffDays} дн.`;
  return parsed.toLocaleDateString('ru-RU');
}

async function buildProjectsTasksData(userId: string, email: string): Promise<WidgetData<ProjectsTasksPayload>> {
  const now = Date.now();
  const generatedAt = new Date().toISOString();

  // Get all projects that user has access to (owned, member, or public)
  const accessibleProjects = await getAccessibleProjects(userId, email);
  const projectIds = new Set(accessibleProjects.map((project) => project.id));

  // Логирование для диагностики
  console.log('[dashboard/data] buildProjectsTasksData:', {
    userId,
    email,
    accessibleProjectsCount: accessibleProjects.length,
    projectIds: Array.from(projectIds)
  });

  const allTasks = tasksRepository.list();
  const tasks = allTasks.filter((task) => projectIds.has(task.projectId));
  const accessibleTaskIds = new Set(tasks.map((task) => task.id));
  
  console.log('[dashboard/data] tasks:', {
    allTasksCount: allTasks.length,
    accessibleTasksCount: tasks.length
  });

  // Если нет доступных проектов, возвращаем пустое состояние
  if (accessibleProjects.length === 0) {
    console.log('[dashboard/data] No accessible projects found, returning empty state');
    return {
      state: 'empty',
      source: 'projects-core',
      lastUpdated: generatedAt
    };
  }

  // Если есть проекты, но нет задач, показываем виджет с нулевыми значениями
  if (tasks.length === 0) {
    console.log('[dashboard/data] No tasks found, but projects exist, returning content with zeros');
    return {
      state: 'content',
      source: 'projects-core',
      lastUpdated: generatedAt,
      payload: {
        summary: {
          overdue: 0,
          dueSoon: 0,
          blockers: 0,
          activeSprints: 0
        },
        spotlight: []
      }
    };
  }

  const dueSoonThreshold = now + 7 * 24 * 60 * 60 * 1000;
  const overdueTasks = tasks.filter((task) => {
    if (task.status === 'done') return false;
    const due = task.dueAt ? new Date(task.dueAt).getTime() : Number.NaN;
    return Number.isFinite(due) && due < now;
  });
  const dueSoonTasks = tasks.filter((task) => {
    if (task.status === 'done') return false;
    const due = task.dueAt ? new Date(task.dueAt).getTime() : Number.NaN;
    return Number.isFinite(due) && due >= now && due <= dueSoonThreshold;
  });

  const dependencies = taskDependenciesRepository.list();
  const blockedByDependencies = dependencies
    .filter((dep) => accessibleTaskIds.has(dep.dependentTaskId))
    .map((dep) => dep.dependentTaskId);

  const blockedSet = new Set<string>();
  tasks.forEach((task) => {
    if (task.status === 'blocked') {
      blockedSet.add(task.id);
    }
  });
  blockedByDependencies.forEach((id) => blockedSet.add(id));

  const activeSprints = new Set(
    tasks.filter((task) => task.iterationId && task.status !== 'done').map((task) => task.iterationId!)
  ).size;

  const projectKeyMap = new Map(
    accessibleProjects.map((project) => [project.id, project.key ?? project.title ?? ''])
  );

  const spotlightCandidates = [
    ...overdueTasks.map((task) => ({ task, risk: 'overdue' as const })),
    ...dueSoonTasks.map((task) => ({ task, risk: 'warning' as const }))
  ];

  const seen = new Set<string>();
  const spotlight = spotlightCandidates
    .sort((a, b) => {
      const orderA = a.risk === 'overdue' ? 0 : 1;
      const orderB = b.risk === 'overdue' ? 0 : 1;
      if (orderA !== orderB) return orderA - orderB;
      const dueA = a.task.dueAt ? new Date(a.task.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const dueB = b.task.dueAt ? new Date(b.task.dueAt).getTime() : Number.POSITIVE_INFINITY;
      return dueA - dueB;
    })
    .filter(({ task }) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    })
    .slice(0, 5)
    .map(({ task, risk }) => {
      const projectKey = projectKeyMap.get(task.projectId);
      const label = projectKey ? `${projectKey}-${task.number}` : `#${task.number}`;
      return {
        title: `${label}: ${task.title}`,
        due: formatDueLabel(task.dueAt),
        risk
      };
    });

  return {
    state: 'content',
    source: 'projects-core',
    lastUpdated: generatedAt,
    payload: {
      summary: {
        overdue: overdueTasks.length,
        dueSoon: dueSoonTasks.length,
        blockers: blockedSet.size,
        activeSprints
      },
      spotlight
    }
  };
}

function buildPlaceholderData(source: string): WidgetData {
  return {
    state: 'content',
    source,
    lastUpdated: new Date().toISOString()
  };
}

export async function GET(request: NextRequest) {
  if (!flags.WORKSPACE_DASHBOARD) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  // Ждём гидратацию данных из PostgreSQL и проверяем наличие тестового проекта
  await ensureTestProject(auth.userId, auth.email);

  const requested = parseRequestedWidgets(request.nextUrl.searchParams.get('widgets'));
  const widgets: Partial<Record<WidgetType, WidgetData>> = {};

  console.log('[dashboard/data] GET request:', {
    userId: auth.userId,
    email: auth.email,
    requestedWidgets: requested
  });

  for (const type of requested) {
    try {
      if (type === 'projects-tasks') {
        widgets[type] = await buildProjectsTasksData(auth.userId, auth.email);
      } else {
        widgets[type] = buildPlaceholderData('dashboard-mock');
      }
    } catch (error) {
      console.error('[dashboard/data] Failed to load widget', type, error);
      widgets[type] = {
        state: 'error',
        error: 'Не удалось загрузить данные виджета',
        source: type,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  const response: DashboardDataResponse = {
    widgets,
    requested,
    generatedAt: new Date().toISOString()
  };

  return jsonOk(response);
}

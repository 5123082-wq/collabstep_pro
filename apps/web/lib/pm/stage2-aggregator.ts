import {
  marketplaceListingsRepository,
  projectsRepository,
  tasksRepository,
  memory,
  isAdminUserId,
  type Project as ApiProject,
  type ProjectMember as ApiProjectMember,
  type Task
} from '@collabverse/api';
import type { Project } from '@/types/pm';
import { DEFAULT_PROJECT_FILTERS, type ProjectListFilters, type ProjectScope } from './filters';

export type ProjectsOverviewOwner = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

export type TaskMetrics = {
  total: number;
  inProgress: number;
  overdue: number;
  completed: number;
  activity7d: number;
  progressPct: number;
};

const STATUS_TO_FRONT: Record<string, Project['status']> = {
  draft: 'DRAFT',
  active: 'ACTIVE',
  on_hold: 'ON_HOLD',
  completed: 'COMPLETED',
  archived: 'ARCHIVED'
};

const FRONT_TO_API_STATUS: Record<Project['status'], string> = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

const MEMBER_ROLE_MAP: Record<ApiProjectMember['role'] | 'owner', Project['members'][number]['role']> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  member: 'MEMBER',
  viewer: 'GUEST'
};

export type InternalFilters = Omit<ProjectListFilters, 'scope'> & {
  scope: ProjectScope;
};

export type Stage2ProjectEntry = {
  project: ApiProject;
  members: ApiProjectMember[];
  metrics: TaskMetrics;
};

export type Stage2Context = {
  normalizedFilters: InternalFilters;
  entries: Stage2ProjectEntry[];
  ownersMap: Map<string, ProjectsOverviewOwner>;
  tasksByProject: Map<string, Task[]>;
};

export type Stage2CollectionOptions = {
  workspaceId?: string | null;
  projectId?: string | null;
};

export function toFrontStatus(status: string): Project['status'] {
  return STATUS_TO_FRONT[status] ?? 'ACTIVE';
}

export function toApiStatus(status?: Project['status']): string | undefined {
  if (!status) {
    return undefined;
  }
  return FRONT_TO_API_STATUS[status] ?? status.toLowerCase();
}

export function buildTaskMetrics(tasks: Task[]): Map<string, TaskMetrics> {
  const metrics = new Map<string, TaskMetrics>();
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  for (const task of tasks) {
    const entry =
      metrics.get(task.projectId) ??
      ({
        total: 0,
        inProgress: 0,
        overdue: 0,
        completed: 0,
        activity7d: 0,
        progressPct: 0
      } satisfies TaskMetrics);

    entry.total += 1;

    if (task.status === 'done') {
      entry.completed += 1;
    } else if (task.status === 'in_progress' || task.status === 'review') {
      entry.inProgress += 1;
    }

    const dueRaw = task.dueAt;
    if (dueRaw) {
      const dueTime = new Date(dueRaw).getTime();
      if (!Number.isNaN(dueTime) && dueTime < now && task.status !== 'done') {
        entry.overdue += 1;
      }
    }

    const updatedAt = task.updatedAt ?? task.createdAt;
    if (updatedAt) {
      const updatedTime = new Date(updatedAt).getTime();
      if (!Number.isNaN(updatedTime) && updatedTime >= sevenDaysAgo) {
        entry.activity7d += 1;
      }
    }

    metrics.set(task.projectId, entry);
  }

  for (const [projectId, entry] of metrics.entries()) {
    entry.progressPct =
      entry.total === 0 ? 0 : Math.min(100, Math.round((entry.completed / entry.total) * 100));
    metrics.set(projectId, entry);
  }

  return metrics;
}

export function groupTasksByProject(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const bucket = map.get(task.projectId) ?? [];
    bucket.push(task);
    map.set(task.projectId, bucket);
  }
  return map;
}

export function mapMembers(apiMembers: ApiProjectMember[], ownerId: string): Project['members'] {
  const withOwner = apiMembers.some((member) => member.userId === ownerId)
    ? apiMembers
    : [...apiMembers, { userId: ownerId, role: 'owner' }];

  return withOwner.map((member) => {
    // Получаем имя пользователя из memory
    const user = memory.WORKSPACE_USERS.find(u => u.id === member.userId);
    const userName = user?.name || undefined;
    const avatarUrl = user?.avatarUrl || undefined;

    return {
      userId: member.userId,
      role: (member.role in MEMBER_ROLE_MAP ? MEMBER_ROLE_MAP[member.role as keyof typeof MEMBER_ROLE_MAP] : undefined) ?? 'MEMBER',
      ...(userName ? { name: userName } : {}),
      ...(avatarUrl ? { avatarUrl } : {})
    };
  });
}

export type ProjectPermissions = {
  canView: boolean;
  canCreateTask: boolean;
  canCreateExpense: boolean;
  isOwner: boolean;
};

export function resolvePermissions(
  project: ApiProject,
  currentUserId: string,
  members: ApiProjectMember[]
): ProjectPermissions {
  const isOwner = project.ownerId === currentUserId;
  const membership = members.find((member) => member.userId === currentUserId) ?? null;
  const effectiveRole = isOwner ? 'owner' : membership?.role ?? 'viewer';
  const canCreateTask = ['owner', 'admin', 'member'].includes(effectiveRole);
  const canCreateExpense = ['owner', 'admin', 'member'].includes(effectiveRole);

  return {
    canView: true,
    canCreateTask,
    canCreateExpense,
    isOwner
  };
}

export function transformProject(
  project: ApiProject,
  members: ApiProjectMember[],
  metrics: TaskMetrics,
  owner: ProjectsOverviewOwner | null
): Project {
  const resolvedMetrics = metrics ?? {
    total: 0,
    inProgress: 0,
    overdue: 0,
    completed: 0,
    activity7d: 0,
    progressPct: 0
  };

  const listing = marketplaceListingsRepository.findByProjectId(project.id);

  return {
    id: project.id,
    name: project.title,
    key: project.key,
    status: toFrontStatus(project.status),
    ownerId: project.ownerId,
    members: mapMembers(members, project.ownerId),
    workspaceId: project.workspaceId,
    startDate: project.createdAt,
    ...(project.deadline ? { dueDate: project.deadline } : {}),
    metrics: {
      total: resolvedMetrics.total,
      inProgress: resolvedMetrics.inProgress,
      overdue: resolvedMetrics.overdue,
      progressPct: resolvedMetrics.progressPct,
      activity7d: resolvedMetrics.activity7d,
      ...(project.budgetSpent !== null ? { budgetUsed: Number(project.budgetSpent) } : {}),
      ...(project.budgetPlanned !== null ? { budgetLimit: Number(project.budgetPlanned) } : {})
    },
    ...(listing
      ? {
        marketplace: {
          listingId: listing.id,
          state:
            listing.state === 'draft' || listing.state === 'published' || listing.state === 'rejected'
              ? listing.state
              : 'draft'
        }
      }
      : {
        marketplace: {
          state: 'none' as const
        }
      }),
    ...(owner ? { owner } : {})
  } as Project;
}

export function applyPermissions(
  project: Project,
  permissions: ProjectPermissions
): Project & { permissions: ProjectPermissions } {
  return {
    ...project,
    permissions
  };
}

export function normalizeFilters(filters: Partial<ProjectListFilters>): InternalFilters {
  const merged = {
    ...DEFAULT_PROJECT_FILTERS,
    ...filters
  };

  const result: InternalFilters = {
    page: merged.page ?? DEFAULT_PROJECT_FILTERS.page,
    pageSize: merged.pageSize ?? DEFAULT_PROJECT_FILTERS.pageSize,
    sortBy: merged.sortBy ?? 'updated',
    sortOrder: merged.sortOrder ?? 'desc',
    scope: merged.scope ?? 'owned'
  };

  if (merged.status !== undefined) result.status = merged.status;
  if (merged.ownerId !== undefined) result.ownerId = merged.ownerId;
  if (merged.memberId !== undefined) result.memberId = merged.memberId;
  if (merged.q !== undefined) result.q = merged.q;

  return result;
}

export function sortProjects(
  projects: Stage2ProjectEntry[],
  filters: InternalFilters
): Stage2ProjectEntry[] {
  const { sortBy = 'updated', sortOrder = 'desc' } = filters;
  return projects.sort((aEntry, bEntry) => {
    const a = aEntry.project;
    const b = bEntry.project;
    const direction = sortOrder === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'dueDate': {
        const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
        return (aTime - bTime) * direction;
      }
      case 'progress': {
        const aProgress = aEntry.metrics.progressPct;
        const bProgress = bEntry.metrics.progressPct;
        return (aProgress - bProgress) * direction;
      }
      case 'updated':
      default: {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return (aTime - bTime) * direction;
      }
    }
  });
}

/**
 * Получает список workspaceId, к которым принадлежит пользователь
 */
function getUserWorkspaceIds(userId: string): Set<string> {
  const workspaceIds = new Set<string>();

  // Администраторы имеют доступ ко всем workspace
  if (isAdminUserId(userId)) {
    return workspaceIds; // Пустой Set означает "все workspace"
  }

  // Ищем пользователя во всех workspace
  for (const [workspaceId, members] of Object.entries(memory.WORKSPACE_MEMBERS)) {
    if (members.some((member) => member.userId === userId)) {
      workspaceIds.add(workspaceId);
    }
  }

  return workspaceIds;
}

export function collectStage2Projects(
  currentUserId: string,
  filters: Partial<ProjectListFilters> = {},
  options: Stage2CollectionOptions = {}
): Stage2Context {
  const normalizedFilters = normalizeFilters(filters);
  const allTasks = tasksRepository.list();
  const metricsMap = buildTaskMetrics(allTasks);
  const tasksByProject = groupTasksByProject(allTasks);

  // Получаем workspaceId пользователя
  const userWorkspaceIds = getUserWorkspaceIds(currentUserId);
  const isAdmin = isAdminUserId(currentUserId);

  // Если указан конкретный workspaceId в options, используем его
  // Иначе фильтруем по workspaceId пользователя (если не админ)
  let projectsFilter: { workspaceId?: string } | undefined = undefined;
  if (typeof options.workspaceId === 'string') {
    projectsFilter = { workspaceId: options.workspaceId };
  } else if (!isAdmin && userWorkspaceIds.size > 0) {
    // Для не-админов фильтруем проекты по их workspace
    // Но projectsRepository.list() принимает только один workspaceId,
    // поэтому нам нужно получить все проекты и отфильтровать вручную
    projectsFilter = undefined; // Получим все проекты, затем отфильтруем
  }

  const allProjects = projectsRepository.list(projectsFilter);
  const ownersMap = new Map<string, ProjectsOverviewOwner>();
  const membersCache = new Map<string, ApiProjectMember[]>();

  const search = normalizedFilters.q?.trim().toLowerCase() ?? '';
  const apiStatus = toApiStatus(normalizedFilters.status);

  // Логирование для отладки
  if (normalizedFilters.status) {
    console.log(`[collectStage2Projects] Filtering by status: ${normalizedFilters.status} -> ${apiStatus}`);
  }

  const entries: Stage2ProjectEntry[] = [];

  for (const project of allProjects) {
    if (options.projectId && project.id !== options.projectId) {
      continue;
    }

    // Проверяем, является ли пользователь владельцем проекта
    const isOwner = project.ownerId === currentUserId;

    // Фильтрация по workspaceId пользователя (если не админ и не указан конкретный workspaceId в options)
    // Владельцы проектов всегда видят свои проекты, независимо от workspace
    // Даже публичные проекты фильтруются по workspace - пользователь должен быть членом workspace проекта
    if (!isAdmin && !isOwner && options.workspaceId === undefined && userWorkspaceIds.size > 0) {
      if (!userWorkspaceIds.has(project.workspaceId)) {
        continue;
      }
    }

    if (!projectsRepository.hasAccess(project.id, currentUserId)) {
      continue;
    }

    const members =
      membersCache.get(project.id) ?? projectsRepository.listMembers(project.id) ?? [];
    membersCache.set(project.id, members);

    // isOwner уже определен выше для фильтрации по workspace
    const membership = members.find((member) => member.userId === currentUserId) ?? null;

    if (normalizedFilters.scope === 'owned' && !isOwner) {
      continue;
    }

    if (normalizedFilters.scope === 'member') {
      if (isOwner) {
        continue;
      }
      if (!membership) {
        continue;
      }
    }

    if (normalizedFilters.ownerId && project.ownerId !== normalizedFilters.ownerId) {
      continue;
    }

    if (normalizedFilters.memberId) {
      const hasMember = members.some((member) => member.userId === normalizedFilters.memberId);
      if (!hasMember) {
        continue;
      }
    }

    // Фильтрация по статусу
    if (apiStatus) {
      // Если статус явно указан, фильтруем по нему
      if (project.status !== apiStatus) {
        if (normalizedFilters.status) {
          console.log(`[collectStage2Projects] Project ${project.id} (${project.title}) status ${project.status} doesn't match filter ${apiStatus}`);
        }
        continue;
      }
    } else {
      // Если статус не указан, исключаем архивные проекты по умолчанию
      if (project.status === 'archived' || project.archived === true) {
        continue;
      }
    }

    if (search) {
      const titleMatch = project.title.toLowerCase().includes(search);
      const keyMatch = project.key.toLowerCase().includes(search);
      if (!titleMatch && !keyMatch) {
        continue;
      }
    }

    // Direct memory access for sync operation (same approach as project-catalog-service)
    const ownerProfile = memory.WORKSPACE_USERS.find(u => u.id === project.ownerId);
    if (ownerProfile) {
      ownersMap.set(project.ownerId, {
        id: ownerProfile.id,
        name: ownerProfile.name,
        email: ownerProfile.email,
        ...(ownerProfile.avatarUrl !== undefined && { avatarUrl: ownerProfile.avatarUrl })
      });
    } else if (!ownersMap.has(project.ownerId)) {
      ownersMap.set(project.ownerId, {
        id: project.ownerId,
        name: project.ownerId
      });
    }

    entries.push({
      project,
      members,
      metrics: metricsMap.get(project.id) ?? {
        total: 0,
        inProgress: 0,
        overdue: 0,
        completed: 0,
        activity7d: 0,
        progressPct: 0
      }
    });
  }

  return {
    normalizedFilters,
    entries,
    ownersMap,
    tasksByProject
  };
}



import { DEFAULT_WORKSPACE_USER_ID, memory } from '../data/memory';
import { projectsRepository } from '../repositories/projects-repository';
import { tasksRepository } from '../repositories/tasks-repository';
import { templatesRepository } from '../repositories/templates-repository';

import { workspacesRepository } from '../repositories/workspaces-repository';
import type {
  CatalogProject,
  ProjectCard,
  ProjectCardFilters,
  ProjectCardMember,
  ProjectCardOwner,
  ProjectCardStatus,
  ProjectCardTaskStats,
  ProjectMember,
  ProjectStatus,
  ProjectTemplate,
  ProjectType,
  ProjectVisibility,
  WorkspaceUser
} from '../types';

export type CatalogProjectItem = CatalogProject;
export type CatalogTemplateItem = ProjectTemplate;
export type ProjectCardItem = ProjectCard;

export type ProjectCardTab = 'all' | 'mine' | 'member';

export type ProjectCardSort =
  | 'updated-desc'
  | 'updated-asc'
  | 'deadline-asc'
  | 'deadline-desc'
  | 'progress-desc'
  | 'progress-asc'
  | 'alphabetical';

interface InternalProjectCardFilters extends ProjectCardFilters {
  status: 'all' | ProjectCardStatus;
  ownerIds: string[];
  memberIds: string[];
  tags: string[];
  dateField: 'createdAt' | 'deadline';
  dateFrom: string | null;
  dateTo: string | null;
  workspaceIds: string[];
  visibility: ProjectVisibility | 'all';
  types: ProjectType[];
}

function deduplicateLabels(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const set = new Set<string>();
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      set.add(value.trim());
    }
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b, 'ru'));
}

export class ProjectCatalogService {
  async getProjects(options: { archived?: boolean | null; currentUserId?: string } = {}): Promise<CatalogProjectItem[]> {
    const tasks = tasksRepository.list();
    const aggregation = new Map<string, { count: number; labels: Set<string> }>();
    for (const task of tasks) {
      const entry = aggregation.get(task.projectId);
      if (!entry) {
        aggregation.set(task.projectId, {
          count: 1,
          labels: new Set(deduplicateLabels(task.labels))
        });
      } else {
        entry.count += 1;
        for (const label of deduplicateLabels(task.labels)) {
          entry.labels.add(label);
        }
      }
    }

    const currentUserId = options.currentUserId ?? DEFAULT_WORKSPACE_USER_ID;
    const projects = projectsRepository.list({
      archived: options.archived ?? null
    });

    const filteredProjects = [];
    for (const project of projects) {
      // For private projects, check if user has access
      if (project.visibility === 'private') {
        const hasAccess = await projectsRepository.hasAccess(project.id, currentUserId);
        if (!hasAccess) {
          continue;
        }
      }
      // Public projects are accessible to everyone
      const stats = aggregation.get(project.id);
      filteredProjects.push({
        ...project,
        tasksCount: stats?.count ?? 0,
        labels: stats ? Array.from(stats.labels.values()).sort((a, b) => a.localeCompare(b, 'ru')) : []
      });
    }

    return filteredProjects;
  }

  getTemplates(): CatalogTemplateItem[] {
    return templatesRepository.list();
  }

  async getProjectCards(params: {
    tab: ProjectCardTab;
    currentUserId?: string;
    query?: string | null;
    sort?: ProjectCardSort | null;
    filters?: ProjectCardFilters | null;
    page?: number | null;
    pageSize?: number | null;
  }): Promise<{ items: ProjectCardItem[]; total: number }> {
    const currentUserId = params.currentUserId ?? DEFAULT_WORKSPACE_USER_ID;
    const filters: InternalProjectCardFilters = {
      status: params.filters?.status ?? 'all',
      ownerIds: Array.isArray(params.filters?.ownerIds) ? params.filters?.ownerIds.filter(Boolean) : [],
      memberIds: Array.isArray(params.filters?.memberIds) ? params.filters?.memberIds.filter(Boolean) : [],
      tags: Array.isArray(params.filters?.tags) ? params.filters?.tags.filter(Boolean) : [],
      dateField: params.filters?.dateField === 'deadline' ? 'deadline' : 'createdAt',
      dateFrom: params.filters?.dateFrom ?? null,
      dateTo: params.filters?.dateTo ?? null,
      workspaceIds: Array.isArray(params.filters?.workspaceIds)
        ? params.filters?.workspaceIds.filter(Boolean)
        : [],
      visibility:
        params.filters?.visibility === 'public' || params.filters?.visibility === 'private'
          ? params.filters.visibility
          : 'all',
      types: Array.isArray(params.filters?.types)
        ? (params.filters.types.filter((item): item is ProjectType =>
          typeof item === 'string' &&
          ['product', 'marketing', 'operations', 'service', 'internal'].includes(item)
        ) as ProjectType[])
        : []
    };

    const projects = projectsRepository.list();
    const tasksByProject = new Map<string, ProjectCardTaskStats & { labels: Set<string> }>();
    const tasks = tasksRepository.list();
    const now = Date.now();

    for (const task of tasks) {
      const entry = tasksByProject.get(task.projectId);
      const overdue =
        task.dueAt && task.status !== 'done' ? new Date(task.dueAt).getTime() < now : false;
      const important = task.priority === 'high';
      const completed = task.status === 'done';
      const labels = deduplicateLabels(task.labels);

      if (!entry) {
        tasksByProject.set(task.projectId, {
          total: 1,
          overdue: overdue ? 1 : 0,
          important: important ? 1 : 0,
          completed: completed ? 1 : 0,
          labels: new Set(labels)
        });
      } else {
        entry.total += 1;
        if (overdue) {
          entry.overdue += 1;
        }
        if (important) {
          entry.important += 1;
        }
        if (completed) {
          entry.completed += 1;
        }
        for (const label of labels) {
          entry.labels.add(label);
        }
      }
    }

    const membershipCache = new Map<string, ProjectCardMember[]>();

    const resolveUser = (userId: string): WorkspaceUser => {
      // Direct memory access for sync operation
      const user = memory.WORKSPACE_USERS.find(u => u.id === userId);
      return user ?? {
        id: userId,
        name: userId,
        email: userId
      };
    };

    const toMember = (userId: string, role: ProjectCardMember['role']): ProjectCardMember => {
      const profile = resolveUser(userId);
      return {
        ...profile,
        role
      };
    };

    const buildMembers = async (
      projectId: string,
      ownerId: string,
      rawMembers?: ProjectMember[]
    ): Promise<ProjectCardMember[]> => {
      const cached = membershipCache.get(projectId);
      if (cached) {
        return cached;
      }
      const source = rawMembers ?? await projectsRepository.listMembers(projectId);
      const members = source
        .filter((member) => member.userId !== ownerId)
        .map((member) => toMember(member.userId, member.role));
      membershipCache.set(projectId, members);
      return members;
    };

    const workspaces = new Map(workspacesRepository.list().map((workspace) => [workspace.id, workspace]));

    const cards: ProjectCardItem[] = [];
    for (const project of projects) {
      const ownerProfile = resolveUser(project.ownerId);
      const owner: ProjectCardOwner = { ...ownerProfile };
      const rawMembers = await projectsRepository.listMembers(project.id);
      const members = await buildMembers(project.id, project.ownerId, rawMembers);
      const isOwner =
        project.ownerId === currentUserId ||
        rawMembers.some((member) => member.role === 'owner' && member.userId === currentUserId);
      const isParticipant = rawMembers.some(
        (member) => member.userId === currentUserId && member.role !== 'viewer'
      );
      const membership = rawMembers.find((member) => member.userId === currentUserId) ?? null;
      const effectiveRole = membership?.role ?? (project.ownerId === currentUserId ? 'owner' : null);
      const canInvite = effectiveRole === 'owner' || effectiveRole === 'admin';
      const canCreateTask =
        effectiveRole === 'owner' ||
        effectiveRole === 'admin' ||
        effectiveRole === 'member';
      const canView = Boolean(effectiveRole) || project.ownerId === currentUserId;

      if (params.tab === 'mine') {
        if (!isOwner) {
          continue;
        }
      } else if (params.tab === 'member') {
        if (!isParticipant || isOwner) {
          continue;
        }
      } else if (params.tab === 'all') {
        // 'all' shows both owned and participant projects
        if (!isOwner && !isParticipant) {
          continue;
        }
      }

      const stats = tasksByProject.get(project.id);
      const total = stats?.total ?? 0;
      const completed = stats?.completed ?? 0;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      const tags = stats ? Array.from(stats.labels.values()).sort((a, b) => a.localeCompare(b, 'ru')) : [];
      const status: ProjectStatus = project.archived ? 'archived' : 'active';

      const workspace = workspaces.get(project.workspaceId);
      const card: ProjectCardItem = {
        id: project.id,
        workspace: {
          id: project.workspaceId,
          name: workspace?.name ?? 'Рабочее пространство'
        },
        title: project.title,
        description: project.description ?? '',
        visibility: project.visibility,
        status,
        owner,
        members,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        tags,
        progress,
        tasks: {
          total,
          overdue: stats?.overdue ?? 0,
          important: stats?.important ?? 0,
          completed
        },
        budget: {
          planned: project.budgetPlanned !== null ? project.budgetPlanned.toFixed(2) : null,
          spent: project.budgetSpent !== null ? project.budgetSpent.toFixed(2) : null
        },
        permissions: {
          // [PLAN:S2-111] Быстрые действия синхронизированы с ACL участников.
          canArchive: project.ownerId === currentUserId,
          canInvite,
          canCreateTask,
          canView
        }
      };

      if (project.type) {
        card.type = project.type;
      }

      if (project.workflowId) {
        card.workflowId = project.workflowId;
      }

      if (project.deadline) {
        card.deadline = project.deadline;
      }

      if (project.stage) {
        card.stage = project.stage;
      }

      const matchesStatus =
        filters.status === 'all' || (filters.status === 'archived' ? project.archived : !project.archived);
      if (!matchesStatus) {
        continue;
      }

      if (filters.ownerIds.length > 0 && !filters.ownerIds.includes(project.ownerId)) {
        continue;
      }

      if (filters.workspaceIds.length > 0 && !filters.workspaceIds.includes(project.workspaceId)) {
        continue;
      }

      if (filters.visibility !== 'all' && project.visibility !== filters.visibility) {
        continue;
      }

      if (filters.types.length > 0) {
        const projectType = project.type ?? 'internal';
        if (!filters.types.includes(projectType as ProjectType)) {
          continue;
        }
      }

      if (filters.memberIds.length > 0) {
        const hasMember = members.some((member) => filters.memberIds.includes(member.id));
        if (!hasMember) {
          continue;
        }
      }

      if (filters.tags.length > 0) {
        const hasTag = filters.tags.some((tag) => card.tags.includes(tag));
        if (!hasTag) {
          continue;
        }
      }

      if (filters.dateFrom || filters.dateTo) {
        const targetDateRaw = filters.dateField === 'deadline' ? project.deadline : project.createdAt;
        if (!targetDateRaw) {
          continue;
        }
        const targetTime = new Date(targetDateRaw).getTime();
        if (Number.isNaN(targetTime)) {
          continue;
        }
        if (filters.dateFrom) {
          const fromTime = new Date(filters.dateFrom).getTime();
          if (!Number.isNaN(fromTime) && targetTime < fromTime) {
            continue;
          }
        }
        if (filters.dateTo) {
          const toTime = new Date(filters.dateTo).getTime();
          if (!Number.isNaN(toTime) && targetTime > toTime) {
            continue;
          }
        }
      }

      if (params.query) {
        const normalized = params.query.trim().toLowerCase();
        if (normalized) {
          const inTitle = project.title.toLowerCase().includes(normalized);
          const inDescription = (project.description ?? '').toLowerCase().includes(normalized);
          if (!inTitle && !inDescription) {
            continue;
          }
        }
      }

      const isPrivate = project.visibility === 'private';
      const isMember =
        project.ownerId === currentUserId ||
        rawMembers.some((member) => member.userId === currentUserId);
      if (isPrivate && !isMember) {
        continue;
      }

      cards.push(card);
    }

    const sortKey: ProjectCardSort = params.sort ?? 'updated-desc';
    const sorted = [...cards];

    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'updated-asc':
          return a.updatedAt.localeCompare(b.updatedAt);
        case 'deadline-asc': {
          const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
          const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
          return aTime - bTime;
        }
        case 'deadline-desc': {
          const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.NEGATIVE_INFINITY;
          const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.NEGATIVE_INFINITY;
          return bTime - aTime;
        }
        case 'progress-asc':
          return a.progress - b.progress;
        case 'progress-desc':
          return b.progress - a.progress;
        case 'alphabetical':
          return a.title.localeCompare(b.title, 'ru');
        case 'updated-desc':
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });

    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : sorted.length || 1;
    const page = params.page && params.page > 0 ? params.page : 1;
    const offset = (page - 1) * pageSize;

    return {
      items: sorted.slice(offset, offset + pageSize),
      total: sorted.length
    };
  }
}

export const projectCatalogService = new ProjectCatalogService();

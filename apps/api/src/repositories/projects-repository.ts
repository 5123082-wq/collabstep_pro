import { memory, isAdminUserId } from '../data/memory';
import type { Project, ProjectMember, ProjectStage, ProjectStatus, ProjectType, ProjectVisibility } from '../types';

function cloneProject(project: Project): Project {
  return { ...project };
}

function normalizeBudgetValue(value: unknown): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) {
      return null;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export class ProjectsRepository {
  list(options: { archived?: boolean | null; workspaceId?: string | null } = {}): Project[] {
    const { archived = null, workspaceId = null } = options;
    let items = memory.PROJECTS;
    if (typeof workspaceId === 'string' && workspaceId.trim()) {
      const targetWorkspaceId = workspaceId.trim();
      items = items.filter((project) => project.workspaceId === targetWorkspaceId);
    }
    if (archived !== null) {
      items = items.filter((project) => project.archived === archived);
    }
    return items.map(cloneProject);
  }

  findById(id: string): Project | null {
    const project = memory.PROJECTS.find((item) => item.id === id);
    if (!project) {
      console.log(`[ProjectsRepository] Project not found by ID: ${id}, totalProjects=${memory.PROJECTS.length}, projectIds=[${memory.PROJECTS.map(p => p.id).join(', ')}]`);
    }
    return project ? cloneProject(project) : null;
  }

  getMember(projectId: string, userId: string): ProjectMember | null {
    const members = memory.PROJECT_MEMBERS[projectId] ?? [];
    return members.find((member) => member.userId === userId) ?? null;
  }

  listMembers(projectId: string): ProjectMember[] {
    return (memory.PROJECT_MEMBERS[projectId] ?? []).map((member) => ({ ...member }));
  }

  upsertMember(projectId: string, userId: string, role: ProjectMember['role']): ProjectMember {
    const members = memory.PROJECT_MEMBERS[projectId] ?? [];
    const index = members.findIndex((item) => item.userId === userId);
    const member: ProjectMember = { userId, role };
    if (index === -1) {
      members.push(member);
    } else {
      members[index] = member;
    }
    memory.PROJECT_MEMBERS[projectId] = members;
    return { ...member };
  }

  removeMember(projectId: string, userId: string): boolean {
    const members = memory.PROJECT_MEMBERS[projectId];
    if (!members) {
      return false;
    }
    const index = members.findIndex((item) => item.userId === userId);
    if (index === -1) {
      return false;
    }
    members.splice(index, 1);
    if (members.length === 0) {
      delete memory.PROJECT_MEMBERS[projectId];
    } else {
      memory.PROJECT_MEMBERS[projectId] = members;
    }
    return true;
  }

  hasAccess(projectId: string, userId: string): boolean {
    const project = this.findById(projectId);
    if (!project) {
      return false;
    }

    // Administrators have access to all projects
    if (isAdminUserId(userId)) {
      return true;
    }

    // Public projects are accessible to everyone
    if (project.visibility === 'public') {
      return true;
    }
    // Private projects are only accessible to members
    if (project.visibility === 'private') {
      const isOwner = project.ownerId === userId;
      const isMember = this.getMember(projectId, userId) !== null;
      const hasAccess = isOwner || isMember;
      // Логирование для отладки
      if (!hasAccess) {
        console.log(`[ProjectsRepository] Access denied: projectId=${projectId}, userId=${userId}, ownerId=${project.ownerId}, isOwner=${isOwner}, isMember=${isMember}`);
      }
      return hasAccess;
    }
    return false;
  }

  /**
   * Generates a unique project key for a workspace
   * Format: uppercase letters (e.g., "PROJ", "ABC")
   */
  private generateProjectKey(workspaceId: string, requestedKey?: string, title?: string): string {
    // If key is provided, validate uniqueness
    if (requestedKey && typeof requestedKey === 'string') {
      const normalizedKey = requestedKey.trim().toUpperCase();
      if (normalizedKey.length >= 2 && normalizedKey.length <= 10) {
        const isUnique = !memory.PROJECTS.some(
          (p) => p.workspaceId === workspaceId && p.key === normalizedKey
        );
        if (isUnique) {
          return normalizedKey;
        }
      }
    }

    // Generate automatic key based on project title
    // Extract first letters from title and make uppercase
    let baseKey = 'PROJ';
    if (title && typeof title === 'string') {
      const titleWords = title.split(/\s+/).filter((w) => w.length > 0);
      if (titleWords.length > 0) {
        baseKey = titleWords
          .slice(0, 4)
          .map((w) => w[0]?.toUpperCase() || '')
          .join('')
          .slice(0, 10);
        // Ensure it's at least 2 characters
        if (baseKey.length < 2) {
          baseKey = 'PROJ';
        }
      }
    }

    // Ensure uniqueness by appending number if needed
    let key = baseKey;
    let counter = 1;
    while (memory.PROJECTS.some((p) => p.workspaceId === workspaceId && p.key === key)) {
      key = `${baseKey}${counter}`;
      counter++;
    }

    return key;
  }

  create(payload: {
    title: string;
    description?: string;
    ownerId: string;
    workspaceId: string;
    key?: string; // Optional project key
    status?: ProjectStatus; // Optional status, defaults to 'draft'
    stage?: ProjectStage;
    deadline?: string;
    type?: ProjectType;
    visibility?: ProjectVisibility;
    workflowId?: string;
    budgetPlanned?: number | string | null;
    budgetSpent?: number | string | null;
  }): Project {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const workflowId = payload.workflowId ?? `wf-${id}`;
    const allowedTypes: ProjectType[] = ['product', 'marketing', 'operations', 'service', 'internal'];
    const type = payload.type && allowedTypes.includes(payload.type) ? payload.type : undefined;

    const visibility: ProjectVisibility = payload.visibility === 'public' ? 'public' : 'private';
    const status: ProjectStatus = payload.status ?? 'draft';
    const key = this.generateProjectKey(payload.workspaceId, payload.key, payload.title);

    const budgetPlanned = normalizeBudgetValue(payload.budgetPlanned);
    const budgetSpent = normalizeBudgetValue(payload.budgetSpent);

    // Determine archived based on status for backward compatibility
    const archived = status === 'archived';

    const project: Project = {
      id,
      workspaceId: payload.workspaceId,
      key,
      title: payload.title,
      description: payload.description ?? '',
      ownerId: payload.ownerId,
      status,
      visibility,
      budgetPlanned,
      budgetSpent,
      workflowId,
      archived,
      createdAt: now,
      updatedAt: now,
      ...(payload.stage ? { stage: payload.stage } : {}),
      ...(payload.deadline ? { deadline: payload.deadline } : {})
    };

    if (type) {
      project.type = type;
    }
    memory.PROJECTS.push(project);
    console.log(`[ProjectsRepository] Created project: id=${project.id}, workspaceId=${project.workspaceId}, ownerId=${project.ownerId}, title=${project.title}, totalProjects=${memory.PROJECTS.length}`);

    return cloneProject(project);
  }

  update(
    id: string,
    patch: Partial<
      Pick<
        Project,
        | 'title'
        | 'description'
        | 'stage'
        | 'status'
        | 'key'
        | 'archived'
        | 'deadline'
        | 'type'
        | 'visibility'
        | 'workflowId'
        | 'budgetPlanned'
        | 'budgetSpent'
      >
    >
  ): Project | null {
    const idx = memory.PROJECTS.findIndex((item) => item.id === id);
    if (idx === -1) {
      return null;
    }
    const current = memory.PROJECTS[idx];
    if (!current) {
      return null;
    }

    const next: Project = {
      ...current,
      updatedAt: new Date().toISOString()
    };

    if (typeof patch.title === 'string' && patch.title.trim()) {
      next.title = patch.title.trim();
    }

    if (typeof patch.description === 'string') {
      next.description = patch.description;
    }

    if (typeof patch.stage === 'string' && patch.stage) {
      next.stage = patch.stage as ProjectStage;
    }

    if (
      typeof patch.type === 'string' &&
      ['product', 'marketing', 'operations', 'service', 'internal'].includes(patch.type)
    ) {
      next.type = patch.type as ProjectType;
    }

    if (patch.status && ['draft', 'active', 'on_hold', 'completed', 'archived'].includes(patch.status)) {
      next.status = patch.status as ProjectStatus;
      // Update archived for backward compatibility
      next.archived = patch.status === 'archived';
    }

    if (typeof patch.archived === 'boolean') {
      next.archived = patch.archived;
      // Update status for backward compatibility
      if (patch.archived && next.status !== 'archived') {
        next.status = 'archived';
      }
    }

    if (patch.key && typeof patch.key === 'string') {
      const normalizedKey = patch.key.trim().toUpperCase();
      // Validate uniqueness within workspace
      const isUnique = !memory.PROJECTS.some(
        (p) => p.id !== id && p.workspaceId === next.workspaceId && p.key === normalizedKey
      );
      if (isUnique && normalizedKey.length >= 2 && normalizedKey.length <= 10) {
        next.key = normalizedKey;
      }
    }

    if (patch.visibility === 'private' || patch.visibility === 'public') {
      next.visibility = patch.visibility;
    }

    if (typeof patch.workflowId === 'string' && patch.workflowId) {
      next.workflowId = patch.workflowId;
    }

    if ('deadline' in patch) {
      if (typeof patch.deadline === 'string' && patch.deadline) {
        next.deadline = patch.deadline;
      } else {
        delete next.deadline;
      }
    }

    if ('budgetPlanned' in patch) {
      next.budgetPlanned = normalizeBudgetValue(patch.budgetPlanned);
    }

    if ('budgetSpent' in patch) {
      next.budgetSpent = normalizeBudgetValue(patch.budgetSpent);
    }

    memory.PROJECTS[idx] = next;

    return cloneProject(next);
  }

  delete(id: string): boolean {
    const idx = memory.PROJECTS.findIndex((item) => item.id === id);
    if (idx === -1) {
      return false;
    }

    memory.PROJECTS.splice(idx, 1);
    memory.TASKS = memory.TASKS.filter((task) => task.projectId !== id);
    memory.ITERATIONS = memory.ITERATIONS.filter((iteration) => iteration.projectId !== id);
    delete memory.WORKFLOWS[id];
    delete memory.PROJECT_MEMBERS[id];

    return true;
  }

  archive(id: string): Project | null {
    return this.update(id, { status: 'archived', archived: true });
  }

  unarchive(id: string): Project | null {
    // When unarchiving, set status to 'active' by default
    return this.update(id, { status: 'active', archived: false });
  }

  findByKey(workspaceId: string, key: string): Project | null {
    const project = memory.PROJECTS.find(
      (item) => item.workspaceId === workspaceId && item.key === key.toUpperCase()
    );
    return project ? cloneProject(project) : null;
  }
}

export const projectsRepository = new ProjectsRepository();

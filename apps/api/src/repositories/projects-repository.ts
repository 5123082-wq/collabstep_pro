import { memory, isAdminUserId } from '../data/memory';
import type { Project, ProjectMember, ProjectStage, ProjectStatus, ProjectType, ProjectVisibility } from '../types';
import { pmPgHydration } from '../storage/pm-pg-bootstrap';
import {
  deleteProjectFromPg,
  fetchProjectByIdFromPg,
  fetchProjectByKeyFromPg,
  fetchProjectMembersFromPg,
  fetchProjectsFromPg,
  isPmDbEnabled,
  persistProjectMembersToPg,
  persistProjectToPg
} from '../storage/pm-pg-adapter';
import { cacheManager } from '../data/cache-manager';

// Fire-and-forget hydration; repositories stay sync for serverless lambdas without blocking CJS builds
void pmPgHydration;

const ALLOWED_PROJECT_STATUSES: ProjectStatus[] = ['active', 'on_hold', 'completed', 'archived'];

function normalizeProjectStatus(rawStatus: string | undefined | null): ProjectStatus {
  if (ALLOWED_PROJECT_STATUSES.includes(rawStatus as ProjectStatus)) {
    return rawStatus as ProjectStatus;
  }
  return 'active';
}

function normalizeProjectVisibility(rawVisibility: string | undefined | null): ProjectVisibility {
  return rawVisibility === 'public' ? 'public' : 'private';
}

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

function syncProjectIntoMemory(project: Project): void {
  const index = memory.PROJECTS.findIndex((item) => item.id === project.id);
  if (index === -1) {
    memory.PROJECTS.push(project);
    return;
  }
  memory.PROJECTS[index] = project;
}

export class ProjectsRepository {
  private normalizeProjectStorage(): void {
    let changed = false;
    for (const project of memory.PROJECTS) {
      const normalizedStatus = normalizeProjectStatus(project.status);
      const normalizedVisibility = normalizeProjectVisibility(project.visibility);
      if (project.status !== normalizedStatus) {
        project.status = normalizedStatus;
        changed = true;
      }
      if (project.visibility !== normalizedVisibility) {
        project.visibility = normalizedVisibility;
        changed = true;
      }
      if (project.archived && project.status !== 'archived') {
        project.archived = false;
        changed = true;
      }
    }
    if (changed && isPmDbEnabled()) {
      for (const project of memory.PROJECTS) {
        void persistProjectToPg(project).catch((error) =>
          console.error('[ProjectsRepository] Failed to persist normalized project', error)
        );
      }
    }
  }

  async list(options: { archived?: boolean | null; workspaceId?: string | null } = {}): Promise<Project[]> {
    const { archived = null, workspaceId = null } = options;
    
    // Если БД включена, используем cache-aside паттерн с TTL
    if (isPmDbEnabled()) {
      const cacheKey = workspaceId 
        ? `projects:workspace:${workspaceId}:archived:${archived ?? 'all'}`
        : `projects:all:archived:${archived ?? 'all'}`;
      
      const cached = cacheManager.getProjects(cacheKey);
      if (cached) {
        let items = cached;
        if (typeof workspaceId === 'string' && workspaceId.trim()) {
          const targetWorkspaceId = workspaceId.trim();
          items = items.filter((project) => project.workspaceId === targetWorkspaceId);
        }
        return items.map(cloneProject);
      }

      const dbProjects = await fetchProjectsFromPg(options);
      cacheManager.setProjects(cacheKey, dbProjects);
      for (const dbProject of dbProjects) {
        syncProjectIntoMemory(dbProject);
      }
      this.normalizeProjectStorage();
      return dbProjects.map(cloneProject);
    }
    
    // Fallback: читаем из памяти (для случаев когда БД не включена)
    this.normalizeProjectStorage();
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

  async findById(id: string): Promise<Project | null> {
    if (isPmDbEnabled()) {
      const dbProject = await fetchProjectByIdFromPg(id);
      if (!dbProject) {
        return null;
      }
      syncProjectIntoMemory(dbProject);
      memory.PROJECT_MEMBERS[dbProject.id] = await fetchProjectMembersFromPg(dbProject.id);
      this.normalizeProjectStorage();
      return cloneProject(dbProject);
    }

    this.normalizeProjectStorage();
    const project = memory.PROJECTS.find((item) => item.id === id);
    if (project) {
      return cloneProject(project);
    }

    console.log(`[ProjectsRepository] Project not found by ID: ${id}, totalProjects=${memory.PROJECTS.length}`);
    return null;
  }

  async getMember(projectId: string, userId: string): Promise<ProjectMember | null> {
    const members = await this.listMembers(projectId);
    return members.find((member) => member.userId === userId) ?? null;
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    if (isPmDbEnabled()) {
      const members = await fetchProjectMembersFromPg(projectId);
      memory.PROJECT_MEMBERS[projectId] = members;
      return members.map((member) => ({ ...member }));
    }

    if (memory.PROJECT_MEMBERS[projectId]) {
      return memory.PROJECT_MEMBERS[projectId].map((member) => ({ ...member }));
    }

    return [];
  }

  async upsertMember(projectId: string, userId: string, role: ProjectMember['role']): Promise<ProjectMember> {
    const members = isPmDbEnabled()
      ? await this.listMembers(projectId)
      : [...(memory.PROJECT_MEMBERS[projectId] ?? [])];
    const index = members.findIndex((item) => item.userId === userId);
    const member: ProjectMember = { userId, role };
    if (index === -1) {
      members.push(member);
    } else {
      members[index] = member;
    }
    memory.PROJECT_MEMBERS[projectId] = members;
    if (isPmDbEnabled()) {
      await persistProjectMembersToPg(projectId, members);
    }
    return { ...member };
  }

  async removeMember(projectId: string, userId: string): Promise<boolean> {
    const members = isPmDbEnabled()
      ? await this.listMembers(projectId)
      : [...(memory.PROJECT_MEMBERS[projectId] ?? [])];
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
    if (isPmDbEnabled()) {
      const snapshot = memory.PROJECT_MEMBERS[projectId] ?? [];
      await persistProjectMembersToPg(projectId, snapshot);
    }
    return true;
  }

  async hasAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await this.findById(projectId);
    if (!project) {
      return false;
    }

    // Administrators have access to all projects
    if (isAdminUserId(userId)) {
      return true;
    }

    const isOwner = project.ownerId === userId;
    const isProjectMember = (await this.getMember(projectId, userId)) !== null;

    // Public projects: NOT globally visible; доступ только владельцу и явным участникам проекта.
    // (Важно: в demo-режиме новые пользователи могут автоматически попадать в общий workspace.)
    if (project.visibility === 'public') {
      return isOwner || isProjectMember;
    }

    // Private projects: only owner + explicit project members.
    if (project.visibility === 'private') {
      const hasAccess = isOwner || isProjectMember;
      if (!hasAccess) {
        console.log(
          `[ProjectsRepository] Access denied: projectId=${projectId}, userId=${userId}, ownerId=${project.ownerId}, isOwner=${isOwner}, isMember=${isProjectMember}`
        );
      }
      return hasAccess;
    }

    return false;
  }

  async create(payload: {
    title: string;
    description?: string;
    ownerId: string;
    workspaceId: string;
    key?: string; // Optional project key
    status?: ProjectStatus; // Optional status, now always normalized to active
    stage?: ProjectStage;
    deadline?: string;
    type?: ProjectType;
    visibility?: ProjectVisibility;
    workflowId?: string;
    budgetPlanned?: number | string | null;
    budgetSpent?: number | string | null;
  }): Promise<Project> {
    this.normalizeProjectStorage();
    const existingProjects = isPmDbEnabled() ? await this.list() : memory.PROJECTS.map(cloneProject);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const workflowId = payload.workflowId ?? `wf-${id}`;
    const allowedTypes: ProjectType[] = ['product', 'marketing', 'operations', 'service', 'internal'];
    const type = payload.type && allowedTypes.includes(payload.type) ? payload.type : undefined;

    const visibility: ProjectVisibility = payload.visibility === 'public' ? 'public' : 'private';
    const status: ProjectStatus = 'active';
    const key = this.generateProjectKeyFromSource(existingProjects, payload.workspaceId, payload.key, payload.title);
    const ownerNumber = this.getNextOwnerProjectNumberFromSource(existingProjects, payload.ownerId);

    const budgetPlanned = normalizeBudgetValue(payload.budgetPlanned);
    const budgetSpent = normalizeBudgetValue(payload.budgetSpent);

    // Determine archived based on status for backward compatibility
    const archived = false;

    const project: Project = {
      id,
      workspaceId: payload.workspaceId,
      key,
      title: payload.title,
      description: payload.description ?? '',
      ownerId: payload.ownerId,
      ownerNumber,
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
    syncProjectIntoMemory(project);
    console.log(`[ProjectsRepository] Created project: id=${project.id}, workspaceId=${project.workspaceId}, ownerId=${project.ownerId}, title=${project.title}, totalProjects=${memory.PROJECTS.length}`);
    if (isPmDbEnabled()) {
      await persistProjectToPg(project);
      // Инвалидируем кэш проектов при создании
      cacheManager.invalidateProjects(project.workspaceId);
    }

    return cloneProject(project);
  }

  async update(
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
  ): Promise<Project | null> {
    const current = await this.findById(id);
    if (!current) {
      return null;
    }
    this.normalizeProjectStorage();

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

    if (patch.status && ALLOWED_PROJECT_STATUSES.includes(patch.status as ProjectStatus)) {
      next.status = normalizeProjectStatus(patch.status);
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
      const existingProjects = isPmDbEnabled() ? await this.list() : memory.PROJECTS.map(cloneProject);
      const isUnique = !existingProjects.some(
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

    syncProjectIntoMemory(next);
    if (isPmDbEnabled()) {
      await persistProjectToPg(next);
      // Инвалидируем кэш проектов при обновлении
      cacheManager.invalidateProjects(next.workspaceId);
    }

    return cloneProject(next);
  }

  async delete(id: string): Promise<boolean> {
    const idx = memory.PROJECTS.findIndex((item) => item.id === id);
    if (idx === -1) {
      if (isPmDbEnabled()) {
        const existing = await this.findById(id);
        if (!existing) {
          return false;
        }
      } else {
        return false;
      }
    }

    const project = idx === -1 ? await this.findById(id) : memory.PROJECTS[idx];
    if (!project) {
      return false;
    }

    const workspaceId = project?.workspaceId;

    if (idx !== -1) {
      memory.PROJECTS.splice(idx, 1);
    }
    memory.TASKS = memory.TASKS.filter((task) => task.projectId !== id);
    memory.ITERATIONS = memory.ITERATIONS.filter((iteration) => iteration.projectId !== id);
    delete memory.WORKFLOWS[id];
    delete memory.PROJECT_MEMBERS[id];
    if (isPmDbEnabled()) {
      await deleteProjectFromPg(id);
      // Инвалидируем кэш проектов при удалении
      if (workspaceId) {
        cacheManager.invalidateProjects(workspaceId);
      }
      // Также инвалидируем кэш задач для этого проекта
      cacheManager.invalidateTasks(id);
    }

    return true;
  }

  async archive(id: string): Promise<Project | null> {
    return this.update(id, { status: 'archived', archived: true });
  }

  async unarchive(id: string): Promise<Project | null> {
    // When unarchiving, set status to 'active' by default
    return this.update(id, { status: 'active', archived: false });
  }

  async findByKey(workspaceId: string, key: string): Promise<Project | null> {
    if (isPmDbEnabled()) {
      const dbProject = await fetchProjectByKeyFromPg(workspaceId, key);
      if (!dbProject) {
        return null;
      }
      syncProjectIntoMemory(dbProject);
      memory.PROJECT_MEMBERS[dbProject.id] = await fetchProjectMembersFromPg(dbProject.id);
      return cloneProject(dbProject);
    }

    const project = memory.PROJECTS.find(
      (item) => item.workspaceId === workspaceId && item.key === key.toUpperCase()
    );
    return project ? cloneProject(project) : null;
  }

  private generateProjectKeyFromSource(
    projects: Project[],
    workspaceId: string,
    requestedKey?: string,
    title?: string
  ): string {
    if (requestedKey && typeof requestedKey === 'string') {
      const normalizedKey = requestedKey.trim().toUpperCase();
      if (normalizedKey.length >= 2 && normalizedKey.length <= 10) {
        const isUnique = !projects.some(
          (p) => p.workspaceId === workspaceId && p.key === normalizedKey
        );
        if (isUnique) {
          return normalizedKey;
        }
      }
    }

    let baseKey = 'PROJ';
    if (title && typeof title === 'string') {
      const titleWords = title.split(/\s+/).filter((w) => w.length > 0);
      if (titleWords.length > 0) {
        baseKey = titleWords
          .slice(0, 4)
          .map((w) => w[0]?.toUpperCase() || '')
          .join('')
          .slice(0, 10);
        if (baseKey.length < 2) {
          baseKey = 'PROJ';
        }
      }
    }

    let key = baseKey;
    let counter = 1;
    while (projects.some((p) => p.workspaceId === workspaceId && p.key === key)) {
      key = `${baseKey}${counter}`;
      counter++;
    }

    return key;
  }

  private getNextOwnerProjectNumberFromSource(projects: Project[], ownerId: string): number {
    const ownerProjects = projects.filter((project) => project.ownerId === ownerId);
    if (ownerProjects.length === 0) {
      return 1;
    }
    const maxNumber = Math.max(...ownerProjects.map((project) => project.ownerNumber ?? 0));
    return maxNumber + 1;
  }
}

export const projectsRepository = new ProjectsRepository();

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
      try {
        // Формируем ключ кэша на основе параметров
        const cacheKey = workspaceId 
          ? `projects:workspace:${workspaceId}:archived:${archived ?? 'all'}`
          : `projects:all:archived:${archived ?? 'all'}`;
        
        // Проверяем кэш
        const cached = cacheManager.getProjects(cacheKey);
        if (cached) {
          // Фильтруем по workspaceId если нужно (кэш может содержать все проекты)
          let items = cached;
          if (typeof workspaceId === 'string' && workspaceId.trim()) {
            const targetWorkspaceId = workspaceId.trim();
            items = items.filter((project) => project.workspaceId === targetWorkspaceId);
          }
          return items.map(cloneProject);
        }

        // Кэш промах - читаем из БД
        const dbProjects = await fetchProjectsFromPg(options);
        
        // Сохраняем в кэш
        cacheManager.setProjects(cacheKey, dbProjects);
        
        // Также обновляем память для обратной совместимости (но это не источник истины)
        if (memory.PROJECTS.length === 0) {
          memory.PROJECTS = dbProjects;
        } else {
          // Синхронизируем: добавляем новые проекты из БД, обновляем существующие
          for (const dbProject of dbProjects) {
            const index = memory.PROJECTS.findIndex(p => p.id === dbProject.id);
            if (index >= 0) {
              memory.PROJECTS[index] = dbProject;
            } else {
              memory.PROJECTS.push(dbProject);
            }
          }
        }
        this.normalizeProjectStorage();
        return dbProjects.map(cloneProject);
      } catch (error) {
        console.error('[ProjectsRepository] Error loading projects from DB, falling back to memory:', error);
        // Fallback to memory if DB fails
      }
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
    this.normalizeProjectStorage();
    // Сначала ищем в памяти
    const project = memory.PROJECTS.find((item) => item.id === id);
    if (project) {
      return cloneProject(project);
    }

    // Если не найден в памяти и БД включена, загружаем из БД
    if (isPmDbEnabled()) {
      try {
        const dbProject = await fetchProjectByIdFromPg(id);
        if (dbProject) {
          // Добавляем в память для последующих запросов
          memory.PROJECTS.push(dbProject);
          console.log(`[ProjectsRepository] Loaded project from DB: id=${dbProject.id}, title=${dbProject.title}`);
          
          // Также загружаем участников проекта, если их нет в памяти
          if (!memory.PROJECT_MEMBERS[dbProject.id]) {
            const members = await fetchProjectMembersFromPg(dbProject.id);
            if (members.length > 0) {
              memory.PROJECT_MEMBERS[dbProject.id] = members;
            }
          }
          
          this.normalizeProjectStorage();
          return cloneProject(dbProject);
        }
      } catch (error) {
        console.error(`[ProjectsRepository] Error loading project from DB: ${id}`, error);
      }
    }

    console.log(`[ProjectsRepository] Project not found by ID: ${id}, totalProjects=${memory.PROJECTS.length}`);
    return null;
  }

  getMember(projectId: string, userId: string): ProjectMember | null {
    const members = memory.PROJECT_MEMBERS[projectId] ?? [];
    return members.find((member) => member.userId === userId) ?? null;
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    // Сначала проверяем память
    if (memory.PROJECT_MEMBERS[projectId]) {
      return memory.PROJECT_MEMBERS[projectId].map((member) => ({ ...member }));
    }

    // Если нет в памяти и БД включена, загружаем из БД
    if (isPmDbEnabled()) {
      try {
        const members = await fetchProjectMembersFromPg(projectId);
        if (members.length > 0) {
          memory.PROJECT_MEMBERS[projectId] = members;
          return members.map((member) => ({ ...member }));
        }
      } catch (error) {
        console.error(`[ProjectsRepository] Error loading project members from DB: ${projectId}`, error);
      }
    }

    return [];
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
    if (isPmDbEnabled()) {
      void persistProjectMembersToPg(projectId, members).catch((error) =>
        console.error('[ProjectsRepository] Failed to persist members', error)
      );
    }
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
    if (isPmDbEnabled()) {
      const snapshot = memory.PROJECT_MEMBERS[projectId] ?? [];
      void persistProjectMembersToPg(projectId, snapshot).catch((error) =>
        console.error('[ProjectsRepository] Failed to persist members', error)
      );
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
    const isProjectMember = this.getMember(projectId, userId) !== null;

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

  /**
   * Returns the next sequential project number for the given owner.
   * Numbers are monotonically increasing and are not reused after deletion.
   */
  private getNextOwnerProjectNumber(ownerId: string): number {
    const ownerProjects = memory.PROJECTS.filter((project) => project.ownerId === ownerId);
    if (ownerProjects.length === 0) {
      return 1;
    }
    const maxNumber = Math.max(...ownerProjects.map((project) => project.ownerNumber ?? 0));
    return maxNumber + 1;
  }

  create(payload: {
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
  }): Project {
    this.normalizeProjectStorage();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const workflowId = payload.workflowId ?? `wf-${id}`;
    const allowedTypes: ProjectType[] = ['product', 'marketing', 'operations', 'service', 'internal'];
    const type = payload.type && allowedTypes.includes(payload.type) ? payload.type : undefined;

    const visibility: ProjectVisibility = payload.visibility === 'public' ? 'public' : 'private';
    const status: ProjectStatus = 'active';
    const key = this.generateProjectKey(payload.workspaceId, payload.key, payload.title);
    const ownerNumber = this.getNextOwnerProjectNumber(payload.ownerId);

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
    memory.PROJECTS.push(project);
    console.log(`[ProjectsRepository] Created project: id=${project.id}, workspaceId=${project.workspaceId}, ownerId=${project.ownerId}, title=${project.title}, totalProjects=${memory.PROJECTS.length}`);
    if (isPmDbEnabled()) {
      void persistProjectToPg(project).catch((error) =>
        console.error('[ProjectsRepository] Failed to persist project', error)
      );
      // Инвалидируем кэш проектов при создании
      cacheManager.invalidateProjects(project.workspaceId);
    }

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
    this.normalizeProjectStorage();
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
    if (isPmDbEnabled()) {
      void persistProjectToPg(next).catch((error) =>
        console.error('[ProjectsRepository] Failed to persist project update', error)
      );
      // Инвалидируем кэш проектов при обновлении
      cacheManager.invalidateProjects(next.workspaceId);
    }

    return cloneProject(next);
  }

  delete(id: string): boolean {
    const idx = memory.PROJECTS.findIndex((item) => item.id === id);
    if (idx === -1) {
      return false;
    }

    const project = memory.PROJECTS[idx];
    const workspaceId = project?.workspaceId;

    memory.PROJECTS.splice(idx, 1);
    memory.TASKS = memory.TASKS.filter((task) => task.projectId !== id);
    memory.ITERATIONS = memory.ITERATIONS.filter((iteration) => iteration.projectId !== id);
    delete memory.WORKFLOWS[id];
    delete memory.PROJECT_MEMBERS[id];
    if (isPmDbEnabled()) {
      void deleteProjectFromPg(id).catch((error) =>
        console.error('[ProjectsRepository] Failed to delete project from Postgres', error)
      );
      // Инвалидируем кэш проектов при удалении
      if (workspaceId) {
        cacheManager.invalidateProjects(workspaceId);
      }
      // Также инвалидируем кэш задач для этого проекта
      cacheManager.invalidateTasks(id);
    }

    return true;
  }

  archive(id: string): Project | null {
    return this.update(id, { status: 'archived', archived: true });
  }

  unarchive(id: string): Project | null {
    // When unarchiving, set status to 'active' by default
    return this.update(id, { status: 'active', archived: false });
  }

  async findByKey(workspaceId: string, key: string): Promise<Project | null> {
    // Сначала ищем в памяти
    const project = memory.PROJECTS.find(
      (item) => item.workspaceId === workspaceId && item.key === key.toUpperCase()
    );
    if (project) {
      return cloneProject(project);
    }

    // Если не найден в памяти и БД включена, загружаем из БД
    if (isPmDbEnabled()) {
      try {
        const dbProject = await fetchProjectByKeyFromPg(workspaceId, key);
        if (dbProject) {
          // Добавляем в память для последующих запросов
          memory.PROJECTS.push(dbProject);
          console.log(`[ProjectsRepository] Loaded project from DB by key: key=${key}, id=${dbProject.id}, title=${dbProject.title}`);
          
          // Также загружаем участников проекта, если их нет в памяти
          if (!memory.PROJECT_MEMBERS[dbProject.id]) {
            const members = await fetchProjectMembersFromPg(dbProject.id);
            if (members.length > 0) {
              memory.PROJECT_MEMBERS[dbProject.id] = members;
            }
          }
          
          return cloneProject(dbProject);
        }
      } catch (error) {
        console.error(`[ProjectsRepository] Error loading project from DB by key: ${workspaceId}/${key}`, error);
      }
    }

    return null;
  }
}

export const projectsRepository = new ProjectsRepository();

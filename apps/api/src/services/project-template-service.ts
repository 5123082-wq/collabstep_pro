import { DEFAULT_WORKSPACE_ID } from '../data/memory';
import { projectsRepository } from '../repositories/projects-repository';
import { tasksRepository } from '../repositories/tasks-repository';
import { templateTasksRepository } from '../repositories/template-tasks-repository';
import { templatesRepository } from '../repositories/templates-repository';
import { userTemplatesRepository } from '../repositories/user-templates-repository';
import { organizationsRepository } from '../repositories/organizations-repository';
import type { Project, Task, ProjectTemplateTask } from '../types';

type TemplateMeta = {
  id: string;
  title: string;
  summary?: string;
  projectType?: Project['type'];
  projectStage?: Project['stage'];
  projectVisibility?: Project['visibility'];
};

export class ProjectTemplateValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ProjectTemplateValidationError';
    this.status = status;
    Object.setPrototypeOf(this, ProjectTemplateValidationError.prototype);
  }
}

function toTemplateMeta(template: {
  id: string;
  title: string;
  summary?: string | null;
  projectType?: Project['type'];
  projectStage?: Project['stage'];
  projectVisibility?: Project['visibility'];
}): TemplateMeta {
  return {
    id: template.id,
    title: template.title,
    ...(template.summary && { summary: template.summary }),
    ...(template.projectType && { projectType: template.projectType }),
    ...(template.projectStage && { projectStage: template.projectStage }),
    ...(template.projectVisibility && { projectVisibility: template.projectVisibility })
  };
}

function addDays(baseDate: Date, offsetDays: number): string {
  const next = new Date(baseDate.getTime());
  next.setUTCDate(next.getUTCDate() + offsetDays);
  return next.toISOString();
}

export class ProjectTemplateService {
  async createProjectFromTemplate(params: {
    templateId: string;
    ownerId: string;
    organizationId: string;
    projectTitle?: string;
    projectDescription?: string;
    startDate?: string;
    selectedTaskIds?: string[];
  }): Promise<{ project: Project; tasks: Task[] }> {
    const adminTemplate = templatesRepository.findById(params.templateId);
    const template = adminTemplate
      ? toTemplateMeta(adminTemplate)
      : await userTemplatesRepository
          .findById(params.templateId, params.ownerId)
          .then((item) => (item ? toTemplateMeta(item) : null));

    if (!template) {
      throw new ProjectTemplateValidationError('Template not found', 404);
    }

    // Validate organization exists BEFORE creating project to prevent orphaned projects
    const organization = await organizationsRepository.findById(params.organizationId);
    if (!organization) {
      throw new ProjectTemplateValidationError(
        `Organization not found: ${params.organizationId}`,
        404
      );
    }

    // Validate selectedTaskIds BEFORE creating project to prevent orphaned projects
    const allTasks = await templateTasksRepository.listByTemplateId(template.id);
    const tasksById = new Map<string, ProjectTemplateTask>(
      allTasks.map((task) => [task.id, task])
    );

    if (params.selectedTaskIds && params.selectedTaskIds.length > 0) {
      for (const taskId of params.selectedTaskIds) {
        if (!tasksById.has(taskId)) {
          throw new ProjectTemplateValidationError(`Task not found in template: ${taskId}`, 400);
        }
      }
    }

    const projectTitle = params.projectTitle?.trim() || template.title;
    const projectDescription = params.projectDescription?.trim() || template.summary || '';
    const visibility: Project['visibility'] =
      template.projectVisibility === 'public' ? 'public' : 'private';

    let project: Project | null = null;
    try {
      project = projectsRepository.create({
        title: projectTitle,
        description: projectDescription,
        ownerId: params.ownerId,
        workspaceId: DEFAULT_WORKSPACE_ID,
        ...(template.projectType ? { type: template.projectType } : {}),
        ...(template.projectStage ? { stage: template.projectStage } : {}),
        visibility
      });
      // Note: Project is created in pm_projects (canonical table) via repository.
      // The deprecated 'project' table (Drizzle) is no longer used per architecture decision.
    } catch (error) {
      // Rollback: delete project if it was created before the error
      if (project) {
        try {
          projectsRepository.delete(project.id);
        } catch (deleteError) {
          console.error('[ProjectTemplateService] Failed to rollback project deletion:', deleteError);
        }
      }
      throw error;
    }

    if (!project) {
      throw new ProjectTemplateValidationError('Failed to create project', 500);
    }

    const selectedTaskIds = params.selectedTaskIds ?? allTasks.map((task) => task.id);
    const selected = new Set(selectedTaskIds);

    const includeParents = (taskId: string) => {
      const task = tasksById.get(taskId);
      if (!task || !task.parentTaskId) {
        return;
      }
      selected.add(task.parentTaskId);
      includeParents(task.parentTaskId);
    };

    for (const taskId of selectedTaskIds) {
      includeParents(taskId);
    }

    if (selected.size === 0) {
      return { project, tasks: [] };
    }

    try {
      const createdTasks: Task[] = [];
      const idMap = new Map<string, string>();
      const baseDate = params.startDate ? new Date(params.startDate) : new Date();

      const createTaskRecursive = (task: ProjectTemplateTask) => {
        if (!selected.has(task.id) || idMap.has(task.id)) {
          return;
        }

        if (task.parentTaskId) {
          const parent = tasksById.get(task.parentTaskId);
          if (parent) {
            createTaskRecursive(parent);
          }
        }

        const startAt = addDays(baseDate, task.offsetStartDays);
        const dueAt =
          task.offsetDueDays !== undefined ? addDays(baseDate, task.offsetDueDays) : undefined;
        const parentId = task.parentTaskId ? idMap.get(task.parentTaskId) ?? null : null;

        const created = tasksRepository.create({
          projectId: project.id,
          title: task.title,
          ...(task.description && { description: task.description }),
          status: task.defaultStatus,
          parentId,
          startAt,
          ...(dueAt && { dueAt }),
          ...(task.defaultPriority && { priority: task.defaultPriority }),
          ...(task.defaultLabels && { labels: task.defaultLabels }),
          ...(task.estimatedTime !== undefined && { estimatedTime: task.estimatedTime }),
          ...(task.storyPoints !== undefined && { storyPoints: task.storyPoints })
        });

        idMap.set(task.id, created.id);
        createdTasks.push(created);
      };

      const sortedTasks = [...allTasks].sort((a, b) => a.position - b.position);
      for (const task of sortedTasks) {
        createTaskRecursive(task);
      }

      return { project, tasks: createdTasks };
    } catch (error) {
      // Rollback: delete project and organization linkage if task creation fails
      // This prevents orphaned projects when task creation fails
      if (project) {
        try {
          console.error('[ProjectTemplateService] Task creation failed, rolling back project:', project.id, error);
          projectsRepository.delete(project.id);
        } catch (deleteError) {
          console.error('[ProjectTemplateService] Failed to rollback project deletion:', deleteError);
          // Re-throw the original error, not the delete error
        }
      }
      throw error;
    }
  }
}

export const projectTemplateService = new ProjectTemplateService();

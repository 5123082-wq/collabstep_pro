import { eq, and, asc, inArray } from 'drizzle-orm';
import { db } from '../db/config';
import { projectTemplateTasks } from '../db/schema';
import { memory } from '../data/memory';
import type { ProjectTemplateTask, ID, TaskStatus } from '../types';

function cloneTask(task: ProjectTemplateTask): ProjectTemplateTask {
  return {
    ...task,
    ...(task.defaultLabels && { defaultLabels: [...task.defaultLabels] }),
  };
}

export class TemplateTaskValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'TemplateTaskValidationError';
    this.status = status;
    Object.setPrototypeOf(this, TemplateTaskValidationError.prototype);
  }
}

export interface CreateTemplateTaskInput {
  templateId: string;
  parentTaskId?: string | null;
  title: string;
  description?: string;
  defaultStatus?: TaskStatus;
  defaultPriority?: 'low' | 'med' | 'high' | 'urgent';
  defaultLabels?: string[];
  offsetStartDays?: number;
  offsetDueDays?: number;
  estimatedTime?: number | null;
  storyPoints?: number | null;
  position?: number;
}

export class TemplateTasksRepository {
  /**
   * Get all tasks for a template (flat list)
   */
  async listByTemplateId(templateId: string): Promise<ProjectTemplateTask[]> {
    // Check if template is admin template (in memory)
    const isAdminTemplate = memory.TEMPLATES.some((t) => t.id === templateId);
    
    if (isAdminTemplate) {
      // For admin templates, use memory storage
      return memory.TEMPLATE_TASKS
        .filter((task) => task.templateId === templateId)
        .map(cloneTask)
        .sort((a, b) => a.position - b.position);
    }

    // For user templates, use database
    try {
      const tasks = await db
        .select()
        .from(projectTemplateTasks)
        .where(eq(projectTemplateTasks.templateId, templateId))
        .orderBy(asc(projectTemplateTasks.position));

      return tasks.map((task) => ({
        id: task.id,
        templateId: task.templateId,
        parentTaskId: task.parentTaskId ?? null,
        title: task.title,
        ...(task.description && { description: task.description }),
        defaultStatus: task.defaultStatus as TaskStatus,
        ...(task.defaultPriority && { defaultPriority: task.defaultPriority as 'low' | 'med' | 'high' | 'urgent' }),
        ...(task.defaultLabels && task.defaultLabels.length > 0 && { defaultLabels: [...task.defaultLabels] }),
        offsetStartDays: task.offsetStartDays,
        ...(task.offsetDueDays != null && { offsetDueDays: task.offsetDueDays }),
        ...(task.estimatedTime != null && { estimatedTime: task.estimatedTime }),
        ...(task.storyPoints != null && { storyPoints: task.storyPoints }),
        position: task.position,
        ...(task.createdAt && { createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt }),
        ...(task.updatedAt && { updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt })
      }));
    } catch (error) {
      console.error('[TemplateTasksRepository] Error loading tasks from DB:', error);
      return [];
    }
  }

  /**
   * Get tasks as a tree structure (with children)
   */
  async getTaskTree(templateId: string): Promise<ProjectTemplateTask[]> {
    const allTasks = await this.listByTemplateId(templateId);
    
    // Build a map of tasks by ID
    const taskMap = new Map<string, ProjectTemplateTask & { children?: ProjectTemplateTask[] }>();
    const rootTasks: (ProjectTemplateTask & { children?: ProjectTemplateTask[] })[] = [];

    // First pass: create all task nodes
    for (const task of allTasks) {
      taskMap.set(task.id, { ...task, children: [] });
    }

    // Second pass: build tree structure
    for (const task of allTasks) {
      const node = taskMap.get(task.id);
      if (!node) continue;

      if (task.parentTaskId) {
        const parent = taskMap.get(task.parentTaskId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
        } else {
          // Parent not found, treat as root
          rootTasks.push(node);
        }
      } else {
        rootTasks.push(node);
      }
    }

    return rootTasks;
  }

  /**
   * Find a task by ID
   */
  async findById(id: string): Promise<ProjectTemplateTask | null> {
    // Check memory first (for admin templates)
    const memoryTask = memory.TEMPLATE_TASKS.find((task) => task.id === id);
    if (memoryTask) {
      return cloneTask(memoryTask);
    }

    // Check database
    try {
      const [task] = await db
        .select()
        .from(projectTemplateTasks)
        .where(eq(projectTemplateTasks.id, id))
        .limit(1);

      if (!task) {
        return null;
      }

      return {
        id: task.id,
        templateId: task.templateId,
        parentTaskId: task.parentTaskId ?? null,
        title: task.title,
        ...(task.description && { description: task.description }),
        defaultStatus: task.defaultStatus as TaskStatus,
        ...(task.defaultPriority && { defaultPriority: task.defaultPriority as 'low' | 'med' | 'high' | 'urgent' }),
        ...(task.defaultLabels && task.defaultLabels.length > 0 && { defaultLabels: [...task.defaultLabels] }),
        offsetStartDays: task.offsetStartDays,
        ...(task.offsetDueDays != null && { offsetDueDays: task.offsetDueDays }),
        ...(task.estimatedTime != null && { estimatedTime: task.estimatedTime }),
        ...(task.storyPoints != null && { storyPoints: task.storyPoints }),
        position: task.position,
        ...(task.createdAt && { createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt }),
        ...(task.updatedAt && { updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt })
      };
    } catch (error) {
      console.error('[TemplateTasksRepository] Error finding task in DB:', error);
      return null;
    }
  }

  /**
   * Create a new task
   */
  async create(input: CreateTemplateTaskInput): Promise<ProjectTemplateTask> {
    const now = new Date().toISOString();
    const id: ID = globalThis.crypto.randomUUID();

    // Validate parent task if specified
    if (input.parentTaskId) {
      const parent = await this.findById(input.parentTaskId);
      if (!parent) {
        throw new TemplateTaskValidationError(`Parent task not found: ${input.parentTaskId}`);
      }
      if (parent.templateId !== input.templateId) {
        throw new TemplateTaskValidationError('Parent task must belong to the same template');
      }
    }

    // Calculate position if not provided
    let position = input.position;
    if (position === undefined) {
      const existingTasks = await this.listByTemplateId(input.templateId);
      position = existingTasks.length > 0 
        ? Math.max(...existingTasks.map((t) => t.position)) + 1 
        : 0;
    }

    const task: ProjectTemplateTask = {
      id,
      templateId: input.templateId,
      parentTaskId: input.parentTaskId ?? null,
      title: input.title,
      ...(input.description && { description: input.description }),
      defaultStatus: input.defaultStatus ?? 'new',
      ...(input.defaultPriority && { defaultPriority: input.defaultPriority }),
      ...(input.defaultLabels && { defaultLabels: input.defaultLabels }),
      offsetStartDays: input.offsetStartDays ?? 0,
      ...(input.offsetDueDays != null && { offsetDueDays: input.offsetDueDays }),
      ...(input.estimatedTime != null && { estimatedTime: input.estimatedTime }),
      ...(input.storyPoints != null && { storyPoints: input.storyPoints }),
      position,
      createdAt: now,
      updatedAt: now
    };

    // Check if template is admin template (in memory)
    const isAdminTemplate = memory.TEMPLATES.some((t) => t.id === input.templateId);
    
    if (isAdminTemplate) {
      // Store in memory
      memory.TEMPLATE_TASKS.push(task);
      return cloneTask(task);
    }

    // Store in database
    try {
      const [created] = await db
        .insert(projectTemplateTasks)
        .values({
          id: task.id,
          templateId: task.templateId,
          parentTaskId: task.parentTaskId ?? null,
          title: task.title,
          description: task.description ?? null,
          defaultStatus: task.defaultStatus,
          defaultPriority: task.defaultPriority ?? null,
          defaultLabels: task.defaultLabels && task.defaultLabels.length > 0 ? task.defaultLabels : [],
          offsetStartDays: task.offsetStartDays,
          offsetDueDays: task.offsetDueDays ?? null,
          estimatedTime: task.estimatedTime ?? null,
          storyPoints: task.storyPoints ?? null,
          position: task.position,
          createdAt: new Date(now),
          updatedAt: new Date(now)
        })
        .returning();

      if (!created) {
        throw new Error('Failed to create task in database');
      }

      return {
        id: created.id,
        templateId: created.templateId,
        parentTaskId: created.parentTaskId ?? null,
        title: created.title,
        ...(created.description && { description: created.description }),
        defaultStatus: created.defaultStatus as TaskStatus,
        ...(created.defaultPriority && { defaultPriority: created.defaultPriority as 'low' | 'med' | 'high' | 'urgent' }),
        ...(created.defaultLabels && created.defaultLabels.length > 0 && { defaultLabels: [...created.defaultLabels] }),
        offsetStartDays: created.offsetStartDays,
        ...(created.offsetDueDays != null && { offsetDueDays: created.offsetDueDays }),
        ...(created.estimatedTime != null && { estimatedTime: created.estimatedTime }),
        ...(created.storyPoints != null && { storyPoints: created.storyPoints }),
        position: created.position,
        ...(created.createdAt && { createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : created.createdAt }),
        ...(created.updatedAt && { updatedAt: created.updatedAt instanceof Date ? created.updatedAt.toISOString() : created.updatedAt })
      };
    } catch (error) {
      console.error('[TemplateTasksRepository] Error creating task in DB:', error);
      throw error;
    }
  }

  /**
   * Update a task
   */
  async update(id: string, patch: Partial<ProjectTemplateTask>): Promise<ProjectTemplateTask | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    // Validate parent task if being changed
    if (patch.parentTaskId !== undefined && patch.parentTaskId !== null) {
      const parent = await this.findById(patch.parentTaskId);
      if (!parent) {
        throw new TemplateTaskValidationError(`Parent task not found: ${patch.parentTaskId}`);
      }
      if (parent.templateId !== existing.templateId) {
        throw new TemplateTaskValidationError('Parent task must belong to the same template');
      }
      // Prevent circular references
      if (parent.id === id) {
        throw new TemplateTaskValidationError('Task cannot be its own parent');
      }
      // Check for deeper circular references
      let currentParentId = parent.parentTaskId;
      while (currentParentId) {
        if (currentParentId === id) {
          throw new TemplateTaskValidationError('Circular reference detected in task hierarchy');
        }
        const currentParent = await this.findById(currentParentId);
        if (!currentParent) break;
        currentParentId = currentParent.parentTaskId;
      }
    }

    const updated: ProjectTemplateTask = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    // Check if template is admin template (in memory)
    const isAdminTemplate = memory.TEMPLATES.some((t) => t.id === existing.templateId);
    
    if (isAdminTemplate) {
      // Update in memory
      const index = memory.TEMPLATE_TASKS.findIndex((t) => t.id === id);
      if (index === -1) {
        return null;
      }
      memory.TEMPLATE_TASKS[index] = updated;
      return cloneTask(updated);
    }

    // Update in database
    try {
      const updateData: {
        title?: string;
        description?: string | null;
        defaultStatus?: string;
        defaultPriority?: string | null;
        defaultLabels?: string[];
        offsetStartDays?: number;
        offsetDueDays?: number | null;
        estimatedTime?: number | null;
        storyPoints?: number | null;
        position?: number;
        parentTaskId?: string | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date()
      };

      if (patch.title !== undefined) updateData.title = patch.title;
      if (patch.description !== undefined) updateData.description = patch.description ?? null;
      if (patch.defaultStatus !== undefined) updateData.defaultStatus = patch.defaultStatus;
      if (patch.defaultPriority !== undefined) updateData.defaultPriority = patch.defaultPriority ?? null;
      if (patch.defaultLabels !== undefined) updateData.defaultLabels = patch.defaultLabels && patch.defaultLabels.length > 0 ? patch.defaultLabels : [];
      if (patch.offsetStartDays !== undefined) updateData.offsetStartDays = patch.offsetStartDays;
      if (patch.offsetDueDays !== undefined) updateData.offsetDueDays = patch.offsetDueDays ?? null;
      if (patch.estimatedTime !== undefined) updateData.estimatedTime = patch.estimatedTime ?? null;
      if (patch.storyPoints !== undefined) updateData.storyPoints = patch.storyPoints ?? null;
      if (patch.position !== undefined) updateData.position = patch.position;
      if (patch.parentTaskId !== undefined) updateData.parentTaskId = patch.parentTaskId ?? null;

      const [result] = await db
        .update(projectTemplateTasks)
        .set(updateData)
        .where(eq(projectTemplateTasks.id, id))
        .returning();

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        templateId: result.templateId,
        parentTaskId: result.parentTaskId ?? null,
        title: result.title,
        ...(result.description && { description: result.description }),
        defaultStatus: result.defaultStatus as TaskStatus,
        ...(result.defaultPriority && { defaultPriority: result.defaultPriority as 'low' | 'med' | 'high' | 'urgent' }),
        ...(result.defaultLabels && result.defaultLabels.length > 0 && { defaultLabels: [...result.defaultLabels] }),
        offsetStartDays: result.offsetStartDays,
        ...(result.offsetDueDays != null && { offsetDueDays: result.offsetDueDays }),
        ...(result.estimatedTime != null && { estimatedTime: result.estimatedTime }),
        ...(result.storyPoints != null && { storyPoints: result.storyPoints }),
        position: result.position,
        ...(result.createdAt && { createdAt: result.createdAt instanceof Date ? result.createdAt.toISOString() : result.createdAt }),
        ...(result.updatedAt && { updatedAt: result.updatedAt instanceof Date ? result.updatedAt.toISOString() : result.updatedAt })
      };
    } catch (error) {
      console.error('[TemplateTasksRepository] Error updating task in DB:', error);
      throw error;
    }
  }

  /**
   * Delete a task and all its children (cascade)
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    // Find all child tasks recursively
    const allTasks = await this.listByTemplateId(existing.templateId);
    const childrenToDelete: string[] = [];
    
    const findChildren = (parentId: string) => {
      for (const task of allTasks) {
        if (task.parentTaskId === parentId) {
          childrenToDelete.push(task.id);
          findChildren(task.id);
        }
      }
    };

    findChildren(id);

    // Check if template is admin template (in memory)
    const isAdminTemplate = memory.TEMPLATES.some((t) => t.id === existing.templateId);
    
    if (isAdminTemplate) {
      // Delete from memory
      memory.TEMPLATE_TASKS = memory.TEMPLATE_TASKS.filter(
        (t) => t.id !== id && !childrenToDelete.includes(t.id)
      );
      return true;
    }

    // Delete from database (cascade will handle children via FK constraint)
    try {
      await db
        .delete(projectTemplateTasks)
        .where(eq(projectTemplateTasks.id, id));
      
      // Also explicitly delete children (in case FK constraint doesn't work as expected)
      if (childrenToDelete.length > 0) {
        await db
          .delete(projectTemplateTasks)
          .where(
            and(
              eq(projectTemplateTasks.templateId, existing.templateId),
              inArray(projectTemplateTasks.id, childrenToDelete)
            )
          );
      }

      return true;
    } catch (error) {
      console.error('[TemplateTasksRepository] Error deleting task from DB:', error);
      return false;
    }
  }

  /**
   * Reorder tasks
   */
  async reorderTasks(templateId: string, taskIds: string[]): Promise<void> {
    // Check if template is admin template (in memory)
    const isAdminTemplate = memory.TEMPLATES.some((t) => t.id === templateId);
    
    if (isAdminTemplate) {
      // Update positions in memory
      for (let i = 0; i < taskIds.length; i++) {
        const task = memory.TEMPLATE_TASKS.find((t) => t.id === taskIds[i] && t.templateId === templateId);
        if (task) {
          task.position = i;
        }
      }
      return;
    }

    // Update positions in database
    try {
      // Update each task's position
      for (let i = 0; i < taskIds.length; i++) {
        const taskId = taskIds[i];
        if (!taskId) continue;
        await db
          .update(projectTemplateTasks)
          .set({ position: i, updatedAt: new Date() })
          .where(
            and(
              eq(projectTemplateTasks.id, taskId),
              eq(projectTemplateTasks.templateId, templateId)
            )
          );
      }
    } catch (error) {
      console.error('[TemplateTasksRepository] Error reordering tasks in DB:', error);
      throw error;
    }
  }
}

export const templateTasksRepository = new TemplateTasksRepository();

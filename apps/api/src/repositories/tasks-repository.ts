import { memory } from '../data/memory';
import type { FileObject, Task, TaskStatus, TaskTreeNode } from '../types';
import { pmPgHydration } from '../storage/pm-pg-bootstrap';
import { deleteTaskFromPg, isPmDbEnabled, persistTaskToPg, fetchTaskByIdFromPg, fetchTasksFromPg } from '../storage/pm-pg-adapter';
import { cacheManager } from '../data/cache-manager';
import { db } from '../db/config';
import { files, attachments } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// Fire-and-forget hydration for serverless; avoids top-level await in CJS builds
void pmPgHydration;

type TaskListView = 'list' | 'tree';

export type TaskListOptions = {
  projectId?: string;
  status?: TaskStatus;
  iterationId?: string;
  view?: TaskListView;
};

export type CreateTaskInput = {
  id?: string;
  projectId: string;
  number?: number; // Optional number, will be auto-generated if not provided
  parentId?: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  iterationId?: string;
  assigneeId?: string;
  startAt?: string;
  startDate?: string; // Alias for startAt
  dueAt?: string;
  priority?: 'low' | 'med' | 'high' | 'urgent';
  labels?: string[];
  estimatedTime?: number | null;
  storyPoints?: number | null;
  loggedTime?: number | null;
  price?: string | null;
  currency?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type TaskUpdatePatch = Partial<Omit<Pick<Task, 'title' | 'description' | 'status' | 'assigneeId' | 'priority' | 'startAt' | 'startDate' | 'dueAt' | 'labels' | 'estimatedTime' | 'storyPoints' | 'loggedTime' | 'iterationId' | 'parentId' | 'price' | 'currency'>, 'assigneeId'>> & {
  assigneeId?: string | null;
};

function enrichTask(task: Task): Task {
  const { labels, ...rest } = task;
  const clone: Task = { ...(rest as Task) };
  if (Array.isArray(labels)) {
    clone.labels = [...labels];
  } else {
    delete (clone as { labels?: string[] }).labels;
  }
  clone.attachments = resolveTaskAttachments(task.id);
  return clone;
}

function resolveTaskAttachments(taskId: string): FileObject[] {
  const attachments = memory.ATTACHMENTS.filter(
    (attachment) => attachment.linkedEntity === 'task' && attachment.entityId === taskId
  );
  if (attachments.length === 0) {
    return [];
  }
  const fileLookup = new Map(memory.FILES.map((file) => [file.id, file] as const));
  return attachments
    .map((attachment) => fileLookup.get(attachment.fileId))
    .filter((file): file is FileObject => Boolean(file))
    .map(cloneFileObject);
}

function cloneFileObject(file: FileObject): FileObject {
  return { ...file };
}

export class TasksRepository {
  async list(options?: TaskListOptions & { view?: 'list' }): Promise<Task[]>;
  async list(options: TaskListOptions & { view: 'tree' }): Promise<TaskTreeNode[]>;
  async list(options: TaskListOptions = {}): Promise<Task[] | TaskTreeNode[]> {
    const { projectId, status, iterationId, view = 'list' } = options;
    const normalizedView: TaskListView = view === 'tree' ? 'tree' : 'list';
    
    // Если БД включена, используем cache-aside паттерн с TTL
    if (isPmDbEnabled()) {
      try {
        // Формируем ключ кэша на основе параметров
        const cacheKey = projectId 
          ? `tasks:project:${projectId}:status:${status ?? 'all'}:iteration:${iterationId ?? 'all'}`
          : `tasks:all:status:${status ?? 'all'}:iteration:${iterationId ?? 'all'}`;
        
        // Проверяем кэш
        const cached = cacheManager.getTasks(cacheKey);
        if (cached) {
          // Фильтруем по projectId если нужно (кэш может содержать все задачи)
          let items = cached;
          if (projectId) {
            items = items.filter((task) => task.projectId === projectId);
          }
          const cloned = items.map(enrichTask);
          if (normalizedView === 'tree') {
            return buildTaskTree(cloned);
          }
          return cloned;
        }

        // Кэш промах - читаем из БД
        const fetchOptions: { projectId?: string; status?: string; iterationId?: string } = {};
        if (projectId) {
          fetchOptions.projectId = projectId;
        }
        if (status) {
          fetchOptions.status = status;
        }
        if (iterationId) {
          fetchOptions.iterationId = iterationId;
        }
        const dbTasks = await fetchTasksFromPg(fetchOptions);
        
        // Сохраняем в кэш
        cacheManager.setTasks(cacheKey, dbTasks);
        
        // Также обновляем память для обратной совместимости (но это не источник истины)
        if (memory.TASKS.length === 0) {
          memory.TASKS = dbTasks;
        } else {
          // Синхронизируем: добавляем новые задачи из БД, обновляем существующие
          for (const dbTask of dbTasks) {
            const index = memory.TASKS.findIndex(t => t.id === dbTask.id);
            if (index >= 0) {
              memory.TASKS[index] = dbTask;
            } else {
              memory.TASKS.push(dbTask);
            }
          }
        }
        const cloned = dbTasks.map(enrichTask);
        if (normalizedView === 'tree') {
          return buildTaskTree(cloned);
        }
        return cloned;
      } catch (error) {
        console.error('[TasksRepository] Error loading tasks from DB, falling back to memory:', error);
        // Fallback to memory if DB fails
      }
    }
    
    // Fallback: читаем из памяти (для случаев когда БД не включена)
    let items = memory.TASKS;
    if (projectId) {
      items = items.filter((task) => task.projectId === projectId);
    }
    if (status) {
      items = items.filter((task) => task.status === status);
    }
    if (iterationId) {
      items = items.filter((task) => task.iterationId === iterationId);
    }

    const cloned = items.map(enrichTask);
    if (normalizedView === 'tree') {
      return buildTaskTree(cloned);
    }
    return cloned;
  }

  async listByProject(projectId: string): Promise<Task[]> {
    const result = await this.list({ projectId });
    return Array.isArray(result) ? result : [];
  }

  findById(id: string): Task | null {
    const task = memory.TASKS.find((task) => task.id === id);
    if (task) {
      return enrichTask(task);
    }
    if (isPmDbEnabled()) {
      // Lazy fetch from Postgres if not present in memory (can happen on new lambdas)
      void fetchTaskByIdFromPg(id)
        .then((fetched) => {
          if (fetched) {
            memory.TASKS.push(fetched);
          }
        })
        .catch((error) => console.error('[TasksRepository] Failed to fetch task from Postgres', error));
    }
    return null;
  }

  /**
   * Gets the next task number for a project
   */
  private getNextTaskNumber(projectId: string): number {
    const projectTasks = memory.TASKS.filter((task) => task.projectId === projectId);
    if (projectTasks.length === 0) {
      return 1;
    }
    const maxNumber = Math.max(...projectTasks.map((task) => task.number ?? 0));
    return maxNumber + 1;
  }

  create(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const createdAt = input.createdAt ?? now;
    const updatedAt = input.updatedAt ?? createdAt;

    // Auto-generate number if not provided
    const number = input.number ?? this.getNextTaskNumber(input.projectId);

    // Use startDate if provided, otherwise use startAt
    const startAt = input.startDate ?? input.startAt;

    const task: Task = {
      id: input.id ?? crypto.randomUUID(),
      projectId: input.projectId,
      number,
      title: input.title,
      description: input.description ?? '',
      parentId: input.parentId ?? null,
      status: input.status,
      createdAt,
      updatedAt,
      ...(input.iterationId ? { iterationId: input.iterationId } : {}),
      ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
      ...(startAt ? { startAt, startDate: startAt } : {}),
      ...(input.dueAt ? { dueAt: input.dueAt } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(Array.isArray(input.labels) ? { labels: [...input.labels] } : {}),
      ...(input.estimatedTime !== undefined ? { estimatedTime: input.estimatedTime } : {}),
      ...(input.storyPoints !== undefined ? { storyPoints: input.storyPoints } : {}),
      ...(input.loggedTime !== undefined ? { loggedTime: input.loggedTime } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
    };

    memory.TASKS.push(task);

    if (isPmDbEnabled()) {
      void persistTaskToPg(task).catch((error) =>
        console.error('[TasksRepository] Failed to persist task', error)
      );
      // Инвалидируем кэш задач при создании
      cacheManager.invalidateTasks(task.projectId);
    }

    return enrichTask(task);
  }

  async update(id: string, patch: TaskUpdatePatch): Promise<Task | null> {
    const idx = memory.TASKS.findIndex((task) => task.id === id);
    if (idx === -1) {
      return null;
    }

    const current = memory.TASKS[idx];
    if (!current) {
      return null;
    }

    const originalTask = current;
    const updated: Task = {
      ...current,
      updatedAt: new Date().toISOString()
    };

    if (typeof patch.title === 'string' && patch.title.trim()) {
      updated.title = patch.title.trim();
    }

    if (typeof patch.description === 'string') {
      updated.description = patch.description;
    }

    if (patch.status && ['new', 'in_progress', 'review', 'done', 'blocked'].includes(patch.status)) {
      updated.status = patch.status;
    }

    if ('assigneeId' in patch) {
      if (patch.assigneeId === null || patch.assigneeId === undefined || patch.assigneeId === '') {
        delete updated.assigneeId;
      } else {
        updated.assigneeId = patch.assigneeId;
      }
    }

    if (patch.priority && ['low', 'med', 'high', 'urgent'].includes(patch.priority)) {
      updated.priority = patch.priority;
    }

    if ('startAt' in patch || 'startDate' in patch) {
      const startAt = patch.startDate ?? patch.startAt;
      if (startAt) {
        updated.startAt = startAt;
        updated.startDate = startAt;
      } else {
        delete updated.startAt;
        delete updated.startDate;
      }
    }

    if ('dueAt' in patch) {
      if (patch.dueAt) {
        updated.dueAt = patch.dueAt;
      } else {
        delete updated.dueAt;
      }
    }

    if ('labels' in patch) {
      if (Array.isArray(patch.labels)) {
        updated.labels = [...patch.labels];
      } else {
        delete updated.labels;
      }
    }

    if ('estimatedTime' in patch) {
      updated.estimatedTime = patch.estimatedTime ?? null;
    }

    if ('storyPoints' in patch) {
      updated.storyPoints = patch.storyPoints ?? null;
    }

    if ('loggedTime' in patch) {
      updated.loggedTime = patch.loggedTime ?? null;
    }

    if ('iterationId' in patch) {
      updated.iterationId = patch.iterationId ?? undefined;
    }

    if ('parentId' in patch) {
      updated.parentId = patch.parentId ?? null;
    }

    if ('price' in patch) {
      updated.price = patch.price ?? null;
    }

    if ('currency' in patch) {
      updated.currency = patch.currency ?? null;
    }

    memory.TASKS[idx] = updated;

    if (isPmDbEnabled()) {
      console.log('[TasksRepository] DB enabled, persisting task update:', updated.id, 'status:', updated.status);
      try {
        await persistTaskToPg(updated);
        // Инвалидируем кэш задач только после успешного сохранения
        cacheManager.invalidateTasks(updated.projectId);
        console.log('[TasksRepository] ✅ Task successfully persisted:', updated.id, 'status:', updated.status);
      } catch (error) {
        memory.TASKS[idx] = originalTask;
        console.error('[TasksRepository] Failed to persist task update', error);
        console.error('[TasksRepository] ❌ Failed to persist, rolled back memory:', error);
        throw error;
      }
    } else {
      console.warn('[TasksRepository] ⚠️ DB not enabled, task updated in memory only:', updated.id, 'status:', updated.status);
    }

    return enrichTask(memory.TASKS[idx]);
  }

  delete(id: string): boolean {
    const idx = memory.TASKS.findIndex((task) => task.id === id);
    if (idx === -1) {
      return false;
    }

    const task = memory.TASKS[idx];
    const projectId = task?.projectId;

    memory.TASKS.splice(idx, 1);
    // Also remove dependencies for this task
    memory.TASK_DEPENDENCIES = memory.TASK_DEPENDENCIES.filter(
      (dep) => dep.dependentTaskId !== id && dep.blockerTaskId !== id
    );

    if (isPmDbEnabled()) {
      void deleteTaskFromPg(id).catch((error) =>
        console.error('[TasksRepository] Failed to delete task from Postgres', error)
      );
      // Инвалидируем кэш задач при удалении
      if (projectId) {
        cacheManager.invalidateTasks(projectId);
      }
    }

    return true;
  }
}

export const tasksRepository = new TasksRepository();

function buildTaskTree(tasks: Task[]): TaskTreeNode[] {
  const nodes = new Map<string, TaskTreeNode>();
  const roots: TaskTreeNode[] = [];

  for (const task of tasks) {
    nodes.set(task.id, { ...task });
  }

  for (const node of nodes.values()) {
    const parentId = node.parentId ?? null;
    if (parentId && nodes.has(parentId)) {
      const parent = nodes.get(parentId);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots.map(compactChildren);
}

function compactChildren(node: TaskTreeNode): TaskTreeNode {
  if (node.children && node.children.length > 0) {
    node.children = node.children.map(compactChildren);
  } else {
    delete node.children;
  }
  return node;
}

/**
 * Hydrate a single task with attachments from the database.
 * Falls back to memory-based attachments if DB query fails.
 */
export async function hydrateTaskAttachmentsFromDb(task: Task): Promise<Task> {
  try {
    const dbAttachments = await db
      .select({
        attachmentId: attachments.id,
        fileId: attachments.fileId,
      })
      .from(attachments)
      .where(
        and(
          eq(attachments.linkedEntity, 'task'),
          eq(attachments.entityId, task.id),
          eq(attachments.projectId, task.projectId)
        )
      );

    if (dbAttachments.length === 0) {
      // No DB attachments, use memory-based ones
      return task;
    }

    const fileIds = dbAttachments.map((a) => a.fileId);
    const dbFiles = await db
      .select()
      .from(files)
      .where(inArray(files.id, fileIds));

    const fileObjects: FileObject[] = dbFiles.map((f) => ({
      id: f.id,
      uploaderId: f.uploadedBy,
      filename: f.filename,
      mimeType: f.mimeType,
      sizeBytes: Number(f.sizeBytes),
      storageUrl: f.storageUrl,
      uploadedAt: f.createdAt?.toISOString() ?? new Date().toISOString(),
      ...(f.description ? { description: f.description } : {}),
      ...(f.sha256 ? { sha256: f.sha256 } : {}),
    }));

    // Merge with existing memory-based attachments (avoid duplicates)
    const existingIds = new Set((task.attachments ?? []).map((a) => a.id));
    const mergedAttachments = [...(task.attachments ?? [])];
    for (const file of fileObjects) {
      if (!existingIds.has(file.id)) {
        mergedAttachments.push(file);
      }
    }

    return { ...task, attachments: mergedAttachments };
  } catch (error) {
    console.error('[TasksRepository] Failed to hydrate attachments from DB', error);
    // Fallback to task as-is with memory attachments
    return task;
  }
}

/**
 * Hydrate multiple tasks with attachments from the database.
 * More efficient than calling hydrateTaskAttachmentsFromDb for each task.
 */
export async function hydrateTasksAttachmentsFromDb(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) {
    return tasks;
  }

  try {
    const taskIds = tasks.map((t) => t.id);
    const taskProjectMap = new Map(tasks.map((task) => [task.id, task.projectId]));
    const projectIds = Array.from(new Set(tasks.map((task) => task.projectId).filter(Boolean)));

    const attachmentConditions = [
      eq(attachments.linkedEntity, 'task'),
      inArray(attachments.entityId, taskIds),
      ...(projectIds.length > 0 ? [inArray(attachments.projectId, projectIds)] : [])
    ];

    const dbAttachments = await db
      .select({
        attachmentId: attachments.id,
        fileId: attachments.fileId,
        entityId: attachments.entityId,
        projectId: attachments.projectId,
      })
      .from(attachments)
      .where(and(...attachmentConditions));

    if (dbAttachments.length === 0) {
      // No DB attachments, return tasks as-is
      return tasks;
    }

    const fileIds = dbAttachments.map((a) => a.fileId);
    const dbFiles = await db
      .select()
      .from(files)
      .where(inArray(files.id, fileIds));

    const fileById = new Map(dbFiles.map((f) => [f.id, f]));

    // Group attachments by task ID
    const attachmentsByTaskId = new Map<string, FileObject[]>();
    for (const attachment of dbAttachments) {
      const taskId = attachment.entityId;
      if (!taskId) continue;
      const expectedProjectId = taskProjectMap.get(taskId);
      if (!expectedProjectId || attachment.projectId !== expectedProjectId) {
        continue;
      }

      const file = fileById.get(attachment.fileId);
      if (!file) continue;

      const fileObject: FileObject = {
        id: file.id,
        uploaderId: file.uploadedBy,
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        storageUrl: file.storageUrl,
        uploadedAt: file.createdAt?.toISOString() ?? new Date().toISOString(),
        ...(file.description ? { description: file.description } : {}),
        ...(file.sha256 ? { sha256: file.sha256 } : {}),
      };

      const existing = attachmentsByTaskId.get(taskId) ?? [];
      existing.push(fileObject);
      attachmentsByTaskId.set(taskId, existing);
    }

    // Merge DB attachments with memory-based ones for each task
    return tasks.map((task) => {
      const dbAttachmentsForTask = attachmentsByTaskId.get(task.id) ?? [];
      if (dbAttachmentsForTask.length === 0) {
        return task;
      }

      const existingIds = new Set((task.attachments ?? []).map((a) => a.id));
      const mergedAttachments = [...(task.attachments ?? [])];
      for (const file of dbAttachmentsForTask) {
        if (!existingIds.has(file.id)) {
          mergedAttachments.push(file);
        }
      }

      return { ...task, attachments: mergedAttachments };
    });
  } catch (error) {
    console.error('[TasksRepository] Failed to hydrate task attachments from DB', error);
    // Fallback to tasks as-is
    return tasks;
  }
}

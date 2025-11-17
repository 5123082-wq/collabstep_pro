import { memory } from '../data/memory';
import type { FileObject, Task, TaskStatus, TaskTreeNode } from '../types';

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
  createdAt?: string;
  updatedAt?: string;
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
  list(options?: TaskListOptions & { view?: 'list' }): Task[];
  list(options: TaskListOptions & { view: 'tree' }): TaskTreeNode[];
  list(options: TaskListOptions = {}): Task[] | TaskTreeNode[] {
    const { projectId, status, iterationId, view = 'list' } = options;
    const normalizedView: TaskListView = view === 'tree' ? 'tree' : 'list';
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

  listByProject(projectId: string): Task[] {
    return this.list({ projectId });
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
      ...(input.loggedTime !== undefined ? { loggedTime: input.loggedTime } : {})
    };

    memory.TASKS.push(task);
    
    return enrichTask(task);
  }

  update(id: string, patch: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assigneeId' | 'priority' | 'startAt' | 'startDate' | 'dueAt' | 'labels' | 'estimatedTime' | 'storyPoints' | 'loggedTime' | 'iterationId' | 'parentId'>>): Task | null {
    const idx = memory.TASKS.findIndex((task) => task.id === id);
    if (idx === -1) {
      return null;
    }

    const current = memory.TASKS[idx];
    if (!current) {
      return null;
    }

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
      updated.assigneeId = patch.assigneeId ?? undefined;
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

    memory.TASKS[idx] = updated;
    
    return enrichTask(updated);
  }

  delete(id: string): boolean {
    const idx = memory.TASKS.findIndex((task) => task.id === id);
    if (idx === -1) {
      return false;
    }
    const task = memory.TASKS[idx];
    memory.TASKS.splice(idx, 1);
    // Also remove dependencies for this task
    memory.TASK_DEPENDENCIES = memory.TASK_DEPENDENCIES.filter(
      (dep) => dep.dependentTaskId !== id && dep.blockerTaskId !== id
    );
    
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

import { memory } from '../data/memory';
import { projectsRepository } from '../repositories/projects-repository';
import { tasksRepository } from '../repositories/tasks-repository';
import { taskDependenciesRepository } from '../repositories/task-dependencies-repository';
import { commentsRepository } from '../repositories/comments-repository';
import type { Attachment, Project, Task, TaskDependency, TaskStatus } from '../types';

type TaskRef = Pick<Task, 'id' | 'title' | 'status'> & { number?: number };

export type TaskDeletionPreview = {
  type: 'task';
  task: TaskRef & { projectId: string; projectTitle?: string };
  links: {
    blockers: TaskRef[];
    blocks: TaskRef[];
    children: TaskRef[];
  };
  related: {
    comments: number;
    attachments: {
      task: number;
      comments: number;
    };
    expenses: number;
    notifications: number;
  };
};

export type ProjectDeletionPreview = {
  type: 'project';
  project: Pick<Project, 'id' | 'title' | 'key'>;
  tasks: TaskRef[];
  dependencies: TaskDependency[];
  attachments: Record<Attachment['linkedEntity'] | 'other', number>;
  related: {
    comments: number;
    documents: number;
    documentVersions: number;
    projectMembers: number;
    iterations: number;
    budgets: number;
    expenses: number;
    expenseAttachments: number;
    notifications: number;
    chatMessages: number;
    marketplaceListings: number;
  };
};

export type TaskDeletionResult = {
  taskId: string;
  projectId: string;
  deletedTaskIds: string[];
  unlinkedChildren: string[];
  removed: {
    comments: number;
    attachments: {
      task: number;
      comments: number;
    };
    expenses: number;
    notifications: number;
  };
};

export type ProjectDeletionResult = {
  projectId: string;
  deletedTaskIds: string[];
  removed: ProjectDeletionPreview['related'] & {
    attachments: ProjectDeletionPreview['attachments'];
    dependencies: number;
  };
};

function toTaskRef(task: Task | null): TaskRef | null {
  if (!task) {
    return null;
  }
  const ref: TaskRef = {
    id: task.id,
    title: task.title,
    status: task.status as TaskStatus
  };
  if (typeof task.number === 'number') {
    ref.number = task.number;
  }
  return ref;
}

function countAttachmentsByType(attachments: Attachment[]): Record<Attachment['linkedEntity'] | 'other', number> {
  const counters: Record<Attachment['linkedEntity'] | 'other', number> = {
    project: 0,
    task: 0,
    comment: 0,
    document: 0,
    project_chat: 0,
    other: 0
  };

  for (const attachment of attachments) {
    if (attachment.linkedEntity in counters) {
      counters[attachment.linkedEntity as Attachment['linkedEntity']] += 1;
    } else {
      counters.other += 1;
    }
  }

  return counters;
}

function uniqueTaskRefs(tasks: Array<TaskRef | null>): TaskRef[] {
  const seen = new Set<string>();
  const result: TaskRef[] = [];
  for (const task of tasks) {
    if (!task || seen.has(task.id)) {
      continue;
    }
    seen.add(task.id);
    result.push(task);
  }
  return result;
}

export class DeletionService {
  async getTaskPreview(taskId: string): Promise<TaskDeletionPreview | null> {
    const task = tasksRepository.findById(taskId);
    if (!task) {
      return null;
    }

    const project = await projectsRepository.findById(task.projectId);

    const dependencies = taskDependenciesRepository.listByTask(taskId);
    const blockers = dependencies
      .filter((dep) => dep.dependentTaskId === taskId)
      .map((dep) => toTaskRef(tasksRepository.findById(dep.blockerTaskId)));
    const blocks = dependencies
      .filter((dep) => dep.blockerTaskId === taskId)
      .map((dep) => toTaskRef(tasksRepository.findById(dep.dependentTaskId)));
    const children = memory.TASKS.filter((child) => child.parentId === taskId).map(toTaskRef).filter(Boolean) as TaskRef[];

    const comments = memory.TASK_COMMENTS.filter((comment) => comment.taskId === taskId);
    const commentIds = new Set(comments.map((comment) => comment.id));
    const taskAttachments = memory.ATTACHMENTS.filter(
      (attachment) => attachment.linkedEntity === 'task' && attachment.entityId === taskId
    );
    const commentAttachments = memory.ATTACHMENTS.filter(
      (attachment) => attachment.linkedEntity === 'comment' && commentIds.has(attachment.entityId ?? '')
    );
    const expenses = memory.EXPENSES.filter((expense) => expense.taskId === taskId);
    const notifications = memory.NOTIFICATIONS.filter((notification) => notification.taskId === taskId);

    return {
      type: 'task',
      task: {
        id: task.id,
        projectId: task.projectId,
        ...(project?.title ? { projectTitle: project.title } : {}),
        title: task.title,
        status: task.status,
        ...(typeof task.number === 'number' ? { number: task.number } : {})
      },
      links: {
        blockers: uniqueTaskRefs(blockers),
        blocks: uniqueTaskRefs(blocks),
        children
      },
      related: {
        comments: comments.length,
        attachments: {
          task: taskAttachments.length,
          comments: commentAttachments.length
        },
        expenses: expenses.length,
        notifications: notifications.length
      }
    };
  }

  async getProjectPreview(projectId: string): Promise<ProjectDeletionPreview | null> {
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return null;
    }

    const tasks = tasksRepository.list({ projectId });
    const taskRefs = tasks.map(toTaskRef).filter(Boolean) as TaskRef[];
    const taskIds = new Set(tasks.map((task) => task.id));

    const dependencies = taskDependenciesRepository.list({ projectId });
    const projectAttachments = memory.ATTACHMENTS.filter(
      (attachment) => attachment.projectId === projectId
    );

    const taskComments = memory.TASK_COMMENTS.filter((comment) => comment.projectId === projectId);
    const documents = memory.DOCUMENTS.filter((document) => document.projectId === projectId);
    const documentIds = new Set(documents.map((document) => document.id));
    const documentVersions = memory.DOCUMENT_VERSIONS.filter((version) => documentIds.has(version.documentId));
    const expenses = memory.EXPENSES.filter((expense) => expense.projectId === projectId);
    const expenseIds = new Set(expenses.map((expense) => expense.id));
    const expenseAttachments = memory.EXPENSE_ATTACHMENTS.filter((attachment) =>
      expenseIds.has(attachment.expenseId)
    );
    const notifications = memory.NOTIFICATIONS.filter(
      (notification) =>
        notification.projectId === projectId ||
        (notification.taskId ? taskIds.has(notification.taskId) : false)
    );
    const chatMessages = memory.PROJECT_CHAT_MESSAGES.filter((message) => message.projectId === projectId);
    const listings = memory.MARKETPLACE_LISTINGS.filter((listing) => listing.projectId === projectId);

    return {
      type: 'project',
      project: {
        id: project.id,
        title: project.title,
        key: project.key
      },
      tasks: taskRefs,
      dependencies,
      attachments: countAttachmentsByType(projectAttachments),
      related: {
        comments: taskComments.length,
        documents: documents.length,
        documentVersions: documentVersions.length,
        projectMembers: (memory.PROJECT_MEMBERS[projectId] ?? []).length,
        iterations: memory.ITERATIONS.filter((iteration) => iteration.projectId === projectId).length,
        budgets: memory.PROJECT_BUDGETS.filter((budget) => budget.projectId === projectId).length,
        expenses: expenses.length,
        expenseAttachments: expenseAttachments.length,
        notifications: notifications.length,
        chatMessages: chatMessages.length,
        marketplaceListings: listings.length
      }
    };
  }

  async deleteTask(taskId: string, options: { skipReparent?: boolean } = {}): Promise<TaskDeletionResult | null> {
    const preview = await this.getTaskPreview(taskId);
    if (!preview) {
      return null;
    }

    const childIds = memory.TASKS.filter((task) => task.parentId === taskId).map((task) => task.id);
    const comments = memory.TASK_COMMENTS.filter((comment) => comment.taskId === taskId);
    const commentIds = new Set(comments.map((comment) => comment.id));
    const expenses = memory.EXPENSES.filter((expense) => expense.taskId === taskId);
    const expenseIds = new Set(expenses.map((expense) => expense.id));
    const notifications = memory.NOTIFICATIONS.filter((notification) => notification.taskId === taskId);
    const notificationIds = new Set(notifications.map((notification) => notification.id));

    const taskAttachmentCount = preview.related.attachments.task;
    const commentAttachmentCount = preview.related.attachments.comments;

    for (const comment of comments) {
      commentsRepository.delete(comment.id);
    }

    memory.ATTACHMENTS = memory.ATTACHMENTS.filter((attachment) => {
      if (attachment.linkedEntity === 'task' && attachment.entityId === taskId) {
        return false;
      }
      if (attachment.linkedEntity === 'comment' && commentIds.has(attachment.entityId ?? '')) {
        return false;
      }
      return true;
    });

    if (expenseIds.size > 0) {
      memory.EXPENSES = memory.EXPENSES.filter((expense) => !expenseIds.has(expense.id));
      memory.EXPENSE_ATTACHMENTS = memory.EXPENSE_ATTACHMENTS.filter(
        (attachment) => !expenseIds.has(attachment.expenseId)
      );
    }

    if (notificationIds.size > 0) {
      memory.NOTIFICATIONS = memory.NOTIFICATIONS.filter((notification) => !notificationIds.has(notification.id));
    }

    tasksRepository.delete(taskId);

    if (!options.skipReparent) {
      for (const childId of childIds) {
        tasksRepository.update(childId, { parentId: null });
      }
    }

    return {
      taskId,
      projectId: preview.task.projectId,
      deletedTaskIds: [taskId],
      unlinkedChildren: options.skipReparent ? [] : childIds,
      removed: {
        comments: preview.related.comments,
        attachments: {
          task: taskAttachmentCount,
          comments: commentAttachmentCount
        },
        expenses: preview.related.expenses,
        notifications: preview.related.notifications
      }
    };
  }

  async deleteProject(projectId: string): Promise<ProjectDeletionResult | null> {
    const preview = await this.getProjectPreview(projectId);
    if (!preview) {
      return null;
    }

    const taskIds = new Set(preview.tasks.map((task) => task.id));
    const expenseIds = new Set(
      memory.EXPENSES.filter((expense) => expense.projectId === projectId).map((expense) => expense.id)
    );
    const documents = memory.DOCUMENTS.filter((document) => document.projectId === projectId);
    const documentIds = new Set(documents.map((document) => document.id));

    // Delete tasks with local cleanup (dependencies handled inside delete)
    for (const taskId of taskIds) {
      await this.deleteTask(taskId, { skipReparent: true });
    }

    // Remove project-level attachments and chat files
    memory.ATTACHMENTS = memory.ATTACHMENTS.filter((attachment) => attachment.projectId !== projectId);

    // Remove project-level comments
    memory.TASK_COMMENTS = memory.TASK_COMMENTS.filter((comment) => !taskIds.has(comment.taskId));

    // Clean project expenses and attachments
    if (expenseIds.size > 0) {
      memory.EXPENSES = memory.EXPENSES.filter((expense) => expense.projectId !== projectId);
      memory.EXPENSE_ATTACHMENTS = memory.EXPENSE_ATTACHMENTS.filter(
        (attachment) => !expenseIds.has(attachment.expenseId)
      );
    }

    // Clean documents and versions
    memory.DOCUMENT_VERSIONS = memory.DOCUMENT_VERSIONS.filter(
      (version) => !documentIds.has(version.documentId)
    );
    memory.DOCUMENTS = memory.DOCUMENTS.filter((document) => document.projectId !== projectId);

    // Clean budgets and listings
    memory.PROJECT_BUDGETS = memory.PROJECT_BUDGETS.filter((budget) => budget.projectId !== projectId);
    memory.MARKETPLACE_LISTINGS = memory.MARKETPLACE_LISTINGS.filter(
      (listing) => listing.projectId !== projectId
    );

    // Clean notifications and chat messages
    memory.NOTIFICATIONS = memory.NOTIFICATIONS.filter(
      (notification) =>
        notification.projectId !== projectId &&
        !(notification.taskId && taskIds.has(notification.taskId))
    );
    memory.PROJECT_CHAT_MESSAGES = memory.PROJECT_CHAT_MESSAGES.filter(
      (message) => message.projectId !== projectId
    );

    // Remove project iterations, workflows, members via repository cleanup
    projectsRepository.delete(projectId);

    return {
      projectId,
      deletedTaskIds: Array.from(taskIds.values()),
      removed: {
        ...preview.related,
        attachments: preview.attachments,
        dependencies: preview.dependencies.length
      }
    };
  }
}

export const deletionService = new DeletionService();

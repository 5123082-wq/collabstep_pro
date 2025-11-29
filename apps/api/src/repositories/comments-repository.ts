import { memory } from '../data/memory';
import { attachmentsRepository } from './files-repository';
import type { FileObject, TaskComment } from '../types';
import { pmPgHydration } from '../storage/pm-pg-bootstrap';
import { deleteCommentFromPg, fetchCommentsByTaskFromPg, isPmDbEnabled, persistCommentToPg } from '../storage/pm-pg-adapter';

// Fire-and-forget hydration; avoids top-level await in CJS builds
void pmPgHydration;

export interface TaskCommentNode extends TaskComment {
  attachmentsFiles: FileObject[];
  children?: TaskCommentNode[];
}

export type CreateCommentInput = {
  projectId: string;
  taskId: string;
  authorId: string;
  body: string;
  mentions?: string[];
  parentId?: string | null;
  attachments?: string[];
  createdAt?: string;
};

export type UpdateCommentInput = {
  body?: string;
  mentions?: string[];
  attachments?: string[];
};

function cloneComment(comment: TaskComment): TaskComment {
  return {
    ...comment,
    mentions: [...comment.mentions],
    attachments: [...comment.attachments]
  };
}

function syncCommentAttachments(comment: TaskComment): void {
  const existing = memory.ATTACHMENTS.filter(
    (attachment) => attachment.linkedEntity === 'comment' && attachment.entityId === comment.id
  );
  const existingIds = new Set(existing.map((attachment) => attachment.fileId));
  const desiredIds = new Set(comment.attachments);

  for (const fileId of comment.attachments) {
    if (!existingIds.has(fileId)) {
      attachmentsRepository.create({
        projectId: comment.projectId,
        fileId,
        linkedEntity: 'comment',
        entityId: comment.id,
        createdBy: comment.authorId
      });
    }
  }

  memory.ATTACHMENTS = memory.ATTACHMENTS.filter((attachment) => {
    if (attachment.linkedEntity !== 'comment') {
      return true;
    }
    if (attachment.entityId !== comment.id) {
      return true;
    }
    return desiredIds.has(attachment.fileId);
  });
}

function cloneFile(file: FileObject): FileObject {
  return { ...file };
}

function withFileAttachments(comment: TaskComment): TaskCommentNode {
  const fileLookup = new Map(memory.FILES.map((file) => [file.id, file] as const));
  const attachmentsFiles = comment.attachments
    .map((fileId) => fileLookup.get(fileId))
    .filter((file): file is FileObject => Boolean(file))
    .map(cloneFile);
  return {
    ...cloneComment(comment),
    attachmentsFiles
  };
}

function buildTree(comments: TaskComment[]): TaskCommentNode[] {
  const nodes = new Map<string, TaskCommentNode>();
  const roots: TaskCommentNode[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, withFileAttachments(comment));
  }

  for (const node of nodes.values()) {
    const parentId = node.parentId;
    if (parentId && nodes.has(parentId)) {
      const parent = nodes.get(parentId);
      if (!parent) {
        continue;
      }
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots.map(compactCommentChildren);
}

function compactCommentChildren(comment: TaskCommentNode): TaskCommentNode {
  if (comment.children && comment.children.length > 0) {
    comment.children = comment.children.map(compactCommentChildren);
  } else {
    delete comment.children;
  }
  return comment;
}

export class CommentsRepository {
  listByTask(projectId: string, taskId: string): TaskCommentNode[] {
    const comments = memory.TASK_COMMENTS.filter(
      (comment) => comment.projectId === projectId && comment.taskId === taskId
    ).map(cloneComment);
    if (comments.length === 0 && isPmDbEnabled()) {
      // Lazy hydrate from Postgres if memory is empty for this task
      void fetchCommentsByTaskFromPg(projectId, taskId)
        .then((fromPg) => {
          if (fromPg.length > 0) {
            for (const comment of fromPg) {
              const exists = memory.TASK_COMMENTS.some((c) => c.id === comment.id);
              if (!exists) {
                memory.TASK_COMMENTS.push(comment);
              }
            }
          }
        })
        .catch((error) => console.error('[CommentsRepository] Failed to fetch comments from Postgres', error));
    }
    return buildTree(comments);
  }

  create(input: CreateCommentInput): TaskCommentNode {
    const now = new Date().toISOString();
    const createdAt = input.createdAt ?? now;
    const comment: TaskComment = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      taskId: input.taskId,
      parentId: input.parentId ?? null,
      body: input.body,
      mentions: Array.isArray(input.mentions) ? [...input.mentions] : [],
      attachments: Array.isArray(input.attachments) ? [...input.attachments] : [],
      authorId: input.authorId,
      createdAt,
      updatedAt: createdAt
    };
    memory.TASK_COMMENTS.push(comment);
    syncCommentAttachments(comment);
    if (isPmDbEnabled()) {
      void persistCommentToPg(comment).catch((error) =>
        console.error('[CommentsRepository] Failed to persist comment', error)
      );
    }
    return withFileAttachments(comment);
  }

  update(commentId: string, patch: UpdateCommentInput): TaskCommentNode | null {
    const match = memory.TASK_COMMENTS.find((comment) => comment.id === commentId);
    if (!match) {
      return null;
    }
    if (patch.body !== undefined) {
      match.body = patch.body;
    }
    if (patch.mentions !== undefined) {
      match.mentions = [...patch.mentions];
    }
    if (patch.attachments !== undefined) {
      match.attachments = [...patch.attachments];
    }
    match.updatedAt = new Date().toISOString();
    syncCommentAttachments(match);
    if (isPmDbEnabled()) {
      void persistCommentToPg(match).catch((error) =>
        console.error('[CommentsRepository] Failed to persist comment update', error)
      );
    }
    return withFileAttachments(match);
  }

  delete(commentId: string): void {
    const idsToRemove = new Set<string>();
    idsToRemove.add(commentId);
    const queue = [commentId];
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) {
        continue;
      }
      for (const comment of memory.TASK_COMMENTS) {
        if (comment.parentId === id) {
          idsToRemove.add(comment.id);
          queue.push(comment.id);
        }
      }
    }
    memory.TASK_COMMENTS = memory.TASK_COMMENTS.filter((comment) => !idsToRemove.has(comment.id));
    memory.ATTACHMENTS = memory.ATTACHMENTS.filter((attachment) => {
      if (attachment.linkedEntity !== 'comment') {
        return true;
      }
      return !idsToRemove.has(attachment.entityId ?? '');
    });
    if (isPmDbEnabled()) {
      for (const id of idsToRemove) {
        void deleteCommentFromPg(id).catch((error) =>
          console.error('[CommentsRepository] Failed to delete comment from Postgres', error)
        );
      }
    }
  }
}

export const commentsRepository = new CommentsRepository();

import { memory } from '../data/memory';
import { pmPgHydration } from '../storage/pm-pg-bootstrap';
import {
  deleteChatMessageFromPg,
  fetchChatMessageByIdFromPg,
  fetchChatMessagesByProjectFromPg,
  isPmDbEnabled,
  persistChatMessageToPg
} from '../storage/pm-pg-adapter';
import { attachmentsRepository } from './files-repository';
import type { FileObject, ProjectChatMessage } from '../types';

export interface ProjectChatMessageWithFiles extends ProjectChatMessage {
  attachmentsFiles: FileObject[];
}

export type CreateChatMessageInput = {
  projectId: string;
  authorId: string;
  body: string;
  attachments?: string[];
  createdAt?: string;
};

export type UpdateChatMessageInput = {
  body?: string;
  attachments?: string[];
};

export type ListChatMessagesOptions = {
  page?: number;
  pageSize?: number;
};

// Kick off optional Postgres hydration without blocking module import
void pmPgHydration;

function cloneMessage(message: ProjectChatMessage): ProjectChatMessage {
  return {
    ...message,
    attachments: [...message.attachments]
  };
}

function cloneFile(file: FileObject): FileObject {
  return { ...file };
}

function syncChatAttachments(message: ProjectChatMessage): void {
  const existing = memory.ATTACHMENTS.filter(
    (attachment) => attachment.linkedEntity === 'project_chat' && attachment.entityId === message.id
  );
  const existingIds = new Set(existing.map((attachment) => attachment.fileId));
  const desiredIds = new Set(message.attachments);

  for (const fileId of message.attachments) {
    if (!existingIds.has(fileId)) {
      attachmentsRepository.create({
        projectId: message.projectId,
        fileId,
        linkedEntity: 'project_chat',
        entityId: message.id,
        createdBy: message.authorId
      });
    }
  }

  memory.ATTACHMENTS = memory.ATTACHMENTS.filter((attachment) => {
    if (attachment.linkedEntity !== 'project_chat') {
      return true;
    }
    if (attachment.entityId !== message.id) {
      return true;
    }
    return desiredIds.has(attachment.fileId);
  });
}

function withFileAttachments(message: ProjectChatMessage): ProjectChatMessageWithFiles {
  const fileLookup = new Map(memory.FILES.map((file) => [file.id, file] as const));
  const attachmentsFiles = message.attachments
    .map((fileId) => fileLookup.get(fileId))
    .filter((file): file is FileObject => Boolean(file))
    .map(cloneFile);
  return {
    ...cloneMessage(message),
    attachmentsFiles
  };
}

export class ProjectChatRepository {
  private hydrateProjectMessages(projectId: string): void {
    if (!isPmDbEnabled()) {
      return;
    }
    const hasMessages = memory.PROJECT_CHAT_MESSAGES.some(
      (message) => message.projectId === projectId
    );
    if (hasMessages) {
      return;
    }
    void fetchChatMessagesByProjectFromPg(projectId)
      .then((fetched) => {
        if (!fetched.length) {
          return;
        }
        const existingIds = new Set(memory.PROJECT_CHAT_MESSAGES.map((item) => item.id));
        const unique = fetched.filter((item) => !existingIds.has(item.id));
        if (unique.length > 0) {
          memory.PROJECT_CHAT_MESSAGES.push(...unique);
        }
      })
      .catch((error) =>
        console.error('[ProjectChatRepository] Failed to hydrate chat messages from Postgres', error)
      );
  }

  listByProject(projectId: string, options?: ListChatMessagesOptions): {
    messages: ProjectChatMessageWithFiles[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  } {
    this.hydrateProjectMessages(projectId);

    const allMessages = memory.PROJECT_CHAT_MESSAGES.filter(
      (message) => message.projectId === projectId
    )
      .map(cloneMessage)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Новые сначала

    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 50;
    const total = allMessages.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const paginated = allMessages.slice(start, start + pageSize);

    return {
      messages: paginated.map(withFileAttachments),
      pagination: { page, pageSize, total, totalPages }
    };
  }

  create(input: CreateChatMessageInput): ProjectChatMessageWithFiles {
    const now = new Date().toISOString();
    const createdAt = input.createdAt ?? now;
    const message: ProjectChatMessage = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      authorId: input.authorId,
      body: input.body,
      attachments: Array.isArray(input.attachments) ? [...input.attachments] : [],
      createdAt,
      updatedAt: createdAt
    };
    memory.PROJECT_CHAT_MESSAGES.push(message);
    syncChatAttachments(message);
    if (isPmDbEnabled()) {
      void persistChatMessageToPg(message).catch((error) =>
        console.error('[ProjectChatRepository] Failed to persist chat message', error)
      );
    }
    return withFileAttachments(message);
  }

  update(messageId: string, patch: UpdateChatMessageInput): ProjectChatMessageWithFiles | null {
    const match = memory.PROJECT_CHAT_MESSAGES.find((message) => message.id === messageId);
    if (!match) {
      return null;
    }
    if (patch.body !== undefined) {
      match.body = patch.body;
    }
    if (patch.attachments !== undefined) {
      match.attachments = [...patch.attachments];
    }
    match.updatedAt = new Date().toISOString();
    syncChatAttachments(match);
    if (isPmDbEnabled()) {
      void persistChatMessageToPg(match).catch((error) =>
        console.error('[ProjectChatRepository] Failed to persist updated chat message', error)
      );
    }
    return withFileAttachments(match);
  }

  delete(messageId: string): void {
    memory.PROJECT_CHAT_MESSAGES = memory.PROJECT_CHAT_MESSAGES.filter(
      (message) => message.id !== messageId
    );
    memory.ATTACHMENTS = memory.ATTACHMENTS.filter((attachment) => {
      if (attachment.linkedEntity !== 'project_chat') {
        return true;
      }
      return attachment.entityId !== messageId;
    });
    if (isPmDbEnabled()) {
      void deleteChatMessageFromPg(messageId).catch((error) =>
        console.error('[ProjectChatRepository] Failed to delete chat message in Postgres', error)
      );
    }
  }

  findById(messageId: string): ProjectChatMessageWithFiles | null {
    const message = memory.PROJECT_CHAT_MESSAGES.find((m) => m.id === messageId);
    if (!message) {
      if (isPmDbEnabled()) {
        void fetchChatMessageByIdFromPg(messageId)
          .then((fetched) => {
            if (fetched) {
              memory.PROJECT_CHAT_MESSAGES.push(fetched);
            }
          })
          .catch((error) =>
            console.error('[ProjectChatRepository] Failed to fetch chat message from Postgres', error)
          );
      }
      return null;
    }
    return withFileAttachments(message);
  }
}

export const projectChatRepository = new ProjectChatRepository();


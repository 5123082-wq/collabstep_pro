import { memory } from '../data/memory';
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
  listByProject(projectId: string, options?: ListChatMessagesOptions): {
    messages: ProjectChatMessageWithFiles[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  } {
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
  }

  findById(messageId: string): ProjectChatMessageWithFiles | null {
    const message = memory.PROJECT_CHAT_MESSAGES.find((m) => m.id === messageId);
    if (!message) {
      return null;
    }
    return withFileAttachments(message);
  }
}

export const projectChatRepository = new ProjectChatRepository();


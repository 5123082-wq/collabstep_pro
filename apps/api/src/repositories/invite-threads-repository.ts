import { memory } from '../data/memory';
import type {
  ID,
  InviteThread,
  InviteThreadMessage,
  InviteThreadParticipant,
  InviteThreadParticipantRole
} from '../types';

export type CreateInviteThreadInput = {
  orgInviteId: ID;
  organizationId: ID;
  createdByUserId: ID;
  inviteeUserId?: ID;
  inviteeEmail?: string;
  previewProjectIds?: ID[];
};

export type EnsureInviteThreadForInviteInput = CreateInviteThreadInput;

export type ListInviteThreadMessagesOptions = {
  page?: number;
  pageSize?: number;
};

export type CreateInviteThreadMessageInput = {
  threadId: ID;
  authorId: ID;
  body: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function cloneThread(thread: InviteThread): InviteThread {
  return { ...thread };
}

function cloneMessage(message: InviteThreadMessage): InviteThreadMessage {
  return { ...message };
}

function createParticipant(input: {
  threadId: ID;
  role: InviteThreadParticipantRole;
  userId?: ID;
  email?: string;
  createdAt: string;
}): InviteThreadParticipant {
  return {
    id: crypto.randomUUID(),
    threadId: input.threadId,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.email ? { email: input.email } : {}),
    role: input.role,
    createdAt: input.createdAt
  };
}

export class InviteThreadsRepository {
  createThread(input: CreateInviteThreadInput): InviteThread {
    const createdAt = nowIso();
    const thread: InviteThread = {
      id: crypto.randomUUID(),
      orgInviteId: input.orgInviteId,
      organizationId: input.organizationId,
      createdByUserId: input.createdByUserId,
      ...(input.inviteeUserId ? { inviteeUserId: input.inviteeUserId } : {}),
      ...(input.inviteeEmail ? { inviteeEmail: input.inviteeEmail } : {}),
      ...(input.previewProjectIds && input.previewProjectIds.length
        ? { previewProjectIds: [...new Set(input.previewProjectIds)] }
        : {}),
      createdAt,
      updatedAt: createdAt
    };

    memory.INVITE_THREADS.push(thread);

    // Participants (MVP): inviter is admin, invitee is member (by userId or email).
    memory.INVITE_THREAD_PARTICIPANTS.push(
      createParticipant({
        threadId: thread.id,
        role: 'admin',
        userId: input.createdByUserId,
        createdAt
      })
    );

    if (input.inviteeUserId || input.inviteeEmail) {
      memory.INVITE_THREAD_PARTICIPANTS.push(
        createParticipant({
          threadId: thread.id,
          role: 'member',
          ...(input.inviteeUserId ? { userId: input.inviteeUserId } : {}),
          ...(input.inviteeEmail ? { email: input.inviteeEmail } : {}),
          createdAt
        })
      );
    }

    return cloneThread(thread);
  }

  ensureThreadForInvite(input: EnsureInviteThreadForInviteInput): InviteThread {
    const existing = memory.INVITE_THREADS.find((t) => t.orgInviteId === input.orgInviteId);
    if (existing) {
      return cloneThread(existing);
    }
    return this.createThread(input);
  }

  listThreadsForUser(userId: ID, email?: string): InviteThread[] {
    const participantThreadIds = new Set(
      memory.INVITE_THREAD_PARTICIPANTS
        .filter((p) => p.userId === userId || (email ? p.email === email : false))
        .map((p) => p.threadId)
    );

    return memory.INVITE_THREADS
      .filter((t) => participantThreadIds.has(t.id))
      .map(cloneThread)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  listMessages(threadId: ID, options?: ListInviteThreadMessagesOptions): {
    messages: InviteThreadMessage[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  } {
    const all = memory.INVITE_THREAD_MESSAGES
      .filter((m) => m.threadId === threadId)
      .map(cloneMessage)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 50;
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const messages = all.slice(start, start + pageSize);

    return { messages, pagination: { page, pageSize, total, totalPages } };
  }

  createMessage(input: CreateInviteThreadMessageInput): InviteThreadMessage {
    const body = input.body.trim();
    if (!body) {
      throw new Error('Message body is required');
    }

    const createdAt = nowIso();
    const message: InviteThreadMessage = {
      id: crypto.randomUUID(),
      threadId: input.threadId,
      authorId: input.authorId,
      body,
      createdAt
    };
    memory.INVITE_THREAD_MESSAGES.push(message);

    const thread = memory.INVITE_THREADS.find((t) => t.id === input.threadId);
    if (thread) {
      thread.updatedAt = createdAt;
    }

    return cloneMessage(message);
  }

  addParticipant(): never {
    // TODO: Planned extension after MVP (see invites-messaging-implementation-plan.md)
    throw new Error('Not implemented');
  }
}

export const inviteThreadsRepository = new InviteThreadsRepository();



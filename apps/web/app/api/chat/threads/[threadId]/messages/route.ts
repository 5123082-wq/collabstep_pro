'use server';

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getProjectRole } from '@/lib/api/finance-access';
import { flags } from '@/lib/flags';
import {
  commentsRepository,
  projectChatRepository,
  projectsRepository,
  tasksRepository,
  usersRepository,
  type TaskCommentNode
} from '@collabverse/api';
import { broadcastToProject } from '@/lib/websocket/event-broadcaster';
import { getCurrentSession } from '@/lib/auth/session';
import { decodeDemoSession, DEMO_SESSION_COOKIE, isDemoAdminEmail } from '@/lib/auth/demo-session';

type AuthContext = {
  userId: string;
  email: string;
  role: 'owner' | 'member';
};

async function getAuthFromRequest(req: NextRequest): Promise<AuthContext | null> {
  // 1) Prefer NextAuth session (real users)
  const session = await getCurrentSession();
  const sessionUserId = session?.user?.id;
  const sessionEmail = session?.user?.email;
  if (sessionUserId && sessionEmail) {
    const isAdmin = session?.user?.role === 'admin' || isDemoAdminEmail(sessionEmail);
    return { userId: sessionUserId, email: sessionEmail, role: isAdmin ? 'owner' : 'member' };
  }

  // 2) Fallback to legacy/demo cookie
  const sessionCookie = req.cookies.get(DEMO_SESSION_COOKIE);
  const demoSession = decodeDemoSession(sessionCookie?.value ?? null);
  if (!demoSession) {
    return null;
  }
  const isAdmin = demoSession.role === 'admin' || isDemoAdminEmail(demoSession.email);
  return { userId: demoSession.userId, email: demoSession.email, role: isAdmin ? 'owner' : 'member' };
}

function parseThreadId(threadId: string): { kind: 'project' | 'task'; id: string } | null {
  if (threadId.startsWith('project-')) {
    return { kind: 'project', id: threadId.replace('project-', '') };
  }
  if (threadId.startsWith('task-')) {
    return { kind: 'task', id: threadId.replace('task-', '') };
  }
  return null;
}

function flattenComments(comments: TaskCommentNode[]): TaskCommentNode[] {
  const result: TaskCommentNode[] = [];
  for (const c of comments) {
    result.push(c);
    if (c.children && Array.isArray(c.children)) {
      result.push(...flattenComments(c.children));
    }
  }
  return result;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const parsed = parseThreadId(params.threadId);
  if (!parsed) {
    return jsonError('THREAD_NOT_FOUND', { status: 404 });
  }

  try {
    if (parsed.kind === 'project') {
      const project = await projectsRepository.findById(parsed.id);
      if (!project) return jsonError('PROJECT_NOT_FOUND', { status: 404 });
      const hasAccess = await projectsRepository.hasAccess(parsed.id, auth.userId);
      if (!hasAccess) return jsonError('ACCESS_DENIED', { status: 403 });

      const url = new URL(req.url);
      const page = Number(url.searchParams.get('page') ?? '1');
      const pageSize = Number(url.searchParams.get('pageSize') ?? '50');
      const result = projectChatRepository.listByProject(parsed.id, { page, pageSize });
      const messagesWithAuthors = await Promise.all(
        result.messages.map(async (message) => {
          const author = await usersRepository.findById(message.authorId);
          return {
            ...message,
            author: author
              ? {
                  id: author.id,
                  name: author.name,
                  email: author.email,
                  avatarUrl: author.avatarUrl
                }
              : null
          };
        })
      );
      return jsonOk({ messages: messagesWithAuthors, pagination: result.pagination });
    }

    // task
    const tasks = await tasksRepository.list();
    const task = tasks.find((t) => t.id === parsed.id);
    if (!task) return jsonError('TASK_NOT_FOUND', { status: 404 });
    const hasAccess = await projectsRepository.hasAccess(task.projectId, auth.userId);
    if (!hasAccess) return jsonError('ACCESS_DENIED', { status: 403 });
    const commentsTree = commentsRepository.listByTask(task.projectId, parsed.id);
    const flat = flattenComments(commentsTree);
    const messages = await Promise.all(
      flat.map(async (comment) => {
        const author = await usersRepository.findById(comment.authorId);
        return {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt ?? comment.updatedAt ?? new Date().toISOString(),
          author: author
            ? {
                id: author.id,
                name: author.name,
                email: author.email,
                avatarUrl: author.avatarUrl
              }
            : null
        };
      })
    );
    return jsonOk({ messages, pagination: { page: 1, pageSize: messages.length, total: messages.length, totalPages: 1 } });
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

async function extractMessageBody(req: NextRequest): Promise<string> {
  try {
    const raw = await req.text();
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.body === 'string') {
        return parsed.body;
      }
    } catch {
      // raw не является JSON — используем его напрямую
    }
    return raw;
  } catch {
    return '';
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const parsed = parseThreadId(params.threadId);
  if (!parsed) return jsonError('THREAD_NOT_FOUND', { status: 404 });

  try {
    const messageBody = (await extractMessageBody(req)).trim();
    if (!messageBody || messageBody.length === 0) {
      return jsonError('Message body must not be empty', { status: 400 });
    }

    if (parsed.kind === 'project') {
      const project = await projectsRepository.findById(parsed.id);
      if (!project) return jsonError('PROJECT_NOT_FOUND', { status: 404 });
      const hasAccess = await projectsRepository.hasAccess(parsed.id, auth.userId);
      if (!hasAccess) return jsonError('ACCESS_DENIED', { status: 403 });

      const message = projectChatRepository.create({
        projectId: parsed.id,
        authorId: auth.userId,
        body: messageBody.trim(),
        attachments: []
      });
      const author = await usersRepository.findById(message.authorId);
      const enriched = {
        ...message,
        author: author
          ? {
              id: author.id,
              name: author.name,
              email: author.email,
              avatarUrl: author.avatarUrl
            }
          : null
      };
      await broadcastToProject(parsed.id, 'chat.message', { message: enriched, projectId: parsed.id });
      return jsonOk({ message: enriched });
    }

    // task
    const tasks = await tasksRepository.list();
    const task = tasks.find((t) => t.id === parsed.id);
    if (!task) return jsonError('TASK_NOT_FOUND', { status: 404 });
    const hasAccess = await projectsRepository.hasAccess(task.projectId, auth.userId);
    if (!hasAccess) return jsonError('ACCESS_DENIED', { status: 403 });

    const created = commentsRepository.create({
      taskId: task.id,
      projectId: task.projectId,
      authorId: auth.userId,
      body: messageBody.trim(),
      mentions: [],
      attachments: []
    });
    const author = await usersRepository.findById(created.authorId);
    const enriched = {
      ...created,
      author: author
        ? { id: author.id, name: author.name, email: author.email, avatarUrl: author.avatarUrl }
        : null
    };
    await broadcastToProject(task.projectId, 'comment.added', { comment: enriched, taskId: task.id, projectId: task.projectId });
    return jsonOk({ message: enriched });
  } catch (error) {
    console.error('Error creating thread message:', error);
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', { status: 400 });
    }
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { threadId: string; messageId: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError('UNAUTHORIZED', { status: 401 });

  const parsed = parseThreadId(params.threadId);
  if (!parsed) return jsonError('THREAD_NOT_FOUND', { status: 404 });

  try {
    const messageBody = (await extractMessageBody(req)).trim();
    if (!messageBody || messageBody.length === 0) {
      return jsonError('Message body must not be empty', { status: 400 });
    }

    if (parsed.kind === 'project') {
      const project = await projectsRepository.findById(parsed.id);
      if (!project) return jsonError('PROJECT_NOT_FOUND', { status: 404 });
      const hasAccess = await projectsRepository.hasAccess(parsed.id, auth.userId);
      if (!hasAccess) return jsonError('ACCESS_DENIED', { status: 403 });
      const role = await getProjectRole(parsed.id, auth.userId);

      const message = projectChatRepository.findById(params.messageId);
      if (!message || message.projectId !== parsed.id) return jsonError('MESSAGE_NOT_FOUND', { status: 404 });
      const isAuthor = message.authorId === auth.userId;
      const isOwnerOrAdmin = role === 'owner' || role === 'admin';
      if (!isAuthor && !isOwnerOrAdmin) return jsonError('ACCESS_DENIED', { status: 403 });

      const updated = projectChatRepository.update(params.messageId, { body: messageBody.trim() });
      if (!updated) return jsonError('MESSAGE_NOT_FOUND', { status: 404 });
      const author = await usersRepository.findById(updated.authorId);
      const enriched = {
        ...updated,
        author: author
          ? { id: author.id, name: author.name, email: author.email, avatarUrl: author.avatarUrl }
          : null
      };
      await broadcastToProject(parsed.id, 'chat.message', { message: enriched, projectId: parsed.id });
      return jsonOk({ message: enriched });
    }

    const tasks = await tasksRepository.list();
    const task = tasks.find((t) => t.id === parsed.id);
    if (!task) return jsonError('TASK_NOT_FOUND', { status: 404 });
    const hasAccess = await projectsRepository.hasAccess(task.projectId, auth.userId);
    if (!hasAccess) return jsonError('ACCESS_DENIED', { status: 403 });
    const role = await getProjectRole(task.projectId, auth.userId);

    const comments = flattenComments(commentsRepository.listByTask(task.projectId, parsed.id));
    const comment = comments.find((c) => c.id === params.messageId);
    if (!comment) return jsonError('MESSAGE_NOT_FOUND', { status: 404 });
    const isAuthor = comment.authorId === auth.userId;
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';
    if (!isAuthor && !isOwnerOrAdmin) return jsonError('ACCESS_DENIED', { status: 403 });

    const updated = commentsRepository.update(params.messageId, { body: messageBody.trim() });
    if (!updated) return jsonError('MESSAGE_NOT_FOUND', { status: 404 });
    const author = await usersRepository.findById(updated.authorId);
    const enriched = {
      ...updated,
      author: author
        ? { id: author.id, name: author.name, email: author.email, avatarUrl: author.avatarUrl }
        : null
    };
    await broadcastToProject(task.projectId, 'comment.updated', { comment: enriched, taskId: task.id, projectId: task.projectId });
    return jsonOk({ message: enriched });
  } catch (error) {
    console.error('Error updating thread message:', error);
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', { status: 400 });
    }
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { threadId: string; messageId: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError('UNAUTHORIZED', { status: 401 });

  const parsed = parseThreadId(params.threadId);
  if (!parsed) return jsonError('THREAD_NOT_FOUND', { status: 404 });

  try {
    if (parsed.kind === 'project') {
      const project = await projectsRepository.findById(parsed.id);
      if (!project) return jsonError('PROJECT_NOT_FOUND', { status: 404 });
      const hasAccess = await projectsRepository.hasAccess(parsed.id, auth.userId);
      if (!hasAccess) return jsonError('ACCESS_DENIED', { status: 403 });
      const role = await getProjectRole(parsed.id, auth.userId);

      const message = projectChatRepository.findById(params.messageId);
      if (!message || message.projectId !== parsed.id) return jsonError('MESSAGE_NOT_FOUND', { status: 404 });
      const isAuthor = message.authorId === auth.userId;
      const isOwnerOrAdmin = role === 'owner' || role === 'admin';
      if (!isAuthor && !isOwnerOrAdmin) return jsonError('ACCESS_DENIED', { status: 403 });

      projectChatRepository.delete(params.messageId);
      await broadcastToProject(parsed.id, 'chat.message.deleted', { messageId: params.messageId, projectId: parsed.id });
      return jsonOk({ ok: true });
    }

    const tasks = await tasksRepository.list();
    const task = tasks.find((t) => t.id === parsed.id);
    if (!task) return jsonError('TASK_NOT_FOUND', { status: 404 });
    const hasAccess = await projectsRepository.hasAccess(task.projectId, auth.userId);
    if (!hasAccess) return jsonError('ACCESS_DENIED', { status: 403 });
    const role = await getProjectRole(task.projectId, auth.userId);

    const comments = flattenComments(commentsRepository.listByTask(task.projectId, parsed.id));
    const comment = comments.find((c) => c.id === params.messageId);
    if (!comment) return jsonError('MESSAGE_NOT_FOUND', { status: 404 });
    const isAuthor = comment.authorId === auth.userId;
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';
    if (!isAuthor && !isOwnerOrAdmin) return jsonError('ACCESS_DENIED', { status: 403 });

    commentsRepository.delete(params.messageId);
    await broadcastToProject(task.projectId, 'comment.deleted', { commentId: params.messageId, taskId: task.id, projectId: task.projectId });
    return jsonOk({ ok: true });
  } catch (error) {
    console.error('Error deleting thread message:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

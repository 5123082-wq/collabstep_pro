'use server';

import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { projectsRepository, projectChatRepository, usersRepository } from '@collabverse/api';
import { broadcastToProject } from '@/lib/websocket/event-broadcaster';
import { getCurrentSession } from '@/lib/auth/session';
import { decodeDemoSession, DEMO_SESSION_COOKIE, isDemoAdminEmail } from '@/lib/auth/demo-session';

type AuthContext = {
  userId: string;
  email: string;
  role: 'owner' | 'member';
};

async function getAuthFromRequest(req: NextRequest): Promise<AuthContext | null> {
  const session = await getCurrentSession();
  const sessionUserId = session?.user?.id;
  const sessionEmail = session?.user?.email;
  if (sessionUserId && sessionEmail) {
    const isAdmin = session?.user?.role === 'admin' || isDemoAdminEmail(sessionEmail);
    return { userId: sessionUserId, email: sessionEmail, role: isAdmin ? 'owner' : 'member' };
  }

  const sessionCookie = req.cookies.get(DEMO_SESSION_COOKIE);
  const demoSession = decodeDemoSession(sessionCookie?.value ?? null);
  if (!demoSession) {
    return null;
  }
  const isAdmin = demoSession.role === 'admin' || isDemoAdminEmail(demoSession.email);
  return { userId: demoSession.userId, email: demoSession.email, role: isAdmin ? 'owner' : 'member' };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;
  const messageId = params.messageId;

  try {
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    const role = await getProjectRole(projectId, auth.userId);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    const body = await req.json();
    const { body: messageBody } = body;
    if (!messageBody || typeof messageBody !== 'string' || messageBody.trim().length === 0) {
      return jsonError('Message body must not be empty', { status: 400 });
    }

    const message = projectChatRepository.findById(messageId);
    if (!message || message.projectId !== projectId) {
      return jsonError('MESSAGE_NOT_FOUND', { status: 404 });
    }

    const isAuthor = message.authorId === auth.userId;
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';
    if (!isAuthor && !isOwnerOrAdmin) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    const updated = projectChatRepository.update(messageId, { body: messageBody.trim() });
    if (!updated) {
      return jsonError('MESSAGE_NOT_FOUND', { status: 404 });
    }

    const author = await usersRepository.findById(updated.authorId);
    const enriched = {
      ...updated,
      author: author
        ? {
            id: author.id,
            name: author.name,
            email: author.email,
            avatarUrl: author.avatarUrl
          }
        : null
    };

    await broadcastToProject(projectId, 'chat.message', { message: enriched, projectId });

    return jsonOk({ message: enriched });
  } catch (error) {
    console.error('Error updating project chat message:', error);
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', { status: 400 });
    }
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;
  const messageId = params.messageId;

  try {
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    const role = await getProjectRole(projectId, auth.userId);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    const message = projectChatRepository.findById(messageId);
    if (!message || message.projectId !== projectId) {
      return jsonError('MESSAGE_NOT_FOUND', { status: 404 });
    }

    const isAuthor = message.authorId === auth.userId;
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';
    if (!isAuthor && !isOwnerOrAdmin) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    projectChatRepository.delete(messageId);

    await broadcastToProject(projectId, 'chat.message.deleted', { messageId, projectId });

    return jsonOk({ ok: true });
  } catch (error) {
    console.error('Error deleting project chat message:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

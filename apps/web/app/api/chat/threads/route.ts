'use server';

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';
import { projectsRepository, tasksRepository } from '@collabverse/api';
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const threads: Array<{
      id: string;
      title: string;
      preview: string;
      updatedAt: string;
      tags: string[];
      participants: string[];
    }> = [];

    // Сначала определяем доступные проекты
    const allProjects = await projectsRepository.list();
    const accessChecks = await Promise.all(
      allProjects.map(async (project) => ({
        project,
        hasAccess: await projectsRepository.hasAccess(project.id, auth.userId)
      }))
    );
    const accessibleProjects = accessChecks.filter((item) => item.hasAccess).map((item) => item.project);
    const accessibleProjectIds = new Set(accessibleProjects.map((p) => p.id));

    // Добавляем треды только для доступных проектов
    for (const project of accessibleProjects) {
      threads.push({
        id: `project-${project.id}`,
        title: project.title || 'Проект',
        preview: 'Чат проекта',
        updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
        tags: ['Проект'],
        participants: []
      });
    }

    // Добавляем треды только для задач доступных проектов
    const allTasks = await tasksRepository.list();
    for (const task of allTasks) {
      if (!accessibleProjectIds.has(task.projectId)) {
        continue;
      }
      threads.push({
        id: `task-${task.id}`,
        title: task.title || 'Задача',
        preview: 'Чат задачи',
        updatedAt: task.updatedAt || task.createdAt || new Date().toISOString(),
        tags: ['Задача'],
        participants: []
      });
    }

    return jsonOk({ threads });
  } catch (error) {
    console.error('Error fetching chat threads:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

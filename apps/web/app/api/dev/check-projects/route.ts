import { NextRequest } from 'next/server';
import { projectsRepository, tasksRepository } from '@collabverse/api';
import { jsonOk } from '@/lib/api/http';
import { getAuthFromRequest } from '@/lib/api/finance-access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Проверяем, что это dev окружение
  if (process.env.NODE_ENV === 'production') {
    return jsonOk({ error: 'Not allowed in production' });
  }

  const auth = getAuthFromRequest(request);
  const allProjects = await projectsRepository.list();
  const allTasks = await tasksRepository.list();

  // Проверяем доступ для каждого проекта
  const projectsWithAccess = await Promise.all(allProjects.map(async (p) => {
    const hasAccess = auth ? await projectsRepository.hasAccess(p.id, auth.userId) : false;
    return {
      id: p.id,
      key: p.key,
      title: p.title,
      status: p.status,
      visibility: p.visibility,
      ownerId: p.ownerId,
      workspaceId: p.workspaceId,
      hasAccess,
      currentUserId: auth?.userId
    };
  }));

  return jsonOk({
    currentUser: auth?.userId || 'not authenticated',
    projectsCount: allProjects.length,
    tasksCount: allTasks.length,
    projects: projectsWithAccess,
    tasks: allTasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      status: t.status,
      number: t.number
    }))
  });
}


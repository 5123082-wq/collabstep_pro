import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { projectsRepository, usersRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Проверка feature flag
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  // Проверка авторизации
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;

  try {
    // Проверка доступа к проекту
    const role = getProjectRole(projectId, auth.userId);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Получение участников проекта
    const members = projectsRepository.listMembers(projectId);

    // Получение информации о пользователях
    const users = await Promise.all(members.map(async (member) => {
      const user = await usersRepository.findById(member.userId);
      return {
        id: member.userId,
        name: user?.name || member.userId.split('@')[0],
        email: member.userId,
        role: member.role
      };
    }));

    // Добавляем владельца проекта, если его нет в списке участников
    const project = projectsRepository.findById(projectId);
    if (project) {
      const ownerExists = members.some((m) => m.userId === project.ownerId);
      if (!ownerExists) {
        const owner = await usersRepository.findById(project.ownerId);
        users.unshift({
          id: project.ownerId,
          name: owner?.name || project.ownerId.split('@')[0],
          email: project.ownerId,
          role: 'owner'
        });
      }
    }

    return jsonOk({ members: users });
  } catch (error) {
    console.error('Error fetching project members:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

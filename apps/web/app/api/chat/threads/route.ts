'use server';

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAuthFromRequestWithSession 
} from "@/lib/api/finance-access";
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';
import { projectsRepository, tasksRepository } from '@collabverse/api';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(req);
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

'use server';

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { flags } from '@/lib/flags';
import { projectsRepository, tasksRepository } from '@collabverse/api';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
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

    // Все проекты (допускаем, что доступ уже регулируется elsewhere; здесь не фильтруем viewer)
    for (const project of projectsRepository.list()) {
      threads.push({
        id: `project-${project.id}`,
        title: project.title || 'Проект',
        preview: 'Чат проекта',
        updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
        tags: ['Проект'],
        participants: []
      });
    }

    // Все задачи (добавляем как отдельные треды)
    for (const task of tasksRepository.list()) {
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

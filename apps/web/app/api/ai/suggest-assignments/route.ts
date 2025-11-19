/**
 * API endpoint для рекомендаций по назначению задач
 * 
 * POST /api/ai/suggest-assignments
 * 
 * Предлагает оптимальное назначение задач участникам проекта
 */

import { NextRequest } from 'next/server';
import { generateText } from '@/lib/ai/client';
import { 
  suggestTaskAssignments,
  type AssignmentRecommendation 
} from '@collabverse/api/services/ai-planning-service';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { projectsRepository, tasksRepository } from '@collabverse/api';

/**
 * Адаптер для использования AI клиента в сервисе
 */
const aiClientAdapter = {
  generateText: async (
    prompt: string, 
    options?: { maxTokens?: number; temperature?: number; systemPrompt?: string }
  ) => {
    return await generateText(prompt, options);
  }
};

export async function POST(req: NextRequest) {
  try {
    // Проверка авторизации
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return jsonError('UNAUTHORIZED', { status: 401 });
    }

    // Парсинг тела запроса
    const body = await req.json();
    const { projectId, taskIds } = body;

    // Валидация
    if (!projectId || typeof projectId !== 'string') {
      return jsonError('INVALID_REQUEST', { 
        status: 400,
        message: 'projectId is required and must be a string'
      });
    }

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return jsonError('INVALID_REQUEST', { 
        status: 400,
        message: 'taskIds is required and must be a non-empty array'
      });
    }

    if (taskIds.length > 50) {
      return jsonError('INVALID_REQUEST', { 
        status: 400,
        message: 'Too many tasks (max 50 tasks at once)'
      });
    }

    // Получение проекта
    const project = projectsRepository.findById(projectId);

    if (!project) {
      return jsonError('NOT_FOUND', { 
        status: 404,
        message: 'Project not found'
      });
    }

    // Проверка прав доступа
    const members = projectsRepository.listMembers(projectId);
    const currentMember = members.find(m => m.userId === auth.userId);
    
    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return jsonError('FORBIDDEN', { 
        status: 403,
        message: 'Only project owners and admins can request assignment suggestions'
      });
    }

    // Получение задач
    const tasks = taskIds
      .map(id => tasksRepository.findById(id))
      .filter(t => t !== undefined && t.projectId === projectId);

    if (tasks.length === 0) {
      return jsonError('INVALID_REQUEST', { 
        status: 400,
        message: 'No valid tasks found'
      });
    }

    // Подсчет текущей загруженности участников
    const allProjectTasks = tasksRepository.listByProject(projectId);
    const memberWorkload = new Map<string, number>();
    
    allProjectTasks.forEach(t => {
      if (t.assigneeId && t.status !== 'done') {
        memberWorkload.set(t.assigneeId, (memberWorkload.get(t.assigneeId) || 0) + 1);
      }
    });

    // Получение информации об участниках
    const membersWithInfo = members.map(m => ({
      userId: m.userId,
      userName: `User ${m.userId.substring(0, 8)}`, // В реальности получать из users-repository
      currentTasksCount: memberWorkload.get(m.userId) || 0,
      skills: [], // TODO: Можно добавить систему навыков
      availability: 100 // TODO: Можно добавить календарь доступности
    }));

    // Генерация рекомендаций
    const recommendations: AssignmentRecommendation[] = await suggestTaskAssignments(
      aiClientAdapter,
      tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        estimatedTime: t.estimatedTime || undefined
      })),
      membersWithInfo
    );

    return jsonOk({ 
      projectId,
      recommendations,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error suggesting task assignments:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return jsonError('AI_SERVICE_ERROR', { 
          status: 503,
          message: 'AI service is not configured'
        });
      }
      
      if (error.message.includes('rate limit')) {
        return jsonError('AI_SERVICE_ERROR', { 
          status: 429,
          message: 'AI service rate limit exceeded'
        });
      }
    }

    return jsonError('AI_SERVICE_ERROR', { 
      status: 500,
      message: 'Failed to suggest task assignments'
    });
  }
}


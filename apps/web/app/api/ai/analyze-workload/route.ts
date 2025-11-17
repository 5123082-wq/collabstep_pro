/**
 * API endpoint для анализа загруженности команды
 * 
 * POST /api/ai/analyze-workload
 * 
 * Анализирует загруженность участников проекта и предлагает оптимизации
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai/client';
import { 
  analyzeWorkload,
  type WorkloadAnalysis 
} from '@/api/src/services/ai-planning-service';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getProjectsRepository } from '@/api/src/repositories/projects-repository';
import { getTasksRepository } from '@/api/src/repositories/tasks-repository';

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
    const { projectId } = body;

    // Валидация
    if (!projectId || typeof projectId !== 'string') {
      return jsonError('INVALID_REQUEST', { 
        status: 400,
        message: 'projectId is required and must be a string'
      });
    }

    // Получение проекта
    const projectsRepo = getProjectsRepository();
    const project = projectsRepo.findById(projectId);

    if (!project) {
      return jsonError('NOT_FOUND', { 
        status: 404,
        message: 'Project not found'
      });
    }

    // Проверка прав доступа
    const members = projectsRepo.listMembers(projectId);
    const currentMember = members.find(m => m.userId === auth.userId);
    
    if (!currentMember) {
      return jsonError('FORBIDDEN', { 
        status: 403,
        message: 'You do not have access to this project'
      });
    }

    // Получение задач проекта
    const tasksRepo = getTasksRepository();
    const tasks = tasksRepo.listByProject(projectId);

    // Получение информации об участниках
    const membersWithNames = members.map(m => {
      // В реальности нужно получить имена из users-repository
      // Пока используем userId как userName
      return {
        userId: m.userId,
        userName: `User ${m.userId.substring(0, 8)}`
      };
    });

    // Анализ загруженности
    const analysis: WorkloadAnalysis = await analyzeWorkload(
      aiClientAdapter,
      tasks.map(t => ({
        id: t.id,
        title: t.title,
        assigneeId: t.assigneeId,
        status: t.status,
        estimatedTime: t.estimatedTime || undefined,
        dueAt: t.dueAt,
        priority: t.priority
      })),
      membersWithNames
    );

    return jsonOk({ 
      projectId,
      analysis,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing workload:', error);
    
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
      message: 'Failed to analyze workload'
    });
  }
}


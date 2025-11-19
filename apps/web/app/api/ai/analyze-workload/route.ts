/**
 * API endpoint для анализа загруженности команды
 * 
 * POST /api/ai/analyze-workload
 * 
 * Анализирует загруженность участников проекта и предлагает оптимизации
 */

import { NextRequest } from 'next/server';
import { generateText } from '@/lib/ai/client';
import {
  analyzeWorkload,
  type WorkloadAnalysis
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
    const { projectId } = body;

    // Валидация
    if (!projectId || typeof projectId !== 'string') {
      return jsonError('INVALID_REQUEST', {
        status: 400
      });
    }

    // Получение проекта
    const project = projectsRepository.findById(projectId);

    if (!project) {
      return jsonError('NOT_FOUND', {
        status: 404
      });
    }

    // Проверка прав доступа
    const members = projectsRepository.listMembers(projectId);
    const currentMember = members.find(m => m.userId === auth.userId);

    if (!currentMember) {
      return jsonError('FORBIDDEN', {
        status: 403
      });
    }

    // Получение задач проекта
    const tasks = tasksRepository.listByProject(projectId);

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
        ...(t.assigneeId ? { assigneeId: t.assigneeId } : {}),
        status: t.status,
        ...(t.estimatedTime ? { estimatedTime: t.estimatedTime } : {}),
        ...(t.dueAt ? { dueAt: t.dueAt } : {}),
        ...(t.priority ? { priority: t.priority } : {})
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
          status: 503
        });
      }

      if (error.message.includes('rate limit')) {
        return jsonError('AI_SERVICE_ERROR', {
          status: 429
        });
      }
    }

    return jsonError('AI_SERVICE_ERROR', {
      status: 500
    });
  }
}


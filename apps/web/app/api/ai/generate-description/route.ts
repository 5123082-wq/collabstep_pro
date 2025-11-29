import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { generateText } from '@/lib/ai/client';
import { generateTaskDescription } from '@collabverse/api/services/ai-service';
import { projectsRepository } from '@collabverse/api';

/**
 * POST /api/ai/generate-description
 * 
 * Генерирует описание задачи через AI
 * 
 * Body:
 * - taskTitle: string (обязательно) - Название задачи
 * - projectId: string (опционально) - ID проекта для контекста
 * 
 * Response:
 * - description: string - Сгенерированное описание задачи
 */
export async function POST(req: NextRequest) {
  // Проверка авторизации
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    // Парсинг body
    const body = await req.json();
    const { taskTitle, projectId } = body;

    // Валидация
    if (!taskTitle || typeof taskTitle !== 'string' || taskTitle.trim().length === 0) {
      return jsonError('INVALID_REQUEST', {
        status: 400
      });
    }

    if (taskTitle.length > 200) {
      return jsonError('INVALID_REQUEST', {
        status: 400
      });
    }

    // Получение контекста проекта (если указан projectId)
    let projectContext: { projectName?: string; projectDescription?: string } = {};

    if (projectId) {
      const project = await projectsRepository.findById(projectId);
      if (project) {
        // Проверяем, есть ли доступ к проекту
        const members = await projectsRepository.listMembers(projectId);
        const isMember = members.some(m => m.userId === auth.userId);

        if (isMember) {
          projectContext = {
            projectName: project.title,
            ...(project.description ? { projectDescription: project.description } : {})
          };
        }
      }
    }

    // Создаём адаптер для AI клиента
    const aiClient = {
      generateText: async (prompt: string, options?: Parameters<typeof generateText>[1]) => {
        return await generateText(prompt, options);
      }
    };

    // Генерация описания
    const description = await generateTaskDescription(
      aiClient,
      taskTitle,
      projectContext
    );

    return jsonOk({ description });

  } catch (error) {
    console.error('AI generate description error:', error);

    // Обработка специфичных ошибок AI
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return jsonError('AI_NOT_CONFIGURED', {
          status: 503
        });
      }

      if (error.message.includes('rate limit')) {
        return jsonError('AI_RATE_LIMIT', {
          status: 429
        });
      }
    }

    return jsonError('AI_SERVICE_ERROR', {
      status: 500
    });
  }
}

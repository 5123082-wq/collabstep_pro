/**
 * API endpoint для генерации подзадач
 * 
 * POST /api/ai/generate-subtasks
 * 
 * Генерирует типовые подзадачи для задачи
 */

import { NextRequest } from 'next/server';
import { generateText } from '@/lib/ai/client';
import {
  generateSubtasks
} from '@collabverse/api/services/ai-planning-service';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';

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
    const { taskTitle, taskDescription, taskId } = body;

    // Валидация
    if (!taskTitle || typeof taskTitle !== 'string' || taskTitle.trim().length === 0) {
      return jsonError('INVALID_REQUEST', {
        status: 400
      });
    }

    if (taskTitle.length > 500) {
      return jsonError('INVALID_REQUEST', {
        status: 400
      });
    }

    if (taskDescription && taskDescription.length > 2000) {
      return jsonError('INVALID_REQUEST', {
        status: 400
      });
    }

    // Генерация подзадач
    const subtasks = await generateSubtasks(
      aiClientAdapter,
      taskTitle,
      taskDescription
    );

    return jsonOk({
      taskTitle,
      subtasks,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating subtasks:', error);

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


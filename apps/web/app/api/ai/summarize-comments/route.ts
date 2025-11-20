import { NextRequest } from 'next/server';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { generateText } from '@/lib/ai/client';
import { summarizeTaskComments } from '@collabverse/api/services/ai-service';
import { tasksRepository, commentsRepository, usersRepository } from '@collabverse/api';

/**
 * POST /api/ai/summarize-comments
 * 
 * Суммирует комментарии задачи через AI
 * 
 * Body:
 * - taskId: string (обязательно) - ID задачи
 * 
 * Response:
 * - summary: string - Сводка комментариев
 * - commentsCount: number - Количество комментариев
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
    const { taskId } = body;

    // Валидация
    if (!taskId || typeof taskId !== 'string') {
      return jsonError('INVALID_REQUEST', {
        status: 400
      });
    }

    // Получение задачи
    const task = tasksRepository.findById(taskId);
    if (!task) {
      return jsonError('NOT_FOUND', {
        status: 404
      });
    }

    // Проверка доступа к проекту
    const role = getProjectRole(task.projectId, auth.userId);
    if (!role) {
      return jsonError('ACCESS_DENIED', {
        status: 403
      });
    }

    // Получение комментариев задачи
    const comments = commentsRepository.listByTask(task.projectId, taskId);

    if (comments.length === 0) {
      return jsonOk({
        summary: 'У этой задачи пока нет комментариев.',
        commentsCount: 0
      });
    }

    // Подготовка данных комментариев с информацией об авторах
    const commentsWithAuthors = await Promise.all(comments.map(async comment => {
      const author = await usersRepository.findById(comment.authorId);
      return {
        id: comment.id,
        authorName: author?.name || 'Неизвестный пользователь',
        body: comment.body,
        createdAt: new Date(comment.createdAt).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    }));

    // Создаём адаптер для AI клиента
    const aiClient = {
      generateText: async (prompt: string, options?: any) => {
        return await generateText(prompt, options);
      }
    };

    // Генерация сводки
    const summary = await summarizeTaskComments(aiClient, commentsWithAuthors);

    return jsonOk({
      summary,
      commentsCount: comments.length
    });

  } catch (error) {
    console.error('AI summarize comments error:', error);

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


import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { projectChatRepository, projectsRepository, usersRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { notifyChatMessageAdded } from '@/lib/notifications/event-generator';
import { broadcastToProject } from '@/lib/websocket/event-broadcaster';
import { handleAgentMentionInChat } from '@/lib/ai/agent-responses';

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
    // Проверка существования проекта
    const project = projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = getProjectRole(projectId, auth.userId);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Пагинация
    const url = new URL(req.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50');

    // Получение сообщений через repository
    const result = projectChatRepository.listByProject(projectId, { page, pageSize });

    // Получение информации об авторах
    const messagesWithAuthors = await Promise.all(result.messages.map(async (message) => {
      const author = await usersRepository.findById(message.authorId);
      return {
        ...message,
        author: author
          ? {
            id: author.id,
            name: author.name,
            email: author.email,
            avatarUrl: author.avatarUrl
          }
          : null
      };
    }));

    return jsonOk({
      messages: messagesWithAuthors,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching project chat messages:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(
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
    // Получение body и валидация
    const body = await req.json();
    const { body: messageBody, attachments } = body;

    // Валидация: body обязателен, минимум 1 символ
    if (!messageBody || typeof messageBody !== 'string' || messageBody.trim().length === 0) {
      return jsonError('Message body is required and must not be empty', { status: 400 });
    }

    // Проверка существования проекта
    const project = projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = getProjectRole(projectId, auth.userId);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Создание сообщения через repository
    const message = projectChatRepository.create({
      projectId: projectId,
      authorId: auth.userId,
      body: messageBody.trim(),
      attachments: Array.isArray(attachments) ? attachments : []
    });

    // Генерируем уведомления для участников проекта
    await notifyChatMessageAdded(message.id, projectId, auth.userId);

    // Получение информации об авторе
    const author = await usersRepository.findById(message.authorId);

    const messageWithAuthor = {
      ...message,
      author: author
        ? {
          id: author.id,
          name: author.name,
          email: author.email,
          avatarUrl: author.avatarUrl
        }
        : null
    };

    // Рассылаем событие через WebSocket
    await broadcastToProject(projectId, 'chat.message', {
      message: messageWithAuthor,
      projectId
    });

    // Проверить упоминания AI-агентов и отправить ответы (асинхронно, не блокируем ответ)
    handleAgentMentionInChat(projectId, messageBody.trim(), auth.userId).catch((error) => {
      console.error('Error handling agent mentions:', error);
      // Не блокируем основной ответ при ошибке обработки агентов
    });

    // Возврат результата
    return jsonOk({
      message: messageWithAuthor
    });
  } catch (error) {
    console.error('Error creating chat message:', error);
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', { status: 400 });
    }
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


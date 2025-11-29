import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  commentsRepository,
  tasksRepository,
  usersRepository,
} from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { notifyCommentAdded } from '@/lib/notifications/event-generator';
import { broadcastToProject } from '@/lib/websocket/event-broadcaster';

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

  const taskId = params.id;

  try {
    // Получение задачи
    const tasks = tasksRepository.list();
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) {
      return jsonError('TASK_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    // Теперь getProjectRole правильно определяет владельца проекта как 'owner'
    const role = await getProjectRole(task.projectId, auth.userId);
    
    // Просмотр комментариев доступен всем, кто имеет доступ к проекту (включая 'viewer')
    // Но если пользователь вообще не имеет доступа, блокируем
    if (!role) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Получение комментариев через commentsRepository.listByTask
    const comments = commentsRepository.listByTask(task.projectId, taskId);
    type CommentNode = typeof comments[number];
    type CommentWithAuthor = CommentNode & {
      author: {
        id: string;
        name: string;
        email: string;
        avatarUrl?: string | null;
      } | null;
      children?: CommentWithAuthor[];
    };

    // Функция для добавления информации об авторах в дерево комментариев
    const addAuthorsToComments = async (commentNodes: CommentNode[]): Promise<CommentWithAuthor[]> => {
      return Promise.all(commentNodes.map(async (comment) => {
        const author = await usersRepository.findById(comment.authorId);
        const { children, ...restComment } = comment;
        const commentWithAuthor: CommentWithAuthor = {
          ...restComment,
          author: author
            ? {
                id: author.id,
                name: author.name,
                email: author.email,
                avatarUrl: author.avatarUrl ?? null
              }
            : null
        };
        
        // Рекурсивно обрабатываем дочерние комментарии
        if (children && children.length > 0) {
          commentWithAuthor.children = await addAuthorsToComments(children);
        }
        
        return commentWithAuthor;
      }));
    };

    // Добавляем информацию об авторах
    const commentsWithAuthors = await addAuthorsToComments(comments);

    // Возврат результата
    return jsonOk({ comments: commentsWithAuthors });
  } catch (error) {
    console.error('Error fetching task comments:', error);
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

  const taskId = params.id;

  try {
    // Получение body и валидация
    const body = await req.json();
    const { body: commentBody, parentId, mentions, attachments } = body;

    // Валидация: body обязателен, минимум 1 символ
    if (!commentBody || typeof commentBody !== 'string' || commentBody.trim().length === 0) {
      return jsonError('Comment body is required and must not be empty', { status: 400 });
    }

    // Получение задачи и проверка доступа
    const tasks = tasksRepository.list();
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) {
      return jsonError('TASK_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = await getProjectRole(task.projectId, auth.userId);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Создание комментария через commentsRepository.create
    const comment = commentsRepository.create({
      projectId: task.projectId,
      taskId: taskId,
      authorId: auth.userId,
      body: commentBody.trim(),
      parentId: parentId ?? null,
      mentions: Array.isArray(mentions) ? mentions : [],
      attachments: Array.isArray(attachments) ? attachments : []
    });

    // Получаем информацию об авторе
    const author = await usersRepository.findById(auth.userId);
    const commentWithAuthor = {
      ...comment,
      author: author
        ? {
            id: author.id,
            name: author.name,
            email: author.email,
            avatarUrl: author.avatarUrl
          }
        : null
    };

    // Генерируем уведомления о комментарии
    await notifyCommentAdded(comment.id, taskId, task.projectId, auth.userId);

    // Рассылаем событие через WebSocket
    await broadcastToProject(task.projectId, 'comment.added', {
      comment: commentWithAuthor,
      taskId,
      projectId: task.projectId
    });

    // Возврат результата
    return jsonOk({ comment: commentWithAuthor });
  } catch (error) {
    console.error('Error creating comment:', error);
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', { status: 400 });
    }
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

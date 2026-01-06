import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  commentsRepository,
  tasksRepository,
  usersRepository,
} from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { broadcastToProject } from '@/lib/websocket/event-broadcaster';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
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
  const commentId = params.commentId;

  try {
    // Получение задачи
    const tasks = await tasksRepository.list();
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) {
      return jsonError('TASK_NOT_FOUND', { status: 404 });
    }

    // Получение комментария и проверка принадлежности к задаче
    const allComments = commentsRepository.listByTask(task.projectId, taskId);
    
    // Функция для поиска комментария в дереве
    const findCommentInTree = (comments: typeof allComments, id: string): typeof allComments[0] | null => {
      for (const comment of comments) {
        if (comment.id === id) {
          return comment;
        }
        if (comment.children) {
          const found = findCommentInTree(comment.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const comment = findCommentInTree(allComments, commentId);
    
    if (!comment) {
      return jsonError('COMMENT_NOT_FOUND', { status: 404 });
    }

    // Проверка прав (автор или owner/admin проекта)
    const role = await getProjectRole(task.projectId, auth.userId);
    const isAuthor = comment.authorId === auth.userId;
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';

    if (!isAuthor && !isOwnerOrAdmin) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Получение body и валидация
    const body = await req.json();
    const { body: commentBody, mentions, attachments } = body;

    const patch: {
      body?: string;
      mentions?: string[];
      attachments?: string[];
    } = {};

    if (commentBody !== undefined) {
      if (typeof commentBody !== 'string' || commentBody.trim().length === 0) {
        return jsonError('Comment body must not be empty', { status: 400 });
      }
      patch.body = commentBody.trim();
    }

    if (mentions !== undefined) {
      if (!Array.isArray(mentions)) {
        return jsonError('Mentions must be an array', { status: 400 });
      }
      patch.mentions = mentions;
    }

    if (attachments !== undefined) {
      if (!Array.isArray(attachments)) {
        return jsonError('Attachments must be an array', { status: 400 });
      }
      patch.attachments = attachments;
    }

    // Обновление через commentsRepository.update
    const updated = commentsRepository.update(commentId, patch);
    
    if (!updated) {
      return jsonError('COMMENT_NOT_FOUND', { status: 404 });
    }

    // Получаем информацию об авторе
    const author = await usersRepository.findById(updated.authorId);
    const updatedWithAuthor = {
      ...updated,
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
    await broadcastToProject(task.projectId, 'comment.updated', {
      comment: updatedWithAuthor,
      taskId,
      projectId: task.projectId
    });

    // Возврат результата
    return jsonOk({ comment: updatedWithAuthor });
  } catch (error) {
    console.error('Error updating comment:', error);
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', { status: 400 });
    }
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
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
  const commentId = params.commentId;

  try {
    // Получение задачи
    const tasks = await tasksRepository.list();
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) {
      return jsonError('TASK_NOT_FOUND', { status: 404 });
    }

    // Получение комментария и проверка принадлежности к задаче
    const allComments = commentsRepository.listByTask(task.projectId, taskId);
    
    // Функция для поиска комментария в дереве
    const findCommentInTree = (comments: typeof allComments, id: string): typeof allComments[0] | null => {
      for (const comment of comments) {
        if (comment.id === id) {
          return comment;
        }
        if (comment.children) {
          const found = findCommentInTree(comment.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const comment = findCommentInTree(allComments, commentId);
    
    if (!comment) {
      return jsonError('COMMENT_NOT_FOUND', { status: 404 });
    }

    // Проверка прав (автор или owner/admin проекта)
    const role = await getProjectRole(task.projectId, auth.userId);
    const isAuthor = comment.authorId === auth.userId;
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';

    if (!isAuthor && !isOwnerOrAdmin) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Удаление через commentsRepository.delete (каскадное удаление уже реализовано)
    commentsRepository.delete(commentId);

    // Возврат успешного статуса
    return jsonOk({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


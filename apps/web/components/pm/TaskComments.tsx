'use client';

import { useEffect, useState, useCallback } from 'react';
import TaskCommentItem from './TaskCommentItem';
import TaskCommentForm from './TaskCommentForm';
import type { TaskCommentNode } from '@collabverse/api';
import { Button } from '@/components/ui/button';
import { useProjectEvents } from '@/lib/websocket/hooks';
import { ContentBlock } from '@/components/ui/content-block';

type CommentWithAuthor = TaskCommentNode & {
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  } | null;
  children?: CommentWithAuthor[];
};

type TaskCommentsProps = {
  taskId: string;
  projectId: string;
  currentUserId: string;
};

export default function TaskComments({ taskId, projectId, currentUserId }: TaskCommentsProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/pm/tasks/${taskId}/comments`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось загрузить комментарии');
      }

      const data = await response.json();
      setComments(data.data?.comments || []);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadComments();
  }, [taskId, loadComments]);

  // Подписка на WebSocket события для комментариев
  useProjectEvents(projectId, currentUserId, 'comment.added', (event) => {
    if (!event.data || typeof event.data !== 'object') {
      return;
    }
    const payload = event.data as { taskId?: string };
    if (payload.taskId === taskId) {
      // Перезагружаем комментарии при получении нового комментария
      void loadComments();
    }
  });

  useProjectEvents(projectId, currentUserId, 'comment.updated', (event) => {
    if (!event.data || typeof event.data !== 'object') {
      return;
    }
    const payload = event.data as { taskId?: string; comment?: CommentWithAuthor };
    if (payload.taskId === taskId) {
      // Обновляем конкретный комментарий
      const updatedComment = payload.comment;
      if (updatedComment) {
        setComments((prev) => {
          const updateCommentInTree = (comments: CommentWithAuthor[]): CommentWithAuthor[] => {
            return comments.map((comment) => {
              if (comment.id === updatedComment.id) {
                return updatedComment;
              }
              if (comment.children) {
                return {
                  ...comment,
                  children: updateCommentInTree(comment.children)
                };
              }
              return comment;
            });
          };
          return updateCommentInTree(prev);
        });
      }
    }
  });

  const handleCommentAdded = () => {
    void loadComments();
  };

  if (loading) {
    return (
      <ContentBlock size="sm">
        <div className="text-center text-sm text-neutral-400">Загрузка комментариев...</div>
      </ContentBlock>
    );
  }

  if (error) {
    return (
      <ContentBlock size="sm" variant="error">
        <div className="mb-3 text-sm font-medium text-rose-100">Ошибка загрузки комментариев</div>
        <div className="mb-4 text-sm text-rose-200/80">{error}</div>
        <Button variant="secondary" size="sm" onClick={loadComments}>
          Попробовать снова
        </Button>
      </ContentBlock>
    );
  }

  const commentsCountLabel =
    comments.length === 0
      ? 'Пока нет комментариев'
      : `${comments.length} ${comments.length === 1 ? 'комментарий' : 'комментариев'}`;
  const visibleComments = showAll ? comments : comments.slice(-5);

  return (
    <div className="flex flex-col gap-3">
      {/* Заголовок секции */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Комментарии</h3>
          <p className="mt-0.5 text-xs text-neutral-500">{commentsCountLabel}</p>
        </div>
      </div>

      {/* Лента комментариев с прокруткой и переключателем */}
      <ContentBlock
        size="sm"
        className="flex min-h-[260px] flex-col gap-2 rounded-2xl border-neutral-900 bg-neutral-950/80 p-3"
      >
        <div className="flex items-center justify-between text-[12px] text-neutral-400">
          <span>
            {showAll || comments.length <= 5
              ? 'Все комментарии'
              : `Показаны последние ${visibleComments.length}`}
          </span>
          {comments.length > 5 && (
            <button
              type="button"
              className="font-semibold text-indigo-300 transition hover:text-indigo-200"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? 'Свернуть' : 'Предыдущие комментарии'}
            </button>
          )}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {visibleComments.length > 0 ? (
            visibleComments.map((comment) => (
              <TaskCommentItem
                key={comment.id}
                comment={comment}
                taskId={taskId}
                projectId={projectId}
                currentUserId={currentUserId}
                onUpdate={handleCommentAdded}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/40 px-4 py-6 text-center text-sm text-neutral-500">
              Пока нет комментариев
            </div>
          )}
        </div>
      </ContentBlock>

      {/* Форма создания комментария внизу (как в мессенджерах) */}
      <ContentBlock size="sm" className="rounded-2xl border-neutral-900 bg-neutral-950/85">
        <TaskCommentForm
          taskId={taskId}
          projectId={projectId}
          onSuccess={handleCommentAdded}
        />
      </ContentBlock>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import TaskCommentItem from './TaskCommentItem';
import TaskCommentForm from './TaskCommentForm';
import type { TaskCommentNode } from '@collabverse/api';
import { Button } from '@/components/ui/button';
import { useProjectEvents } from '@/lib/websocket/hooks';
import { ContentBlock } from '@/components/ui/content-block';

type TaskCommentsProps = {
  taskId: string;
  projectId: string;
  currentUserId: string;
};

export default function TaskComments({ taskId, projectId, currentUserId }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskCommentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComments = async () => {
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
  };

  useEffect(() => {
    void loadComments();
  }, [taskId]);

  // Подписка на WebSocket события для комментариев
  useProjectEvents(projectId, currentUserId, 'comment.added', (event) => {
    if (event.data?.taskId === taskId) {
      // Перезагружаем комментарии при получении нового комментария
      void loadComments();
    }
  });

  useProjectEvents(projectId, currentUserId, 'comment.updated', (event) => {
    if (event.data?.taskId === taskId) {
      // Обновляем конкретный комментарий
      const updatedComment = event.data?.comment;
      if (updatedComment) {
        setComments((prev) => {
          const updateCommentInTree = (comments: TaskCommentNode[]): TaskCommentNode[] => {
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

  return (
    <div className="space-y-6">
      {/* Заголовок секции */}
      <div>
        <h3 className="text-lg font-semibold text-white">Комментарии</h3>
        <p className="mt-1 text-sm text-neutral-400">
          {comments.length === 0
            ? 'Пока нет комментариев'
            : `${comments.length} ${comments.length === 1 ? 'комментарий' : 'комментариев'}`}
        </p>
      </div>

      {/* Форма создания комментария */}
      <ContentBlock size="sm">
        <TaskCommentForm
          taskId={taskId}
          projectId={projectId}
          onSuccess={handleCommentAdded}
        />
      </ContentBlock>

      {/* Список комментариев */}
      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <TaskCommentItem
              key={comment.id}
              comment={comment}
              taskId={taskId}
              projectId={projectId}
              currentUserId={currentUserId}
              onUpdate={handleCommentAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}


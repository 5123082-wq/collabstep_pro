'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import TaskCommentForm from './TaskCommentForm';
import type { TaskCommentNode } from '@collabverse/api';
import { ContentBlock } from '@/components/ui/content-block';

type TaskCommentItemProps = {
  comment: TaskCommentNode;
  taskId: string;
  projectId: string;
  currentUserId: string;
  onUpdate: () => void;
};

export default function TaskCommentItem({
  comment,
  taskId,
  projectId,
  currentUserId,
  onUpdate
}: TaskCommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = comment.authorId === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor;

  const handleDelete = async () => {
    if (!confirm('Удалить комментарий? Все ответы также будут удалены.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/pm/tasks/${taskId}/comments/${comment.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при удалении комментария');
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(error instanceof Error ? error.message : 'Не удалось удалить комментарий');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Рендер текста комментария с подсветкой упоминаний
  const renderCommentBody = (text: string, mentionIds?: string[]) => {
    if (!mentionIds || mentionIds.length === 0) {
      return text;
    }

    // Простой парсинг упоминаний в формате @username
    const parts: Array<{ text: string; isMention: boolean }> = [];
    let lastIndex = 0;
    const mentionPattern = /@(\w+)/g;
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
      // Добавляем текст до упоминания
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isMention: false });
      }

      // Проверяем, является ли это упоминанием из списка
      const mentionText = match[0];
      const isMention = mentionIds.some((id) => {
        // Простая проверка: если ID содержит имя пользователя
        const userName = id.split('@')[0];
        return userName ? mentionText.includes(userName) : false;
      });

      parts.push({ text: mentionText, isMention });
      lastIndex = match.index + match[0].length;
    }

    // Добавляем оставшийся текст
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isMention: false });
    }

    return (
      <>
        {parts.map((part, index) =>
          part.isMention ? (
            <span
              key={index}
              className="rounded bg-indigo-500/20 px-1 py-0.5 text-indigo-300 font-medium"
            >
              {part.text}
            </span>
          ) : (
            <span key={index}>{part.text}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className="space-y-3">
      <ContentBlock size="sm">
        {/* Автор и время */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-medium text-indigo-300">
              {comment.authorId.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {comment.authorId.split('@')[0]}
              </div>
              <div className="text-xs text-neutral-400">
                {formatDate(comment.createdAt)}
                {comment.updatedAt !== comment.createdAt && ' (изменён)'}
              </div>
            </div>
          </div>
          
          {/* Кнопки действий */}
          {(canEdit || canDelete) && (
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={isDeleting}
                >
                  Редактировать
                </Button>
              )}
              {canDelete && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  loading={isDeleting}
                  disabled={isDeleting}
                >
                  Удалить
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Текст комментария */}
        {!isEditing ? (
          <div className="text-sm text-neutral-200 whitespace-pre-wrap">
            {renderCommentBody(comment.body, comment.mentions)}
          </div>
        ) : (
          <TaskCommentForm
            taskId={taskId}
            projectId={projectId}
            comment={{
              id: comment.id,
              body: comment.body,
              mentions: comment.mentions,
              attachments: comment.attachments
            }}
            onSuccess={() => {
              setIsEditing(false);
              onUpdate();
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}

        {/* Вложения */}
        {comment.attachmentsFiles && comment.attachmentsFiles.length > 0 && (
          <div className="mt-3 space-y-1">
            {comment.attachmentsFiles.map((file) => (
              <a
                key={file.id}
                href={file.storageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <span>📎</span>
                <span>{file.filename}</span>
              </a>
            ))}
          </div>
        )}


        {/* Кнопка ответа */}
        {!isEditing && (
          <div className="mt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsReplying(!isReplying)}
            >
              {isReplying ? 'Отмена' : 'Ответить'}
            </Button>
          </div>
        )}
      </ContentBlock>

      {/* Форма ответа */}
      {isReplying && !isEditing && (
        <div className="ml-8 border-l-2 border-neutral-800 pl-4">
          <TaskCommentForm
            taskId={taskId}
            projectId={projectId}
            parentId={comment.id}
            onSuccess={() => {
              setIsReplying(false);
              onUpdate();
            }}
            onCancel={() => setIsReplying(false)}
          />
        </div>
      )}

      {/* Рекурсивный рендер ответов */}
      {comment.children && comment.children.length > 0 && (
        <div className="ml-8 space-y-3 border-l-2 border-neutral-800 pl-4">
          {comment.children.map((child) => (
            <TaskCommentItem
              key={child.id}
              comment={child}
              taskId={taskId}
              projectId={projectId}
              currentUserId={currentUserId}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}


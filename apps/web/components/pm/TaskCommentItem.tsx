'use client';

import { useState } from 'react';
import TaskCommentForm from './TaskCommentForm';
import type { TaskCommentNode } from '@collabverse/api';
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

type TaskCommentItemProps = {
  comment: CommentWithAuthor;
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

  const formatFileSize = (size?: number) => {
    if (!size || size <= 0) return '';
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} КБ`;
    return `${(kb / 1024).toFixed(2)} МБ`;
  };

  return (
    <div className="space-y-2">
      <ContentBlock
        size="sm"
        className="gap-2 rounded-2xl border-neutral-800/80 bg-neutral-950/80 p-3"
      >
        {/* Автор и время */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold uppercase text-indigo-200">
            {comment.author?.name
              ? comment.author.name.charAt(0).toUpperCase()
              : comment.authorId.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {comment.author?.name || comment.authorId.split('@')[0]}
              </span>
              <span className="text-[11px] text-neutral-500">
                {formatDate(comment.createdAt)}
                {comment.updatedAt !== comment.createdAt && ' • изменён'}
              </span>
            </div>

            {/* Текст комментария */}
            {!isEditing ? (
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-200">
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
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-indigo-300">
                <span className="text-neutral-400">Файлы:</span>
                {comment.attachmentsFiles.map((file) => (
                  <a
                    key={file.id}
                    href={file.storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-2 py-1 transition hover:border-indigo-400/40 hover:text-indigo-200"
                  >
                    <span>📎</span>
                    <span className="font-medium">{file.filename}</span>
                    <span className="text-neutral-400">{formatFileSize(file.sizeBytes)}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Кнопки действий */}
            {!isEditing && (
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-indigo-300">
                <button
                  type="button"
                  className="font-semibold transition hover:text-indigo-200"
                  onClick={() => setIsReplying(!isReplying)}
                >
                  {isReplying ? 'Отмена' : 'Ответить'}
                </button>
                {canEdit && (
                  <button
                    type="button"
                    className="text-neutral-400 transition hover:text-white"
                    onClick={() => setIsEditing(!isEditing)}
                    disabled={isDeleting}
                  >
                    Редактировать
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="text-rose-300 transition hover:text-rose-200"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Удаление…' : 'Удалить'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </ContentBlock>

      {/* Форма ответа */}
      {isReplying && !isEditing && (
        <div className="ml-10 border-l border-neutral-800 pl-4">
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
        <div className="ml-10 space-y-2 border-l border-neutral-800 pl-4">
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

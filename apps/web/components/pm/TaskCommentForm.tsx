'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/ui/toast';

type ProjectMember = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type TaskCommentFormProps = {
  taskId: string;
  projectId: string;
  parentId?: string | null;
  comment?: { id: string; body: string; mentions?: string[]; attachments?: string[] };
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function TaskCommentForm({
  taskId,
  projectId,
  parentId,
  comment,
  onSuccess,
  onCancel
}: TaskCommentFormProps) {
  const [body, setBody] = useState(comment?.body ?? '');
  const [loading, setLoading] = useState(false);
  const [mentions, setMentions] = useState<string[]>(comment?.mentions ?? []);
  const [attachments, setAttachments] = useState<string[]>(comment?.attachments ?? []);
  const [attachmentFiles, setAttachmentFiles] = useState<Array<{ id: string; filename: string }>>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузка участников проекта
  useEffect(() => {
    async function loadMembers() {
      try {
        const response = await fetch(`/api/pm/projects/${projectId}/members`);
        if (response.ok) {
          const data = await response.json();
          setMembers(data.data?.members || []);
        }
      } catch (error) {
        console.error('Error loading project members:', error);
      }
    }

    void loadMembers();
  }, [projectId]);

  // Загрузка информации о файлах при монтировании (для режима редактирования)
  useEffect(() => {
    if (comment?.attachments && comment.attachments.length > 0) {
      // В реальном приложении здесь бы был запрос к API для получения информации о файлах
      // Пока просто сохраняем ID файлов
      setAttachmentFiles(
        comment.attachments.map((id) => ({ id, filename: `file-${id.slice(0, 8)}` }))
      );
    }
  }, [comment]);

  // Обработка ввода текста для упоминаний
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setBody(value);

    // Проверка на ввод "@"
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Если после @ нет пробела или переноса строки, показываем автодополнение
      if (!textAfterAt.match(/[\s\n]/)) {
        setMentionQuery(textAfterAt);
        setMentionPosition({ start: lastAtIndex, end: cursorPos });
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
    setMentionPosition(null);
  };

  // Выбор участника из автодополнения
  const handleSelectMention = (member: ProjectMember) => {
    if (!mentionPosition || !textareaRef.current) return;

    const beforeMention = body.slice(0, mentionPosition.start);
    const afterMention = body.slice(mentionPosition.end);
    const newBody = `${beforeMention}@${member.name} ${afterMention}`;
    
    setBody(newBody);
    setMentions([...mentions.filter((id) => id !== member.id), member.id]);
    setShowMentions(false);
    setMentionPosition(null);
    setMentionQuery('');

    // Установка курсора после упоминания
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionPosition.start + member.name.length + 2; // +2 для "@" и пробела
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Фильтрация участников для автодополнения
  const filteredMembers = members.filter((member) => {
    if (!mentionQuery) return true;
    const query = mentionQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  // Загрузка файла
  const handleFileUpload = async (file: File) => {
    setUploadingFiles(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('entityType', 'comment');
      formData.append('entityId', comment?.id || '');

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при загрузке файла');
      }

      const data = await response.json();
      const fileId = data.file?.id;
      
      if (fileId) {
        setAttachments([...attachments, fileId]);
        setAttachmentFiles([...attachmentFiles, { id: fileId, filename: file.name }]);
        toast('Файл загружен', 'success');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast(
        error instanceof Error ? error.message : 'Не удалось загрузить файл',
        'warning'
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  // Удаление файла
  const handleRemoveFile = (fileId: string) => {
    setAttachments(attachments.filter((id) => id !== fileId));
    setAttachmentFiles(attachmentFiles.filter((file) => file.id !== fileId));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!body.trim()) {
      toast('Комментарий не может быть пустым', 'warning');
      return;
    }

    setLoading(true);

    try {
      const url = comment
        ? `/api/pm/tasks/${taskId}/comments/${comment.id}`
        : `/api/pm/tasks/${taskId}/comments`;
      
      const method = comment ? 'PATCH' : 'POST';
      const requestBody = comment
        ? {
            body: body.trim(),
            mentions: mentions,
            attachments: attachments
          }
        : {
            body: body.trim(),
            parentId: parentId ?? null,
            mentions: mentions,
            attachments: attachments
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при сохранении комментария');
      }

      // Очистка формы
      setBody('');
      setMentions([]);
      setAttachments([]);
      setAttachmentFiles([]);
      toast(comment ? 'Комментарий обновлён' : 'Комментарий добавлен', 'success');
      
      // Вызов onSuccess
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      toast(
        error instanceof Error ? error.message : 'Не удалось сохранить комментарий',
        'warning'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setBody(comment?.body ?? '');
    setMentions(comment?.mentions ?? []);
    setAttachments(comment?.attachments ?? []);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={handleTextChange}
          onKeyDown={(e) => {
            if (showMentions && e.key === 'ArrowDown') {
              e.preventDefault();
              // Можно добавить навигацию по списку
            }
            if (showMentions && e.key === 'Escape') {
              setShowMentions(false);
            }
          }}
          placeholder={comment ? 'Редактировать комментарий...' : 'Написать комментарий... (используйте @ для упоминаний)'}
          rows={3}
          disabled={loading}
          className="min-h-[80px]"
        />
        
        {/* Автодополнение упоминаний */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 z-10 w-full max-h-48 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl content-block-sm">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSelectMention(member)}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-neutral-800 transition"
              >
                <div className="font-medium">{member.name}</div>
                <div className="text-xs text-neutral-400">{member.email}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Прикрепленные файлы */}
      {attachmentFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachmentFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-sm"
            >
              <span className="text-neutral-400">📎</span>
              <span className="text-neutral-300">{file.filename}</span>
              {!comment && (
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="text-neutral-400 hover:text-white"
                  disabled={loading}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleFileUpload(file);
              }
              // Сброс input для возможности повторной загрузки того же файла
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            disabled={loading || uploadingFiles}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploadingFiles}
          >
            {uploadingFiles ? 'Загрузка...' : '📎 Прикрепить файл'}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {comment && onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
            >
              Отмена
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            loading={loading}
            disabled={!body.trim() || loading || uploadingFiles}
          >
            {comment ? 'Сохранить' : 'Отправить'}
          </Button>
        </div>
      </div>
    </form>
  );
}

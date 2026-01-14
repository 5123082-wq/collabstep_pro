'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ContentBlock } from '@/components/ui/content-block';
import { InlineChat } from '@/components/pm/InlineChat';
import type { Task, TaskAttachment, TaskStatus } from '@/types/pm';
import LargeContentModal from '@/components/ui/large-content-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TaskResultsBlock from '@/components/pm/TaskResultsBlock';
import { toast } from '@/lib/ui/toast';

type ProjectMember = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type TaskDetailModalProps = {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
};

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'new', label: 'Backlog' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'review', label: 'На проверке' },
  { value: 'done', label: 'Готово' },
  { value: 'blocked', label: 'Заблокировано' }
];

const PRIORITY_OPTIONS: Array<{ value: NonNullable<Task['priority']>; label: string }> = [
  { value: 'urgent', label: 'Срочный' },
  { value: 'high', label: 'Высокий' },
  { value: 'med', label: 'Средний' },
  { value: 'low', label: 'Низкий' }
];

function formatDate(dateString?: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function toDateInputValue(dateString?: string) {
  if (!dateString) return '';
  const iso = new Date(dateString).toISOString();
  return iso.slice(0, 10);
}

function isImageAttachment(file: TaskAttachment) {
  const mime = file.mimeType || '';
  const name = file.filename?.toLowerCase() || '';
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name);
}

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  currentUserId
}: TaskDetailModalProps) {
  const [taskData, setTaskData] = useState<Task | null>(task);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTaskData(task);
  }, [task]);

  useEffect(() => {
    if (!task?.projectId || !isOpen) {
      return;
    }

    const loadMembers = async () => {
      try {
        setLoadingMembers(true);
        const response = await fetch(`/api/pm/projects/${task.projectId}/members`);
        if (!response.ok) {
          throw new Error('Не удалось загрузить участников проекта');
        }
        const data = await response.json();
        setMembers(data.data?.members || data.members || []);
      } catch (error) {
        console.error('Failed to load project members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    void loadMembers();
  }, [isOpen, task?.projectId]);

  const statusLabels = useMemo(
    () =>
      STATUS_OPTIONS.reduce<Record<TaskStatus, string>>((acc, item) => {
        acc[item.value] = item.label;
        return acc;
      }, {} as Record<TaskStatus, string>),
    []
  );

  const priorityLabels = useMemo(
    () =>
      PRIORITY_OPTIONS.reduce<Record<NonNullable<Task['priority']>, string>>((acc, item) => {
        acc[item.value] = item.label;
        return acc;
      }, {} as Record<NonNullable<Task['priority']>, string>),
    []
  );

  const handleUpdate = useCallback(
    async (patch: {
      status?: TaskStatus;
      assigneeId?: string | null;
      priority?: Task['priority'];
      dueAt?: string | null;
    }) => {
      if (!taskData) return;
      setSavingField(Object.keys(patch)[0] ?? null);

      // Создаем очищенный объект для запроса, удаляя undefined и пустые строки
      const requestPatch: Record<string, unknown> = {};
      const localPatch: Partial<Task> = {};

      if ('status' in patch && patch.status !== undefined) {
        requestPatch.status = patch.status;
        localPatch.status = patch.status;
      }
      if ('priority' in patch && patch.priority !== undefined) {
        requestPatch.priority = patch.priority;
        localPatch.priority = patch.priority;
      }
      if ('dueAt' in patch) {
        if (patch.dueAt !== null && patch.dueAt !== undefined) {
          requestPatch.dueAt = patch.dueAt;
          localPatch.dueAt = patch.dueAt;
        } else {
          // Явно передаем null для удаления дедлайна
          requestPatch.dueAt = null;
        }
      }
      if ('assigneeId' in patch) {
        if (patch.assigneeId !== null && patch.assigneeId !== undefined && patch.assigneeId !== '') {
          requestPatch.assigneeId = patch.assigneeId;
          localPatch.assigneeId = patch.assigneeId;
        } else {
          // Явно передаем null для удаления исполнителя
          requestPatch.assigneeId = null;
        }
      }

      // Проверяем, что есть хотя бы одно поле для обновления
      if (Object.keys(requestPatch).length === 0) {
        console.warn('[TaskDetailModal] No fields to update');
        return;
      }

      console.log('[TaskDetailModal] Sending update request:', {
        taskId: taskData.id,
        updates: requestPatch
      });

      try {
        const response = await fetch('/api/pm/tasks/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskIds: [taskData.id],
            updates: requestPatch
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error('[TaskDetailModal] API Error:', {
            status: response.status,
            statusText: response.statusText,
            payload,
            requestBody: { taskIds: [taskData.id], updates: requestPatch }
          });
          const message = payload?.error || payload?.details || `Не удалось обновить задачу (${response.status})`;
          throw new Error(message);
        }

        const updatedTask: Task | null =
          payload?.data?.tasks?.[0] || payload?.tasks?.[0] || null;

        setTaskData((prev) => {
          if (!prev) return prev;
          if (updatedTask) {
            return { ...prev, ...updatedTask };
          }
          return { ...prev, ...localPatch };
        });

        // Обновляем список задач на странице
        window.dispatchEvent(
          new CustomEvent('task-updated', {
            detail: { taskId: taskData.id, projectId: taskData.projectId }
          })
        );

        toast('Задача обновлена', 'success');
      } catch (error) {
        console.error('Failed to update task:', error);
        toast(
          error instanceof Error ? error.message : 'Не удалось сохранить изменения',
          'warning'
        );
      } finally {
        setSavingField(null);
      }
    },
    [taskData]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!taskData) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', taskData.projectId);
        formData.append('entityType', 'task');
        formData.append('entityId', taskData.id);
        if (currentUserId) {
          formData.append('uploaderId', currentUserId);
        }

        const response = await fetch('/api/files', {
          method: 'POST',
          body: formData
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            payload?.error === 'Not found'
              ? 'Вложения выключены. Проверьте флаг FEATURE_PROJECT_ATTACHMENTS.'
              : payload?.error || 'Не удалось загрузить файл';
          throw new Error(message);
        }

        const newFile: TaskAttachment | undefined = payload?.file;
        if (newFile) {
          setTaskData((prev) =>
            prev
              ? {
                  ...prev,
                  attachments: [...(prev.attachments ?? []), newFile]
                }
              : prev
          );
          window.dispatchEvent(
            new CustomEvent('task-updated', {
              detail: { taskId: taskData.id, projectId: taskData.projectId }
            })
          );
          toast('Файл прикреплён', 'success');
        }
      } catch (error) {
        console.error('Failed to upload attachment:', error);
        toast(
          error instanceof Error ? error.message : 'Не удалось прикрепить файл',
          'warning'
        );
      } finally {
        setUploading(false);
      }
    },
    [currentUserId, taskData]
  );

  if (!taskData) {
    return null;
  }

  return (
    <LargeContentModal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6 p-6">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-4 pr-14">
            <div className="flex-1 space-y-1">
              <p className="text-xs uppercase tracking-[0.08em] text-neutral-500">
                Задача {taskData.number ? `#${taskData.number}` : ''}
              </p>
              <h1 className="text-xl font-semibold text-white">{taskData.title}</h1>
            </div>
            <div className="mr-4 flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-neutral-900/60 px-3 py-2 text-xs font-semibold uppercase text-neutral-200">
                <span className="rounded-full border border-neutral-800 px-3 py-1">
                  {statusLabels[taskData.status] || taskData.status}
                </span>
                {taskData.priority && (
                  <span className="rounded-full border border-neutral-800 px-3 py-1">
                    {priorityLabels[taskData.priority] || taskData.priority}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:max-h-[calc(100vh-200px)] lg:overflow-hidden">
          <div className="space-y-6 min-h-0 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1">
            {/* Задание + вложения */}
            <ContentBlock
              size="sm"
              className="space-y-4 rounded-2xl border-neutral-900 bg-neutral-950/85 p-4"
            >
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Задание
                </div>
                {taskData.description ? (
                  <p className="text-sm leading-relaxed text-neutral-200">{taskData.description}</p>
                ) : (
                  <p className="text-sm text-neutral-500">Пока нет описания задачи.</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Вложения
                    </div>
                    <p className="text-xs text-neutral-500">
                      Добавьте файлы или превью, чтобы видеть контекст задачи.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleFileUpload(file);
                        }
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      disabled={uploading}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Прикрепить файл
                    </Button>
                  </div>
                </div>

                {taskData.attachments && taskData.attachments.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {taskData.attachments.map((file) => {
                      const image = isImageAttachment(file);
                      return (
                        <a
                          key={file.id}
                          href={file.storageUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 transition hover:border-indigo-500/40 hover:bg-neutral-900"
                        >
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/70">
                            {image && file.storageUrl ? (
                              <Image
                                src={file.storageUrl}
                                alt={file.filename}
                                width={56}
                                height={56}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-lg">📎</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-white group-hover:text-indigo-200">
                              {file.filename}
                            </div>
                            {file.sizeBytes ? (
                              <div className="text-xs text-neutral-400">
                                {(file.sizeBytes / 1024).toFixed(0)} КБ
                              </div>
                            ) : null}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/40 px-4 py-6 text-center text-sm text-neutral-500">
                    Пока нет вложений
                  </div>
                )}
              </div>
            </ContentBlock>

            <TaskResultsBlock
              taskId={taskData.id}
              {...(taskData.attachments && { attachments: taskData.attachments })}
              active={isOpen}
              size="sm"
              className="rounded-2xl border-neutral-900 bg-neutral-950/85 p-4"
            />

            {/* Управление задачей (компактно в колонку) */}
            <ContentBlock
              size="sm"
              className="flex flex-col gap-4 rounded-2xl border-neutral-900 bg-neutral-950/85 p-4"
            >
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Статус / этап
                </div>
                <Select
                  value={taskData.status}
                  onValueChange={(value) => void handleUpdate({ status: value as TaskStatus })}
                  disabled={savingField === 'status'}
                >
                  <SelectTrigger className="h-10 rounded-xl border-neutral-800 bg-neutral-950 text-white">
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Исполнитель
                </div>
                <Select
                  value={taskData.assigneeId ?? 'unassigned'}
                  onValueChange={(value) =>
                    void handleUpdate({ assigneeId: value === 'unassigned' ? '' : value })
                  }
                  disabled={savingField === 'assigneeId' || loadingMembers}
                >
                  <SelectTrigger className="h-10 rounded-xl border-neutral-800 bg-neutral-950 text-white">
                    <SelectValue placeholder="Назначить исполнителя" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Не назначено</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Приоритет
                </div>
                <Select
                  value={taskData.priority ?? 'unset'}
                  onValueChange={(value) => {
                    if (value === 'unset') return;
                    void handleUpdate({ priority: value as Task['priority'] });
                  }}
                  disabled={savingField === 'priority'}
                >
                  <SelectTrigger className="h-10 rounded-xl border-neutral-800 bg-neutral-950 text-white">
                    <SelectValue placeholder="Установить приоритет" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Не задано</SelectItem>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Дедлайн
                </div>
                <Input
                  type="date"
                  value={toDateInputValue(taskData.dueAt)}
                  onChange={(event) => {
                    const value = event.target.value;
                    void handleUpdate({
                      dueAt: value ? new Date(value).toISOString() : null
                    });
                  }}
                  disabled={savingField === 'dueAt'}
                  className="h-10 rounded-xl border-neutral-800 bg-neutral-950 text-white"
                />
                {taskData.dueAt && (
                  <p className="text-xs text-neutral-500">
                    Текущее значение: {formatDate(taskData.dueAt)}
                  </p>
                )}
              </div>
            </ContentBlock>
          </div>

          <InlineChat
            contextId={taskData.id}
            contextType="task"
            currentUserId={currentUserId}
            title="Чат по задаче"
            className="h-full lg:max-h-[calc(100vh-220px)]"
          />
        </div>
      </div>
    </LargeContentModal>
  );
}

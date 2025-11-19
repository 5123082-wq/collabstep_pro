'use client';

import { ContentBlock } from '@/components/ui/content-block';
import TaskComments from './TaskComments';
import type { Task } from '@/types/pm';
import LargeContentModal from '@/components/ui/large-content-modal';

type TaskDetailModalProps = {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
};

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  currentUserId
}: TaskDetailModalProps) {
  if (!task) {
    return null;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const STATUS_LABELS: Record<string, string> = {
    new: 'Backlog',
    in_progress: 'В работе',
    review: 'На проверке',
    done: 'Готово',
    blocked: 'Заблокировано'
  };

  const PRIORITY_LABELS: Record<string, string> = {
    low: 'Низкий',
    med: 'Средний',
    high: 'Высокий',
    urgent: 'Срочный'
  };

  return (
    <LargeContentModal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6 p-6">
        <header className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">{task.title}</h1>
              {task.description && (
                <p className="mt-2 text-sm text-neutral-400">{task.description}</p>
              )}
            </div>
          </div>
        </header>

        {/* Метаданные задачи */}
        <ContentBlock size="sm" className="grid grid-cols-4 gap-4 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Статус</div>
            <div className="mt-1 text-sm text-white">{STATUS_LABELS[task.status] || task.status}</div>
          </div>
          {task.priority && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Приоритет</div>
              <div className="mt-1 text-sm text-white">{PRIORITY_LABELS[task.priority] || task.priority}</div>
            </div>
          )}
          {task.startDate && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Начало</div>
              <div className="mt-1 text-sm text-white">{formatDate(task.startDate)}</div>
            </div>
          )}
          {task.dueAt && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Дедлайн</div>
              <div className="mt-1 text-sm text-white">{formatDate(task.dueAt)}</div>
            </div>
          )}
          {task.labels && task.labels.length > 0 && (
            <div className="col-span-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Метки</div>
              <div className="flex flex-wrap gap-2">
                {task.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </ContentBlock>

        {/* Комментарии */}
        <ContentBlock size="sm">
          <TaskComments
            taskId={task.id}
            projectId={task.projectId}
            currentUserId={currentUserId}
          />
        </ContentBlock>
      </div>
    </LargeContentModal>
  );
}


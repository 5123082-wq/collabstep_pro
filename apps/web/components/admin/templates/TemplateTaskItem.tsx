'use client';

import { useState } from 'react';
import { Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { ProjectTemplateTask } from '@collabverse/api';

type TemplateTaskItemProps = {
  task: ProjectTemplateTask & { children?: TemplateTaskItemProps['task'][] };
  level?: number;
  onEdit: (task: ProjectTemplateTask) => void;
  onDelete: (taskId: string) => void;
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
};

export default function TemplateTaskItem({
  task,
  level = 0,
  onEdit,
  onDelete,
  expandedTasks,
  onToggleExpand
}: TemplateTaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const hasChildren = task.children && task.children.length > 0;
  const indent = level * 24;
  const isExpanded = expandedTasks.has(task.id);

  const handleDelete = async () => {
    if (!confirm(`Удалить задачу "${task.title}" и все её подзадачи?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const priorityColors: Record<string, string> = {
    urgent: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    high: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    med: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    low: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/40'
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500/20 text-blue-300',
    in_progress: 'bg-indigo-500/20 text-indigo-300',
    review: 'bg-purple-500/20 text-purple-300',
    done: 'bg-green-500/20 text-green-300',
    blocked: 'bg-red-500/20 text-red-300'
  };

  return (
    <div className="space-y-1">
      <div
        className={clsx(
          'group flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 transition hover:border-neutral-700',
          level > 0 && 'ml-4'
        )}
        style={{ paddingLeft: `${12 + indent}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(task.id)}
            className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-neutral-800 bg-neutral-900/60 text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-200"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <div className="flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-white">{task.title}</h4>
              {task.description && (
                <p className="mt-1 text-xs text-neutral-400 line-clamp-2">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => onEdit(task)}
                className="rounded border border-neutral-800 bg-neutral-900/60 p-1.5 text-neutral-400 transition hover:border-indigo-500/40 hover:text-indigo-300"
                title="Редактировать"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded border border-neutral-800 bg-neutral-900/60 p-1.5 text-neutral-400 transition hover:border-rose-500/40 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                title="Удалить"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {task.defaultPriority && (
              <span
                className={clsx(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border',
                  priorityColors[task.defaultPriority] || priorityColors.low
                )}
              >
                {task.defaultPriority}
              </span>
            )}
            <span
              className={clsx(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                statusColors[task.defaultStatus] || statusColors.new
              )}
            >
              {task.defaultStatus}
            </span>
            {task.defaultLabels && task.defaultLabels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.defaultLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 bg-neutral-800/60"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
            <span className="text-[10px] text-neutral-500">
              Дни: {task.offsetStartDays} → {task.offsetDueDays ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {task.children!.map((child) => (
            <TemplateTaskItem
              key={child.id}
              task={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedTasks={expandedTasks}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

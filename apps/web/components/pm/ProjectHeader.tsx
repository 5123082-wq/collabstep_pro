'use client';

import { type Project } from '@/types/pm';
import { cn } from '@/lib/utils';

type ProjectHeaderProps = {
  project: Project;
};

const STATUS_COLORS: Record<Project['status'], string> = {
  DRAFT: 'bg-neutral-500',
  ACTIVE: 'bg-emerald-500',
  ON_HOLD: 'bg-amber-500',
  COMPLETED: 'bg-indigo-500',
  ARCHIVED: 'bg-neutral-600'
};

const STATUS_LABELS: Record<Project['status'], string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  ON_HOLD: 'Приостановлен',
  COMPLETED: 'Завершён',
  ARCHIVED: 'Архив'
};

export default function ProjectHeader({ project }: ProjectHeaderProps) {
  const statusColor = STATUS_COLORS[project.status];
  const statusLabel = STATUS_LABELS[project.status];

  return (
    <header className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <span className="text-sm font-mono text-neutral-500">{project.key}</span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider',
                statusColor,
                'text-white'
              )}
            >
              {statusLabel}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-white">{project.name}</h1>
        </div>
      </div>

      {(project.startDate || project.dueDate) && (
        <div className="flex flex-wrap items-center gap-6 text-sm text-neutral-400">
          {project.startDate && (
            <div>
              <span className="text-neutral-500">Начало: </span>
              <span className="font-medium text-neutral-300">
                {new Date(project.startDate).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
          {project.dueDate && (
            <div>
              <span className="text-neutral-500">Дедлайн: </span>
              <span className="font-medium text-neutral-300">
                {new Date(project.dueDate).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}


'use client';

import { type Project } from '@/types/pm';
import { cn } from '@/lib/utils';

type ProjectHeaderProps = {
  project: Project;
};

const STATUS_COLORS: Record<Project['status'], string> = {
  ACTIVE: 'bg-emerald-500',
  ON_HOLD: 'bg-amber-500',
  COMPLETED: 'bg-indigo-500',
  ARCHIVED: 'bg-neutral-600'
};

const STATUS_LABELS: Record<Project['status'], string> = {
  ACTIVE: 'Активен',
  ON_HOLD: 'Приостановлен',
  COMPLETED: 'Завершён',
  ARCHIVED: 'Архив'
};

const VISIBILITY_LABELS: Record<Project['visibility'], string> = {
  private: 'Приватный',
  public: 'Публичный'
};

const VISIBILITY_COLORS: Record<Project['visibility'], string> = {
  private: 'bg-neutral-700 text-white',
  public: 'bg-emerald-600 text-white'
};

export default function ProjectHeader({ project }: ProjectHeaderProps) {
  const statusColor = STATUS_COLORS[project.status] ?? 'bg-neutral-700';
  const statusLabel = STATUS_LABELS[project.status] ?? 'Статус';
  const visibilityColor = VISIBILITY_COLORS[project.visibility] ?? 'bg-neutral-700 text-white';
  const visibilityLabel = VISIBILITY_LABELS[project.visibility] ?? 'Приватность';

  return (
    <header className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider',
                statusColor,
                'text-white'
              )}
            >
              {statusLabel}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider',
                visibilityColor
              )}
            >
              {visibilityLabel}
            </span>
            <h1 className="text-xl font-semibold text-white">{project.name}</h1>
          </div>
        </div>
        {(project.startDate || project.dueDate) && (
          <div className="mr-16 flex flex-wrap items-center gap-6 text-sm text-neutral-400">
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
      </div>
    </header>
  );
}


'use client';

import Link from 'next/link';
import { type Project } from '@/types/pm';
import { cn } from '@/lib/utils';
import { ContentBlock } from '@/components/ui/content-block';

type ProjectCardTileProps = {
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

export default function ProjectCardTile({ project }: ProjectCardTileProps) {
  const statusColor = STATUS_COLORS[project.status];
  const statusLabel = STATUS_LABELS[project.status];
  const progress = project.metrics?.progressPct || 0;
  const totalTasks = project.metrics?.total || 0;
  const inProgress = project.metrics?.inProgress || 0;
  const overdue = project.metrics?.overdue || 0;

  return (
    <Link
      href={`/pm/projects/${project.id}`}
      className="group block"
    >
      <ContentBlock interactive className="h-full">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-500">{project.key}</span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider',
                statusColor,
                'text-white'
              )}
            >
              {statusLabel}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {project.name}
          </h3>
        </div>
      </header>

      {project.metrics && (
        <div className="mb-4 space-y-3">
          {/* Прогресс */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
              <span>Прогресс</span>
              <span className="font-medium text-neutral-300">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full bg-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Метрики задач */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-neutral-400">Всего</div>
              <div className="mt-0.5 text-sm font-semibold text-white">{totalTasks}</div>
            </div>
            <div>
              <div className="text-neutral-400">В работе</div>
              <div className="mt-0.5 text-sm font-semibold text-emerald-400">{inProgress}</div>
            </div>
            <div>
              <div className="text-neutral-400">Просрочено</div>
              <div className="mt-0.5 text-sm font-semibold text-rose-400">{overdue}</div>
            </div>
          </div>
        </div>
      )}

      {/* Даты */}
      {(project.startDate || project.dueDate) && (
        <div className="mt-auto flex items-center gap-4 text-xs text-neutral-500">
          {project.startDate && (
            <div>
              <span className="text-neutral-600">Начало: </span>
              <span>{new Date(project.startDate).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
          {project.dueDate && (
            <div>
              <span className="text-neutral-600">Дедлайн: </span>
              <span>{new Date(project.dueDate).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
        </div>
      )}

      {/* Бюджет */}
      {project.metrics?.budgetLimit && (
        <div className="mt-3 border-t border-neutral-800 pt-3 text-xs">
          <div className="flex items-center justify-between text-neutral-400">
            <span>Бюджет</span>
            <span className="font-medium text-neutral-300">
              {project.metrics.budgetUsed || 0} / {project.metrics.budgetLimit}
            </span>
          </div>
        </div>
      )}
      </ContentBlock>
    </Link>
  );
}


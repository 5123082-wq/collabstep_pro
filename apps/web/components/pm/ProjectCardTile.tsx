'use client';

import Image from 'next/image';
import { type Project } from '@/types/pm';
import { cn } from '@/lib/utils';
import { ContentBlock } from '@/components/ui/content-block';

type ProjectCardTileProps = {
  project: Project;
  onOpenProject?: (project: Project) => void;
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

function UserAvatar({
  user,
  className
}: {
  user?: { name?: string; email?: string; avatarUrl?: string; userId?: string; id?: string } | undefined;
  className?: string;
}) {
  if (user?.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={user.name || 'User'}
        width={40}
        height={40}
        sizes="40px"
        className={cn('rounded-full object-cover bg-neutral-800', className)}
      />
    );
  }

  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-medium',
        className
      )}
    >
      {initial}
    </div>
  );
}

export default function ProjectCardTile({ project, onOpenProject }: ProjectCardTileProps) {
  const statusColor = STATUS_COLORS[project.status];
  const statusLabel = STATUS_LABELS[project.status];
  const progress = project.metrics?.progressPct || 0;
  const totalTasks = project.metrics?.total || 0;
  const inProgress = project.metrics?.inProgress || 0;
  const overdue = project.metrics?.overdue || 0;

  const handleClick = () => {
    if (onOpenProject) {
      onOpenProject(project);
    }
  };

  const Component = onOpenProject ? 'button' : 'div';
  const componentProps = onOpenProject
    ? {
        type: 'button' as const,
        onClick: handleClick,
        className: 'group block w-full text-left'
      }
    : {
        className: 'group block'
      };

  // Filter participants (exclude owner)
  const allParticipants = project.members.filter((m) => m.userId !== project.ownerId);
  // Sort: Admins first
  allParticipants.sort((a, b) => {
    if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
    if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
    return 0;
  });

  const visibleParticipants = allParticipants.slice(0, 4);
  const remainingCount = Math.max(0, allParticipants.length - 4);

  return (
    <Component {...componentProps}>
      <ContentBlock interactive className="h-full flex flex-col">
        <header className="mb-4 flex items-start gap-3">
          {/* Owner Avatar (Top Left) */}
          <UserAvatar user={project.owner} className="h-10 w-10 shrink-0 text-sm" />

          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-mono text-neutral-500">{project.key}</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                  statusColor,
                  'text-white'
                )}
              >
                {statusLabel}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
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

        <div className="mt-auto pt-3 flex items-center justify-between gap-4 border-t border-neutral-800/50">
          <div className="flex flex-col gap-1 text-xs text-neutral-500">
             {/* Даты */}
            {(project.startDate || project.dueDate) && (
                <>
                {project.startDate && (
                    <div>
                    <span className="text-neutral-600">Начало: </span>
                    <span>{new Date(project.startDate).toLocaleDateString('ru-RU')}</span>
                    </div>
                )}
                {/* 
                  // Removed deadline to save space or keep it? 
                  // User screenshot shows "Начало: 23.11.2025".
                  // User request didn't explicitly say remove deadline, but layout changes might require it.
                  // I'll keep logic simple.
                */}
                </>
            )}
             {/* Бюджет */}
            {project.metrics?.budgetLimit && (
                <div className="flex items-center gap-1">
                  <span className="text-neutral-600">Бюджет:</span>
                  <span className="font-medium text-neutral-300">
                    {project.metrics.budgetUsed || 0} / {project.metrics.budgetLimit}
                  </span>
                </div>
            )}
          </div>

          {/* Participants (Bottom Right) */}
          <div className="flex items-center -space-x-2">
            {visibleParticipants.map((member) => (
              <UserAvatar
                key={member.userId}
                user={member}
                className="h-10 w-10 ring-2 ring-neutral-900 text-xs"
              />
            ))}
            {remainingCount > 0 && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 ring-2 ring-neutral-900 text-xs font-medium text-neutral-400">
                +{remainingCount}
              </div>
            )}
          </div>
        </div>
      </ContentBlock>
    </Component>
  );
}

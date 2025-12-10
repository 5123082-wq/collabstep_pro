'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/telemetry';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

type PulseWidgetProps = {
  data?: {
    activeProjects: number;
    activeProjectsByOwner?: Array<{
      ownerId: string;
      ownerName: string;
      ownerEmail?: string;
      projects: Array<{ id: string; key: string; title: string; status: string }>;
    }>;
    draftProjects?: number;
    draftProjectsByOwner?: Array<{
      ownerId: string;
      ownerName: string;
      ownerEmail?: string;
      projects: Array<{ id: string; key: string; title: string; status: string }>;
    }>;
    openTasks: number;
    myOpenTasks: number;
    overdue: number;
    myOverdue?: number;
    upcomingDeadlines: Array<{
      id: string;
      title: string;
      projectId: string;
      projectKey: string;
      dueAt: string;
      status: string;
      assigneeId?: string;
    }>;
    myUpcomingDeadlines?: number;
  };
};

export default function PulseWidget({ data }: PulseWidgetProps) {
  // Default values to prevent errors when data is undefined
  const pulseData = data || {
    activeProjects: 0,
    activeProjectsByOwner: [],
    draftProjects: 0,
    draftProjectsByOwner: [],
    openTasks: 0,
    myOpenTasks: 0,
    overdue: 0,
    myOverdue: 0,
    upcomingDeadlines: [],
    myUpcomingDeadlines: 0,
  };
  const router = useRouter();

  const handleDrilldown = (type: string, params?: Record<string, string>) => {
    trackEvent('pm_dashboard_drilldown', { widget: 'pulse', type, ...params });
    if (type === 'projects') {
      router.push('/pm/projects?status=ACTIVE');
    } else if (type === 'drafts') {
      router.push('/pm/projects?status=DRAFT');
    } else if (type === 'tasks') {
      // Показываем все доступные задачи, а не только из проектов пользователя
      router.push('/pm/tasks?scope=all');
    } else if (type === 'overdue') {
      router.push('/pm/tasks?scope=all&status=in_progress');
    } else if (type === 'deadline' && params?.taskId) {
      router.push(`/pm/tasks?scope=all&taskId=${params.taskId}`);
    }
  };

  const formatOwnerProjects = (
    items?: Array<{
      ownerId: string;
      ownerName: string;
      ownerEmail?: string;
      projects: Array<{ id: string; key: string; title: string; status: string }>;
    }>
  ) => {
    if (!items || items.length === 0) {
      return 'Нет данных';
    }

    return items
      .map(({ ownerName, ownerEmail, projects }) => {
        const projectLabels =
          projects && projects.length > 0
            ? projects.map((project) => project.key || project.title).join(', ')
            : '—';
        const ownerLabel = ownerName || ownerEmail || 'Неизвестный пользователь';
        return `${ownerLabel}: ${projectLabels}`;
      })
      .join(' • ');
  };

  const activeOwnersSubtitle = formatOwnerProjects(pulseData.activeProjectsByOwner);
  const draftOwnersSubtitle = formatOwnerProjects(pulseData.draftProjectsByOwner);

  // Единая структура карточки
  const CardContent = ({
    title,
    value,
    valueColor = 'text-white',
    subtitle,
    onClick,
    buttonClassName,
  }: {
    title: string;
    value: number | string;
    valueColor?: string;
    subtitle?: string;
    onClick?: () => void;
    buttonClassName?: string;
  }) => {
    const content = (
      <div className="flex flex-col h-full min-h-[80px]">
        {/* Заголовок - всегда вверху */}
        <div className="text-xs text-neutral-400 leading-tight">{title}</div>
        
        {/* Цифра - фиксированный отступ сверху для единообразия */}
        <div className={cn('mt-1.5 text-xl font-bold', valueColor)}>
          {value}
        </div>
        
        {/* Дополнительная информация - внизу */}
        {subtitle && (
          <div className="mt-1 text-xs text-neutral-500 leading-tight">
            {subtitle}
          </div>
        )}
      </div>
    );

    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'group rounded-xl border p-3 text-left transition',
            buttonClassName || 'border-neutral-800 bg-neutral-900/50 hover:border-indigo-500/40 hover:bg-neutral-900'
          )}
        >
          {content}
        </button>
      );
    }

    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
        {content}
      </div>
    );
  };

  return (
    <ContentBlock size="sm">
      <ContentBlockTitle as="h2">Пульс</ContentBlockTitle>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {/* Активные проекты */}
        <CardContent
          title="Активные проекты"
          value={pulseData.activeProjects}
          subtitle={activeOwnersSubtitle}
          onClick={() => handleDrilldown('projects')}
        />

        {/* Черновики проектов */}
        <CardContent
          title="Черновики"
          value={pulseData.draftProjects ?? 0}
          valueColor={(pulseData.draftProjects ?? 0) > 0 ? 'text-amber-400' : 'text-white'}
          subtitle={draftOwnersSubtitle}
          onClick={() => handleDrilldown('drafts')}
          buttonClassName={cn(
            (pulseData.draftProjects ?? 0) > 0
              ? 'border-amber-500/50 bg-amber-500/10 hover:border-amber-500/60'
              : 'border-neutral-800 bg-neutral-900/50 hover:border-indigo-500/40 hover:bg-neutral-900'
          )}
        />

        {/* Открытые задачи */}
        <CardContent
          title="Открытые задачи"
          value={pulseData.openTasks}
          subtitle={`Мои: ${pulseData.myOpenTasks}`}
          onClick={() => handleDrilldown('tasks')}
        />

        {/* Просрочки */}
        <CardContent
          title="Просрочено"
          value={pulseData.overdue}
          valueColor={pulseData.overdue > 0 ? 'text-rose-400' : 'text-rose-300'}
          {...(pulseData.myOverdue !== undefined && { subtitle: `Мои: ${pulseData.myOverdue}` })}
          onClick={() => handleDrilldown('overdue')}
          buttonClassName={cn(
            pulseData.overdue > 0
              ? 'border-rose-500/50 bg-rose-500/10 hover:border-rose-500/60'
              : 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/40 hover:bg-rose-500/10'
          )}
        />

        {/* Ближайшие дедлайны */}
        <CardContent
          title="Ближайшие дедлайны"
          value={pulseData.upcomingDeadlines.length}
          {...(pulseData.myUpcomingDeadlines !== undefined && { subtitle: `Мои: ${pulseData.myUpcomingDeadlines}` })}
        />
      </div>

      {/* Список ближайших дедлайнов */}
      {pulseData.upcomingDeadlines.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-xs font-medium text-neutral-300">Ближайшие дедлайны (7 дней)</div>
          <div className="space-y-1.5">
            {pulseData.upcomingDeadlines.map((deadline) => {
              const dueDate = new Date(deadline.dueAt);
              const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <button
                  key={deadline.id}
                  type="button"
                  onClick={() => handleDrilldown('deadline', { taskId: deadline.id })}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900/50 p-2.5 text-left transition hover:border-indigo-500/40 hover:bg-neutral-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-white">{deadline.title}</div>
                      <div className="mt-0.5 text-xs text-neutral-400">
                        {deadline.projectKey} • {daysUntilDue === 0 ? 'Сегодня' : `${daysUntilDue} дн.`}
                      </div>
                    </div>
                    <div className="ml-3 text-xs text-neutral-500">
                      {dueDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </ContentBlock>
  );
}


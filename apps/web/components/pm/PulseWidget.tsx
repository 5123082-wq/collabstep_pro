'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/telemetry';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

type PulseWidgetProps = {
  data?: {
    activeProjects: number;
    openTasks: number;
    myOpenTasks: number;
    overdue: number;
    upcomingDeadlines: Array<{
      id: string;
      title: string;
      projectId: string;
      projectKey: string;
      dueAt: string;
      status: string;
      assigneeId?: string;
    }>;
  };
};

export default function PulseWidget({ data }: PulseWidgetProps) {
  // Default values to prevent errors when data is undefined
  const pulseData = data || {
    activeProjects: 0,
    openTasks: 0,
    myOpenTasks: 0,
    overdue: 0,
    upcomingDeadlines: [],
  };
  const router = useRouter();

  const handleDrilldown = (type: string, params?: Record<string, string>) => {
    trackEvent('pm_dashboard_drilldown', { widget: 'pulse', type, ...params });
    if (type === 'projects') {
      router.push('/pm/projects?status=ACTIVE');
    } else if (type === 'tasks') {
      router.push('/pm/tasks');
    } else if (type === 'overdue') {
      router.push('/pm/tasks?status=in_progress');
    } else if (type === 'deadline' && params?.taskId) {
      router.push(`/pm/tasks?taskId=${params.taskId}`);
    }
  };

  return (
    <ContentBlock size="sm">
      <ContentBlockTitle as="h2">Пульс</ContentBlockTitle>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Активные проекты */}
        <button
          type="button"
          onClick={() => handleDrilldown('projects')}
          className="group rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-left transition hover:border-indigo-500/40 hover:bg-neutral-900"
        >
          <div className="text-xs text-neutral-400">Активные проекты</div>
          <div className="mt-1.5 text-xl font-bold text-white">{pulseData.activeProjects}</div>
        </button>

        {/* Открытые задачи */}
        <button
          type="button"
          onClick={() => handleDrilldown('tasks')}
          className="group rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-left transition hover:border-indigo-500/40 hover:bg-neutral-900"
        >
          <div className="text-xs text-neutral-400">Открытые задачи</div>
          <div className="mt-1.5 text-xl font-bold text-white">{pulseData.openTasks}</div>
          <div className="mt-1 text-xs text-neutral-500">Мои: {pulseData.myOpenTasks}</div>
        </button>

        {/* Просрочки */}
        <button
          type="button"
          onClick={() => handleDrilldown('overdue')}
          className={cn(
            'group rounded-xl border p-3 text-left transition hover:bg-neutral-900',
            pulseData.overdue > 0
              ? 'border-rose-500/50 bg-rose-500/10 hover:border-rose-500/60'
              : 'border-neutral-800 bg-neutral-900/50 hover:border-indigo-500/40'
          )}
        >
          <div className="text-xs text-neutral-400">Просрочено</div>
          <div className={cn('mt-1.5 text-xl font-bold', pulseData.overdue > 0 ? 'text-rose-400' : 'text-white')}>
            {pulseData.overdue}
          </div>
        </button>

        {/* Ближайшие дедлайны */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
          <div className="text-xs text-neutral-400">Ближайшие дедлайны</div>
          <div className="mt-1.5 text-xl font-bold text-white">{pulseData.upcomingDeadlines.length}</div>
        </div>
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


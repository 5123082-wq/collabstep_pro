'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { trackEvent } from '@/lib/telemetry';
import { cn } from '@/lib/utils';
import { ContentBlock } from '@/components/ui/content-block';

type WorkloadWidgetProps = {
  data: Array<{
    assigneeId: string;
    taskCount: number;
    projectCount: number;
    projects: string[];
  }>;
};

export default function WorkloadWidget({ data }: WorkloadWidgetProps) {
  const router = useRouter();

  const maxTasks = useMemo(() => Math.max(...data.map((d) => d.taskCount), 1), [data]);

  const handleDrilldown = (assigneeId: string) => {
    trackEvent('pm_dashboard_drilldown', { widget: 'workload', assigneeId });
    router.push(`/pm/tasks?assigneeId=${assigneeId}`);
  };

  if (data.length === 0) {
    return (
      <ContentBlock>
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Нагрузка исполнителей</h2>
        <div className="py-6 text-center text-xs text-[color:var(--text-tertiary)]">Нет данных о нагрузке</div>
      </ContentBlock>
    );
  }

  return (
    <ContentBlock>
      <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Нагрузка исполнителей</h2>

      <div className="space-y-2">
        {data
          .sort((a, b) => b.taskCount - a.taskCount)
          .slice(0, 10)
          .map((item) => {
            const intensity = item.taskCount / maxTasks;
            const colorIntensity = Math.min(intensity * 100, 100);

            return (
              <button
                key={item.assigneeId}
                type="button"
                onClick={() => handleDrilldown(item.assigneeId)}
                className="group w-full rounded-lg border border-neutral-800 bg-neutral-900/50 p-2.5 text-left transition hover:border-indigo-500/40 hover:bg-neutral-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white">{item.assigneeId}</div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-400">
                      <span>{item.taskCount} задач</span>
                      <span>{item.projectCount} проектов</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    {/* Heatmap bar */}
                    <div className="h-6 w-20 rounded border border-neutral-800 bg-neutral-900/50">
                      <div
                        className={cn(
                          'h-full rounded transition group-hover:opacity-80',
                          intensity > 0.8
                            ? 'bg-rose-500/60'
                            : intensity > 0.6
                              ? 'bg-orange-500/60'
                              : intensity > 0.4
                                ? 'bg-yellow-500/60'
                                : 'bg-green-500/60'
                        )}
                        style={{ width: `${colorIntensity}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </ContentBlock>
  );
}


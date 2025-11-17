'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/telemetry';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

type ProgressWidgetProps = {
  data: {
    burnup: Array<{ date: string; total: number; completed: number }>;
    burndown: Array<{ date: string; remaining: number }>;
  };
};

export default function ProgressWidget({ data }: ProgressWidgetProps) {
  const router = useRouter();

  const maxValue = useMemo(() => {
    const burnupMax = Math.max(...data.burnup.map((d) => d.total), 0);
    const burndownMax = Math.max(...data.burndown.map((d) => d.remaining), 0);
    return Math.max(burnupMax, burndownMax, 1);
  }, [data]);

  const handleDrilldown = () => {
    trackEvent('pm_dashboard_drilldown', { widget: 'progress' });
    router.push('/pm/tasks?view=list');
  };

  return (
    <ContentBlock size="sm">
      <ContentBlockTitle
        as="h2"
        actions={
          <button
            type="button"
            onClick={handleDrilldown}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Подробнее →
          </button>
        }
      >
        Прогресс
      </ContentBlockTitle>

      <div className="space-y-4">
        {/* Burnup Chart */}
        <div>
          <div className="mb-2 text-xs font-medium text-neutral-300">Burnup</div>
          <div className="relative h-24 w-full">
            <svg className="h-full w-full" viewBox="0 0 300 100" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="300"
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              ))}
              {/* Total line */}
              <polyline
                points={data.burnup
                  .map((d, i) => {
                    const x = (i / (data.burnup.length - 1 || 1)) * 300;
                    const y = 100 - (d.total / maxValue) * 100;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="rgba(99, 102, 241, 0.5)"
                strokeWidth="2"
              />
              {/* Completed line */}
              <polyline
                points={data.burnup
                  .map((d, i) => {
                    const x = (i / (data.burnup.length - 1 || 1)) * 300;
                    const y = 100 - (d.completed / maxValue) * 100;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="rgba(34, 197, 94, 0.7)"
                strokeWidth="2"
              />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-neutral-500">
              <span>{data.burnup[0]?.date.split('-').slice(1).join('.') || ''}</span>
              <span>{data.burnup[data.burnup.length - 1]?.date.split('-').slice(1).join('.') || ''}</span>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500/50" />
              <span>Всего задач</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500/70" />
              <span>Выполнено</span>
            </div>
          </div>
        </div>

        {/* Burndown Chart */}
        <div>
          <div className="mb-2 text-xs font-medium text-neutral-300">Burndown</div>
          <div className="relative h-24 w-full">
            <svg className="h-full w-full" viewBox="0 0 300 100" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="300"
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              ))}
              {/* Remaining line */}
              <polyline
                points={data.burndown
                  .map((d, i) => {
                    const x = (i / (data.burndown.length - 1 || 1)) * 300;
                    const y = 100 - (d.remaining / maxValue) * 100;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="rgba(249, 115, 22, 0.7)"
                strokeWidth="2"
              />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-neutral-500">
              <span>{data.burndown[0]?.date.split('-').slice(1).join('.') || ''}</span>
              <span>{data.burndown[data.burndown.length - 1]?.date.split('-').slice(1).join('.') || ''}</span>
            </div>
          </div>
          <div className="mt-1.5 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500/70" />
              <span>Осталось задач</span>
            </div>
          </div>
        </div>
      </div>
    </ContentBlock>
  );
}


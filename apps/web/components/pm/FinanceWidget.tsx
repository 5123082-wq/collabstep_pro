'use client';

import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/telemetry';
import { cn } from '@/lib/utils';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

type FinanceWidgetProps = {
  data: {
    expenses: Array<{
      projectId: string;
      projectKey: string;
      projectTitle: string;
      spent: string;
      limit?: string;
      remaining?: string;
      currency: string;
      categories: Array<{ name: string; spent: string; limit?: string }>;
    }>;
    totalSpent: string;
    totalLimit: string;
  };
};

export default function FinanceWidget({ data }: FinanceWidgetProps) {
  const router = useRouter();

  const handleDrilldown = (projectId: string) => {
    trackEvent('pm_dashboard_drilldown', { widget: 'finance', projectId });
    router.push(`/pm/projects/${projectId}`);
  };

  const totalSpentNum = parseFloat(data.totalSpent || '0');
  const totalLimitNum = parseFloat(data.totalLimit || '0');
  const usagePercent = totalLimitNum > 0 ? (totalSpentNum / totalLimitNum) * 100 : 0;

  return (
    <ContentBlock size="sm">
      <ContentBlockTitle as="h2">Финансы</ContentBlockTitle>

      {/* Общая статистика */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
          <div className="text-xs text-neutral-400">Потрачено</div>
          <div className="mt-1.5 text-xl font-bold text-white">
            {totalSpentNum.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
          </div>
        </div>
        {totalLimitNum > 0 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
            <div className="text-xs text-neutral-400">Лимит</div>
            <div className="mt-1.5 text-xl font-bold text-white">
              {totalLimitNum.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
            </div>
            <div className="mt-1.5">
              <div className="h-1.5 w-full rounded-full bg-neutral-800">
                <div
                  className={cn(
                    'h-full rounded-full transition',
                    usagePercent > 100
                      ? 'bg-rose-500'
                      : usagePercent > 80
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <div className="mt-0.5 text-xs text-neutral-400">{usagePercent.toFixed(1)}% использовано</div>
            </div>
          </div>
        )}
      </div>

      {/* Список проектов */}
      {data.expenses.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-neutral-300">По проектам</div>
          {data.expenses.map((project) => {
            const spentNum = parseFloat(project.spent || '0');
            const limitNum = project.limit ? parseFloat(project.limit) : null;
            const projectUsagePercent = limitNum && limitNum > 0 ? (spentNum / limitNum) * 100 : null;

            return (
              <button
                key={project.projectId}
                type="button"
                onClick={() => handleDrilldown(project.projectId)}
                className="group w-full rounded-lg border border-neutral-800 bg-neutral-900/50 p-2.5 text-left transition hover:border-indigo-500/40 hover:bg-neutral-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white">{project.projectTitle}</div>
                    <div className="mt-0.5 text-xs text-neutral-400">{project.projectKey}</div>
                    <div className="mt-1.5 text-xs text-neutral-300">
                      Потрачено: {spentNum.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      {limitNum && (
                        <span className="ml-2 text-neutral-500">
                          / {limitNum.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                        </span>
                      )}
                    </div>
                    {projectUsagePercent !== null && (
                      <div className="mt-1.5">
                        <div className="h-1 w-full rounded-full bg-neutral-800">
                          <div
                            className={cn(
                              'h-full rounded-full transition',
                              projectUsagePercent > 100
                                ? 'bg-rose-500'
                                : projectUsagePercent > 80
                                  ? 'bg-orange-500'
                                  : 'bg-green-500'
                            )}
                            style={{ width: `${Math.min(projectUsagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-neutral-400">Нет данных о финансах</div>
      )}
    </ContentBlock>
  );
}


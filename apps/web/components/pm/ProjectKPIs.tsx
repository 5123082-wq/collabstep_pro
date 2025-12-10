'use client';

import { type Project } from '@/types/pm';
import { cn } from '@/lib/utils';
import { Settings, CircleHelp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { ContentBlock } from '@/components/ui/content-block';

type ProjectKPIsProps = {
  project: Project;
  onUpdateLimit?: () => void;
  onBudgetSettingsClick?: () => void;
};

export default function ProjectKPIs({ project, onUpdateLimit, onBudgetSettingsClick }: ProjectKPIsProps) {
  const metrics = project.metrics;
  if (!metrics) {
    return null;
  }

  const progress = metrics.progressPct || 0;
  const totalTasks = metrics.total || 0;
  const inProgress = metrics.inProgress || 0;
  const overdue = metrics.overdue || 0;
  const budgetUsed = metrics.budgetUsed || 0;
  const budgetLimit = metrics.budgetLimit;
  const activity7d = metrics.activity7d || 0;

  const budgetPercentage = budgetLimit ? Math.min(100, (budgetUsed / budgetLimit) * 100) : 0;
  const isBudgetExceeded = budgetLimit && budgetUsed > budgetLimit;
  const isBudgetWarning = budgetLimit && budgetPercentage >= 80 && !isBudgetExceeded;
  const showBudgetBanner = budgetLimit && (isBudgetExceeded || isBudgetWarning);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Прогресс */}
        <ContentBlock size="sm" className="!p-2">
          <div className="text-[10px] leading-tight text-[color:var(--text-tertiary)]">Прогресс</div>
          <div className="text-base font-semibold text-[color:var(--text-primary)]">{progress}%</div>
          <div className="h-1 overflow-hidden rounded-full bg-neutral-800">
            <div
              className={cn('h-full transition-all', progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500')}
              style={{ width: `${progress}%` }}
            />
          </div>
        </ContentBlock>

        {/* Задачи */}
        <ContentBlock size="sm" className="!p-2">
          <div className="text-[10px] leading-tight text-[color:var(--text-tertiary)]">Задачи</div>
          <div className="text-base font-semibold text-[color:var(--text-primary)]">{totalTasks}</div>
          <div className="flex items-center gap-2 text-[10px] leading-tight text-neutral-500">
            <span className="text-emerald-400">В работе: {inProgress}</span>
            {overdue > 0 && <span className="text-rose-400">Просрочено: {overdue}</span>}
          </div>
        </ContentBlock>

        {/* Бюджет */}
        <ContentBlock 
          size="sm" 
          className={cn(
            '!p-2',
            onBudgetSettingsClick && 'cursor-pointer transition hover:bg-neutral-900/80',
            'relative'
          )}
          onClick={onBudgetSettingsClick}
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] leading-tight text-[color:var(--text-tertiary)]">Бюджет</div>
            {onBudgetSettingsClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBudgetSettingsClick();
                }}
                className="rounded p-0.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                title="Настройки бюджета"
              >
                <Settings className="h-3 w-3" />
              </button>
            )}
          </div>
          {budgetLimit ? (
            <>
              <div className={cn('text-base font-semibold', isBudgetExceeded ? 'text-rose-400' : 'text-[color:var(--text-primary)]')}>
                {budgetUsed} / {budgetLimit}
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className={cn('h-full transition-all', isBudgetExceeded ? 'bg-rose-500' : 'bg-indigo-500')}
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-base font-semibold text-[color:var(--text-tertiary)]">
              Не установлен
            </div>
          )}
        </ContentBlock>

        {/* Активность */}
        <ContentBlock size="sm" className="!p-2">
          <div className="text-[10px] leading-tight text-[color:var(--text-tertiary)]">Активность (7д)</div>
          <div className="text-base font-semibold text-[color:var(--text-primary)]">{activity7d}</div>
          <div className="text-[10px] leading-tight text-neutral-500">событий</div>
        </ContentBlock>

        {/* Бюджет предупреждение */}
        {showBudgetBanner && (
          <ContentBlock
            size="sm"
            variant={isBudgetExceeded ? 'error' : 'default'}
            className={cn(
              '!p-2',
              isBudgetExceeded
                ? 'border-rose-500/40 bg-rose-500/10'
                : 'border-amber-500/40 bg-amber-500/10'
            )}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <CircleHelp
                  className={cn('h-3 w-3 flex-shrink-0', isBudgetExceeded ? 'text-rose-400' : 'text-amber-400')}
                />
                <div className={cn('text-[10px] leading-tight font-semibold', isBudgetExceeded ? 'text-rose-100' : 'text-amber-100')}>
                  {isBudgetExceeded ? 'Превышен лимит' : 'Приближение к лимиту'}
                </div>
              </div>
              <div className={cn('text-[10px] leading-tight', isBudgetExceeded ? 'text-rose-100/80' : 'text-amber-100/80')}>
                {budgetUsed.toLocaleString()} / {budgetLimit.toLocaleString()} ({budgetPercentage.toFixed(1)}%)
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <Link
                  href={`/finance/overview?projectId=${project.id}`}
                  className={cn(
                    'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition',
                    isBudgetExceeded
                      ? 'bg-rose-500/20 text-rose-100 hover:bg-rose-500/30'
                      : 'bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
                  )}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  Финансы
                </Link>
                {onUpdateLimit && (
                  <button
                    type="button"
                    onClick={onUpdateLimit}
                    className={cn(
                      'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition',
                      isBudgetExceeded
                        ? 'bg-rose-500/20 text-rose-100 hover:bg-rose-500/30'
                        : 'bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
                    )}
                  >
                    <Settings className="h-2.5 w-2.5" />
                    Лимит
                  </button>
                )}
              </div>
            </div>
          </ContentBlock>
        )}
      </div>
    </div>
  );
}

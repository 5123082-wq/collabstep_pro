'use client';

import { type Project } from '@/types/pm';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';
import BudgetBanner from './BudgetBanner';
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Прогресс */}
        <ContentBlock size="sm">
          <div className="text-xs text-[color:var(--text-tertiary)]">Прогресс</div>
          <div className="text-xl font-semibold text-[color:var(--text-primary)]">{progress}%</div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className={cn('h-full transition-all', progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500')}
              style={{ width: `${progress}%` }}
            />
          </div>
        </ContentBlock>

        {/* Задачи */}
        <ContentBlock size="sm">
          <div className="text-xs text-[color:var(--text-tertiary)]">Задачи</div>
          <div className="text-xl font-semibold text-[color:var(--text-primary)]">{totalTasks}</div>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="text-emerald-400">В работе: {inProgress}</span>
            {overdue > 0 && <span className="text-rose-400">Просрочено: {overdue}</span>}
          </div>
        </ContentBlock>

        {/* Бюджет */}
        <ContentBlock 
          size="sm" 
          className={cn(
            onBudgetSettingsClick && 'cursor-pointer transition hover:bg-neutral-900/80',
            'relative'
          )}
          onClick={onBudgetSettingsClick}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-[color:var(--text-tertiary)]">Бюджет</div>
            {onBudgetSettingsClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBudgetSettingsClick();
                }}
                className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                title="Настройки бюджета"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {budgetLimit ? (
            <>
              <div className={cn('text-xl font-semibold', isBudgetExceeded ? 'text-rose-400' : 'text-[color:var(--text-primary)]')}>
                {budgetUsed} / {budgetLimit}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className={cn('h-full transition-all', isBudgetExceeded ? 'bg-rose-500' : 'bg-indigo-500')}
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-xl font-semibold text-[color:var(--text-tertiary)]">
              Не установлен
            </div>
          )}
        </ContentBlock>

        {/* Активность */}
        <ContentBlock size="sm">
          <div className="text-xs text-[color:var(--text-tertiary)]">Активность (7д)</div>
          <div className="text-xl font-semibold text-[color:var(--text-primary)]">{activity7d}</div>
          <div className="text-xs text-neutral-500">событий</div>
        </ContentBlock>
      </div>

      <BudgetBanner project={project} onUpdateLimit={onUpdateLimit} />
    </div>
  );
}

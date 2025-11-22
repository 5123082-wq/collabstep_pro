'use client';

import { type Project } from '@/types/pm';
import { CircleHelp, ExternalLink, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ContentBlock } from '@/components/ui/content-block';

type BudgetBannerProps = {
  project: Project;
  onUpdateLimit?: () => void;
};

export default function BudgetBanner({ project, onUpdateLimit }: BudgetBannerProps) {
  const metrics = project.metrics;
  if (!metrics || !metrics.budgetLimit) {
    return null;
  }

  const budgetUsed = metrics.budgetUsed || 0;
  const budgetLimit = metrics.budgetLimit;
  const percentage = (budgetUsed / budgetLimit) * 100;
  const isExceeded = budgetUsed > budgetLimit;
  const isWarning = percentage >= 80 && !isExceeded;

  if (!isExceeded && !isWarning) {
    return null;
  }

  return (
    <ContentBlock
      size="sm"
      variant={isExceeded ? 'error' : 'default'}
      className={cn(
        isExceeded
          ? 'border-rose-500/40 bg-rose-500/10'
          : 'border-amber-500/40 bg-amber-500/10'
      )}
    >
      <div className="flex items-start gap-3">
        <CircleHelp
          className={cn('h-5 w-5 flex-shrink-0 mt-0.5', isExceeded ? 'text-rose-400' : 'text-amber-400')}
        />
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <h4
              className={cn('text-sm font-semibold', isExceeded ? 'text-rose-100' : 'text-amber-100')}
            >
              {isExceeded ? 'Превышен лимит бюджета' : 'Приближение к лимиту бюджета'}
            </h4>
            <p className={cn('text-xs', isExceeded ? 'text-rose-100/80' : 'text-amber-100/80')}>
              {isExceeded
                ? `Использовано ${budgetUsed.toLocaleString()} из ${budgetLimit.toLocaleString()} (${percentage.toFixed(1)}%)`
                : `Использовано ${budgetUsed.toLocaleString()} из ${budgetLimit.toLocaleString()} (${percentage.toFixed(1)}%)`}
            </p>
            {isExceeded && (
              <p className="text-xs text-rose-100/60 mt-2">
                Превышение составляет {(budgetUsed - budgetLimit).toLocaleString()}. Рекомендуется пересмотреть бюджет или приостановить расходы.
              </p>
            )}
          </div>

          {/* Действия */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/finance/overview?projectId=${project.id}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                isExceeded
                  ? 'bg-rose-500/20 text-rose-100 hover:bg-rose-500/30'
                  : 'bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Перейти в финансы
            </Link>
            {onUpdateLimit && (
              <button
                type="button"
                onClick={onUpdateLimit}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  isExceeded
                    ? 'bg-rose-500/20 text-rose-100 hover:bg-rose-500/30'
                    : 'bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
                )}
              >
                <Settings className="h-3.5 w-3.5" />
                Изменить лимит
              </button>
            )}
          </div>
        </div>
      </div>
    </ContentBlock>
  );
}


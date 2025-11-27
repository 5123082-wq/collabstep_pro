'use client';

import Link from 'next/link';
// @ts-expect-error lucide-react icon types
import { DollarSign, ExternalLink, Megaphone, Store } from 'lucide-react';
import { type Project } from '@/types/pm';
import { cn } from '@/lib/utils';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

type ProjectLinksProps = {
  project: Project;
};

const MARKETPLACE_STATE_LABELS: Record<NonNullable<Project['marketplace']>['state'], string> = {
  none: 'Не опубликован',
  draft: 'Черновик',
  published: 'Опубликован',
  rejected: 'Отклонён'
};

const MARKETPLACE_STATE_COLORS: Record<NonNullable<Project['marketplace']>['state'], string> = {
  none: 'text-neutral-400',
  draft: 'text-amber-400',
  published: 'text-emerald-400',
  rejected: 'text-rose-400'
};

export default function ProjectLinks({ project }: ProjectLinksProps) {
  const marketplaceState = project.marketplace?.state || 'none';
  const marketplaceLabel = MARKETPLACE_STATE_LABELS[marketplaceState];
  const marketplaceColor = MARKETPLACE_STATE_COLORS[marketplaceState];

  return (
    <ContentBlock size="sm">
      <ContentBlockTitle as="h3">Связки</ContentBlockTitle>

      <div className="space-y-3">
        {/* Маркетплейс */}
        <div className="flex items-center justify-between rounded-lg border border-neutral-800/50 bg-neutral-900/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-indigo-400" />
            <div>
              <div className="text-sm font-medium text-white">Маркетплейс</div>
              <div className={cn('text-xs', marketplaceColor)}>{marketplaceLabel}</div>
            </div>
          </div>
          {project.marketplace?.listingId && (
            <Link
              href={`/market/projects/${project.marketplace.listingId}`}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
            >
              Открыть
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Маркетинг */}
        <Link
          href={`/marketing/overview?projectId=${project.id}`}
          className="flex items-center justify-between rounded-lg border border-neutral-800/50 bg-neutral-900/30 px-4 py-3 transition hover:border-indigo-500/40"
        >
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-indigo-400" />
            <div>
              <div className="text-sm font-medium text-white">Маркетинг</div>
              <div className="text-xs text-neutral-400">Кампании и аналитика</div>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-neutral-400" />
        </Link>

        {/* Финансы */}
        <Link
          href={`/finance/expenses?projectId=${project.id}`}
          className="flex items-center justify-between rounded-lg border border-neutral-800/50 bg-neutral-900/30 px-4 py-3 transition hover:border-indigo-500/40"
        >
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-indigo-400" />
            <div>
              <div className="text-sm font-medium text-white">Финансы</div>
              <div className="text-xs text-neutral-400">
                Траты: {project.metrics?.budgetUsed || 0} / {project.metrics?.budgetLimit || '—'}
              </div>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-neutral-400" />
        </Link>
      </div>
    </ContentBlock>
  );
}


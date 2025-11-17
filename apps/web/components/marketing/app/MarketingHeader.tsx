'use client';

import Link from 'next/link';
import { toast } from '@/lib/ui/toast';
import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { ContentBlock } from '@/components/ui/content-block';

type MarketingAction = {
  label: string;
  message?: string;
  href?: string;
  variant?: 'primary' | 'secondary';
};

type MarketingMetric = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  trend?: {
    value: string;
    label?: string;
    direction: 'up' | 'down';
  };
};

type MarketingHeaderProps = {
  title: string;
  description: string;
  actions: MarketingAction[];
  metrics: MarketingMetric[];
};

function renderAction(action: MarketingAction) {
  const baseClass =
    'rounded-2xl border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400';
  const variantClass =
    action.variant === 'secondary'
      ? 'border-neutral-800 bg-neutral-900/60 text-neutral-200 hover:border-indigo-400 hover:text-white'
      : 'border-indigo-500/50 bg-indigo-500/15 text-indigo-100 hover:border-indigo-400 hover:bg-indigo-500/25';

  if (action.href) {
    return (
      <Link key={action.label} href={action.href} className={clsx(baseClass, variantClass)}>
        {action.label}
      </Link>
    );
  }

  return (
    <button
      key={action.label}
      type="button"
      onClick={() => action.message && toast(action.message)}
      className={clsx(baseClass, variantClass)}
    >
      {action.label}
    </button>
  );
}

export default function MarketingHeader({ title, description, actions, metrics }: MarketingHeaderProps) {
  const metricsGridStyle = {
    '--cs-grid-gap': '12px'
  } as CSSProperties;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-neutral-400">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions.map(renderAction)}</div>
      </header>
      <div className="cs-auto-grid" style={metricsGridStyle}>
        {metrics.map((metric) => (
          <ContentBlock key={metric.id} size="sm" className="flex flex-col">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
            <div className="mt-auto space-y-2">
              {metric.helper ? <p className="text-xs text-neutral-400">{metric.helper}</p> : <div className="h-0" aria-hidden="true" />}
              {metric.trend ? (
                <p
                  className={clsx(
                    'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
                    metric.trend.direction === 'up'
                      ? 'bg-emerald-500/10 text-emerald-200'
                      : 'bg-rose-500/10 text-rose-200'
                  )}
                >
                  <span aria-hidden="true">{metric.trend.direction === 'up' ? '↑' : '↓'}</span>
                  {metric.trend.value}
                  {metric.trend.label ? <span className="font-normal text-neutral-400">· {metric.trend.label}</span> : null}
                </p>
              ) : (
                <div className="h-0" aria-hidden="true" />
              )}
            </div>
          </ContentBlock>
        ))}
      </div>
    </section>
  );
}

export type { MarketingAction, MarketingMetric };

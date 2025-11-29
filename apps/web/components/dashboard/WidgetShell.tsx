'use client';

import { type ReactNode, useMemo } from 'react';
import clsx from 'clsx';
import { ContentBlock } from '@/components/ui/content-block';
import { cn } from '@/lib/utils';
import type { WidgetConfig, WidgetData, WidgetState } from '@/lib/dashboard/types';

type WidgetShellProps = {
  config: WidgetConfig;
  data: WidgetData;
  title?: string;
  description?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  onRetry?: () => void;
  onRefresh?: () => void;
  onStateChange?: (state: WidgetState) => void;
  children: ReactNode;
};

const stateMeta: Record<
  WidgetState,
  {
    label: string;
    tone: string;
  }
> = {
  content: { label: 'Готово', tone: 'bg-emerald-400' },
  loading: { label: 'Загрузка', tone: 'bg-amber-400' },
  empty: { label: 'Пусто', tone: 'bg-sky-400' },
  error: { label: 'Ошибка', tone: 'bg-rose-400' }
};

function formatTimestamp(value?: string): string {
  if (!value) {
    return 'Обновление ожидается';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function WidgetShell({
  config,
  data,
  title,
  description,
  actions,
  toolbar,
  onRetry,
  onRefresh,
  children
}: WidgetShellProps) {
  const meta = stateMeta[data.state];
  const fallbackDescription = description ?? 'Настройте источники и фильтры под свои сценарии.';
  const formattedUpdated = useMemo(() => formatTimestamp(data.lastUpdated), [data.lastUpdated]);

  return (
    <ContentBlock className="dashboard-widget h-full">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-black/20',
                meta?.tone ?? 'bg-neutral-500'
              )}
              aria-hidden
            />
            <p className="text-sm font-semibold text-white">{title ?? config.title}</p>
          </div>
          <p className="text-xs text-neutral-400">{fallbackDescription}</p>
          <div className="hidden flex-wrap items-center gap-2 text-[11px] text-neutral-400">
            {data.source ? (
              <span className="rounded-full border border-neutral-800 bg-neutral-950/60 px-2 py-1">
                Источник: {data.source}
              </span>
            ) : null}
            <span className="rounded-full border border-neutral-800 bg-neutral-950/60 px-2 py-1">
              Обновлено: {formattedUpdated}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {toolbar}
          {actions}
        </div>
      </header>

      <div className={cn('flex flex-1 flex-col gap-3', data.state === 'loading' && 'animate-pulse')}>
        {data.state === 'loading' && (
          <div className="space-y-3">
            <div className="h-3 w-2/3 rounded bg-neutral-800/80" />
            <div className="h-3 w-3/4 rounded bg-neutral-800/80" />
            <div className="h-3 w-1/2 rounded bg-neutral-800/80" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 rounded-lg bg-neutral-900/80" />
              <div className="h-16 rounded-lg bg-neutral-900/80" />
              <div className="h-16 rounded-lg bg-neutral-900/80" />
            </div>
          </div>
        )}

        {data.state === 'empty' && (
          <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 p-4">
            <p className="text-sm text-neutral-300">
              {data.source === 'projects-core'
                ? 'Нет доступных проектов или задач. Создайте проект или получите доступ к существующему.'
                : 'Здесь появятся данные, когда вы подключите источник.'}
            </p>
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-lg border border-indigo-500/60 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Обновить
              </button>
            ) : null}
          </div>
        )}

        {data.state === 'error' && (
          <div className="flex flex-1 flex-col items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-50">
            <p className="text-sm font-semibold">Ошибка загрузки</p>
            <p className="text-xs text-rose-50/80">{data.error ?? 'Не удалось получить данные'}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg border border-rose-400/60 bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
              >
                Повторить
              </button>
            ) : null}
          </div>
        )}

        {data.state === 'content' && children}
      </div>

      <footer className="flex items-center justify-between gap-3 text-[11px] text-neutral-400">
        <span className="inline-flex items-center gap-2">
          <span className={clsx('h-2 w-2 rounded-full', meta?.tone ?? 'bg-neutral-500')} aria-hidden />
          {meta?.label}
        </span>
        <div className="flex items-center gap-2">
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-md border border-neutral-800 px-3 py-1 text-[11px] text-neutral-300 transition hover:border-indigo-500/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Обновить
            </button>
          ) : null}
          {data.state === 'error' && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md border border-rose-500/70 px-3 py-1 text-[11px] text-rose-50 transition hover:bg-rose-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
            >
              Retry
            </button>
          ) : null}
        </div>
      </footer>
    </ContentBlock>
  );
}

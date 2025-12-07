'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export default function AdminPageHeader({
  title,
  description,
  actions,
  className
}: AdminPageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Админка
        </p>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-white sm:text-2xl">{title}</h1>
          {description ? <p className="text-sm text-neutral-400">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';

type ContentContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function ContentContainer({ children, className }: ContentContainerProps) {
  return (
    <main
      data-app-main
      className={clsx(
        'content-area relative flex-1 min-w-0 overflow-y-auto py-4',
        // Единые горизонтальные отступы применяются через globals.css для [data-app-main]
        className
      )}
      aria-live="polite"
    >
      <div className="flex w-full min-w-0 flex-col gap-8 pb-16">{children}</div>
    </main>
  );
}

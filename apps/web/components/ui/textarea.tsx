'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-4 py-2',
        'text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] transition-colors duration-200',
        'hover:border-[color:var(--surface-border-strong)] focus-visible:border-[color:var(--accent-border)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent-border-strong)]',
        'disabled:cursor-not-allowed disabled:border-[color:var(--surface-border-subtle)] disabled:bg-[color:var(--surface-muted)] disabled:text-[color:var(--text-tertiary)]',
        'resize-none',
        className
      )}
      {...props}
    />
  );
});


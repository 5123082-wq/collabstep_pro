'use client';

import { type ReactNode, type HTMLAttributes, forwardRef, createElement } from 'react';
import clsx from 'clsx';

type ContentBlockSize = 'sm' | 'md';
type ContentBlockVariant = 'default' | 'primary' | 'muted' | 'error' | 'borderless' | 'dashed';
type ContentBlockElement = 'section' | 'div' | 'article' | 'aside';

type ContentBlockProps = Omit<HTMLAttributes<HTMLElement>, 'className'> & {
  as?: ContentBlockElement;
  size?: ContentBlockSize;
  variant?: ContentBlockVariant;
  interactive?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Универсальный компонент для блоков контента
 * Основан на эталонном блоке: rounded-3xl border border-neutral-900 bg-neutral-950/70 p-6 shadow-[0_0_12px_rgba(0,0,0,0.12)]
 */
export const ContentBlock = forwardRef<HTMLElement, ContentBlockProps>(
  function ContentBlock(
    {
      as: Component = 'section',
      size = 'md',
      variant = 'default',
      interactive = false,
      header,
      footer,
      children,
      className,
      ...props
    },
    ref
  ) {
    const sizeClass = size === 'sm' ? 'content-block-sm' : '';
    
    const variantClass = {
      default: '',
      primary: 'content-block-primary',
      muted: 'content-block-muted',
      error: 'content-block-error',
      borderless: 'content-block-borderless',
      dashed: 'content-block-dashed'
    }[variant];

    const classNames = clsx(
      'content-block',
      sizeClass,
      variantClass,
      interactive && 'content-block-interactive',
      className
    );

    const content = (
      <>
        {header && <div className="content-block-header">{header}</div>}
        <div className="content-block-body">{children}</div>
        {footer && <div className="content-block-footer">{footer}</div>}
      </>
    );

    // Используем createElement для правильной обработки ref с динамическими компонентами
    return createElement(Component, { ref, className: classNames, ...props }, content);
  }
);

/**
 * Компонент для заголовка блока с описанием и действиями
 */
type ContentBlockTitleProps = {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function ContentBlockTitle({
  as: Component = 'h3',
  children,
  description,
  actions,
  className
}: ContentBlockTitleProps) {
  return (
    <div className={clsx('flex items-start justify-between gap-4', className)}>
      <div className="flex-1 min-w-0">
        <Component className="text-lg font-semibold text-[color:var(--text-primary)]">
          {children}
        </Component>
        {description && (
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}


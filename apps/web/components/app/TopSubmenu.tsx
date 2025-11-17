'use client';

import clsx from 'clsx';
import Link from 'next/link';
import type { MouseEventHandler, ReactNode } from 'react';
import { ContentBlock } from '@/components/ui/content-block';

type BaseItem = {
  id: string;
  label: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
};

type ActionItem = BaseItem & {
  href?: undefined;
  onSelect: () => void;
  active?: boolean;
};

type LinkItem = BaseItem & {
  href: string;
  onSelect?: () => void;
  active?: boolean;
};

type TopSubmenuItem = ActionItem | LinkItem;

type TopSubmenuProps = {
  items: TopSubmenuItem[];
  ariaLabel?: string;
};

function renderBadge(badge: ReactNode) {
  if (badge === null || badge === undefined || badge === false) {
    return null;
  }

  return (
    <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-100">
      {badge}
    </span>
  );
}

function resolveItemClassName(active?: boolean, disabled?: boolean) {
  return clsx(
    'group relative inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
    active
      ? 'bg-indigo-500 text-white shadow'
      : 'text-neutral-400 hover:text-white hover:bg-neutral-900/80',
    disabled && 'pointer-events-none opacity-50'
  );
}

export default function TopSubmenu({ items, ariaLabel = 'Дополнительная навигация' }: TopSubmenuProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ContentBlock as="nav" size="sm" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2 p-2">
      {items.map((item) => {
        const { id, label, badge, disabled } = item;
        const className = resolveItemClassName(item.active, disabled);

        if ('href' in item && item.href) {
          let handleClick: MouseEventHandler<HTMLAnchorElement> | undefined;
          if (item.onSelect) {
            handleClick = () => {
              item.onSelect?.();
            };
          }
          return (
            <Link
              key={id}
              href={item.href}
              className={className}
              aria-current={item.active ? 'page' : undefined}
              {...(handleClick ? { onClick: handleClick } : {})}
            >
              <span className="flex items-center">
                {label}
                {renderBadge(item.badge)}
              </span>
            </Link>
          );
        }

        return (
          <button
            key={id}
            type="button"
            onClick={item.onSelect}
            className={className}
            aria-pressed={item.active}
            disabled={disabled}
          >
            <span className="flex items-center">
              {label}
              {renderBadge(item.badge)}
            </span>
          </button>
        );
      })}
    </ContentBlock>
  );
}

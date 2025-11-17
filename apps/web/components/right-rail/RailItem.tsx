'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { QuickAction } from '@/types/quickActions';
import { COLLAPSED_RAIL_WIDTH, RAIL_INNER_PADDING } from './constants';

const ICON_COLUMN_WIDTH = COLLAPSED_RAIL_WIDTH - RAIL_INNER_PADDING * 2;

interface RailItemProps {
  action: QuickAction;
  expanded: boolean;
  onClick: () => void;
  badge?: number | undefined;
  iconColumnWidth?: number;
}

export function RailItem({ action, expanded, onClick, badge, iconColumnWidth }: RailItemProps) {
  const Icon = action.icon;
  const showBadge = typeof badge === 'number' && badge > 0;
  const computedIconColumnWidth = iconColumnWidth ?? ICON_COLUMN_WIDTH;
  const iconColumnWidthValue = `${computedIconColumnWidth}px`;
  const gridTemplateColumns = expanded
    ? `minmax(0,1fr) ${iconColumnWidthValue}`
    : `0px ${iconColumnWidthValue}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative my-0.5 grid w-full items-center overflow-hidden rounded-xl py-1 transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
        'hover:shadow-lg hover:scale-[1.03]',
        expanded ? 'pl-3 pr-0' : 'px-0'
      )}
      style={{ gridTemplateColumns }}
      aria-label={expanded ? undefined : action.label}
    >
      <span
        aria-hidden={!expanded}
        className={cn(
          'block overflow-hidden whitespace-nowrap pr-3 text-right text-sm text-neutral-500 opacity-0 transition-[max-width,opacity,transform] duration-200 ease-out dark:text-neutral-200',
          expanded ? 'max-w-[188px] opacity-100 translate-x-0' : 'max-w-0 -translate-x-1'
        )}
      >
        {action.label}
      </span>
      <span
        className="flex h-9 items-center justify-center"
        style={{ width: iconColumnWidthValue }}
      >
        <span className="relative flex h-9 w-9 items-center justify-center">
          <Icon className="h-[19px] w-[19px] text-neutral-500 dark:text-neutral-200" aria-hidden="true" />
          {showBadge ? (
            <span className="absolute -top-1 -right-1">
              <Badge className="px-1 py-0 text-xs leading-3">{badge}</Badge>
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

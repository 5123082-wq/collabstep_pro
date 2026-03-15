'use client';

import Link from 'next/link';
import type { CatalogDemoMetrics, MarketplaceSeller } from '@/lib/marketplace/types';
import { formatCatalogMetricValue } from '@/lib/marketplace/discovery';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type CatalogDiscoveryCardFooterProps = {
  seller: MarketplaceSeller;
  metrics: CatalogDemoMetrics;
};

const METRIC_ITEMS = [
  {
    key: 'likes',
    label: 'Лайки',
    icon: (
      <path d="M12 21s-6-4.35-9-8.36C-1 7.52 2.24 3 6.5 3A4.62 4.62 0 0 1 12 6.1 4.62 4.62 0 0 1 17.5 3C21.76 3 25 7.52 21 12.64 18 16.65 12 21 12 21Z" />
    )
  },
  {
    key: 'views',
    label: 'Просмотры',
    icon: (
      <>
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3.25" />
      </>
    )
  },
  {
    key: 'uses',
    label: 'Использования',
    icon: (
      <path d="m4 12 5 5L20 6" />
    )
  }
] as const;

function getSellerInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'AU';
}

export default function CatalogDiscoveryCardFooter({ seller, metrics }: CatalogDiscoveryCardFooterProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link href={`/p/${seller.handle}`} className="group flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9 border border-neutral-800 bg-neutral-900">
          <AvatarImage src={seller.avatarUrl} alt={seller.name} />
          <AvatarFallback className="bg-neutral-800 text-xs font-semibold text-neutral-200">
            {getSellerInitials(seller.name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-semibold text-neutral-100 transition group-hover:text-indigo-300">
          {seller.name}
        </span>
      </Link>

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        {METRIC_ITEMS.map((item) => (
          <div key={item.key} className="inline-flex items-center gap-1.5" aria-label={item.label}>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 text-neutral-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {item.icon}
            </svg>
            <span>{formatCatalogMetricValue(metrics[item.key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

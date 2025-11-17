'use client';

import { useMemo } from 'react';
import type { MarketplaceCategory } from '@/lib/marketplace/types';
import { ContentBlock } from '@/components/ui/content-block';

type SortKey = 'featured' | 'price_asc' | 'price_desc' | 'rating_desc';

type TemplatesToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  category: MarketplaceCategory | 'all';
  onCategoryChange: (value: MarketplaceCategory | 'all') => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  totalCount: number;
  categoryLabels: Record<MarketplaceCategory, string>;
};

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'featured', label: 'По умолчанию' },
  { value: 'price_asc', label: 'Цена ↑' },
  { value: 'price_desc', label: 'Цена ↓' },
  { value: 'rating_desc', label: 'Рейтинг' }
];

export default function TemplatesToolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  totalCount,
  categoryLabels
}: TemplatesToolbarProps) {
  const totalLabel = useMemo(() => new Intl.NumberFormat('ru-RU').format(totalCount), [totalCount]);

  return (
    <ContentBlock size="sm" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Поиск по шаблонам</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Поиск по названию или тегам"
            className="w-full rounded-xl border border-neutral-800/80 bg-neutral-950/80 px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </label>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value as MarketplaceCategory | 'all')}
            className="w-full rounded-xl border border-neutral-800/80 bg-neutral-950/80 px-4 py-2.5 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="all">Все категории</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
            className="w-full rounded-xl border border-neutral-800/80 bg-neutral-950/80 px-4 py-2.5 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs uppercase tracking-[0.32em] text-neutral-500">
        Найдено: <span className="text-neutral-100">{totalLabel}</span>
      </p>
    </ContentBlock>
  );
}

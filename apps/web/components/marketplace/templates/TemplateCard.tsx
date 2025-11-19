'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import clsx from 'clsx';
import type { MarketplaceTemplate } from '@/lib/marketplace/types';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import { getTemplatePricingBadge } from '@/lib/marketplace/pricing';
import { ContentBlock } from '@/components/ui/content-block';

const CATEGORY_BADGES: Record<string, string> = {
  logo: 'Логотип',
  landing: 'Лендинг',
  ui_kit: 'UI-kit',
  presentation: 'Презентация'
};

const salesFormatter = new Intl.NumberFormat('ru-RU');

type TemplateCardProps = {
  template: MarketplaceTemplate;
};

export default function TemplateCard({ template }: TemplateCardProps) {
  const toggleFavorite = useMarketplaceStore((state) => state.toggleFavorite);
  const openTemplateDetail = useMarketplaceStore((state) => state.openTemplateDetail);
  const favorites = useMarketplaceStore((state) => state.favorites);
  const isFavorite = favorites.includes(template.id);

  const badgeLabel = useMemo(() => CATEGORY_BADGES[template.category] ?? 'Шаблон', [template.category]);
  const pricingBadge = useMemo(() => getTemplatePricingBadge(template), [template]);
  const ratingStars = useMemo(() => Array.from({ length: 5 }, (_, index) => template.rating >= index + 1), [template.rating]);
  const formattedSales = useMemo(() => salesFormatter.format(template.salesCount), [template.salesCount]);

  const pricingBadgeClassName = useMemo(
    () =>
      clsx(
        'rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em]',
        pricingBadge.tone === 'subscription' && 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20',
        pricingBadge.tone === 'free' && 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
        pricingBadge.tone === 'paid' && 'bg-neutral-800 text-neutral-100 shadow-lg shadow-neutral-900/20'
      ),
    [pricingBadge.tone]
  );

  return (
    <ContentBlock
      as="article"
      size="sm"
      interactive
      className="group flex flex-col overflow-hidden p-0"
    >
      <div className="relative">
        <div className="relative block aspect-[16/10] cursor-pointer overflow-hidden" onClick={() => openTemplateDetail(template.id)}>
          <Image
            src={template.previewUrl}
            alt={template.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(min-width: 1280px) 260px, (min-width: 1024px) 240px, (min-width: 768px) 280px, 100vw"
            loading="lazy"
          />
        </div>
        {/* Бейдж категории - верхний левый угол */}
        <div className="pointer-events-none absolute left-3 top-3">
          <span className="rounded-full bg-white/95 dark:bg-black/90 backdrop-blur-sm px-3 py-1 text-xs uppercase tracking-[0.24em] text-neutral-900 dark:text-white ring-1 ring-neutral-300/50 dark:ring-neutral-600/50">
            {badgeLabel}
          </span>
        </div>

        {/* Бейдж подписки - нижний левый угол */}
        <div className="pointer-events-none absolute bottom-3 left-3">
          <span className={pricingBadgeClassName}>{pricingBadge.label}</span>
        </div>
        <button
          type="button"
          onClick={() => toggleFavorite(template.id)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
          className={clsx(
            'absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300',
            isFavorite
              ? 'border-indigo-400/80 bg-indigo-500/20 text-indigo-200'
              : 'border-neutral-700/80 bg-neutral-950/60 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100'
          )}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={clsx('h-4 w-4 transition', isFavorite ? 'scale-110' : 'group-hover:scale-105')}
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21s-6-4.35-9-8.36C-1 7.52 2.24 3 6.5 3A4.62 4.62 0 0 1 12 6.1 4.62 4.62 0 0 1 17.5 3C21.76 3 25 7.52 21 12.64 18 16.65 12 21 12 21Z" />
          </svg>
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-2">
          <button
            onClick={() => openTemplateDetail(template.id)}
            className="line-clamp-2 text-left text-base font-semibold text-neutral-100 transition hover:text-indigo-300"
          >
            {template.title}
          </button>
          <p className="line-clamp-2 text-sm text-neutral-400">{template.description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-400">
          <div className="flex items-center gap-1">
            {ratingStars.map((isActive, index) => (
              <svg
                key={`star-${template.id}-${index}`}
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={clsx('h-3.5 w-3.5', isActive ? 'text-amber-300' : 'text-neutral-700')}
                fill={isActive ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isActive ? 0 : 1.5}
              >
                <path d="m12 17.27-4.15 2.51 1.1-4.72L5 11.24l4.9-.42L12 6.5l2.1 4.32 4.9.42-3.95 3.82 1.1 4.72Z" />
              </svg>
            ))}
            <span className="ml-1.5 text-sm font-semibold text-neutral-100">{template.rating.toFixed(1)}</span>
            <span className="text-xs text-neutral-500">({template.ratingCount})</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-neutral-500" fill="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>{formattedSales}</span>
          </div>
        </div>
      </div>
    </ContentBlock>
  );
}



'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import type { MarketplaceTemplate } from '@/lib/marketplace/types';
import { getTemplatePriceLabel } from '@/lib/marketplace/pricing';
import CatalogIntentButton from '@/components/marketplace/catalog/CatalogIntentButton';

type TemplatePurchaseActionsProps = {
  template: MarketplaceTemplate;
};

export default function TemplatePurchaseActions({ template }: TemplatePurchaseActionsProps) {
  const addToCart = useMarketplaceStore((state) => state.addToCart);
  const toggleFavorite = useMarketplaceStore((state) => state.toggleFavorite);
  const favorites = useMarketplaceStore((state) => state.favorites);
  const isFavorite = favorites.includes(template.id);

  const priceInfo = useMemo(() => getTemplatePriceLabel(template), [template]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">Формат доступа</p>
        <p className="text-3xl font-semibold text-neutral-50">{priceInfo.primary}</p>
        {priceInfo.secondary ? (
          <p className="mt-1 text-sm text-neutral-500">{priceInfo.secondary}</p>
        ) : null}
        <p className="mt-3 text-sm text-neutral-400">Лицензия: {template.license}</p>
      </div>
      <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Автор</p>
        <Link href={`/p/${template.seller.handle}`} className="mt-2 block text-base font-semibold text-neutral-100 transition hover:text-indigo-300">
          {template.seller.name}
        </Link>
        <p className="mt-1 text-sm text-neutral-400">{template.seller.headline}</p>
        <p className="mt-2 text-xs text-neutral-500">
          {template.seller.location} • {template.seller.portfolioCount} публичных работ
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <CatalogIntentButton
          intent="project"
          sourceKind="template"
          sourceId={template.id}
          sourceTitle={template.title}
          label="Использовать в проекте"
          className="w-full"
        />
        <button
          type="button"
          onClick={() => toggleFavorite(template.id)}
          className="w-full rounded-xl border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
        >
          {isFavorite ? 'Сохранено в сохранённом' : 'Сохранить'}
        </button>
        <CatalogIntentButton
          intent="adaptation"
          sourceKind="template"
          sourceId={template.id}
          sourceTitle={template.title}
          label="Запросить адаптацию"
          className="w-full"
          variant="secondary"
        />
        <button
          type="button"
          onClick={() => addToCart(template.id)}
          className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:border-neutral-600 hover:text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
        >
          В корзину и оформление
        </button>
      </div>
    </div>
  );
}

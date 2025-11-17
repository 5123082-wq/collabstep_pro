'use client';

import Link from 'next/link';
import Image from 'next/image';
import clsx from 'clsx';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import type { MarketplaceTemplate } from '@/lib/marketplace/types';
import { getTemplatePriceLabel } from '@/lib/marketplace/pricing';
import { ContentBlock } from '@/components/ui/content-block';

type FavoritesViewProps = {
  templates: MarketplaceTemplate[];
};

export default function FavoritesView({ templates }: FavoritesViewProps) {
  const favorites = useMarketplaceStore((state) => state.favorites);
  const toggleFavorite = useMarketplaceStore((state) => state.toggleFavorite);
  const addToCart = useMarketplaceStore((state) => state.addToCart);

  const favoriteTemplates = templates.filter((template) => favorites.includes(template.id));

  if (favoriteTemplates.length === 0) {
    return (
      <ContentBlock variant="dashed" size="sm" className="flex flex-col items-center justify-center gap-4 p-16 text-center">
        <h2 className="text-lg font-semibold text-neutral-100">Вы пока ничего не сохранили</h2>
        <p className="max-w-md text-sm text-neutral-400">
          Добавляйте понравившиеся шаблоны и проекты в избранное, чтобы быстро находить их и делиться с командой.
        </p>
        <Link
          href="/market/templates"
          className="rounded-xl border border-indigo-400 px-5 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/10"
        >
          Открыть каталог шаблонов
        </Link>
      </ContentBlock>
    );
  }

  return (
    <div className="grid gap-4">
      {favoriteTemplates.map((template) => {
        const priceInfo = getTemplatePriceLabel(template);

        return (
          <ContentBlock
            key={template.id}
            size="sm"
            className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
          >
            <Link href={`/market/templates/${template.id}`} className="relative h-32 w-full overflow-hidden rounded-xl sm:w-48">
              <Image src={template.previewUrl} alt={template.title} fill className="object-cover" sizes="192px" />
            </Link>
            <div className="flex flex-1 flex-col gap-2">
              <Link
                href={`/market/templates/${template.id}`}
                className="line-clamp-2 text-lg font-semibold text-neutral-100 transition hover:text-indigo-300"
              >
                {template.title}
              </Link>
              <p className="text-sm text-neutral-400">{template.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
                <span className="font-semibold text-neutral-100">{priceInfo.primary}</span>
                {priceInfo.secondary ? <span className="text-xs text-neutral-500">{priceInfo.secondary}</span> : null}
                <span aria-hidden className="text-neutral-700">•</span>
                <span>
                  ★ {template.rating.toFixed(1)} <span className="text-neutral-600">({template.ratingCount})</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:w-48">
              <button
                type="button"
                onClick={() => addToCart(template.id)}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                В корзину
              </button>
              <button
                type="button"
                onClick={() => toggleFavorite(template.id)}
                className={clsx(
                  'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                  'border-neutral-700 text-neutral-200 hover:border-neutral-500 hover:text-neutral-50'
                )}
              >
                Удалить
              </button>
            </div>
          </ContentBlock>
        );
      })}
    </div>
  );
}

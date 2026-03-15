'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { CatalogSpotlight } from '@/lib/marketplace/types';
import { ContentBlock } from '@/components/ui/content-block';
import CatalogDiscoveryCardFooter from './CatalogDiscoveryCardFooter';
import CatalogSpotlightDetailModal from './CatalogSpotlightDetailModal';

type CatalogSpotlightCardProps = {
  item: CatalogSpotlight;
};

export default function CatalogSpotlightCard({ item }: CatalogSpotlightCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ContentBlock
        as="article"
        size="sm"
        interactive
        className="group flex h-full flex-col overflow-hidden border-neutral-800/80 bg-neutral-950/80 p-0 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.85)]"
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative block aspect-[16/10] w-full overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
        >
          <Image
            src={item.previewUrl}
            alt={item.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 420px, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/75 via-neutral-950/15 to-transparent" />
        </button>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="line-clamp-2 text-left text-lg font-semibold text-neutral-50 transition hover:text-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            >
              {item.title}
            </button>
            <p className="line-clamp-3 text-sm leading-6 text-neutral-400">{item.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={`${item.id}-${tag}`}
                className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-xs text-neutral-300"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-auto border-t border-neutral-800/80 pt-4">
            <CatalogDiscoveryCardFooter seller={item.seller} metrics={item.demoMetrics} />
          </div>
        </div>
      </ContentBlock>

      <CatalogSpotlightDetailModal item={item} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

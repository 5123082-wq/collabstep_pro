'use client';

import Image from 'next/image';
import type { MarketplaceTemplate } from '@/lib/marketplace/types';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import { getTemplateDemoMetrics } from '@/lib/marketplace/discovery';
import { ContentBlock } from '@/components/ui/content-block';
import CatalogDiscoveryCardFooter from '@/components/marketplace/catalog/CatalogDiscoveryCardFooter';

type TemplateCardProps = {
  template: MarketplaceTemplate;
};

export default function TemplateCard({ template }: TemplateCardProps) {
  const openTemplateDetail = useMarketplaceStore((state) => state.openTemplateDetail);

  return (
    <ContentBlock
      as="article"
      size="sm"
      interactive
      className="group flex h-full flex-col overflow-hidden border-neutral-800/80 bg-neutral-950/80 p-0 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.9)]"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => openTemplateDetail(template.id)}
          className="relative block aspect-[16/10] w-full cursor-pointer overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
        >
          <Image
            src={template.previewUrl}
            alt={template.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(min-width: 1280px) 260px, (min-width: 1024px) 240px, (min-width: 768px) 280px, 100vw"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 via-transparent to-transparent" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => openTemplateDetail(template.id)}
            className="line-clamp-2 text-left text-base font-semibold text-neutral-100 transition hover:text-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            {template.title}
          </button>
          <p className="line-clamp-3 text-sm leading-6 text-neutral-400">{template.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={`${template.id}-${tag}`}
              className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-xs text-neutral-300"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-auto border-t border-neutral-800/80 pt-4">
          <CatalogDiscoveryCardFooter seller={template.seller} metrics={getTemplateDemoMetrics(template)} />
        </div>
      </div>
    </ContentBlock>
  );
}

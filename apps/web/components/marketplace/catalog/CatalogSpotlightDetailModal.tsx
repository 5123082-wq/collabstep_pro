'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CatalogSpotlight } from '@/lib/marketplace/types';
import LargeContentModal from '@/components/ui/large-content-modal';
import { ContentBlock } from '@/components/ui/content-block';
import CatalogIntentButton from './CatalogIntentButton';
import CatalogDiscoveryCardFooter from './CatalogDiscoveryCardFooter';

type CatalogSpotlightDetailModalProps = {
  item: CatalogSpotlight;
  isOpen: boolean;
  onClose: () => void;
};

const KIND_LABELS: Record<CatalogSpotlight['kind'], string> = {
  solution: 'Готовое решение',
  service: 'Услуга'
};

export default function CatalogSpotlightDetailModal({ item, isOpen, onClose }: CatalogSpotlightDetailModalProps) {
  const isSolution = item.kind === 'solution';

  return (
    <LargeContentModal isOpen={isOpen} onClose={onClose}>
      <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-12 xl:p-8">
        <section className="space-y-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[28px] border border-neutral-800/80">
            <Image src={item.previewUrl} alt={item.title} fill className="object-cover" sizes="(min-width: 1280px) 760px, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/10 to-transparent" />
          </div>

          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">{KIND_LABELS[item.kind]}</p>
            <h1 className="text-2xl font-semibold text-neutral-50">{item.title}</h1>
            <p className="text-sm leading-7 text-neutral-400">{item.description}</p>
          </header>

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

          <ContentBlock size="sm" className="border-neutral-800/80 bg-neutral-900/50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Контекст</p>
            <p className="mt-3 text-sm text-neutral-300">{item.meta}</p>
            <p className="mt-2 text-sm text-neutral-400">
              Метрики в карточке пока остаются demo placeholders и не подключены к новой аналитике или backend-источнику.
            </p>
          </ContentBlock>

          <ContentBlock size="sm" className="border-neutral-800/80 bg-neutral-900/50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Автор</p>
            <div className="mt-3">
              <CatalogDiscoveryCardFooter seller={item.seller} metrics={item.demoMetrics} />
            </div>
            <p className="mt-3 text-sm text-neutral-300">{item.seller.headline}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {item.seller.location} • {item.seller.portfolioCount} публичных работ
            </p>
          </ContentBlock>
        </section>

        <aside className="space-y-6">
          <ContentBlock size="sm">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Действия</p>
                <p className="mt-3 text-sm text-neutral-400">
                  {isSolution
                    ? 'Сначала оцените состав решения и только затем отправляйте его в проект или запрашивайте адаптацию.'
                    : 'Сначала откройте scope и автора, затем переводите договорённость в inquiry или project flow.'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {isSolution ? (
                  <CatalogIntentButton
                    intent="project"
                    sourceKind="solution"
                    sourceId={item.id}
                    sourceTitle={item.title}
                    label="Использовать в проекте"
                    className="w-full"
                  />
                ) : null}
                <CatalogIntentButton
                  intent="adaptation"
                  sourceKind={item.kind}
                  sourceId={item.id}
                  sourceTitle={item.title}
                  label="Запросить адаптацию"
                  className="w-full"
                  variant={isSolution ? 'secondary' : 'primary'}
                />
                <Link
                  href={`/p/${item.seller.handle}`}
                  className="rounded-xl border border-neutral-700 px-5 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-neutral-50"
                >
                  Открыть автора
                </Link>
              </div>
            </div>
          </ContentBlock>
        </aside>
      </div>
    </LargeContentModal>
  );
}

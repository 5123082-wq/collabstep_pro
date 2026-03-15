'use client';

import Link from 'next/link';
import type { CatalogAuthorPublication } from '@/lib/marketplace/types';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import CatalogIntentButton from './CatalogIntentButton';

type AuthorSolutionsSectionProps = {
  items: CatalogAuthorPublication[];
};

const KIND_LABELS: Record<CatalogAuthorPublication['kind'], string> = {
  template: 'Шаблон',
  solution: 'Готовое решение',
  service: 'Услуга'
};

export default function AuthorSolutionsSection({ items }: AuthorSolutionsSectionProps) {
  return (
    <ContentBlock
      as="section"
      header={<ContentBlockTitle as="h2">Решения автора</ContentBlockTitle>}
    >
      {items.length === 0 ? (
        <p className="text-sm text-neutral-400">Публичных решений пока нет. На странице появятся только опубликованные сущности каталога.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            return (
              <article key={item.id} className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">{KIND_LABELS[item.kind]}</p>
                    <Link href={item.href} className="mt-2 block text-base font-semibold text-neutral-100 transition hover:text-indigo-300">
                      {item.title}
                    </Link>
                  </div>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-[11px] text-neutral-300">
                    {item.meta}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-neutral-400">{item.description}</p>

                {item.tags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-xs text-neutral-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={item.href}
                    className="rounded-xl border border-neutral-700 bg-neutral-950/70 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:text-neutral-50"
                  >
                    Открыть
                  </Link>
                  {item.kind === 'service' ? (
                    <CatalogIntentButton
                      intent="adaptation"
                      sourceKind={item.kind}
                      sourceId={item.sourceId}
                      sourceTitle={item.title}
                      label="Запросить адаптацию"
                      variant="secondary"
                    />
                  ) : (
                    <CatalogIntentButton
                      intent="project"
                      sourceKind={item.kind}
                      sourceId={item.sourceId}
                      sourceTitle={item.title}
                      label="Использовать в проекте"
                      variant="secondary"
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ContentBlock>
  );
}

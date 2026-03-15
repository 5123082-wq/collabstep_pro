'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ContentBlock } from '@/components/ui/content-block';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import type { CatalogSourceKind } from '@/lib/marketplace/types';

function getSourceHref(kind: CatalogSourceKind, sourceId: string): string {
  if (kind === 'template') {
    return `/market/templates/${sourceId}`;
  }
  if (kind === 'solution') {
    return '/market/projects';
  }
  return '/market/services';
}

function getSourceLabel(kind: CatalogSourceKind): string {
  if (kind === 'template') {
    return 'Шаблон';
  }
  if (kind === 'solution') {
    return 'Готовое решение';
  }
  return 'Услуга';
}

export default function MarketOrdersClient() {
  const inquiries = useMarketplaceStore((state) => state.inquiries);

  const sortedInquiries = useMemo(
    () =>
      [...inquiries].sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [inquiries]
  );

  return (
    <div className="space-y-6">
      <ContentBlock size="sm" className="space-y-3">
        <p className="text-sm text-neutral-300">
          В C4 этот раздел принимает service/template adaptation briefs и показывает, куда inquiry path уже доведён.
          Purchase access и protected delivery пока остаются следующими шагами, без доминирования над reuse-flow.
        </p>
      </ContentBlock>

      {sortedInquiries.length === 0 ? (
        <ContentBlock variant="dashed" size="sm" className="p-10 text-sm text-neutral-400">
          Активных inquiries пока нет. Отправьте `Запросить адаптацию` из шаблона, готового решения или услуги, чтобы сделка появилась здесь.
        </ContentBlock>
      ) : (
        <div className="space-y-4">
          {sortedInquiries.map((inquiry) => (
            <ContentBlock key={inquiry.id} size="sm" className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">{getSourceLabel(inquiry.sourceKind)}</p>
                  <p className="mt-2 text-lg font-semibold text-neutral-100">{inquiry.sourceTitle}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {new Date(inquiry.createdAt).toLocaleString('ru-RU', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
                <span className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-xs text-neutral-300">
                  Brief отправлен
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-neutral-900 bg-neutral-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Контекст запроса</p>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">{inquiry.brief}</p>
                </div>
                <div className="rounded-2xl border border-neutral-900 bg-neutral-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Ожидаемый результат</p>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">{inquiry.desiredOutcome}</p>
                  <p className="mt-4 text-sm text-neutral-500">
                    {inquiry.linkedProjectTitle
                      ? `Связано с проектом: ${inquiry.linkedProjectTitle}`
                      : 'Проект ещё не выбран. Его можно создать после согласования scope.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={getSourceHref(inquiry.sourceKind, inquiry.sourceId)}
                  className="rounded-xl border border-neutral-700 bg-neutral-950/70 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:text-neutral-50"
                >
                  Открыть источник
                </Link>
                {inquiry.linkedProjectId ? (
                  <Link
                    href={`/pm/projects/${inquiry.linkedProjectId}`}
                    className="rounded-xl border border-neutral-700 bg-neutral-950/70 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:text-neutral-50"
                  >
                    Открыть проект
                  </Link>
                ) : null}
              </div>
            </ContentBlock>
          ))}
        </div>
      )}

      <ContentBlock variant="dashed" size="sm" className="p-6 text-sm text-neutral-400">
        Выдача доступов, protected delivery и финальные статусы сделки остаются заглушкой до следующего этапа.
      </ContentBlock>
    </div>
  );
}

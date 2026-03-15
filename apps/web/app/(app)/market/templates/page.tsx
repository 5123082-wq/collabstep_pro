import type { Metadata } from 'next';
import { Suspense } from 'react';
import TemplatesCatalog from '@/components/marketplace/templates/TemplatesCatalog';
import TemplatesSkeleton from '@/components/marketplace/templates/TemplatesSkeleton';
import { templates } from '@/lib/marketplace/data';

export const metadata: Metadata = {
  title: 'Шаблоны — Каталог Collabverse',
  description: 'Шаблоны и стартовые базы для проекта: с автором, хэштегами и demo-метриками на discovery-плитках.'
};

export default function MarketTemplatesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Шаблоны</h1>
          <p className="text-sm text-neutral-400">
            Стартовые базы для проектов: с автором, тегами и demo-метриками на плитке. Сначала откройте detail surface, а затем
            отправляйте решение в проект или сохраняйте его.
          </p>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="space-y-6">
            <TemplatesSkeleton />
          </div>
        }
      >
        <TemplatesCatalog templates={templates} />
      </Suspense>
    </div>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import TemplatesCatalog from '@/components/marketplace/templates/TemplatesCatalog';
import TemplatesSkeleton from '@/components/marketplace/templates/TemplatesSkeleton';
import { templates } from '@/lib/marketplace/data';

export const metadata: Metadata = {
  title: 'Каталог шаблонов — Collabverse Market',
  description: '12 подборок шаблонов и UI-китов для быстрого старта проекта.'
};

export default function MarketTemplatesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Каталог шаблонов</h1>
          <p className="text-sm text-neutral-400">
            Подборка готовых UI-комплектов, презентаций и лендингов. Добавляйте в корзину, сохраняйте в
            избранное и собирайте коллекции для своих проектов.
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

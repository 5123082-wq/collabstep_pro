import { readySolutions } from '@/lib/marketplace/data';
import CatalogSpotlightCard from '@/components/marketplace/catalog/CatalogSpotlightCard';

export default function MarketProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-xl font-semibold text-neutral-50">Готовые решения</h1>
          <p className="text-sm text-neutral-400">
            Публичные публикации PM-проектов, которые помогают стартовать быстрее. Здесь приоритет у автора, контекста решения и
            reuse-flow, а действия перенесены в detail surface вместо CTA на самой плитке.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {readySolutions.map((item) => (
          <CatalogSpotlightCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

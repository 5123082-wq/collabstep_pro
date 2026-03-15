import { serviceOffers } from '@/lib/marketplace/data';
import CatalogSpotlightCard from '@/components/marketplace/catalog/CatalogSpotlightCard';

export default function MarketServicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-xl font-semibold text-neutral-50">Услуги</h1>
          <p className="text-sm text-neutral-400">
            Сервисные предложения авторов и команд в discovery-first подаче. Основной сценарий здесь: понять автора, открыть
            scope и перейти к brief/inquiry через detail surface, а не через CTA на самой плитке.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {serviceOffers.map((item) => (
          <CatalogSpotlightCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

import MarketOrdersClient from '@/components/marketplace/orders/MarketOrdersClient';

export default function MarketOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Сделки и доступ</h1>
          <p className="text-sm text-neutral-400">
            Здесь живёт вторичный слой каталога: история оформлений, статусы доступа и защищённые ссылки на материалы после сделки.
          </p>
        </div>
      </div>
      <MarketOrdersClient />
    </div>
  );
}

import CartView from '@/components/marketplace/templates/CartView';
import { templates } from '@/lib/marketplace/data';

export default function MarketCartPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Корзина и оформление</h1>
          <p className="text-sm text-neutral-400">
            Вторичный коммерческий слой каталога. Используйте его, когда решение уже выбрано и нужно перейти к оформлению доступа.
          </p>
        </div>
      </div>
      <CartView templates={templates} />
    </div>
  );
}

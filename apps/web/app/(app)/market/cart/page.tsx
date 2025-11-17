import CartView from '@/components/marketplace/templates/CartView';
import { templates } from '@/lib/marketplace/data';

export default function MarketCartPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Корзина</h1>
          <p className="text-sm text-neutral-400">
            Проверьте выбранные шаблоны перед оплатой. Услуги добавляются отдельно через запрос предложения.
          </p>
        </div>
      </div>
      <CartView templates={templates} />
    </div>
  );
}

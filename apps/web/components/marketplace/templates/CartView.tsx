'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMarketplaceStore, enrichCartItems } from '@/lib/marketplace/store';
import type { MarketplaceTemplate } from '@/lib/marketplace/types';
import { formatTemplatePrice, getTemplatePriceLabel } from '@/lib/marketplace/pricing';
import { ContentBlock } from '@/components/ui/content-block';

type CartViewProps = {
  templates: MarketplaceTemplate[];
};

export default function CartView({ templates }: CartViewProps) {
  const cart = useMarketplaceStore((state) => state.cart);
  const removeFromCart = useMarketplaceStore((state) => state.removeFromCart);
  const updateQuantity = useMarketplaceStore((state) => state.updateQuantity);
  const clearCart = useMarketplaceStore((state) => state.clearCart);
  const [promo, setPromo] = useState('');

  const items = useMemo(() => enrichCartItems(cart, templates), [cart, templates]);
  const subtotal = items.reduce(
    (acc, item) => (item.template.pricingType === 'paid' ? acc + item.template.price * item.quantity : acc),
    0
  );
  const totalLabel = formatTemplatePrice(subtotal);

  if (items.length === 0) {
    return (
      <ContentBlock variant="dashed" size="sm" className="flex flex-col items-center justify-center gap-4 p-16 text-center">
        <h2 className="text-lg font-semibold text-neutral-100">Корзина пуста</h2>
        <p className="max-w-md text-sm text-neutral-400">Добавьте шаблоны из каталога, чтобы оформить заказ.</p>
        <Link
          href="/market/templates"
          className="rounded-xl border border-indigo-400 px-5 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/10"
        >
          Вернуться к каталогу
        </Link>
      </ContentBlock>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {items.map((item) => {
          const priceInfo = getTemplatePriceLabel(item.template);

          return (
            <ContentBlock
              key={item.templateId}
              size="sm"
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex flex-1 flex-col gap-2">
                <Link
                  href={`/market/templates/${item.template.id}`}
                  className="text-lg font-semibold text-neutral-100 transition hover:text-indigo-300"
                >
                  {item.template.title}
                </Link>
                <p className="text-sm text-neutral-400">{item.template.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
                  <span className="font-semibold text-neutral-100">{priceInfo.primary}</span>
                  {item.template.pricingType === 'paid' ? (
                    <>
                      <span aria-hidden className="text-neutral-700">•</span>
                      <span>{item.quantity} шт.</span>
                      <span aria-hidden className="text-neutral-700">•</span>
                      <span className="text-neutral-500">
                        {formatTemplatePrice(item.template.price * item.quantity)}
                      </span>
                    </>
                  ) : (
                    <span className="text-neutral-500">{priceInfo.secondary ?? 'Без оплаты'}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                <label className="flex items-center gap-2 rounded-xl border border-neutral-800/80 bg-neutral-950/60 px-3 py-2 text-sm">
                  <span className="text-neutral-500">Кол-во</span>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => updateQuantity(item.templateId, Number(event.target.value))}
                    className="w-16 rounded border border-neutral-800/60 bg-neutral-950/0 px-2 py-1 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.templateId)}
                  className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-neutral-50"
                >
                  Удалить
                </button>
              </div>
            </ContentBlock>
          );
        })}
      </div>
      <ContentBlock as="aside" size="sm" className="space-y-4">
        <div className="space-y-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-neutral-300">Промокод</span>
            <input
              value={promo}
              onChange={(event) => setPromo(event.target.value)}
              placeholder="Введите код"
              className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 px-4 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </label>
          <p className="text-sm text-neutral-500">
            Услуги оформляются отдельно: их нельзя добавить в корзину и оплатить вместе с шаблонами.
          </p>
        </div>
        <div className="space-y-2 text-sm text-neutral-300">
          <div className="flex justify-between text-base font-semibold text-neutral-100">
            <span>Итого</span>
            <span>{totalLabel}</span>
          </div>
          <p className="text-xs text-neutral-500">Стоимость указана с учётом единичных лицензий.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearCart();
            alert('Платёжная сессия создана (демо). После интеграции произойдёт редирект к провайдеру.');
          }}
          className="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          Оформить заказ
        </button>
      </ContentBlock>
    </div>
  );
}

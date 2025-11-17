import { redirect, notFound } from 'next/navigation';

const TAB_MAP = {
  templates: '/market/templates',
  services: '/market/services',
  categories: '/market/categories',
  favorites: '/market/favorites',
  cart: '/market/cart',
  orders: '/market/orders'
} as const;

type MarketplaceTab = keyof typeof TAB_MAP;

type MarketplaceTabPageProps = {
  params: { tab: string };
};

export default function MarketplaceTabPage({ params }: MarketplaceTabPageProps) {
  const key = params.tab as MarketplaceTab;

  if (!(key in TAB_MAP)) {
    notFound();
  }

  redirect(TAB_MAP[key]);
}

export function generateStaticParams() {
  return Object.keys(TAB_MAP).map((tab) => ({ tab }));
}

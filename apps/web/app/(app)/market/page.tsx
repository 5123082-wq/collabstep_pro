import type { Metadata } from 'next';
import CatalogDiscoveryPage from '@/components/marketplace/catalog/CatalogDiscoveryPage';

export const metadata: Metadata = {
  title: 'Каталог — Collabverse',
  description: 'Главная discovery-лента каталога: шаблоны, готовые решения, услуги, подборки и переходы к авторам.'
};

export default function MarketIndexPage() {
  return <CatalogDiscoveryPage />;
}

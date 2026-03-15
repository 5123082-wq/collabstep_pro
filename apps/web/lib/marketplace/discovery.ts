import type { CatalogDemoMetrics, MarketplaceTemplate } from './types';

const compactNumberFormatter = new Intl.NumberFormat('ru-RU', {
  notation: 'compact',
  maximumFractionDigits: 1
});

export function formatCatalogMetricValue(value: number) {
  return compactNumberFormatter.format(value);
}

export function getTemplateDemoMetrics(template: MarketplaceTemplate): CatalogDemoMetrics {
  return {
    likes: template.ratingCount + Math.round(template.rating * 12),
    views: template.salesCount * 12 + template.ratingCount * 5,
    uses: template.salesCount
  };
}

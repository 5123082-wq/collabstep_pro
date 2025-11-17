import type { MetadataRoute } from 'next';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collabverse.local').replace(/\/$/, '');

const marketingPaths = [
  '/',
  '/product',
  '/product/ai',
  '/product/pm',
  '/product/marketplace',
  '/audience',
  '/projects',
  '/projects/cases',
  '/specialists',
  '/contractors',
  '/pricing',
  '/blog',
  '/login',
  '/register',
  '/market',
  '/market/templates',
  '/market/projects',
  '/market/services',
  '/market/categories',
  '/market/favorites',
  '/market/cart',
  '/market/orders',
  '/market/publish',
  '/market/seller'
];

export default function sitemap(): MetadataRoute.Sitemap {
  return marketingPaths.map((path, index) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : Number((0.8 - index * 0.01).toFixed(2))
  }));
}

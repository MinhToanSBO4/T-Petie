import type { MetadataRoute } from 'next';
import { getCollections, getProducts } from '@/server/catalog/queries';
import { siteUrl } from '@/lib/site-url';

// Dựng lại mỗi giờ: sản phẩm mới vào sitemap mà không cần deploy lại.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/girls', priority: 0.9, changeFrequency: 'daily' },
  { path: '/girls/tops', priority: 0.8, changeFrequency: 'daily' },
  { path: '/girls/bottoms', priority: 0.8, changeFrequency: 'daily' },
  { path: '/girls/dresses', priority: 0.8, changeFrequency: 'daily' },
  { path: '/girls/sets', priority: 0.8, changeFrequency: 'daily' },
  { path: '/sale', priority: 0.8, changeFrequency: 'daily' },
  { path: '/collections', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/feedback', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/stores', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/payment-policy', priority: 0.2, changeFrequency: 'monthly' },
  { path: '/return-policy', priority: 0.2, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.2, changeFrequency: 'monthly' },
];

/** Sitemap cho máy tìm kiếm: trang tĩnh, mọi sản phẩm đang bán (theo slug) và mọi bộ sưu tập đang hiện. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, collections] = await Promise.all([getProducts().catch(() => []), getCollections().catch(() => [])]);
  return [
    ...STATIC_PAGES.map((page) => ({ url: `${base}${page.path}`, priority: page.priority, changeFrequency: page.changeFrequency })),
    ...collections.map((collection) => ({ url: `${base}/collections/${collection.id}`, priority: 0.6, changeFrequency: 'weekly' as const })),
    ...products.map((product) => ({ url: `${base}/products/${product.slug}`, priority: 0.7, changeFrequency: 'weekly' as const })),
  ];
}

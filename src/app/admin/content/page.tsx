import { requireStaffPage } from '@/server/auth/staff-session';
import { SiteContentManager } from '@/components/admin/SiteContentManager';
import { prisma } from '@/server/db/client';
import { SITE_CONTENT_KEYS } from '@/lib/content/site-content';
import { getProducts, getCollections } from '@/server/catalog/queries';
import { getPublishedTestimonials } from '@/server/content/testimonials';
import { getFeaturedReviews } from '@/server/content/reviews';

export const dynamic = 'force-dynamic';

export default async function AdminSiteContentPage() {
  await requireStaffPage('/admin/content');
  const [rows, products, collections, testimonials, featuredReviews] = await Promise.all([
    prisma.siteContent.findMany({ where: { key: { in: [...SITE_CONTENT_KEYS] } } }),
    getProducts(),
    getCollections(),
    getPublishedTestimonials(),
    getFeaturedReviews(),
  ]);
  const content: Record<string, unknown> = {};
  for (const key of SITE_CONTENT_KEYS) content[key] = rows.find((row) => row.key === key)?.data ?? null;
  return <SiteContentManager
    initialContent={content}
    collections={collections.filter((collection) => collection.showOnHome)}
    bestSellers={products.filter((product) => product.isBestSeller).slice(0, 4)}
    saleProducts={products.filter((product) => product.isSale).slice(0, 4)}
    testimonials={(featuredReviews.length > 0 ? featuredReviews : testimonials).slice(0, 3)}
  />;
}

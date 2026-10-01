import { requireStaffPage } from '@/server/auth/staff-session';
import { SiteContentManager } from '@/components/admin/SiteContentManager';
import { prisma } from '@/server/db/client';
import { SITE_CONTENT_KEYS } from '@/lib/content/site-content';
import { getProducts, getCollections } from '@/server/catalog/queries';
import { getPublishedFeedback } from '@/server/content/testimonials';
import { getFeaturedReviews } from '@/server/content/reviews';

export const dynamic = 'force-dynamic';

export default async function AdminSiteContentPage() {
  await requireStaffPage('/admin/content');
  const [rows, products, collections, feedback, featuredReviews] = await Promise.all([
    prisma.siteContent.findMany({ where: { key: { in: [...SITE_CONTENT_KEYS] } } }),
    getProducts(),
    getCollections(),
    getPublishedFeedback(),
    getFeaturedReviews(),
  ]);
  const content: Record<string, unknown> = {};
  for (const key of SITE_CONTENT_KEYS) content[key] = rows.find((row) => row.key === key)?.data ?? null;
  return <SiteContentManager
    initialContent={content}
    collections={collections.filter((collection) => collection.showOnHome)}
    products={products.map(({ id, name, thumbnail, basePrice }) => ({ id, name, thumbnail, basePrice }))}
    bestSellers={products.filter((product) => product.isBestSeller).slice(0, 4)}
    saleProducts={products.filter((product) => product.isSale).slice(0, 4)}
    feedback={feedback.slice(0, 12)}
    feedbackTotal={feedback.length}
    reviews={featuredReviews.slice(0, 3)}
  />;
}

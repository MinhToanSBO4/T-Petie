import 'server-only';
import { prisma } from '@/server/db/client';
import { SITE_CONTENT_KEYS } from '@/lib/content/site-content';
import { getProducts, getCollections } from '@/server/catalog/queries';
import { getPublishedFeedback } from '@/server/content/testimonials';
import { HOME_FEEDBACK_LIMIT } from '@/lib/content/testimonial-input';

/** Dữ liệu của trình chỉnh sửa nội dung website, dùng chung cho khu quản trị và khu nhân viên. */
export async function loadSiteContentEditor() {
  const [rows, products, collections, feedback] = await Promise.all([
    prisma.siteContent.findMany({ where: { key: { in: [...SITE_CONTENT_KEYS] } } }),
    getProducts(),
    getCollections(),
    getPublishedFeedback(),
  ]);
  const content: Record<string, unknown> = {};
  for (const key of SITE_CONTENT_KEYS) content[key] = rows.find((row) => row.key === key)?.data ?? null;
  return {
    initialContent: content,
    collections: collections.filter((collection) => collection.showOnHome),
    products: products.map(({ id, name, thumbnail, basePrice }) => ({ id, name, thumbnail, basePrice })),
    bestSellers: products.filter((product) => product.isBestSeller).slice(0, 4),
    saleProducts: products.filter((product) => product.isSale).slice(0, 4),
    feedback: feedback.slice(0, HOME_FEEDBACK_LIMIT),
    feedbackTotal: feedback.length,
  };
}

/** Sản phẩm cho ô chọn "sản phẩm được khen" của feedback: chỉ các trường cần gửi xuống trình duyệt. */
export async function loadFeedbackProductOptions() {
  const products = await getProducts();
  return products.map(({ id, name, thumbnail }) => ({ id, name, thumbnail }));
}

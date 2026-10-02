import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/server/db/client';
import type { PublicFeedback } from '@/types/testimonial';

/** Giới hạn an toàn cho trang album; trang chủ chỉ dùng vài ảnh đầu. */
const PUBLIC_FEEDBACK_LIMIT = 200;

/** Feedback dạng ảnh đã được khách đồng ý và bật công bố, theo thứ tự quản trị viên sắp xếp rồi mới nhất trước. */
export const getPublishedFeedback = unstable_cache(async (): Promise<PublicFeedback[]> => {
  const rows = await prisma.customerTestimonial.findMany({
    where: { isPublished: true, consentConfirmed: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: PUBLIC_FEEDBACK_LIMIT,
    select: { id: true, imageUrl: true, imageWidth: true, imageHeight: true, caption: true,
      product: { select: { name: true, slug: true, isActive: true } } },
  });
  return rows.map((row) => ({ id: row.id, imageUrl: row.imageUrl, width: row.imageWidth, height: row.imageHeight,
    caption: row.caption, product: row.product?.isActive ? { name: row.product.name, slug: row.product.slug } : null }));
}, ['published-feedback'], { revalidate: 60, tags: ['testimonials'] });

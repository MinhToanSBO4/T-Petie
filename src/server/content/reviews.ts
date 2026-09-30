import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/server/db/client';

export const REVIEWS_TAG = 'reviews';

export type FeaturedReview = {
  id: string; customerName: string; quote: string; rating: number;
  productName: string; productSlug: string;
};

/**
 * Đánh giá sản phẩm được quản trị viên chọn hiển thị ở khối đánh giá trang chủ.
 * Không nhập tay: nội dung lấy từ đánh giá khách đã gửi và đã được duyệt.
 */
export const getFeaturedReviews = unstable_cache(async (): Promise<FeaturedReview[]> => {
  const reviews = await prisma.productReview.findMany({
    where: { isApproved: true, isFeatured: true },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: { product: { select: { name: true, slug: true } } },
  });
  return reviews.map((review) => ({ id: review.id, customerName: review.customerName, quote: review.content,
    rating: review.rating, productName: review.product.name, productSlug: review.product.slug }));
}, ['featured-reviews'], { revalidate: 60, tags: [REVIEWS_TAG] });

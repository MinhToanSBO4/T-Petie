import 'server-only';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/client';
import { reviewerName } from '@/lib/reviews/rules';
import { REVIEWS_PER_PAGE, type PublicReview, type ReviewFilter, type ReviewSummary } from '@/lib/reviews/filters';
import type { FeaturedReview } from '@/types/testimonial';

export const REVIEWS_TAG = 'reviews';

/**
 * Đánh giá sản phẩm được quản trị viên chọn hiển thị ở khối đánh giá trang chủ.
 * Không nhập tay: nội dung lấy từ đánh giá khách đã mua, đã gửi và đã được duyệt.
 */
export const getFeaturedReviews = unstable_cache(async (): Promise<FeaturedReview[]> => {
  const reviews = await prisma.productReview.findMany({
    where: { isApproved: true, isFeatured: true, content: { not: '' } },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: { product: { select: { name: true, slug: true, isActive: true } } },
  });
  return reviews.map((review) => ({ id: review.id, customerName: reviewerName(review.customerName, review.isAnonymous),
    quote: review.content, rating: review.rating, productName: review.product.name,
    productSlug: review.product.isActive ? review.product.slug : null, variantLabel: review.variantLabel,
    verified: Boolean(review.orderItemId) }));
}, ['featured-reviews-v2'], { revalidate: 60, tags: [REVIEWS_TAG] });

function filterWhere(productId: string, filter: ReviewFilter): Prisma.ProductReviewWhereInput {
  const base = { productId, isApproved: true };
  if (/^[1-5]$/.test(filter)) return { ...base, rating: Number(filter) };
  if (filter === 'media') return { ...base, imageUrls: { isEmpty: false } };
  if (filter === 'comment') return { ...base, content: { not: '' } };
  return base;
}

/** Điểm trung bình, phân bố sao, số đánh giá có ảnh/bình luận và cảm nhận size — chỉ tính đánh giá đã duyệt. */
export const getProductReviewSummary = unstable_cache(async (productId: string): Promise<ReviewSummary> => {
  const approved = { productId, isApproved: true };
  const [byRating, withImages, withComments, byFit] = await Promise.all([
    prisma.productReview.groupBy({ by: ['rating'], where: approved, _count: { _all: true } }),
    prisma.productReview.count({ where: { ...approved, imageUrls: { isEmpty: false } } }),
    prisma.productReview.count({ where: { ...approved, content: { not: '' } } }),
    prisma.productReview.groupBy({ by: ['sizeFit'], where: { ...approved, sizeFit: { not: null } }, _count: { _all: true } }),
  ]);
  const counts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const row of byRating) if (String(row.rating) in counts) counts[String(row.rating) as keyof typeof counts] = row._count._all;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const average = total ? Object.entries(counts).reduce((sum, [rating, count]) => sum + Number(rating) * count, 0) / total : 0;
  const fit = { small: 0, fit: 0, large: 0 };
  for (const row of byFit) if (row.sizeFit && row.sizeFit in fit) fit[row.sizeFit as keyof typeof fit] = row._count._all;
  return { average: Math.round(average * 10) / 10, total, counts, withImages, withComments, fit };
}, ['product-review-summary'], { revalidate: 60, tags: [REVIEWS_TAG] });

/** Một trang đánh giá đã duyệt theo bộ lọc, mới nhất trước. Ngày giờ trả về dạng chuỗi để lưu được trong cache. */
export const getProductReviewPage = unstable_cache(async (productId: string, filter: ReviewFilter, page: number) => {
  const where = filterWhere(productId, filter);
  const [rows, total] = await Promise.all([
    prisma.productReview.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * REVIEWS_PER_PAGE, take: REVIEWS_PER_PAGE,
      select: { id: true, customerName: true, isAnonymous: true, rating: true, content: true, variantLabel: true,
        sizeFit: true, imageUrls: true, createdAt: true, orderItemId: true, editCount: true } }),
    prisma.productReview.count({ where }),
  ]);
  const reviews: PublicReview[] = rows.map((row) => ({ id: row.id, name: reviewerName(row.customerName, row.isAnonymous),
    rating: row.rating, content: row.content, variantLabel: row.variantLabel, sizeFit: row.sizeFit, images: row.imageUrls,
    createdAt: row.createdAt.toISOString(), verified: Boolean(row.orderItemId), edited: row.editCount > 0 }));
  return { reviews, total, page, pages: Math.max(1, Math.ceil(total / REVIEWS_PER_PAGE)) };
}, ['product-review-page'], { revalidate: 60, tags: [REVIEWS_TAG] });

/** Làm mới khối đánh giá công khai: danh sách, điểm trung bình trên trang sản phẩm và khối trang chủ. */
export function invalidateReviews() {
  revalidateTag(REVIEWS_TAG);
  revalidateTag('products');
  revalidatePath('/');
}

/** Tính lại điểm trung bình và số đánh giá đã duyệt của sản phẩm sau khi duyệt, bỏ duyệt, sửa hoặc xóa đánh giá. */
export async function refreshProductRating(productId: string) {
  const aggregate = await prisma.productReview.aggregate({
    where: { productId, isApproved: true }, _avg: { rating: true }, _count: { _all: true },
  });
  const count = aggregate._count._all;
  await prisma.product.updateMany({ where: { id: productId }, data: {
    rating: count && aggregate._avg.rating !== null ? Math.round(aggregate._avg.rating * 10) / 10 : null,
    reviewCount: count,
  } });
  invalidateReviews();
}

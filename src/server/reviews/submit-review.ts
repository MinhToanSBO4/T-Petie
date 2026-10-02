import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/client';
import { cloudinaryPublicId, deleteCloudinaryImage, uploadImageToCloudinary } from '@/server/media/cloudinary';
import { refreshProductRating } from '@/server/content/reviews';
import { detectImageType } from '@/lib/media/image-signature';
import { REVIEW_MAX_IMAGES, type ReviewFields } from '@/lib/content/review-input';
import { canEditReview, REVIEW_BLOCK_MESSAGES, REVIEW_EDIT_WINDOW_DAYS, reviewEligibility } from '@/lib/reviews/rules';

/** Ảnh đã được nén ở trình duyệt (~200–500 KB); giới hạn này chặn tệp gốc quá lớn gửi thẳng lên. */
export const REVIEW_IMAGE_MAX_BYTES = 2_000_000;
/** Dưới giới hạn 4,5 MB cho mỗi request của Vercel Functions. */
export const REVIEW_BODY_MAX_BYTES = 4_400_000;
const REVIEW_FOLDER = 'tpetie/reviews';

/** Lỗi nghiệp vụ kèm mã HTTP, được phép hiển thị cho khách. */
export class ReviewError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function checkImages(files: File[]) {
  if (files.length > REVIEW_MAX_IMAGES) throw new ReviewError(`Mỗi đánh giá tối đa ${REVIEW_MAX_IMAGES} ảnh`, 400);
  for (const file of files) {
    if (!(file instanceof File) || file.size < 1 || file.size > REVIEW_IMAGE_MAX_BYTES) {
      throw new ReviewError('Mỗi ảnh tối đa 2 MB sau khi nén', 400);
    }
    if (!detectImageType(new Uint8Array(await file.slice(0, 16).arrayBuffer()))) {
      throw new ReviewError('Chỉ nhận ảnh JPG, PNG hoặc WebP', 400);
    }
  }
}

/** Xóa ảnh đánh giá không còn dùng; lỗi xóa không làm hỏng thao tác chính. */
export async function removeReviewImages(urls: string[]) {
  await Promise.all(urls.map(async (url) => {
    const publicId = cloudinaryPublicId(url);
    if (publicId) await deleteCloudinaryImage(publicId).catch(() => false);
  }));
}

async function uploadImages(files: File[]): Promise<string[]> {
  const uploaded = await Promise.all(files.map((file) => uploadImageToCloudinary(file, REVIEW_FOLDER).catch(() => null)));
  const urls = uploaded.flatMap((image) => image ? [image.url] : []);
  if (urls.length !== files.length) {
    await removeReviewImages(urls);
    throw new ReviewError('Không tải được ảnh đánh giá, mẹ thử lại giúp shop nhé', 502);
  }
  return urls;
}

/**
 * Khách gửi đánh giá cho một món trong đơn của chính mình. Chỉ nhận khi đơn đã hoàn tất, còn trong hạn
 * và món đó chưa được đánh giá. Đánh giá hiển thị ngay; shop có thể ẩn nếu không phù hợp.
 */
export async function createVerifiedReview({ userId, customerName, orderItemId, fields, files }: {
  userId: string; customerName: string; orderItemId: string; fields: ReviewFields; files: File[];
}) {
  await checkImages(files);
  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, order: { userId } },
    select: { id: true, productId: true, size: true, review: { select: { id: true } },
      order: { select: { orderStatus: true, completedAt: true } } },
  });
  if (!item) throw new ReviewError('Không tìm thấy sản phẩm này trong đơn hàng của mẹ', 404);
  const eligibility = reviewEligibility({ orderStatus: item.order.orderStatus, completedAt: item.order.completedAt,
    hasReview: Boolean(item.review) });
  if (!eligibility.ok) {
    throw new ReviewError(REVIEW_BLOCK_MESSAGES[eligibility.reason], eligibility.reason === 'reviewed' ? 409 : 403);
  }
  const imageUrls = files.length ? await uploadImages(files) : [];
  let reviewId: string;
  try {
    const review = await prisma.productReview.create({ data: {
      productId: item.productId, userId, orderItemId: item.id, customerName: customerName.trim() || 'Khách hàng',
      isAnonymous: fields.isAnonymous, rating: fields.rating, content: fields.content,
      variantLabel: item.size, sizeFit: fields.sizeFit, imageUrls,
    } });
    reviewId = review.id;
  } catch (error) {
    await removeReviewImages(imageUrls);
    // Hai lần gửi cùng lúc: chỉ mục duy nhất theo món hàng chặn bản thứ hai.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ReviewError(REVIEW_BLOCK_MESSAGES.reviewed, 409);
    }
    throw error;
  }
  // Đánh giá hiển thị ngay nên điểm sao của sản phẩm cập nhật luôn.
  await refreshProductRating(item.productId);
  return reviewId;
}

/**
 * Khách sửa đánh giá của mình một lần trong 30 ngày. Có thể giữ lại một phần ảnh cũ và thêm ảnh mới.
 * Bản sửa hiển thị ngay (đánh giá đang bị shop ẩn thì vẫn ẩn).
 */
export async function updateOwnReview({ userId, reviewId, fields, keepImageUrls, files }: {
  userId: string; reviewId: string; fields: ReviewFields; keepImageUrls: string[]; files: File[];
}) {
  await checkImages(files);
  const review = await prisma.productReview.findFirst({ where: { id: reviewId, userId, orderItemId: { not: null } } });
  if (!review) throw new ReviewError('Không tìm thấy đánh giá', 404);
  if (!canEditReview({ createdAt: review.createdAt, editCount: review.editCount })) {
    throw new ReviewError(`Mỗi đánh giá chỉ sửa được 1 lần trong ${REVIEW_EDIT_WINDOW_DAYS} ngày kể từ khi gửi`, 409);
  }
  const kept = [...new Set(keepImageUrls)].filter((url) => review.imageUrls.includes(url));
  if (kept.length + files.length > REVIEW_MAX_IMAGES) throw new ReviewError(`Mỗi đánh giá tối đa ${REVIEW_MAX_IMAGES} ảnh`, 400);
  const added = files.length ? await uploadImages(files) : [];
  const updated = await prisma.productReview.updateMany({
    where: { id: review.id, editCount: review.editCount },
    data: { rating: fields.rating, content: fields.content, sizeFit: fields.sizeFit, isAnonymous: fields.isAnonymous,
      imageUrls: [...kept, ...added], editCount: { increment: 1 } },
  });
  if (updated.count !== 1) {
    await removeReviewImages(added);
    throw new ReviewError('Đánh giá vừa được sửa ở nơi khác', 409);
  }
  await removeReviewImages(review.imageUrls.filter((url) => !kept.includes(url)));

  // Số sao có thể đã đổi nên điểm trung bình phải tính lại.
  await refreshProductRating(review.productId);
}

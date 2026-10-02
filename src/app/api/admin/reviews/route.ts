import { NextResponse } from 'next/server';
import { requireStaffApi } from '@/server/auth/staff-session';
import { isSameOrigin } from '@/server/security/origin';
import { paginated, parsePagination, parseSearch } from '@/lib/pagination';
import { prisma } from '@/server/db/client';
import { invalidateReviews, refreshProductRating } from '@/server/content/reviews';
import { removeReviewImages } from '@/server/reviews/submit-review';
import { REVIEW_REPLY_MAX } from '@/lib/content/review-input';

export const dynamic = 'force-dynamic';

/**
 * Danh sách đánh giá cho quản trị viên và nhân viên (tìm kiếm, lọc, phân trang).
 * `productId` giới hạn trong một sản phẩm (mục Đánh giá khi sửa sản phẩm); kèm số liệu nhanh của phạm vi đó.
 */
export async function GET(request: Request) {
  if (!(await requireStaffApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
  const search = parseSearch(searchParams);
  const filter = searchParams.get('filter') || '';
  const productId = searchParams.get('productId') || '';
  const scope = productId ? { productId } : {};
  const where = {
    ...scope,
    ...(search ? { OR: [{ customerName: { contains: search, mode: 'insensitive' as const } },
      { content: { contains: search, mode: 'insensitive' as const } },
      { product: { name: { contains: search, mode: 'insensitive' as const } } },
      { orderItem: { order: { orderCode: { contains: search, mode: 'insensitive' as const } } } }] } : {}),
    ...(filter === 'visible' ? { isHidden: false } : filter === 'hidden' ? { isHidden: true }
      : filter === 'unreplied' ? { reply: null, isHidden: false }
      : filter === 'media' ? { imageUrls: { isEmpty: false } }
      : filter === 'low' ? { rating: { lte: 2 } } : /^[1-5]$/.test(filter) ? { rating: Number(filter) } : {}),
  };
  const [reviews, total, unreplied, hidden] = await Promise.all([
    prisma.productReview.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take,
      include: { product: { select: { name: true, slug: true } },
        orderItem: { select: { order: { select: { orderCode: true } } } } } }),
    prisma.productReview.count({ where }),
    prisma.productReview.count({ where: { ...scope, reply: null, isHidden: false } }),
    prisma.productReview.count({ where: { ...scope, isHidden: true } }),
  ]);
  return NextResponse.json({ ...paginated(reviews.map((review) => ({
    id: review.id, customerName: review.customerName, isAnonymous: review.isAnonymous, rating: review.rating,
    content: review.content, imageUrls: review.imageUrls, sizeFit: review.sizeFit, variantLabel: review.variantLabel,
    editCount: review.editCount, isHidden: review.isHidden, createdAt: review.createdAt,
    reply: review.reply, repliedAt: review.repliedAt,
    productName: review.product.name, productSlug: review.product.slug, orderCode: review.orderItem?.order.orderCode || null,
  })), total, page, limit), stats: { unreplied, hidden } }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Ẩn/hiện đánh giá, hoặc trả lời đánh giá (`reply: null` để gỡ câu trả lời).
 * Đánh giá bị ẩn không hiện ở trang sản phẩm và không tính vào điểm sao.
 */
export async function PATCH(request: Request) {
  const session = await requireStaffApi();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > REVIEW_REPLY_MAX * 4 + 500) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  let body: { id?: unknown; isHidden?: unknown; reply?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (typeof body.id !== 'string' || (body.isHidden === undefined && body.reply === undefined)) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }
  const data: { isHidden?: boolean; reply?: string | null; repliedAt?: Date | null; repliedById?: string | null } = {};
  if (body.isHidden !== undefined) {
    if (typeof body.isHidden !== 'boolean') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    data.isHidden = body.isHidden;
  }
  if (body.reply !== undefined) {
    if (body.reply !== null && typeof body.reply !== 'string') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    const reply = typeof body.reply === 'string' ? body.reply.trim() : '';
    if (reply.length > REVIEW_REPLY_MAX) return NextResponse.json({ error: `Câu trả lời tối đa ${REVIEW_REPLY_MAX} ký tự` }, { status: 400 });
    data.reply = reply || null;
    data.repliedAt = reply ? new Date() : null;
    data.repliedById = reply ? session.user.id : null;
  }
  const updated = await prisma.productReview.update({ where: { id: body.id }, data, select: { productId: true } }).catch(() => null);
  if (!updated) return NextResponse.json({ error: 'Không tìm thấy đánh giá' }, { status: 404 });
  // Ẩn/hiện đổi điểm sao; trả lời chỉ cần làm mới phần hiển thị.
  if (data.isHidden !== undefined) await refreshProductRating(updated.productId);
  else invalidateReviews();
  return NextResponse.json({ success: true });
}

/** Xóa hẳn đánh giá cùng ảnh khách đã tải lên (khách được đánh giá lại món đó nếu còn hạn). */
export async function DELETE(request: Request) {
  if (!(await requireStaffApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Thiếu mã đánh giá' }, { status: 400 });
  const deleted = await prisma.productReview.delete({ where: { id }, select: { productId: true, imageUrls: true } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: 'Không tìm thấy đánh giá' }, { status: 404 });
  await Promise.all([refreshProductRating(deleted.productId), removeReviewImages(deleted.imageUrls)]);
  return NextResponse.json({ success: true });
}

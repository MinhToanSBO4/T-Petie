import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/server/auth/staff-session';
import { isSameOrigin } from '@/server/security/origin';
import { paginated, parsePagination, parseSearch } from '@/lib/pagination';
import { prisma } from '@/server/db/client';
import { refreshProductRating } from '@/server/content/reviews';
import { removeReviewImages } from '@/server/reviews/submit-review';

export const dynamic = 'force-dynamic';

/** Danh sách đánh giá sản phẩm cho quản trị viên duyệt và chọn hiển thị (có tìm kiếm, phân trang). */
export async function GET(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
  const search = parseSearch(searchParams);
  const status = searchParams.get('filter') || '';
  const where = {
    ...(search ? { OR: [{ customerName: { contains: search, mode: 'insensitive' as const } },
      { content: { contains: search, mode: 'insensitive' as const } },
      { product: { name: { contains: search, mode: 'insensitive' as const } } },
      { orderItem: { order: { orderCode: { contains: search, mode: 'insensitive' as const } } } }] } : {}),
    ...(status === 'pending' ? { isApproved: false } : status === 'approved' ? { isApproved: true }
      : status === 'featured' ? { isFeatured: true } : status === 'media' ? { imageUrls: { isEmpty: false } } : {}),
  };
  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({ where, orderBy: [{ isApproved: 'asc' }, { createdAt: 'desc' }], skip, take,
      include: { product: { select: { name: true, slug: true } },
        orderItem: { select: { order: { select: { orderCode: true } } } } } }),
    prisma.productReview.count({ where }),
  ]);
  return NextResponse.json({ ...paginated(reviews.map((review) => ({
    id: review.id, customerName: review.customerName, isAnonymous: review.isAnonymous, rating: review.rating,
    content: review.content, imageUrls: review.imageUrls, sizeFit: review.sizeFit, variantLabel: review.variantLabel,
    editCount: review.editCount, isApproved: review.isApproved, isFeatured: review.isFeatured, createdAt: review.createdAt,
    productName: review.product.name, productSlug: review.product.slug, orderCode: review.orderItem?.order.orderCode || null,
  })), total, page, limit) }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Duyệt hoặc chọn/bỏ chọn đánh giá hiển thị ở khối đánh giá trang chủ. */
export async function PATCH(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 2000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  let body: { id?: unknown; isApproved?: unknown; isFeatured?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (typeof body.id !== 'string' || (body.isApproved === undefined && body.isFeatured === undefined)) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }
  const data: { isApproved?: boolean; isFeatured?: boolean } = {};
  if (body.isApproved !== undefined) {
    if (typeof body.isApproved !== 'boolean') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    data.isApproved = body.isApproved;
    // Bỏ duyệt thì đồng thời bỏ chọn hiển thị trang chủ.
    if (body.isApproved === false) data.isFeatured = false;
  }
  if (body.isFeatured !== undefined) {
    if (typeof body.isFeatured !== 'boolean') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    data.isFeatured = body.isFeatured;
    if (body.isFeatured === true) data.isApproved = true;
  }
  if (data.isFeatured) {
    // Khối trang chủ trích dẫn nội dung, nên đánh giá chỉ chấm sao không đưa lên trang chủ được.
    const target = await prisma.productReview.findUnique({ where: { id: body.id }, select: { content: true } });
    if (target && !target.content.trim()) {
      return NextResponse.json({ error: 'Đánh giá chỉ có số sao, không có nội dung để hiện ở trang chủ' }, { status: 400 });
    }
  }
  const updated = await prisma.productReview.update({ where: { id: body.id }, data, select: { productId: true } }).catch(() => null);
  if (!updated) return NextResponse.json({ error: 'Không tìm thấy đánh giá' }, { status: 404 });
  await refreshProductRating(updated.productId);
  return NextResponse.json({ success: true });
}

/** Xóa đánh giá không phù hợp cùng ảnh khách đã tải lên. */
export async function DELETE(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Thiếu mã đánh giá' }, { status: 400 });
  const deleted = await prisma.productReview.delete({ where: { id }, select: { productId: true, imageUrls: true } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: 'Không tìm thấy đánh giá' }, { status: 404 });
  await Promise.all([refreshProductRating(deleted.productId), removeReviewImages(deleted.imageUrls)]);
  return NextResponse.json({ success: true });
}

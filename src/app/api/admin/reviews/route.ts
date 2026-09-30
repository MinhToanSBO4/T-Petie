import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdminApi } from '@/server/auth/staff-session';
import { isSameOrigin } from '@/server/security/origin';
import { paginated, parsePagination, parseSearch } from '@/lib/pagination';
import { prisma } from '@/server/db/client';
import { REVIEWS_TAG } from '@/server/content/reviews';

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
      { product: { name: { contains: search, mode: 'insensitive' as const } } }] } : {}),
    ...(status === 'pending' ? { isApproved: false } : status === 'approved' ? { isApproved: true }
      : status === 'featured' ? { isFeatured: true } : {}),
  };
  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({ where, orderBy: [{ isApproved: 'asc' }, { createdAt: 'desc' }], skip, take,
      include: { product: { select: { name: true, slug: true } } } }),
    prisma.productReview.count({ where }),
  ]);
  return NextResponse.json({ ...paginated(reviews.map((review) => ({
    id: review.id, customerName: review.customerName, rating: review.rating, content: review.content,
    isApproved: review.isApproved, isFeatured: review.isFeatured, createdAt: review.createdAt,
    productName: review.product.name, productSlug: review.product.slug,
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
  const updated = await prisma.productReview.update({ where: { id: body.id }, data }).catch(() => null);
  if (!updated) return NextResponse.json({ error: 'Không tìm thấy đánh giá' }, { status: 404 });
  revalidatePath('/');
  revalidateTag(REVIEWS_TAG);
  return NextResponse.json({ success: true });
}

/** Xóa đánh giá không phù hợp. */
export async function DELETE(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Thiếu mã đánh giá' }, { status: 400 });
  const deleted = await prisma.productReview.delete({ where: { id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: 'Không tìm thấy đánh giá' }, { status: 404 });
  revalidatePath('/');
  revalidateTag(REVIEWS_TAG);
  return NextResponse.json({ success: true });
}

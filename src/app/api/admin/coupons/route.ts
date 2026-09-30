import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdminApi } from '@/server/auth/staff-session';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';
import { parseCouponInput } from '@/lib/orders/commerce-input';
import { COMMERCE_TAG } from '@/server/orders/commerce-settings';
import { paginated, parsePagination, parseSearch } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

/** Danh sách mã giảm giá có tìm kiếm và phân trang. */
export async function GET(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
  const search = parseSearch(searchParams);
  const status = searchParams.get('filter') || '';
  const where = {
    ...(search ? { code: { contains: search.toUpperCase(), mode: 'insensitive' as const } } : {}),
    ...(status === 'active' ? { active: true } : status === 'inactive' ? { active: false } : {}),
  };
  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({ where, orderBy: { code: 'asc' }, skip, take }),
    prisma.coupon.count({ where }),
  ]);
  return NextResponse.json({ ...paginated(coupons.map((coupon) => ({ ...coupon, minSubtotal: Number(coupon.minSubtotal) })),
    total, page, limit) }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Tạo mới hoặc cập nhật một mã giảm giá. */
export async function PATCH(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 4000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  try {
    const { code, ...data } = parseCouponInput(JSON.parse(raw));
    await prisma.coupon.upsert({ where: { code }, create: { code, ...data }, update: data });
    revalidateTag(COMMERCE_TAG);
    return NextResponse.json({ success: true, code });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    if (error instanceof Error && /không hợp lệ/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Coupon save failed:', error);
    return NextResponse.json({ error: 'Không lưu được mã giảm giá' }, { status: 500 });
  }
}

/** Xóa mã giảm giá; mã đã dùng cho đơn hàng chỉ được chuyển sang ngừng hoạt động. */
export async function DELETE(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const code = new URL(request.url).searchParams.get('code')?.trim().toUpperCase() || '';
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return NextResponse.json({ error: 'Mã giảm giá không hợp lệ' }, { status: 400 });
  const used = await prisma.order.count({ where: { couponCode: code } });
  if (used > 0) {
    const archived = await prisma.coupon.update({ where: { code }, data: { active: false } }).catch(() => null);
    if (!archived) return NextResponse.json({ error: 'Không tìm thấy mã giảm giá' }, { status: 404 });
    revalidateTag(COMMERCE_TAG);
    return NextResponse.json({ archived: true });
  }
  const deleted = await prisma.coupon.delete({ where: { code } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: 'Không tìm thấy mã giảm giá' }, { status: 404 });
  revalidateTag(COMMERCE_TAG);
  return NextResponse.json({ ok: true });
}

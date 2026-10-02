import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { requireAdminApi } from '@/server/auth/staff-session';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';
import { parseCouponInput } from '@/lib/orders/commerce-input';
import { COMMERCE_TAG } from '@/server/orders/commerce-settings';
import { paginated, parseChoice, parsePagination, parseSearch, splitPage } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

/** Cách sắp xếp mã giảm giá ("expiring" xử lý riêng ở expiringFirst); mã là khóa chính nên đứng cuối để phân trang ổn định. */
const SORTS: Record<string, Prisma.CouponOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { code: 'asc' }],
  usage: [{ usedCount: 'desc' }, { code: 'asc' }],
  code: [{ code: 'asc' }],
};
const STATUS: Record<string, Prisma.CouponWhereInput> = { active: { active: true }, inactive: { active: false } };
/** Hiệu lực tại thời điểm xem, cùng điều kiện với lúc khách áp mã (calculateTotals). */
const VALIDITY: Record<string, (now: Date) => Prisma.CouponWhereInput> = {
  usable: (now) => ({ active: true, AND: [
    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
    { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
    { OR: [{ usageLimit: null }, { usedCount: { lt: prisma.coupon.fields.usageLimit } }] },
  ] }),
  scheduled: (now) => ({ startsAt: { gt: now } }),
  expired: (now) => ({ expiresAt: { lt: now } }),
  'used-up': () => ({ usageLimit: { not: null }, usedCount: { gte: prisma.coupon.fields.usageLimit } }),
};

/**
 * "Sắp hết hạn": mã còn hạn có ngày hết hạn gần nhất lên đầu, tiếp đến mã không giới hạn ngày, mã đã hết hạn xếp cuối
 * (mới hết hạn trước). Prisma không sắp xếp theo điều kiện nên hai nhóm truy vấn riêng, splitPage giữ phân trang liền mạch.
 */
async function expiringFirst(where: Prisma.CouponWhereInput, now: Date, skip: number, take: number) {
  const live = { AND: [where, { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }] };
  const ended = { AND: [where, { expiresAt: { lt: now } }] };
  const [liveCount, endedCount] = await Promise.all([prisma.coupon.count({ where: live }), prisma.coupon.count({ where: ended })]);
  const [first, second] = splitPage(skip, take, [liveCount, endedCount]);
  const rows = await Promise.all([
    first.take ? prisma.coupon.findMany({ where: live, orderBy: [{ expiresAt: { sort: 'asc', nulls: 'last' } }, { code: 'asc' }], ...first }) : [],
    second.take ? prisma.coupon.findMany({ where: ended, orderBy: [{ expiresAt: 'desc' }, { code: 'asc' }], ...second }) : [],
  ]);
  return [rows.flat(), liveCount + endedCount] as const;
}

/** Danh sách mã giảm giá có tìm kiếm, lọc theo trạng thái/hiệu lực, sắp xếp và phân trang. */
export async function GET(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
  const search = parseSearch(searchParams);
  const now = new Date();
  const where: Prisma.CouponWhereInput = { AND: [
    search ? { code: { contains: search.toUpperCase(), mode: 'insensitive' } } : {},
    parseChoice(searchParams, 'filter', STATUS) ?? {},
    parseChoice(searchParams, 'validity', VALIDITY)?.(now) ?? {},
  ] };
  const [coupons, total] = searchParams.get('sort') === 'expiring' ? await expiringFirst(where, now, skip, take) : await Promise.all([
    prisma.coupon.findMany({ where, orderBy: parseChoice(searchParams, 'sort', SORTS) ?? SORTS.newest, skip, take }),
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

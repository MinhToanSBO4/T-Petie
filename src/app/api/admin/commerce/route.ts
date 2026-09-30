import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/server/auth/options';
import { prisma } from '@/server/db/client';
import { parseCommerceSettings, parseCouponInput } from '@/lib/orders/commerce-input';
import { COMMERCE_TAG } from '@/server/orders/commerce-settings';

export const dynamic = 'force-dynamic';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin' && session.user.status === 'active';
}

export async function DELETE(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const code = new URL(request.url).searchParams.get('code')?.trim().toUpperCase() || '';
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return NextResponse.json({ error: 'Mã giảm giá không hợp lệ' }, { status: 400 });
  // Đơn cũ tham chiếu mã qua khóa ngoại; xóa hẳn sẽ làm mất thông tin trên đơn nên chỉ ngừng kích hoạt.
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

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const [settings, coupons] = await Promise.all([
    prisma.commerceSetting.findUnique({ where: { id: 'default' } }),
    prisma.coupon.findMany({ orderBy: { code: 'asc' } }),
  ]);
  return NextResponse.json({ settings: settings && {
    shippingFee: Number(settings.shippingFee), freeShippingThreshold: Number(settings.freeShippingThreshold),
  }, coupons: coupons.map((coupon) => ({ ...coupon, minSubtotal: Number(coupon.minSubtotal) })) },
  { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  try {
    if (body.kind === 'settings') {
      const data = parseCommerceSettings(body);
      await prisma.commerceSetting.update({ where: { id: 'default' }, data });
    } else if (body.kind === 'coupon') {
      const { code, ...data } = parseCouponInput(body);
      await prisma.coupon.upsert({ where: { code }, create: { code, ...data }, update: data });
    } else return NextResponse.json({ error: 'Thao tác không hợp lệ' }, { status: 400 });
    // Phí giao hàng và ngưỡng miễn phí hiển thị ở mini-cart nên cần làm mới cache.
    revalidateTag(COMMERCE_TAG);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && /không hợp lệ/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Commerce settings update failed:', error);
    return NextResponse.json({ error: 'Không lưu được cấu hình bán hàng' }, { status: 500 });
  }
}

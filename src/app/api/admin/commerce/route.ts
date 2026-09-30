import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/server/auth/options';
import { prisma } from '@/server/db/client';
import { parseCommerceSettings } from '@/lib/orders/commerce-input';
import { COMMERCE_TAG } from '@/server/orders/commerce-settings';

export const dynamic = 'force-dynamic';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin' && session.user.status === 'active';
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const settings = await prisma.commerceSetting.findUnique({ where: { id: 'default' } });
  return NextResponse.json({ settings: settings && {
    shippingFee: Number(settings.shippingFee), freeShippingThreshold: Number(settings.freeShippingThreshold),
  } }, { headers: { 'Cache-Control': 'no-store' } });
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

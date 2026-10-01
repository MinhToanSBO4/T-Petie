import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/session';
import { prisma } from '@/server/db/client';
import { allowAttempt } from '@/server/security/rate-limit';
import { clientIp } from '@/server/security/client-ip';
import { buildOrderTimeline } from '@/lib/orders/customer-orders';

export const dynamic = 'force-dynamic';

/**
 * Tra cứu một đơn: chủ đơn đã đăng nhập, hoặc khách vãng lai nhập đúng số điện thoại đặt hàng.
 * Chỉ trả thông tin cần cho việc theo dõi; địa chỉ đầy đủ chỉ hiện trong mục Đơn mua của chủ đơn.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!/^TP-[A-Z0-9-]{6,50}$/.test(params.id)) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
  const session = await getActiveSession();
  const phone = new URL(request.url).searchParams.get('phone');
  if (phone && !(await allowAttempt(`order-lookup:${clientIp(request)}`, 20))) {
    return NextResponse.json({ error: 'Bạn đã thử quá nhiều lần' }, { status: 429 });
  }
  const order = await prisma.order.findUnique({ where: { orderCode: params.id }, include: { items: true,
    statusEvents: { orderBy: { createdAt: 'asc' }, select: { status: true, createdAt: true } } } });
  const owned = Boolean(order && session && session.user.id === order.userId);
  const authorized = order && (owned || (phone && /^0[35789]\d{8}$/.test(phone) && phone === order.customerPhone));
  if (!authorized) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
  return NextResponse.json({ order: {
    code: order.orderCode, status: order.orderStatus, createdAt: order.createdAt, owned,
    customerName: order.customerName, city: order.city, district: order.district,
    total: Number(order.totalAmount), items: order.items.map((item) => ({
      name: item.productName, size: item.size, quantity: item.quantity,
      total: Number(item.totalPrice),
    })),
    timeline: buildOrderTimeline(order.orderStatus, order.statusEvents, order.createdAt),
  } }, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/session';
import { listCustomerOrders } from '@/server/orders/customer-orders';
import { parseOrderTab } from '@/lib/orders/customer-orders';
export { POST } from '../checkout/route';

export const dynamic = 'force-dynamic';

/** Đơn mua của khách đang đăng nhập theo tab (kèm số đơn từng tab), dùng cho trang tài khoản. */
export async function GET(request: Request) {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  const searchParams = new URL(request.url).searchParams;
  const result = await listCustomerOrders(session.user.id, parseOrderTab(searchParams.get('tab')), Number(searchParams.get('page')) || 1);
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

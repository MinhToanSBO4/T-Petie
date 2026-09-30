import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';
import { paginated, parsePagination, parseSearch } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

/** Danh sách đơn hàng cho quản trị viên, có tìm kiếm và phân trang. */
export async function GET(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
  const search = parseSearch(searchParams);
  const status = searchParams.get('filter') || '';
  const where = {
    ...(search ? { OR: [
      { orderCode: { contains: search, mode: 'insensitive' as const } },
      { customerName: { contains: search, mode: 'insensitive' as const } },
      { customerPhone: { contains: search, mode: 'insensitive' as const } },
    ] } : {}),
    ...(status ? { orderStatus: status } : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { items: true } }),
    prisma.order.count({ where }),
  ]);
  return NextResponse.json({ ...paginated(orders.map((order) => ({
    id: order.id, orderCode: order.orderCode, customerName: order.customerName,
    customerPhone: order.customerPhone, city: order.city, district: order.district,
    totalAmount: Number(order.totalAmount), orderStatus: order.orderStatus, source: order.source,
    couponCode: order.couponCode, note: order.orderNote,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({ name: item.productName, size: item.size, quantity: item.quantity, total: Number(item.totalPrice) })),
  })), total, page, limit) }, { headers: { 'Cache-Control': 'no-store' } });
}

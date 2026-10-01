import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';
import { paginated, parsePagination, parseSearch } from '@/lib/pagination';
import { ORDER_STATUSES } from '@/lib/orders/status';
import { autoCompleteShippedOrders } from '@/server/orders/order-status';

export const dynamic = 'force-dynamic';

/**
 * Danh sách đơn hàng cho quản trị viên, có tìm kiếm, lọc theo trạng thái và phân trang.
 * Kèm số đơn của từng trạng thái (theo từ khóa đang tìm) cho thanh tab, và đủ thông tin
 * giao hàng + lịch sử trạng thái để mở chi tiết đơn không phải tải thêm.
 */
export async function GET(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  await autoCompleteShippedOrders();
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
  const search = parseSearch(searchParams);
  const filter = searchParams.get('filter') || '';
  const status = (ORDER_STATUSES as readonly string[]).includes(filter) ? filter : '';
  const searchWhere = search ? { OR: [
    { orderCode: { contains: search, mode: 'insensitive' as const } },
    { customerName: { contains: search, mode: 'insensitive' as const } },
    { customerPhone: { contains: search, mode: 'insensitive' as const } },
  ] } : {};
  const statusCounts = async () => Object.fromEntries((await prisma.order.groupBy({ by: ['orderStatus'], where: searchWhere,
    _count: { _all: true } })).map((row) => [row.orderStatus, row._count._all]));
  // Mốc thay đổi gần nhất của toàn bộ đơn: trang quản trị so sánh để biết có cần tải lại danh sách không.
  const dataVersion = async () => String((await prisma.order.aggregate({ _max: { updatedAt: true } }))._max.updatedAt?.getTime() ?? 0);
  if (searchParams.get('summary') === '1') {
    // Kiểm tra định kỳ: chỉ hai truy vấn gộp, không đọc đơn và sản phẩm.
    const [counts, version] = await Promise.all([statusCounts(), dataVersion()]);
    return NextResponse.json({ counts, version }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const where = { ...searchWhere, ...(status ? { orderStatus: status } : {}) };
  // Đơn chờ xử lý: cũ nhất lên đầu để xử lý theo thứ tự đặt; các tab khác mới nhất lên đầu.
  const oldestFirst = status === 'PENDING' || status === 'CONFIRMED' || status === 'PROCESSING';
  const [orders, total, counts, version] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: oldestFirst ? 'asc' : 'desc' }, skip, take, include: {
      items: true,
      statusEvents: { orderBy: { createdAt: 'asc' }, select: { status: true, actor: true, note: true, createdAt: true } },
    } }),
    prisma.order.count({ where }),
    statusCounts(),
    dataVersion(),
  ]);
  return NextResponse.json({ ...paginated(orders.map((order) => ({
    id: order.id, orderCode: order.orderCode, customerName: order.customerName,
    customerPhone: order.customerPhone, customerEmail: order.customerEmail,
    shippingAddress: order.shippingAddress, ward: order.ward, city: order.city, district: order.district,
    subtotal: Number(order.subtotal), shippingFee: Number(order.shippingFee), discountAmount: Number(order.discountAmount),
    totalAmount: Number(order.totalAmount), paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus, source: order.source, couponCode: order.couponCode, note: order.orderNote,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({ name: item.productName, size: item.size, quantity: item.quantity, total: Number(item.totalPrice) })),
    events: order.statusEvents.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
  })), total, page, limit), counts, version }, { headers: { 'Cache-Control': 'no-store' } });
}

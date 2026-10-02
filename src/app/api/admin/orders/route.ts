import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireStaffApi } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';
import { vnDayStart } from '@/lib/admin/dashboard-range';
import { paginated, parseChoice, parsePagination, parseSearch } from '@/lib/pagination';
import { OLDEST_FIRST_STATUSES, ORDER_STATUSES } from '@/lib/orders/status';
import { autoCompleteShippedOrders } from '@/server/orders/order-status';
import { scheduleEmailDispatch } from '@/server/email/outbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Cách sắp xếp danh sách đơn; luôn kèm id để phân trang ổn định khi trùng thời điểm hoặc tổng tiền. */
const SORTS: Record<string, Prisma.OrderOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  'total-desc': [{ totalAmount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
};
/** Lọc theo ngày đặt: số ngày gần nhất tính cả hôm nay, theo lịch Việt Nam. */
const PERIOD_DAYS: Record<string, number> = { today: 1, '7d': 7, '30d': 30 };

/**
 * Danh sách đơn hàng cho quản trị viên và nhân viên, có tìm kiếm, lọc theo trạng thái/ngày đặt, sắp xếp và phân trang.
 * Kèm số đơn của từng trạng thái (theo từ khóa đang tìm) cho thanh tab, và đủ thông tin
 * giao hàng + lịch sử trạng thái để mở chi tiết đơn không phải tải thêm.
 */
export async function GET(request: Request) {
  if (!(await requireStaffApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  await autoCompleteShippedOrders();
  scheduleEmailDispatch();
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
  // Một truy vấn gộp cho cả số đơn từng tab lẫn mốc thay đổi gần nhất (trang quản trị so mốc này để biết có cần tải lại).
  const summarize = async (where: typeof searchWhere) => {
    const rows = await prisma.order.groupBy({ by: ['orderStatus'], where, _count: { _all: true }, _max: { updatedAt: true } });
    return {
      counts: Object.fromEntries(rows.map((row) => [row.orderStatus, row._count._all])) as Record<string, number>,
      version: String(Math.max(0, ...rows.map((row) => row._max.updatedAt?.getTime() ?? 0))),
    };
  };
  if (searchParams.get('summary') === '1') {
    // Kiểm tra định kỳ: một truy vấn gộp, không đọc đơn và sản phẩm.
    return NextResponse.json(await summarize({}), { headers: { 'Cache-Control': 'no-store' } });
  }
  const days = parseChoice(searchParams, 'period', PERIOD_DAYS);
  const periodWhere = days ? { createdAt: { gte: vnDayStart(days - 1) } } : {};
  const where = { ...searchWhere, ...periodWhere, ...(status ? { orderStatus: status } : {}) };
  // Mặc định: đơn chờ xử lý cũ nhất lên đầu để xử lý theo thứ tự đặt; các tab khác mới nhất lên đầu.
  const orderBy = parseChoice(searchParams, 'sort', SORTS)
    ?? SORTS[(OLDEST_FIRST_STATUSES as readonly string[]).includes(status) ? 'oldest' : 'newest'];
  const [orders, filtered, overall, periodTotal] = await Promise.all([
    prisma.order.findMany({ where, orderBy, skip, take, include: {
      items: { select: { productName: true, size: true, quantity: true, totalPrice: true } },
      statusEvents: { orderBy: { createdAt: 'asc' }, select: { status: true, actor: true, note: true, createdAt: true } },
    } }),
    summarize(searchWhere),
    // Khi đang tìm kiếm, số đếm theo từ khóa còn mốc thay đổi phải tính trên toàn bộ đơn.
    search ? summarize({}) : null,
    // Số đơn trên các tab là việc cần làm nên không theo bộ lọc ngày; riêng tổng dòng của bảng phải đếm theo bộ lọc.
    days ? prisma.order.count({ where }) : null,
  ]);
  const { counts } = filtered;
  const version = (overall ?? filtered).version;
  // Không lọc theo ngày thì tổng số dòng của tab đang xem lấy luôn từ số đếm, không cần thêm truy vấn count.
  const total = periodTotal ?? (status ? counts[status] ?? 0 : Object.values(counts).reduce((sum, value) => sum + value, 0));
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

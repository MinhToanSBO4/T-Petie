import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/server/db/client';
import { resolvePeriod, type DashboardRangeKey } from '@/lib/admin/dashboard-range';

/** Ngưỡng tồn kho được coi là sắp hết, giữ đúng quy ước cũ của trang tổng quan. */
export const LOW_STOCK_THRESHOLD = 5;
export const DASHBOARD_TAG = 'admin-dashboard';

type Totals = { revenue: number; completed: number; orders: number; cancelled: number };

export type DashboardData = {
  range: DashboardRangeKey;
  generatedAt: string;
  unit: 'day' | 'month';
  trend: { key: string; revenue: number; prevRevenue: number }[];
  current: Totals;
  previous: Totals;
  statusCounts: Record<string, number>;
  pendingNow: number;
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  sources: { source: string; orders: number }[];
  lowStock: { total: number; items: { id: string; productId: string; productName: string; size: string; stock: number }[] };
  recentOrders: { id: string; orderCode: string; customerName: string; orderStatus: string; totalAmount: number; createdAt: string }[];
};

// Mốc thời gian gửi dạng chuỗi ISO rồi ép về timestamp: cột createdAt là timestamp không múi giờ
// lưu theo UTC, nên so sánh như vậy đúng bất kể TimeZone của phiên database.
const iso = (date: Date) => date.toISOString();

async function loadDashboard(range: DashboardRangeKey): Promise<DashboardData> {
  const period = resolvePeriod(range);
  const format = period.unit === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';

  // Runtime chỉ có 1 kết nối database, nên gộp số liệu vào ít truy vấn nhất có thể.
  const [buckets, statusRows, topProducts, sources, lowStockItems, lowStockTotal, recentOrders, pendingNow] = await Promise.all([
    prisma.$queryRaw<{ bucket: string; revenue: bigint; completed: bigint; orders: bigint; cancelled: bigint; is_current: boolean }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh', ${format}) AS bucket,
        ("createdAt" >= ${iso(period.from)}::timestamp) AS is_current,
        COALESCE(SUM("totalAmount") FILTER (WHERE "orderStatus" = 'COMPLETED'), 0)::bigint AS revenue,
        COUNT(*) FILTER (WHERE "orderStatus" = 'COMPLETED')::bigint AS completed,
        COUNT(*) FILTER (WHERE "orderStatus" <> 'CANCELLED')::bigint AS orders,
        COUNT(*) FILTER (WHERE "orderStatus" = 'CANCELLED')::bigint AS cancelled
      FROM "orders"
      WHERE "createdAt" >= ${iso(period.prevFrom)}::timestamp AND "createdAt" < ${iso(period.to)}::timestamp
        AND ("createdAt" >= ${iso(period.from)}::timestamp OR "createdAt" < ${iso(period.prevTo)}::timestamp)
      GROUP BY 1, 2`,
    prisma.order.groupBy({ by: ['orderStatus'], _count: { _all: true },
      where: { createdAt: { gte: period.from, lt: period.to } } }),
    prisma.$queryRaw<{ productId: string; name: string; quantity: bigint; revenue: bigint }[]>`
      SELECT i."productId", MAX(i."productName") AS name, SUM(i."quantity")::bigint AS quantity, SUM(i."totalPrice")::bigint AS revenue
      FROM "order_items" i JOIN "orders" o ON o."id" = i."orderId"
      WHERE o."orderStatus" <> 'CANCELLED'
        AND o."createdAt" >= ${iso(period.from)}::timestamp AND o."createdAt" < ${iso(period.to)}::timestamp
      GROUP BY i."productId" ORDER BY revenue DESC LIMIT 5`,
    prisma.order.groupBy({ by: ['source'], _count: { _all: true },
      where: { orderStatus: { not: 'CANCELLED' }, createdAt: { gte: period.from, lt: period.to } } }),
    prisma.productVariant.findMany({ where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD }, product: { isActive: true } },
      orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }], take: 6,
      select: { id: true, size: true, stock: true, productId: true, product: { select: { name: true } } } }),
    prisma.productVariant.count({ where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD }, product: { isActive: true } } }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 6,
      select: { id: true, orderCode: true, customerName: true, orderStatus: true, totalAmount: true, createdAt: true } }),
    prisma.order.count({ where: { orderStatus: 'PENDING' } }),
  ]);

  const empty = (): Totals => ({ revenue: 0, completed: 0, orders: 0, cancelled: 0 });
  const current = empty();
  const previous = empty();
  const revenueByKey = new Map<string, number>();
  for (const row of buckets) {
    const totals = row.is_current ? current : previous;
    totals.revenue += Number(row.revenue);
    totals.completed += Number(row.completed);
    totals.orders += Number(row.orders);
    totals.cancelled += Number(row.cancelled);
    // Khóa cột của hai kỳ không trùng nhau nên gộp chung một bảng tra được.
    revenueByKey.set(row.bucket, Number(row.revenue));
  }

  return {
    range, unit: period.unit, generatedAt: new Date().toISOString(),
    trend: period.keys.map((key, index) => ({ key, revenue: revenueByKey.get(key) || 0,
      prevRevenue: revenueByKey.get(period.prevKeys[index]) || 0 })),
    current, previous,
    statusCounts: Object.fromEntries(statusRows.map((row) => [row.orderStatus, row._count._all])),
    pendingNow,
    topProducts: topProducts.map((row) => ({ productId: row.productId, name: row.name,
      quantity: Number(row.quantity), revenue: Number(row.revenue) })),
    sources: sources.map((row) => ({ source: row.source || 'Không chọn', orders: row._count._all }))
      .sort((a, b) => b.orders - a.orders),
    lowStock: { total: lowStockTotal, items: lowStockItems.map((item) => ({ id: item.id, productId: item.productId,
      productName: item.product.name, size: item.size, stock: item.stock })) },
    recentOrders: recentOrders.map((order) => ({ ...order, totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt.toISOString() })),
  };
}

/**
 * Số liệu tổng quan được cache trên máy chủ theo từng khoảng thời gian, dùng chung cho mọi quản trị viên.
 * Mọi thay đổi ảnh hưởng số liệu (khách đặt đơn, đổi trạng thái đơn, sửa tồn kho) và nút "Làm mới"
 * đều xóa cache qua DASHBOARD_TAG, nên có thể giữ lâu; 15 phút chỉ là lưới an toàn khi sang ngày mới.
 */
export const getDashboardData = (range: DashboardRangeKey) =>
  unstable_cache(() => loadDashboard(range), ['admin-dashboard', range], { revalidate: 900, tags: [DASHBOARD_TAG] })();

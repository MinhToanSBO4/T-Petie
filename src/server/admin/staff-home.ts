import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/server/db/client';
import { table } from '@/server/db/sql';
import { DASHBOARD_TAG, LOW_STOCK_THRESHOLD } from '@/server/admin/dashboard';
import type { OrderStatus } from '@/lib/orders/status';

/** Các bước đơn còn chờ shop làm, theo thứ tự quy trình. */
export const OPEN_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING'] as const satisfies readonly OrderStatus[];
export type OpenStatus = typeof OPEN_STATUSES[number];
/** Đơn còn nằm ở shop (chưa giao cho shipper). */
const TO_HANDLE: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING'];

/**
 * Số đơn shop cần xử lý, hiện cạnh mục "Đơn hàng" ở sidebar. Layout dựng lại ở mỗi lần làm mới trang nên số này được
 * cache; mọi thao tác đổi trạng thái đơn đã xóa cache qua DASHBOARD_TAG, một phút chỉ là lưới an toàn.
 */
export const getOrdersToHandleCount = unstable_cache(
  () => prisma.order.count({ where: { orderStatus: { in: TO_HANDLE } } }),
  ['orders-to-handle'], { revalidate: 60, tags: [DASHBOARD_TAG] },
);

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** 0 giờ hôm nay theo giờ Việt Nam, để "hôm nay" khớp ngày nhân viên thấy bất kể múi giờ máy chủ. */
function startOfTodayVN(now: Date) {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - VN_OFFSET_MS);
}

/**
 * Số liệu trang chủ nhân viên: việc cần làm, không có doanh thu. Không cache để số đơn luôn đúng lúc mở trang; các phép
 * đếm gộp vào một câu SQL, cả trang chỉ tốn năm lượt truy vấn chạy song song.
 */
export async function getStaffHomeData(now = new Date()) {
  const today = startOfTodayVN(now).toISOString();
  const lowStockWhere = { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD }, product: { isActive: true } };
  const [queueRows, waiting, lowStockItems, reviewItems, [totals]] = await Promise.all([
    prisma.order.groupBy({ by: ['orderStatus'], where: { orderStatus: { in: [...OPEN_STATUSES] } },
      _count: { _all: true }, _min: { createdAt: true } }),
    // Đơn đặt trước xử lý trước; đơn đang giao đã rời shop nên không nằm trong danh sách chờ.
    prisma.order.findMany({ where: { orderStatus: { in: TO_HANDLE } }, orderBy: { createdAt: 'asc' }, take: 6,
      select: { orderCode: true, customerName: true, customerPhone: true, orderStatus: true, totalAmount: true,
        paymentMethod: true, createdAt: true, _count: { select: { items: true } } } }),
    prisma.productVariant.findMany({ where: lowStockWhere, orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }], take: 5,
      select: { id: true, size: true, stock: true, product: { select: { name: true } } } }),
    // Đánh giá thấp cần trả lời trước để giữ uy tín shop.
    prisma.productReview.findMany({ where: { reply: null, isHidden: false }, orderBy: [{ rating: 'asc' }, { createdAt: 'desc' }], take: 4,
      select: { id: true, customerName: true, isAnonymous: true, rating: true, content: true, createdAt: true, product: { select: { name: true } } } }),
    prisma.$queryRaw<{ new_today: bigint; completed_today: bigint; low_stock: bigint; unreplied: bigint; low_rated: bigint }[]>`
      SELECT
        (SELECT COUNT(*) FROM ${table('orders')} WHERE "createdAt" >= ${today}::timestamp) AS new_today,
        (SELECT COUNT(*) FROM ${table('orders')} WHERE "orderStatus" = 'COMPLETED' AND "completedAt" >= ${today}::timestamp) AS completed_today,
        (SELECT COUNT(*) FROM ${table('product_variants')} v JOIN ${table('products')} p ON p."id" = v."productId"
          WHERE v."isActive" AND p."isActive" AND v."stock" <= ${LOW_STOCK_THRESHOLD}) AS low_stock,
        COUNT(*) AS unreplied,
        COUNT(*) FILTER (WHERE "rating" <= 2) AS low_rated
      FROM ${table('product_reviews')} WHERE "reply" IS NULL AND NOT "isHidden"`,
  ]);

  const queue = Object.fromEntries(OPEN_STATUSES.map((status) => {
    const row = queueRows.find((entry) => entry.orderStatus === status);
    return [status, { count: row?._count._all ?? 0, oldest: row?._min.createdAt?.toISOString() ?? null }];
  })) as Record<OpenStatus, { count: number; oldest: string | null }>;

  return {
    queue,
    waiting: waiting.map(({ _count, totalAmount, createdAt, ...order }) => ({ ...order, orderStatus: order.orderStatus as OpenStatus,
      itemCount: _count.items, totalAmount: Number(totalAmount), createdAt: createdAt.toISOString() })),
    today: { newOrders: Number(totals.new_today), completed: Number(totals.completed_today) },
    lowStock: { total: Number(totals.low_stock), items: lowStockItems.map((item) => ({ id: item.id, productName: item.product.name,
      size: item.size, stock: item.stock })) },
    reviews: { unreplied: Number(totals.unreplied), lowRated: Number(totals.low_rated), items: reviewItems.map((review) => ({
      id: review.id, customerName: review.isAnonymous ? 'Khách ẩn danh' : review.customerName, rating: review.rating,
      content: review.content, productName: review.product.name, createdAt: review.createdAt.toISOString() })) },
  };
}

export type StaffHomeData = Awaited<ReturnType<typeof getStaffHomeData>>;

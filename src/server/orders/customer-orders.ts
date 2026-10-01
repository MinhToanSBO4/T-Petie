import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/client';
import { autoCompleteShippedOrders } from '@/server/orders/order-status';
import { MAX_PAGE } from '@/lib/pagination';
import { buildOrderTimeline, countOrderTabs, tabStatuses, type CustomerOrderTab } from '@/lib/orders/customer-orders';
import { cartSizeLabel } from '@/lib/orders/variant-match';
import { AUTO_COMPLETE_DAYS } from '@/lib/orders/status';
import { canEditReview, editDeadline, REVIEW_WINDOW_DAYS, reviewDeadline, reviewEligibility } from '@/lib/reviews/rules';
import type { CustomerOrderDetail, CustomerOrderItem, CustomerOrderList, CustomerOrderSummary, ReviewTarget } from '@/types/order';

export const ORDERS_PER_PAGE = 10;
const DAY_MS = 86_400_000;

/** Ngày đơn đang giao sẽ tự hoàn tất nếu khách chưa bấm "Đã nhận được hàng". */
function autoCompleteAt(events: { status: string; createdAt: Date }[]) {
  const shipped = events.findLast((event) => event.status === 'SHIPPING');
  return shipped ? new Date(shipped.createdAt.getTime() + AUTO_COMPLETE_DAYS * DAY_MS).toISOString() : null;
}

const firstImage = { orderBy: { sortOrder: 'asc' as const }, take: 1, select: { url: true } };

const itemInclude = {
  product: { select: { slug: true, sku: true, isActive: true, categoryName: true, images: firstImage } },
  variant: { select: { size: true, weightRange: true, price: true, stock: true, isActive: true } },
  review: { select: { id: true, rating: true, content: true, sizeFit: true, isAnonymous: true, imageUrls: true,
    isApproved: true, editCount: true, createdAt: true } },
} satisfies Prisma.OrderItemInclude;

const orderInclude = { items: { include: itemInclude, orderBy: { id: 'asc' as const } } } satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type ItemRow = OrderRow['items'][number];

const reviewWindowStart = (now: Date) => new Date(now.getTime() - REVIEW_WINDOW_DAYS * DAY_MS);

/** Điều kiện của từng tab. "Chờ đánh giá" là đơn hoàn tất còn hạn và còn món chưa đánh giá. */
function tabWhere(userId: string, tab: CustomerOrderTab, now: Date): Prisma.OrderWhereInput {
  if (tab === 'to-review') {
    return { userId, orderStatus: 'COMPLETED', completedAt: { gte: reviewWindowStart(now) },
      items: { some: { review: { is: null } } } };
  }
  const statuses = tabStatuses(tab);
  return statuses ? { userId, orderStatus: { in: [...statuses] } } : { userId };
}

function toItem(item: ItemRow, order: Pick<OrderRow, 'orderStatus' | 'completedAt'>, now: Date): CustomerOrderItem {
  const eligibility = reviewEligibility({ orderStatus: order.orderStatus, completedAt: order.completedAt,
    hasReview: Boolean(item.review), now });
  const { product, variant, review } = item;
  return {
    id: item.id, productId: item.productId, productName: item.productName,
    productSlug: product.isActive ? product.slug : null, thumbnail: product.images[0]?.url || '',
    size: item.size, quantity: item.quantity, unitPrice: Number(item.unitPrice), totalPrice: Number(item.totalPrice),
    review: review && {
      id: review.id, rating: review.rating, content: review.content, sizeFit: review.sizeFit,
      isAnonymous: review.isAnonymous, imageUrls: review.imageUrls, status: review.isApproved ? 'approved' : 'pending',
      editable: canEditReview({ createdAt: review.createdAt, editCount: review.editCount, now }),
      editDeadline: editDeadline(review.createdAt).toISOString(),
    },
    reviewAvailability: review ? 'reviewed' : eligibility.ok ? 'open' : eligibility.reason === 'expired' ? 'expired' : 'waiting',
    reorder: product.isActive && variant.isActive && variant.stock > 0 ? {
      sku: product.sku, category: product.categoryName, selectedSize: cartSizeLabel(variant.size, variant.weightRange),
      price: Number(variant.price), stock: variant.stock,
    } : null,
  };
}

function toSummary(order: OrderRow, now: Date): CustomerOrderSummary {
  const items = order.items.map((item) => toItem(item, order, now));
  const deadline = order.orderStatus === 'COMPLETED' ? reviewDeadline(order.completedAt) : null;
  return {
    code: order.orderCode, createdAt: order.createdAt.toISOString(), status: order.orderStatus,
    total: Number(order.totalAmount), itemCount: items.reduce((sum, item) => sum + item.quantity, 0), items,
    pendingReviews: items.filter((item) => item.reviewAvailability === 'open').length,
    reviewDeadline: deadline ? deadline.toISOString() : null,
  };
}

/** Đơn mua của khách theo tab, kèm số đơn từng tab cho thanh tab. Các truy vấn chạy song song. */
export async function listCustomerOrders(userId: string, tab: CustomerOrderTab, requestedPage: number): Promise<CustomerOrderList> {
  await autoCompleteShippedOrders();
  const now = new Date();
  const page = Math.min(MAX_PAGE, Math.max(1, Math.floor(requestedPage) || 1));
  const where = tabWhere(userId, tab, now);
  const [orders, total, byStatus, toReview] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * ORDERS_PER_PAGE,
      take: ORDERS_PER_PAGE, include: orderInclude }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['orderStatus'], where: { userId }, _count: { _all: true } }),
    prisma.order.count({ where: tabWhere(userId, 'to-review', now) }),
  ]);
  const counts = countOrderTabs(Object.fromEntries(byStatus.map((row) => [row.orderStatus, row._count._all])), toReview);
  return { orders: orders.map((order) => toSummary(order, now)), counts, tab, page,
    pages: Math.max(1, Math.ceil(total / ORDERS_PER_PAGE)) };
}

/** Chi tiết một đơn của chính khách; đơn của người khác trả về null như không tồn tại. */
export async function getCustomerOrder(userId: string, orderCode: string): Promise<CustomerOrderDetail | null> {
  if (!/^TP-[A-Z0-9-]{6,50}$/.test(orderCode)) return null;
  await autoCompleteShippedOrders();
  const order = await prisma.order.findFirst({
    where: { orderCode, userId },
    include: { ...orderInclude, statusEvents: { orderBy: { createdAt: 'asc' }, select: { status: true, note: true, createdAt: true } } },
  });
  if (!order) return null;
  const now = new Date();
  return {
    ...toSummary(order, now),
    subtotal: Number(order.subtotal), shippingFee: Number(order.shippingFee), discount: Number(order.discountAmount),
    couponCode: order.couponCode, paymentMethod: order.paymentMethod,
    recipient: { name: order.customerName, phone: order.customerPhone,
      address: [order.shippingAddress, order.ward, order.district, order.city].filter(Boolean).join(', ') },
    note: order.orderNote, timeline: buildOrderTimeline(order.orderStatus, order.statusEvents, order.createdAt),
    cancelReason: order.orderStatus === 'CANCELLED'
      ? order.statusEvents.findLast((event) => event.status === 'CANCELLED')?.note ?? null : null,
    autoCompleteAt: order.orderStatus === 'SHIPPING' ? autoCompleteAt(order.statusEvents) : null,
  };
}

/** Món của sản phẩm này mà khách đã nhận và còn hạn đánh giá. */
export async function getReviewTargets(userId: string, productId: string): Promise<ReviewTarget[]> {
  const now = new Date();
  const items = await prisma.orderItem.findMany({
    where: { productId, review: { is: null },
      order: { userId, orderStatus: 'COMPLETED', completedAt: { gte: reviewWindowStart(now) } } },
    orderBy: { order: { completedAt: 'desc' } },
    take: 5,
    select: { id: true, size: true, productName: true, order: { select: { orderCode: true, completedAt: true } },
      product: { select: { images: firstImage } } },
  });
  return items.map((item) => ({
    orderItemId: item.id, orderCode: item.order.orderCode, productName: item.productName, size: item.size,
    thumbnail: item.product.images[0]?.url || '', deadline: reviewDeadline(item.order.completedAt)!.toISOString(),
  }));
}

import 'server-only';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/server/db/client';
import { DASHBOARD_TAG } from '@/server/admin/dashboard';
import { canTransition, type OrderStatus } from '@/lib/orders/status';

export const ORDER_NOT_FOUND = 'Không tìm thấy đơn hàng';
export const INVALID_TRANSITION = 'Chuyển trạng thái không hợp lệ';
export const CONCURRENT_UPDATE = 'Đơn hàng đã được cập nhật bởi người khác';

/** Lỗi nghiệp vụ được phép trả về trình duyệt; lỗi hệ thống khác không lộ chi tiết. */
export class OrderStatusError extends Error {}

/**
 * Chuyển trạng thái đơn theo đúng quy trình, dùng chung cho quản trị viên và khách.
 * Trong cùng transaction: cập nhật có điều kiện (chống hai người bấm cùng lúc), ghi lịch sử trạng thái,
 * ghi mốc hoàn tất để tính hạn đánh giá, và hoàn kho/lượt mã giảm giá khi hủy.
 * Truyền `ownerId` để chỉ thao tác được trên đơn của chính khách đó, `from` để chỉ chấp nhận đúng một
 * trạng thái hiện tại (khách chỉ hủy được đơn chưa xác nhận dù quy trình cho phép hủy muộn hơn).
 */
export async function changeOrderStatus(orderCode: string, next: OrderStatus, options: { ownerId?: string; from?: OrderStatus } = {}) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderCode }, include: { items: true } });
    if (!order || (options.ownerId !== undefined && order.userId !== options.ownerId)) {
      throw new OrderStatusError(ORDER_NOT_FOUND);
    }
    if (!canTransition(order.orderStatus, next) || (options.from && order.orderStatus !== options.from)) {
      throw new OrderStatusError(INVALID_TRANSITION);
    }
    const updated = await tx.order.updateMany({
      where: { id: order.id, orderStatus: order.orderStatus },
      data: { orderStatus: next, ...(next === 'COMPLETED' ? { completedAt: new Date() } : {}) },
    });
    if (updated.count !== 1) throw new OrderStatusError(CONCURRENT_UPDATE);
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: next } });
    if (next === 'CANCELLED') {
      for (const item of order.items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
      if (order.couponCode) {
        await tx.coupon.update({ where: { code: order.couponCode }, data: { usedCount: { decrement: 1 } } });
      }
    }
  });
  if (next === 'CANCELLED') revalidateTag('products');
  revalidateTag(DASHBOARD_TAG);
}

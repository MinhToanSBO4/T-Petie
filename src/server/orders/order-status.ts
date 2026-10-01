import 'server-only';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/server/db/client';
import { DASHBOARD_TAG } from '@/server/admin/dashboard';
import {
  AUTO_COMPLETE_DAYS, canTransition, PREVIOUS_STATUS, UNDO_WINDOW_MS, UNDOABLE_STATUSES,
  type OrderStatus, type StatusActor,
} from '@/lib/orders/status';

export const ORDER_NOT_FOUND = 'Không tìm thấy đơn hàng';
export const INVALID_TRANSITION = 'Chuyển trạng thái không hợp lệ';
export const CONCURRENT_UPDATE = 'Đơn hàng đã được cập nhật bởi người khác';
export const UNDO_EXPIRED = 'Đã quá thời gian hoàn tác';

/** Lỗi nghiệp vụ được phép trả về trình duyệt; lỗi hệ thống khác không lộ chi tiết. */
export class OrderStatusError extends Error {}

/**
 * Chuyển trạng thái đơn theo đúng quy trình, dùng chung cho quản trị viên, khách và hệ thống.
 * Trong cùng transaction: cập nhật có điều kiện (chống hai người bấm cùng lúc), ghi lịch sử trạng thái
 * (ai làm, ghi chú như lý do hủy), ghi mốc hoàn tất để tính hạn đánh giá, và hoàn kho/lượt mã giảm giá khi hủy.
 * Truyền `ownerId` để chỉ thao tác được trên đơn của chính khách đó, `from` để chỉ chấp nhận đúng một
 * trạng thái hiện tại (khách chỉ hủy được đơn chưa xác nhận dù quy trình cho phép hủy muộn hơn).
 */
export async function changeOrderStatus(orderCode: string, next: OrderStatus, options: {
  ownerId?: string; from?: OrderStatus; actor?: StatusActor; note?: string; revalidate?: boolean;
} = {}) {
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
      // Đơn COD hoàn tất nghĩa là shipper đã thu tiền.
      data: { orderStatus: next, ...(next === 'COMPLETED' ? { completedAt: new Date(),
        ...(order.paymentMethod === 'COD' ? { paymentStatus: 'PAID' } : {}) } : {}) },
    });
    if (updated.count !== 1) throw new OrderStatusError(CONCURRENT_UPDATE);
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: next,
      actor: options.actor ?? null, note: options.note?.trim() || null } });
    if (next === 'CANCELLED') {
      for (const item of order.items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
      if (order.couponCode) {
        await tx.coupon.update({ where: { code: order.couponCode }, data: { usedCount: { decrement: 1 } } });
      }
    }
  });
  if (options.revalidate === false) return;
  if (next === 'CANCELLED') revalidateTag('products');
  revalidateTag(DASHBOARD_TAG);
}

/**
 * Hoàn tác bước tiến vừa bấm nhầm: chỉ khi đơn vẫn đang ở đúng trạng thái `current`, bước đó vừa được
 * quản trị viên ghi trong UNDO_WINDOW_MS, và không phải Hủy/Hoàn tất. Xóa dòng lịch sử của bước đó
 * để hành trình đơn của khách không hiện bước đã hoàn tác. Trả về trạng thái sau khi hoàn tác.
 */
export async function undoOrderStatus(orderCode: string, current: OrderStatus): Promise<OrderStatus> {
  const previous = PREVIOUS_STATUS[current];
  if (!previous || !UNDOABLE_STATUSES.includes(current)) throw new OrderStatusError(INVALID_TRANSITION);
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderCode },
      include: { statusEvents: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!order) throw new OrderStatusError(ORDER_NOT_FOUND);
    if (order.orderStatus !== current) throw new OrderStatusError(CONCURRENT_UPDATE);
    const last = order.statusEvents[0];
    if (!last || last.status !== current || last.actor !== 'admin' || Date.now() - last.createdAt.getTime() > UNDO_WINDOW_MS) {
      throw new OrderStatusError(UNDO_EXPIRED);
    }
    const updated = await tx.order.updateMany({ where: { id: order.id, orderStatus: current }, data: { orderStatus: previous } });
    if (updated.count !== 1) throw new OrderStatusError(CONCURRENT_UPDATE);
    await tx.orderStatusEvent.delete({ where: { id: last.id } });
  });
  revalidateTag(DASHBOARD_TAG);
  return previous;
}

const DAY_MS = 86_400_000;
const SWEEP_INTERVAL_MS = 10 * 60_000;
let lastSweep = 0;

/**
 * Đơn đang giao quá AUTO_COMPLETE_DAYS ngày (tính từ lúc giao cho shipper) mà khách chưa bấm
 * "Đã nhận được hàng" thì hệ thống tự hoàn tất. Không cần cron: được gọi khi mở danh sách đơn,
 * trang tổng quan hay trang đơn của khách, và tự giới hạn tối đa một lần mỗi 10 phút trên mỗi máy chủ.
 */
export async function autoCompleteShippedOrders(now = new Date()): Promise<number> {
  if (now.getTime() - lastSweep < SWEEP_INTERVAL_MS) return 0;
  lastSweep = now.getTime();
  const cutoff = new Date(now.getTime() - AUTO_COMPLETE_DAYS * DAY_MS);
  try {
    const due = await prisma.order.findMany({
      where: { orderStatus: 'SHIPPING', statusEvents: { some: { status: 'SHIPPING', createdAt: { lt: cutoff } } } },
      select: { orderCode: true }, take: 100,
    });
    let completed = 0;
    for (const { orderCode } of due) {
      try {
        await changeOrderStatus(orderCode, 'COMPLETED', { from: 'SHIPPING', actor: 'system', revalidate: false,
          note: `Tự động hoàn tất sau ${AUTO_COMPLETE_DAYS} ngày giao hàng` });
        completed += 1;
      } catch (error) {
        // Đơn vừa được người khác cập nhật thì bỏ qua; lần quét sau sẽ xét lại.
        if (!(error instanceof OrderStatusError)) throw error;
      }
    }
    if (completed) {
      // Bước quét có thể chạy trong lúc dựng trang, nơi Next.js không cho làm mới cache; khi đó số liệu
      // tổng quan chỉ cập nhật ở lần làm mới kế tiếp, đơn hàng vẫn đã được hoàn tất.
      try { revalidateTag(DASHBOARD_TAG); } catch { /* bỏ qua */ }
    }
    return completed;
  } catch (error) {
    // Quét lỗi không được làm hỏng trang đang mở; lần sau thử lại.
    lastSweep = 0;
    console.error('Auto-complete shipped orders failed:', error);
    return 0;
  }
}

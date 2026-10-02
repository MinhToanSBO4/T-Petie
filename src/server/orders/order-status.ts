import 'server-only';
import { randomUUID } from 'crypto';
import { revalidateTag } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/client';
import { table } from '@/server/db/sql';
import { DASHBOARD_TAG } from '@/server/admin/dashboard';
import { enqueueOrderEmail, scheduleEmailDispatch } from '@/server/email/outbox';
import {
  AUTO_COMPLETE_DAYS, canTransition, forwardPath, isShopActor, PREVIOUS_STATUS, restocksOnCancel, UNDO_WINDOW_MS, UNDOABLE_STATUSES,
  type OrderStatus, type StatusActor,
} from '@/lib/orders/status';

export const ORDER_NOT_FOUND = 'Không tìm thấy đơn hàng';
export const INVALID_TRANSITION = 'Chuyển trạng thái không hợp lệ';
export const CONCURRENT_UPDATE = 'Đơn hàng đã được cập nhật bởi người khác';
export const UNDO_EXPIRED = 'Đã quá thời gian hoàn tác';
export const UNDO_REVIEWED = 'Khách đã đánh giá đơn này nên không hoàn tác được';

/** Lỗi nghiệp vụ được phép trả về trình duyệt; lỗi hệ thống khác không lộ chi tiết. */
export class OrderStatusError extends Error {}

type OrderHead = { id: string; orderCode: string; userId: string | null; orderStatus: string; paymentMethod: string };
const headSelect = { id: true, orderCode: true, userId: true, orderStatus: true, paymentMethod: true } as const;

type ChangeOptions = {
  /** Chỉ thao tác được trên đơn của chính khách này. */
  ownerId?: string;
  /** Chỉ chấp nhận đúng một trạng thái hiện tại (khách chỉ hủy được đơn chưa xác nhận dù quy trình cho phép hủy muộn hơn). */
  from?: OrderStatus;
  actor?: StatusActor;
  note?: string;
  /** Quản trị viên chuyển thẳng tới bước sau; lịch sử vẫn ghi đủ từng bước. */
  jump?: boolean;
  revalidate?: boolean;
};

/**
 * Tiến đơn qua các bước `path`: một câu lệnh SQL cập nhật có điều kiện theo trạng thái đang đọc được (hai người bấm
 * cùng lúc thì chỉ một người thành công), ghi lịch sử từng bước, ghi mốc hoàn tất để tính hạn đánh giá và ghi nhận đã
 * thu tiền với đơn COD; cùng transaction đó xếp thư báo trạng thái vào hàng đợi để thư không gửi cho thay đổi bị hủy.
 */
async function moveForward(order: OrderHead, path: OrderStatus[], actor: StatusActor | null, note: string | null) {
  const target = path[path.length - 1];
  const start = Date.now();
  // Mỗi bước cách nhau 1 ms để lịch sử luôn xếp đúng thứ tự.
  const times = path.map((_, index) => new Date(start + index).toISOString());
  const ids = path.map(() => randomUUID());
  const at = times[times.length - 1];
  // Cột thời gian là timestamp không múi giờ lưu giờ UTC: gửi chuỗi ISO rồi ép kiểu để không phụ thuộc múi giờ phiên database.
  const completion = target === 'COMPLETED'
    ? Prisma.sql`, "completedAt" = ${at}::timestamp${order.paymentMethod === 'COD' ? Prisma.sql`, "paymentStatus" = 'PAID'` : Prisma.empty}`
    : Prisma.empty;
  await prisma.$transaction(async (tx) => {
  const inserted = await tx.$executeRaw`
    WITH moved AS (
      UPDATE ${table('orders')} SET "orderStatus" = ${target}, "updatedAt" = ${at}::timestamp ${completion}
      WHERE "id" = ${order.id} AND "orderStatus" = ${order.orderStatus}
      RETURNING "id"
    )
    INSERT INTO ${table('order_status_events')} ("id", "orderId", "status", "actor", "note", "createdAt")
    SELECT step.id, moved."id", step.status, ${actor}::text, ${note}::text, step.at
    FROM moved, unnest(${ids}::text[], ${path}::text[], ${times}::timestamp[]) AS step(id, status, at)`;
  if (inserted !== path.length) throw new OrderStatusError(CONCURRENT_UPDATE);
  const eventId = ids[ids.length - 1];
  // Khách tự bấm "Đã nhận hàng" thì không cần thư báo lại chính thao tác đó.
  if (actor !== 'customer') {
    await enqueueOrderEmail(tx, order.id, `status:${eventId}`, 'status', target, note, isShopActor(actor) ? UNDO_WINDOW_MS + 1000 : 0, eventId);
  }
  });
}

/**
 * Hủy đơn: cập nhật có điều kiện, ghi lịch sử (kèm lý do), hoàn kho và trả lượt dùng mã giảm giá trong một transaction.
 * Lý do "hết hàng" hay "hàng hư khi vận chuyển" không hoàn kho (xem restocksOnCancel).
 */
async function cancelOrder(order: OrderHead, actor: StatusActor | null, note: string | null) {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({ where: { id: order.id, orderStatus: order.orderStatus }, data: { orderStatus: 'CANCELLED' } });
    if (updated.count !== 1) throw new OrderStatusError(CONCURRENT_UPDATE);
    const current = await tx.order.findUniqueOrThrow({ where: { id: order.id },
      select: { couponCode: true, items: { select: { variantId: true, quantity: true } } } });
    const event = await tx.orderStatusEvent.create({ data: { orderId: order.id, status: 'CANCELLED', actor, note } });
    await enqueueOrderEmail(tx, order.id, `status:${event.id}`, 'status', 'CANCELLED', note, 0, event.id);
    // Cùng thứ tự khóa với lúc đặt hàng (theo mã size) để không khóa chéo với đơn đang tạo.
    if (restocksOnCancel(note)) {
      for (const item of [...current.items].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
    }
    if (current.couponCode) {
      await tx.coupon.update({ where: { code: current.couponCode }, data: { usedCount: { decrement: 1 } } });
    }
  });
}

/** Lộ trình hợp lệ để đưa đơn tới `next`, hoặc lỗi nghiệp vụ nếu không được phép. */
function planChange(order: OrderHead, next: OrderStatus, options: ChangeOptions): OrderStatus[] | 'cancel' {
  if (options.from && order.orderStatus !== options.from) throw new OrderStatusError(INVALID_TRANSITION);
  if (next === 'CANCELLED') {
    if (!canTransition(order.orderStatus, next)) throw new OrderStatusError(INVALID_TRANSITION);
    return 'cancel';
  }
  const path = options.jump ? forwardPath(order.orderStatus, next) : canTransition(order.orderStatus, next) ? [next] : null;
  if (!path) throw new OrderStatusError(INVALID_TRANSITION);
  return path;
}

async function applyChange(order: OrderHead, next: OrderStatus, options: ChangeOptions) {
  const plan = planChange(order, next, options);
  const note = options.note?.trim() || null;
  if (plan === 'cancel') await cancelOrder(order, options.actor ?? null, note);
  else await moveForward(order, plan, options.actor ?? null, note);
}

function afterChange(statuses: OrderStatus[]) {
  if (statuses.includes('CANCELLED')) revalidateTag('products');
  revalidateTag(DASHBOARD_TAG);
}

/**
 * Chuyển trạng thái một đơn theo đúng quy trình, dùng chung cho quản trị viên, khách và hệ thống.
 * Truyền `ownerId` để chỉ thao tác được trên đơn của chính khách đó, `from` để chỉ chấp nhận đúng một trạng thái hiện tại,
 * `jump` để quản trị viên chuyển thẳng nhiều bước.
 */
export async function changeOrderStatus(orderCode: string, next: OrderStatus, options: ChangeOptions = {}) {
  const order = await prisma.order.findUnique({ where: { orderCode }, select: headSelect });
  if (!order || (options.ownerId !== undefined && order.userId !== options.ownerId)) throw new OrderStatusError(ORDER_NOT_FOUND);
  await applyChange(order, next, options);
  scheduleEmailDispatch(isShopActor(options.actor ?? null) && next !== 'CANCELLED' ? UNDO_WINDOW_MS + 1000 : 0);
  if (options.revalidate !== false) afterChange([next]);
}

export type BulkResult = { code: string; ok: boolean; status?: OrderStatus; error?: string; conflict?: boolean };

/** Chạy `task` cho từng phần tử, tối đa `limit` việc cùng lúc (giữ vừa số kết nối database). */
async function eachLimited<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  }));
  return results;
}

function failure(code: string, error: unknown): BulkResult {
  if (error instanceof OrderStatusError) return { code, ok: false, error: error.message, conflict: error.message === CONCURRENT_UPDATE };
  console.error(`Bulk order update failed for ${code}:`, error);
  return { code, ok: false, error: 'Không cập nhật được đơn này' };
}

/**
 * Xử lý nhiều đơn trong một request của quản trị viên: đọc trạng thái mọi đơn bằng một truy vấn, rồi cập nhật từng đơn
 * độc lập (đơn đã bị người khác đổi chỉ bỏ qua đơn đó). Trả kết quả từng đơn để giao diện báo đúng đơn nào chưa được.
 */
export async function bulkChangeOrderStatus(codes: string[], next: OrderStatus, options: ChangeOptions = {}): Promise<BulkResult[]> {
  const orders = await prisma.order.findMany({ where: { orderCode: { in: codes } }, select: headSelect });
  const byCode = new Map(orders.map((order) => [order.orderCode, order]));
  const results = await eachLimited(codes, 3, async (code): Promise<BulkResult> => {
    const order = byCode.get(code);
    if (!order) return { code, ok: false, error: ORDER_NOT_FOUND };
    try {
      await applyChange(order, next, options);
      return { code, ok: true, status: next };
    } catch (error) {
      return failure(code, error);
    }
  });
  if (results.some((result) => result.ok)) afterChange([next]);
  if (results.some((result) => result.ok)) scheduleEmailDispatch(isShopActor(options.actor ?? null) && next !== 'CANCELLED' ? UNDO_WINDOW_MS + 1000 : 0);
  return results;
}

/**
 * Hoàn tác thao tác vừa bấm: đưa đơn từ `current` về `to` (mặc định là bước liền trước) khi đơn vẫn đang ở đúng
 * `current` và mọi bước cần gỡ đều do shop (quản trị viên hoặc nhân viên) ghi trong UNDO_WINDOW_MS. Xóa các dòng lịch sử đó để hành trình đơn
 * của khách không hiện bước đã hoàn tác. Hoàn tác Hoàn tất thì gỡ mốc hoàn tất (khóa lại quyền đánh giá) và trạng thái
 * đã thu tiền COD, chỉ khi khách chưa kịp đánh giá. Không hoàn tác Hủy.
 */
async function undoOne(orderCode: string, current: OrderStatus, to: OrderStatus | undefined) {
  const target = to ?? PREVIOUS_STATUS[current];
  const path = target ? forwardPath(target, current) : null;
  if (!target || !path || !UNDOABLE_STATUSES.includes(current)) throw new OrderStatusError(INVALID_TRANSITION);
  const order = await prisma.order.findUnique({ where: { orderCode }, select: {
    id: true, orderStatus: true, paymentMethod: true,
    statusEvents: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: path.length, select: { id: true, status: true, actor: true, createdAt: true } },
    items: { select: { review: { select: { id: true } } } },
  } });
  if (!order) throw new OrderStatusError(ORDER_NOT_FOUND);
  if (order.orderStatus !== current) throw new OrderStatusError(CONCURRENT_UPDATE);
  const expected = [...path].reverse();
  const now = Date.now();
  const removable = order.statusEvents.length === path.length && order.statusEvents.every((event, index) =>
    event.status === expected[index] && isShopActor(event.actor) && now - event.createdAt.getTime() <= UNDO_WINDOW_MS);
  if (!removable) throw new OrderStatusError(UNDO_EXPIRED);
  if (order.items.some((item) => item.review)) throw new OrderStatusError(UNDO_REVIEWED);
  const reopen = current === 'COMPLETED'
    ? Prisma.sql`, "completedAt" = NULL${order.paymentMethod === 'COD' ? Prisma.sql`, "paymentStatus" = 'PENDING'` : Prisma.empty}`
    : Prisma.empty;
  const eventIds = order.statusEvents.map((event) => event.id);
  // Đổi trạng thái và xóa lịch sử trong cùng một câu lệnh: không có trạng thái nửa vời nếu đơn vừa bị người khác đổi.
  await prisma.$transaction(async (tx) => {
  const deleted = await tx.$executeRaw`
    WITH reverted AS (
      UPDATE ${table('orders')} SET "orderStatus" = ${target}, "updatedAt" = ${new Date(now).toISOString()}::timestamp ${reopen}
      WHERE "id" = ${order.id} AND "orderStatus" = ${current}
      RETURNING "id"
    )
    DELETE FROM ${table('order_status_events')} WHERE "id" = ANY(${eventIds}::text[]) AND "orderId" IN (SELECT "id" FROM reverted)`;
  if (deleted !== path.length) throw new OrderStatusError(CONCURRENT_UPDATE);
  // Serialize classification/cancellation with the worker's job claim, so a pending job cannot
  // be claimed between checking whether it was communicated and cancelling it.
  const affected = await tx.$queryRaw<{ status: string }[]>`
    SELECT "status" FROM ${table('email_jobs')}
    WHERE "orderId" = ${order.id} AND "eventId" = ANY(${eventIds}::text[]) FOR UPDATE`;
  const communicated = affected.some((job) => job.status === 'sent' || job.status === 'processing');
  await tx.emailJob.updateMany({ where: { orderId: order.id, eventId: { in: eventIds }, status: { in: ['pending', 'processing'] } },
    data: { status: 'cancelled', leaseUntil: null, leaseOwner: null } });
  if (communicated) await enqueueOrderEmail(tx, order.id, `undo:${eventIds[0]}`, 'status', target, 'Shop đã điều chỉnh lại trạng thái đơn hàng.', affected.some((job) => job.status === 'processing') ? 21000 : 0);
  });
  scheduleEmailDispatch();
  return target;
}

/** Hoàn tác một đơn (API cũ của trang quản trị và script kiểm thử); trả về trạng thái sau khi hoàn tác. */
export async function undoOrderStatus(orderCode: string, current: OrderStatus, to?: OrderStatus): Promise<OrderStatus> {
  const target = await undoOne(orderCode, current, to);
  revalidateTag(DASHBOARD_TAG);
  return target;
}

/** Hoàn tác thao tác hàng loạt vừa làm: mỗi đơn về lại trạng thái trước thao tác. */
export async function bulkUndoOrderStatus(items: { code: string; current: OrderStatus; to: OrderStatus }[]): Promise<BulkResult[]> {
  const results = await eachLimited(items, 3, async ({ code, current, to }): Promise<BulkResult> => {
    try {
      return { code, ok: true, status: await undoOne(code, current, to) };
    } catch (error) {
      return failure(code, error);
    }
  });
  if (results.some((result) => result.ok)) revalidateTag(DASHBOARD_TAG);
  return results;
}

const DAY_MS = 86_400_000;
const SWEEP_INTERVAL_MS = 10 * 60_000;
let lastSweep = 0;

/**
 * Đơn đang giao quá AUTO_COMPLETE_DAYS ngày (tính từ lúc giao cho shipper) mà khách chưa bấm
 * "Đã nhận được hàng" thì hệ thống tự hoàn tất. Được gọi khi mở danh sách đơn, trang tổng quan, trang đơn của khách
 * và cron bảo trì hằng ngày; tự giới hạn tối đa một lần mỗi 10 phút trên mỗi máy chủ (`force` bỏ qua giới hạn này).
 */
export async function autoCompleteShippedOrders(now = new Date(), { force = false, limit = 100, deadline = Infinity } = {}): Promise<number> {
  if (!force && now.getTime() - lastSweep < SWEEP_INTERVAL_MS) return 0;
  lastSweep = now.getTime();
  const cutoff = new Date(now.getTime() - AUTO_COMPLETE_DAYS * DAY_MS);
  try {
    const due = await prisma.order.findMany({
      where: { orderStatus: 'SHIPPING', statusEvents: { some: { status: 'SHIPPING', createdAt: { lt: cutoff } } } },
      select: headSelect, take: Math.max(1, Math.min(limit, 100)),
    });
    let completed = 0;
    for (const order of due) {
      if (Date.now() >= deadline) break;
      try {
        await moveForward(order, ['COMPLETED'], 'system', `Tự động hoàn tất sau ${AUTO_COMPLETE_DAYS} ngày giao hàng`);
        completed += 1;
      } catch (error) {
        // Đơn vừa được người khác cập nhật thì bỏ qua; lần quét sau sẽ xét lại.
        if (!(error instanceof OrderStatusError)) throw error;
      }
    }
    if (completed) {
      scheduleEmailDispatch();
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

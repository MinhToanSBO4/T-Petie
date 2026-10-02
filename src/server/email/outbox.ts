import 'server-only';
import { randomUUID } from 'node:crypto';
import { Prisma, type EmailJob } from '@prisma/client';
import { waitUntil } from '@vercel/functions';
import { prisma } from '@/server/db/client';
import { table } from '@/server/db/sql';
import { sendEmail, mailErrorCode } from './transport';
import { retryEmailJob } from '@/lib/email/outbox-policy';
import type { EmailPayload } from '@/lib/email/templates';

export async function enqueueOrderEmail(tx: Prisma.TransactionClient, orderId: string, eventKey: string, kind: 'receipt' | 'status', status: string, note?: string | null, delay = 0, eventId?: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (!order.customerEmail) return;
  const payload: EmailPayload = {
    kind, orderCode: order.orderCode, name: order.customerName, status, note,
    date: order.createdAt.toISOString(), registered: Boolean(order.userId),
    address: [order.shippingAddress, order.ward, order.district, order.city].filter(Boolean).join(', '),
    items: order.items.map((i) => ({ name: i.productName, size: i.size, quantity: i.quantity, unitPrice: Number(i.unitPrice), totalPrice: Number(i.totalPrice) })),
    subtotal: Number(order.subtotal), shippingFee: Number(order.shippingFee), discount: Number(order.discountAmount), total: Number(order.totalAmount),
  };
  await tx.emailJob.create({ data: { eventKey, orderId, eventId, recipient: order.customerEmail, kind,
    payload: payload as unknown as Prisma.InputJsonValue, nextAttemptAt: new Date(Date.now() + delay) } });
}

/** Nội dung thư (tên, địa chỉ, món hàng) chỉ cần tới khi gửi xong; sau đó xóa để không giữ dữ liệu cá nhân thừa. */
const REDACTED = {} as Prisma.InputJsonValue;
const STALE_DAYS = 3;
const RETENTION_DAYS = 30;

/** Thời gian tối đa một lần gửi chiếm (giới hạn cứng SMTP trong transport.ts + ghi kết quả). */
const SEND_BUDGET_MS = 17_000;
/** Mọi route gửi thư có maxDuration = 60s; dừng nhận việc mới sớm để không bị Vercel cắt giữa chừng (gây gửi trùng). */
const FUNCTION_BUDGET_MS = 50_000;

/**
 * Gửi các thư đã đến hạn cho tới khi hết thư hoặc hết thời gian (`deadline`), tối đa `limit` thư.
 * Claim one job just before sending; SKIP LOCKED and owner checks isolate concurrent workers.
 */
export async function dispatchEmailJobs(limit = 25, deliver = sendEmail, deadline = Date.now() + 45000) {
  if (process.env.NEXT_PHASE === 'phase-production-build') return 0;
  let sent = 0;
  let claimed = 0;
  let failed = false;
  for (let index = 0; index < Math.min(limit, 50); index++) {
    if (Date.now() + SEND_BUDGET_MS >= deadline) break;
    // Lần gửi vừa lỗi tạm thời (mất mạng, Gmail chậm): chờ tới lượt thử lại ngay trong lần chạy này nếu còn thời gian,
    // thay vì phải đợi lượt quét sau. Chỉ hỏi thêm database khi có lỗi, hàng đợi bình thường không tốn thêm truy vấn.
    if (failed && !(await waitForRetry(deadline))) break;
    failed = false;
    const owner = randomUUID();
    const jobs = await prisma.$queryRaw<EmailJob[]>`
      UPDATE ${table('email_jobs')} SET "status" = 'processing', "leaseOwner" = ${owner},
        "leaseUntil" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + interval '60 seconds', "attempts" = "attempts" + 1
      WHERE "id" IN (
        SELECT "id" FROM ${table('email_jobs')}
        WHERE "attempts" < 5 AND (("status" = 'pending' AND "nextAttemptAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
          OR ("status" = 'processing' AND "leaseUntil" < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')))
        ORDER BY "nextAttemptAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1
      ) RETURNING *`;
    const job = jobs[0];
    if (!job) break;
    claimed += 1;
    try {
      await deliver(job.recipient, job.payload as unknown as EmailPayload, `<${job.id}@tpetie.transactional>`);
      const updated = await prisma.emailJob.updateMany({ where: { id: job.id, leaseOwner: owner, status: 'processing' },
        data: { status: 'sent', sentAt: new Date(), leaseOwner: null, leaseUntil: null, errorCode: null, payload: REDACTED } });
      sent += updated.count;
    } catch (error) {
      const retry = retryEmailJob(job.attempts);
      await prisma.emailJob.updateMany({ where: { id: job.id, leaseOwner: owner, status: 'processing' },
        data: { ...retry, leaseOwner: null, leaseUntil: null, errorCode: mailErrorCode(error), ...(retry.status === 'failed' ? { payload: REDACTED } : {}) } });
      failed = retry.status === 'pending';
    }
  }
  if (claimed) await failAbandonedLeases();
  return sent;
}

/** A process that disappeared during attempt five cannot leave an immortal lease. */
async function failAbandonedLeases() {
  await prisma.emailJob.updateMany({ where: { status: 'processing', attempts: { gte: 5 }, leaseUntil: { lt: new Date() } },
    data: { status: 'failed', leaseOwner: null, leaseUntil: null, errorCode: 'LEASE_EXPIRED', payload: REDACTED } });
}

/** Chờ tới lượt thử lại sớm nhất nếu nó rơi vào trong thời gian còn lại; false nếu không còn gì để chờ. */
async function waitForRetry(deadline: number) {
  const next = await prisma.emailJob.findFirst({ where: { status: 'pending', attempts: { lt: 5 } },
    orderBy: { nextAttemptAt: 'asc' }, select: { nextAttemptAt: true } });
  if (!next) return false;
  // Cộng 1 giây bù lệch đồng hồ giữa máy chủ ứng dụng (ghi nextAttemptAt) và database (so khi nhận việc).
  const wait = next.nextAttemptAt.getTime() - Date.now() + 1000;
  if (wait > 0 && Date.now() + wait + SEND_BUDGET_MS >= deadline) return false;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  return true;
}

let lastKick = 0;
/** Mỗi máy chủ chỉ quét hàng đợi tối đa một lần mỗi KICK_INTERVAL_MS, dù có bao nhiêu lượt truy cập. */
const KICK_INTERVAL_MS = 2 * 60_000;

/**
 * Tận dụng lượt khách xem sản phẩm, giỏ hàng để gửi thư còn tồn (thư lỗi đến hạn thử lại) mà không cần bộ hẹn giờ
 * chạy liên tục. Không làm chậm request: chạy sau phản hồi; hàng đợi trống chỉ tốn một truy vấn có chỉ mục.
 */
export function kickEmailOutbox() {
  const now = Date.now();
  if (now - lastKick < KICK_INTERVAL_MS) return;
  lastKick = now;
  scheduleEmailDispatch();
}

/**
 * Gửi thư trong nền sau khi phản hồi đã trả về. `delay`: chờ hết thời gian hoàn tác trạng thái đơn rồi mới gửi
 * (cộng 2 giây bù lệch đồng hồ giữa máy chủ ứng dụng và database). Hạn chót tính từ lúc gọi, nằm trong maxDuration.
 */
export function scheduleEmailDispatch(delay = 0) {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const deadline = Date.now() + FUNCTION_BUDGET_MS;
  const work = (async () => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay + 2000));
    await dispatchEmailJobs(25, sendEmail, deadline);
  })().catch((error) => { console.warn('Email outbox dispatch unavailable:', error instanceof Error ? error.message.split('\n')[0] : error); });
  waitUntil(work);
}

/**
 * Dọn hàng đợi (cron hằng ngày). Thư còn chờ quá STALE_DAYS ngày đã lỗi thời (báo trạng thái cũ) nên đánh dấu hết hạn
 * thay vì gửi muộn; lịch sử gửi chỉ giữ RETENTION_DAYS ngày để tra lỗi rồi xóa hẳn.
 */
export async function purgeEmailJobs(now = new Date()) {
  await failAbandonedLeases();
  const expired = await prisma.emailJob.updateMany({
    where: { status: { in: ['pending', 'processing'] }, createdAt: { lt: new Date(now.getTime() - STALE_DAYS * 86_400_000) } },
    data: { status: 'failed', errorCode: 'EXPIRED', leaseOwner: null, leaseUntil: null, payload: REDACTED },
  });
  const removed = await prisma.emailJob.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - RETENTION_DAYS * 86_400_000) },
    status: { in: ['sent', 'failed', 'cancelled'] } } });
  return { count: removed.count, expired: expired.count };
}

/** Tài khoản bị xóa: hủy thư chưa gửi, xóa địa chỉ email và nội dung thư của mọi đơn thuộc tài khoản (cùng transaction). */
export async function forgetUserEmailJobs(tx: Prisma.TransactionClient, userId: string) {
  const orders = await tx.order.findMany({ where: { userId }, select: { id: true } });
  if (!orders.length) return;
  const orderId = { in: orders.map((order) => order.id) };
  await tx.emailJob.updateMany({ where: { orderId, status: { in: ['pending', 'processing'] } },
    data: { status: 'cancelled', leaseOwner: null, leaseUntil: null } });
  await tx.emailJob.updateMany({ where: { orderId }, data: { recipient: 'redacted', payload: REDACTED } });
}

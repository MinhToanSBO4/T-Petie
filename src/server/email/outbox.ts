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

/** Claim one job just before sending; SKIP LOCKED and owner checks isolate concurrent workers. */
export async function dispatchEmailJobs(limit = 2, deliver = sendEmail, deadline = Date.now() + 45000) {
  if (process.env.NEXT_PHASE === 'phase-production-build') return 0;
  let sent = 0;
  for (let index = 0; index < Math.min(limit, 10); index++) {
    if (Date.now() + 22000 >= deadline) break;
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
    try {
      await deliver(job.recipient, job.payload as unknown as EmailPayload, `<${job.id}@tpetie.transactional>`);
      const updated = await prisma.emailJob.updateMany({ where: { id: job.id, leaseOwner: owner, status: 'processing' },
        data: { status: 'sent', sentAt: new Date(), leaseOwner: null, leaseUntil: null, errorCode: null } });
      sent += updated.count;
    } catch (error) {
      await prisma.emailJob.updateMany({ where: { id: job.id, leaseOwner: owner, status: 'processing' },
        data: { ...retryEmailJob(job.attempts), leaseOwner: null, leaseUntil: null, errorCode: mailErrorCode(error) } });
    }
  }
  // A process that disappeared during attempt five cannot leave an immortal lease.
  await prisma.emailJob.updateMany({ where: { status: 'processing', attempts: { gte: 5 }, leaseUntil: { lt: new Date() } },
    data: { status: 'failed', leaseOwner: null, leaseUntil: null, errorCode: 'LEASE_EXPIRED' } });
  return sent;
}

export function scheduleEmailDispatch(delay = 0) {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const work = (async () => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    await dispatchEmailJobs(delay ? 1 : 2);
  })().catch(() => { console.warn('Email outbox dispatch unavailable'); });
  waitUntil(work);
}

export async function purgeEmailJobs(now = new Date()) {
  return prisma.emailJob.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 30 * 86_400_000) }, status: { in: ['sent', 'failed', 'cancelled'] } } });
}

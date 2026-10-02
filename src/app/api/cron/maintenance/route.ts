import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { autoCompleteShippedOrders } from '@/server/orders/order-status';
import { failStaleExportJobs, purgeExpiredExports } from '@/server/orders/export-orders';
import { dispatchEmailJobs, purgeEmailJobs } from '@/server/email/outbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') || '';
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * Việc bảo trì định kỳ, do Vercel Cron gọi mỗi ngày (xem vercel.json; gói Hobby chỉ cho chạy 1 lần/ngày).
 * Vercel gửi `Authorization: Bearer <CRON_SECRET>`; thiếu hoặc sai khóa thì từ chối. Các việc đều chạy lại an toàn
 * (idempotent) nên lần gọi trùng hoặc bị lỡ không gây sai dữ liệu. Ứng dụng vẫn tự làm các việc này khi có người mở
 * trang quản trị; cron chỉ bảo đảm chúng chạy cả khi không ai vào.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const now = new Date();
  // Stop taking new work early enough for one bounded SMTP attempt and cleanup.
  const deadline = Date.now() + 50000;
  const completedOrders = await autoCompleteShippedOrders(now, { force: true, limit: 5, deadline: Date.now() + 10000 });
  const failedExports = await failStaleExportJobs(now);
  const purgedExports = await purgeExpiredExports(now);
  const sentEmails = await dispatchEmailJobs(1, undefined, deadline);
  const { count: purgedEmails } = await purgeEmailJobs(now);
  const { count: expiredTokens } = await prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } });
  const { count: expiredRateLimits } = await prisma.rateLimitCounter.deleteMany({ where: { expiresAt: { lt: now } } });
  return NextResponse.json({ completedOrders, failedExports, purgedExports, sentEmails, purgedEmails, expiredTokens, expiredRateLimits, at: now.toISOString() },
    { headers: { 'Cache-Control': 'no-store' } });
}

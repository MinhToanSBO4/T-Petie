import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/server/security/cron-auth';
import { dispatchEmailJobs } from '@/server/email/outbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Gửi thư đang chờ và thử lại thư lỗi. Gói Vercel Hobby chỉ cho cron chạy mỗi ngày, nên endpoint này được
 * GitHub Actions gọi mỗi 5 phút (.github/workflows/email-outbox.yml). Hàng đợi trống thì chỉ tốn một truy vấn.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sent = await dispatchEmailJobs(50, undefined, Date.now() + 50_000);
  return NextResponse.json({ sent, at: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
}

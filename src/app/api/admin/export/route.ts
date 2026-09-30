import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';
import { isSameOrigin } from '@/server/security/origin';
import { EXPORT_JOB_FIELDS, runOrderExportJob } from '@/server/orders/export-orders';

export const dynamic = 'force-dynamic';

/** Tiến trình chạy quá lâu coi như bị gián đoạn (ví dụ máy chủ dừng giữa chừng) để còn chạy lại. */
const STALE_JOB_MS = 2 * 60 * 1000;

/** Danh sách các lần xuất dữ liệu gần đây để giao diện theo dõi tiến trình. */
export async function GET() {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  await prisma.exportJob.updateMany({
    where: { status: { in: ['pending', 'processing'] }, createdAt: { lt: new Date(Date.now() - STALE_JOB_MS) } },
    data: { status: 'failed', error: 'Tiến trình bị gián đoạn, vui lòng chạy lại.', completedAt: new Date() },
  });
  const jobs = await prisma.exportJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20, select: EXPORT_JOB_FIELDS });
  return NextResponse.json({ jobs }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Kích hoạt xuất đơn hàng: trả về ngay mã tiến trình, file được dựng ở nền
 * nên người dùng không phải chờ và sẽ nhận thông báo khi hoàn tất.
 */
export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const running = await prisma.exportJob.count({ where: { status: { in: ['pending', 'processing'] } } });
  if (running > 0) {
    return NextResponse.json({ error: 'Đang có tiến trình xuất dữ liệu chạy. Vui lòng chờ trong giây lát.' }, { status: 409 });
  }
  const job = await prisma.exportJob.create({ data: { requestedById: session.user.id, status: 'pending' },
    select: EXPORT_JOB_FIELDS });
  // Chạy nền, không chặn phản hồi; trạng thái được theo dõi qua bảng export_jobs.
  void runOrderExportJob(job.id);
  return NextResponse.json({ job }, { status: 202 });
}

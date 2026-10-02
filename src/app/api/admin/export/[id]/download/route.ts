import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

const EXPORT_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Tải file đã xuất. File được chuyển tiếp qua máy chủ để mỗi lần tải đều kiểm tra quyền
 * thay vì để lộ trực tiếp đường dẫn lưu trữ.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const job = await prisma.exportJob.findUnique({ where: { id: params.id } });
  if (!job || job.status !== 'completed' || !job.fileUrl) {
    return NextResponse.json({ error: 'File chưa sẵn sàng' }, { status: 404 });
  }
  const upstream = await fetch(job.fileUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Không tải được file đã xuất' }, { status: 502 });
  }
  return new Response(upstream.body, { headers: {
    'Content-Type': EXPORT_MIME,
    'Content-Disposition': `attachment; filename="${job.fileName || 'tpetie-orders.xlsx'}"`,
    'Cache-Control': 'no-store',
  } });
}

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

/** Trạng thái một tiến trình xuất dữ liệu, dùng cho giao diện theo dõi. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const job = await prisma.exportJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Không tìm thấy tiến trình' }, { status: 404 });
  return NextResponse.json({ job }, { headers: { 'Cache-Control': 'no-store' } });
}

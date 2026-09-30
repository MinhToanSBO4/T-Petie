import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/options';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

/** Trạng thái một tiến trình xuất dữ liệu, dùng cho giao diện theo dõi. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin' || session.user.status !== 'active') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  const job = await prisma.exportJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Không tìm thấy tiến trình' }, { status: 404 });
  return NextResponse.json({ job }, { headers: { 'Cache-Control': 'no-store' } });
}

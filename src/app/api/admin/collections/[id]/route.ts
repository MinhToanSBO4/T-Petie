import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active' || !['admin', 'staff'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  const result = await prisma.collection.deleteMany({ where: { id: params.id } });
  if (!result.count) return NextResponse.json({ error: 'Không tìm thấy bộ sưu tập' }, { status: 404 });
  revalidateTag('collections');
  revalidateTag('products');
  return NextResponse.json({ success: true });
}

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/server/auth/options';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';

export async function DELETE(request: Request, { params }: { params: { id: string; imageId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active' || !['admin', 'staff'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const deleted = await prisma.productImage.deleteMany({ where: { id: params.imageId, productId: params.id } });
  if (!deleted.count) return NextResponse.json({ error: 'Không tìm thấy ảnh' }, { status: 404 });
  revalidateTag('products');
  return NextResponse.json({ success: true });
}

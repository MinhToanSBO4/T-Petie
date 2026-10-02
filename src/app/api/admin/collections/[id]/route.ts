import { NextResponse } from 'next/server';
import { parseCollectionInput } from '@/lib/content/collection-input';
import { getStaffSession } from '@/server/auth/staff-session';
import { invalidateCollections } from '@/server/content/invalidate';
import { prisma } from '@/server/db/client';

type Context = { params: { id: string } };

function validOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function PATCH(request: Request, { params }: Context) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!validOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 12000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
    const data = parseCollectionInput(JSON.parse(raw));
    const current = await prisma.collection.findUnique({ where: { id: params.id }, select: { slug: true } });
    if (!current) return NextResponse.json({ error: 'Không tìm thấy bộ sưu tập' }, { status: 404 });
    if (data.slug !== current.slug) return NextResponse.json({ error: 'Không thể đổi slug của bộ sưu tập đã tạo' }, { status: 400 });
    await prisma.collection.update({ where: { id: params.id }, data });
    invalidateCollections(current.slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    if (error instanceof Error && /không hợp lệ/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Collection update failed:', error);
    return NextResponse.json({ error: 'Không lưu được bộ sưu tập' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!validOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const current = await prisma.collection.findUnique({ where: { id: params.id },
    select: { slug: true, _count: { select: { products: true } } } });
  if (!current) return NextResponse.json({ error: 'Không tìm thấy bộ sưu tập' }, { status: 404 });
  if (current._count.products > 0) {
    await prisma.collection.update({ where: { id: params.id }, data: { isActive: false } });
  } else {
    await prisma.collection.delete({ where: { id: params.id } });
  }
  invalidateCollections(current.slug);
  return NextResponse.json({ success: true, archived: current._count.products > 0 });
}

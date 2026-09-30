import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getStaffSession } from '@/server/auth/staff-session';
import { deleteCloudinaryImage } from '@/server/media/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cập nhật mô tả ảnh (alt text). */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  }
  const raw = await request.text();
  if (raw.length > 2000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  let altText: unknown;
  try { altText = (JSON.parse(raw) as { altText?: unknown }).altText; }
  catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (typeof altText !== 'string' || altText.length > 300) {
    return NextResponse.json({ error: 'Mô tả ảnh không hợp lệ' }, { status: 400 });
  }
  const asset = await prisma.mediaAsset.update({ where: { id: params.id }, data: { altText: altText.trim() || null } })
    .catch(() => null);
  if (!asset) return NextResponse.json({ error: 'Không tìm thấy ảnh' }, { status: 404 });
  return NextResponse.json({ asset });
}

/** Xóa ảnh khỏi thư viện và Cloudinary. */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  }
  const asset = await prisma.mediaAsset.findUnique({ where: { id: params.id } });
  if (!asset) return NextResponse.json({ error: 'Không tìm thấy ảnh' }, { status: 404 });
  if (asset.publicId && !(await deleteCloudinaryImage(asset.publicId))) {
    return NextResponse.json({ error: 'Không xóa được ảnh trên Cloudinary' }, { status: 502 });
  }
  await prisma.mediaAsset.delete({ where: { id: asset.id } });
  return NextResponse.json({ ok: true });
}

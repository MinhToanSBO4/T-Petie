import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getStaffSession } from '@/server/auth/staff-session';
import { MEDIA_MAX_BYTES, isValidImageFile, uploadImageToCloudinary } from '@/server/media/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Danh sách ảnh trong thư viện, mới nhất trước. */
export async function GET(request: Request) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const search = new URL(request.url).searchParams.get('q')?.trim().slice(0, 100) || '';
  const assets = await prisma.mediaAsset.findMany({
    where: search ? { OR: [{ altText: { contains: search, mode: 'insensitive' } }, { publicId: { contains: search, mode: 'insensitive' } }] } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ assets }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Tải ảnh mới lên Cloudinary và lưu metadata vào database. */
export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') || 0) > MEDIA_MAX_BYTES + 500_000) {
    return NextResponse.json({ error: 'Ảnh vượt quá 5 MB' }, { status: 413 });
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'Không đọc được ảnh' }, { status: 400 }); }
  const file = form.get('file');
  const altText = typeof form.get('altText') === 'string' ? String(form.get('altText')).trim().slice(0, 300) : '';
  if (!isValidImageFile(file)) {
    return NextResponse.json({ error: 'Chỉ nhận JPEG, PNG, WebP, AVIF tối đa 5 MB' }, { status: 400 });
  }
  const uploaded = await uploadImageToCloudinary(file, 'tpetie/site');
  if (!uploaded) return NextResponse.json({ error: 'Không tải được ảnh lên Cloudinary' }, { status: 502 });
  const asset = await prisma.mediaAsset.upsert({
    where: { url: uploaded.url },
    update: { altText: altText || undefined },
    create: { ...uploaded, altText: altText || null, uploadedById: session.user.id || null, folder: 'tpetie/site' },
  });
  return NextResponse.json({ asset }, { status: 201 });
}

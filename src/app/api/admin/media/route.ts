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

/**
 * Tải ảnh mới lên Cloudinary và lưu metadata vào database.
 * Nhận một hoặc nhiều tệp trong cùng yêu cầu (trường `file` lặp lại); thứ tự tệp
 * gửi lên được giữ nguyên trong danh sách trả về để bên gọi lưu đúng thứ tự.
 */
export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  }
  const maxTotal = MEDIA_MAX_BYTES * 12;
  if (Number(request.headers.get('content-length') || 0) > maxTotal + 500_000) {
    return NextResponse.json({ error: 'Tổng dung lượng ảnh vượt quá giới hạn' }, { status: 413 });
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'Không đọc được ảnh' }, { status: 400 }); }
  const files = form.getAll('file');
  const altText = typeof form.get('altText') === 'string' ? String(form.get('altText')).trim().slice(0, 300) : '';
  if (files.length === 0) return NextResponse.json({ error: 'Chưa chọn ảnh' }, { status: 400 });
  if (files.length > 12) return NextResponse.json({ error: 'Mỗi lần tải lên tối đa 12 ảnh' }, { status: 400 });
  const invalid = files.find((file) => !isValidImageFile(file));
  if (invalid) return NextResponse.json({ error: 'Chỉ nhận JPEG, PNG, WebP, AVIF tối đa 5 MB mỗi ảnh' }, { status: 400 });

  const assets = [];
  for (const file of files) {
    const uploaded = await uploadImageToCloudinary(file as File, 'tpetie/site');
    if (!uploaded) return NextResponse.json({ error: 'Không tải được ảnh lên Cloudinary' }, { status: 502 });
    assets.push(await prisma.mediaAsset.upsert({
      where: { url: uploaded.url },
      update: { altText: altText || undefined },
      create: { ...uploaded, altText: altText || null, uploadedById: session.user.id || null, folder: 'tpetie/site' },
    }));
  }
  // Giữ trường `asset` cho lời gọi một ảnh để tương thích với các màn hình cũ.
  return NextResponse.json({ assets, asset: assets[0] }, { status: 201 });
}

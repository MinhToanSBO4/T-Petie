import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getStaffSession } from '@/server/auth/staff-session';
import { MEDIA_MAX_BYTES, isValidImageFile, uploadImageToCloudinary } from '@/server/media/cloudinary';
import { detectImageType } from '@/lib/media/image-signature';
import { isSameOrigin } from '@/server/security/origin';

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
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  // Vercel từ chối request trên 4,5 MB trước khi tới đây; giao diện nén và gửi từng ảnh một.
  if (Number(request.headers.get('content-length') || 0) > 4_400_000) {
    return NextResponse.json({ error: 'Ảnh quá lớn (tối đa 4 MB mỗi lần gửi)' }, { status: 413 });
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'Không đọc được ảnh' }, { status: 400 }); }
  const files = form.getAll('file');
  const altText = typeof form.get('altText') === 'string' ? String(form.get('altText')).trim().slice(0, 300) : '';
  if (files.length === 0) return NextResponse.json({ error: 'Chưa chọn ảnh' }, { status: 400 });
  if (files.length > 12) return NextResponse.json({ error: 'Mỗi lần tải lên tối đa 12 ảnh' }, { status: 400 });
  const invalid = files.find((file) => !isValidImageFile(file));
  if (invalid) return NextResponse.json({ error: `Chỉ nhận JPEG, PNG, WebP, AVIF tối đa ${MEDIA_MAX_BYTES / 1_000_000} MB mỗi ảnh` }, { status: 400 });
  // Kiểm tra nội dung thật của tệp, không chỉ loại MIME do trình duyệt khai báo (tệp SVG/HTML đổi tên không lọt qua).
  for (const file of files as File[]) {
    if (!detectImageType(new Uint8Array(await file.slice(0, 16).arrayBuffer()), true)) {
      return NextResponse.json({ error: `${file.name} không phải ảnh JPEG, PNG, WebP hoặc AVIF` }, { status: 400 });
    }
  }

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

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getStaffSession } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';
import { MEDIA_MAX_BYTES, cloudinaryConfig, isValidImageFile, uploadImageToCloudinary } from '@/server/media/cloudinary';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  }
  if (!cloudinaryConfig()) return NextResponse.json({ error: 'Chưa cấu hình Cloudinary' }, { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > MEDIA_MAX_BYTES + 500_000) {
    return NextResponse.json({ error: 'Ảnh vượt quá 5 MB' }, { status: 413 });
  }
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
  let file: FormDataEntryValue | null;
  try { file = (await request.formData()).get('file'); }
  catch { return NextResponse.json({ error: 'Không đọc được ảnh' }, { status: 400 }); }
  if (!isValidImageFile(file)) {
    return NextResponse.json({ error: 'Chỉ nhận JPEG, PNG, WebP, AVIF tối đa 5 MB' }, { status: 400 });
  }
  const uploaded = await uploadImageToCloudinary(file, 'tpetie/products');
  if (!uploaded) return NextResponse.json({ error: 'Không tải được ảnh lên Cloudinary' }, { status: 502 });
  // Ảnh sản phẩm cũng được ghi vào thư viện media để quản lý tập trung.
  await prisma.mediaAsset.upsert({ where: { url: uploaded.url }, update: {},
    create: { ...uploaded, folder: 'tpetie/products', uploadedById: session.user.id || null, altText: product.name } });
  const image = await prisma.productImage.create({
    data: { productId: params.id, url: uploaded.url, altText: product.name },
  });
  revalidateTag('products');
  return NextResponse.json({ id: image.id, url: image.url }, { status: 201 });
}

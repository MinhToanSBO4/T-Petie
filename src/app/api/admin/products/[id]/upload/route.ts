import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/server/auth/options';
import { prisma } from '@/server/db/client';

export const runtime = 'nodejs';
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active' || !['admin', 'staff'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret || !/^[a-zA-Z0-9_-]+$/.test(cloud)) {
    return NextResponse.json({ error: 'Chưa cấu hình Cloudinary' }, { status: 503 });
  }
  if (Number(request.headers.get('content-length') || 0) > 5_500_000) {
    return NextResponse.json({ error: 'Ảnh vượt quá 5 MB' }, { status: 413 });
  }
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
  let file: FormDataEntryValue | null;
  try { file = (await request.formData()).get('file'); }
  catch { return NextResponse.json({ error: 'Không đọc được ảnh' }, { status: 400 }); }
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size < 1 || file.size > 5_000_000) {
    return NextResponse.json({ error: 'Chỉ nhận JPEG, PNG, WebP, AVIF tối đa 5 MB' }, { status: 400 });
  }
  const upload = new FormData();
  upload.set('file', file);
  upload.set('folder', 'tpetie/products');
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
      body: upload,
    });
    if (!response.ok) throw new Error('Cloudinary upload failed');
    const result = await response.json() as { secure_url?: string };
    if (!result.secure_url?.startsWith(`https://res.cloudinary.com/${cloud}/`)) throw new Error('Unexpected CDN URL');
    const image = await prisma.productImage.create({ data: { productId: params.id, url: result.secure_url, altText: product.name } });
    revalidateTag('products');
    return NextResponse.json({ id: image.id, url: image.url }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Không tải được ảnh lên CDN' }, { status: 502 });
  }
}

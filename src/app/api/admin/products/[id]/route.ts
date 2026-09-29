import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active' || !['admin', 'staff'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  const keys = Object.keys(body);
  if (keys.length === 2 && keys.includes('variantId') && keys.includes('stock') &&
    typeof body.variantId === 'string' && Number.isInteger(body.stock) && Number(body.stock) >= 0 && Number(body.stock) <= 100000) {
    const updated = await prisma.productVariant.updateMany({
      where: { id: body.variantId, productId: params.id }, data: { stock: Number(body.stock) },
    });
    if (!updated.count) return NextResponse.json({ error: 'Không tìm thấy biến thể' }, { status: 404 });
    revalidateTag('products');
    return NextResponse.json({ success: true });
  }
  if (keys.length === 1 && keys[0] === 'imageUrl' && typeof body.imageUrl === 'string') {
    let url: URL;
    try { url = new URL(body.imageUrl); } catch { return NextResponse.json({ error: 'URL ảnh không hợp lệ' }, { status: 400 }); }
    if (url.protocol !== 'https:' || !['res.cloudinary.com', 'i.ibb.co'].includes(url.hostname)) {
      return NextResponse.json({ error: 'Chỉ nhận ảnh HTTPS từ CDN Cloudinary hoặc imgbb' }, { status: 400 });
    }
    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
    await prisma.productImage.create({ data: { productId: params.id, url: url.toString(), altText: product.name } });
    revalidateTag('products');
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Chỉ được cập nhật tồn kho hoặc thêm URL ảnh CDN' }, { status: 400 });
}

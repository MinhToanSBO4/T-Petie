import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/server/auth/options';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';
import { parseProductPatch, parseVariantInput, parseVariantPatch } from '@/lib/content/product-input';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active' || !['admin', 'staff'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  const keys = Object.keys(body);
  try {
    // Sửa tồn kho và/hoặc giá của một biến thể.
    if (keys.includes('variantId') && typeof body.variantId === 'string') {
      const patch = parseVariantPatch(body);
      const updated = await prisma.productVariant.updateMany({ where: { id: body.variantId, productId: params.id }, data: patch });
      if (!updated.count) return NextResponse.json({ error: 'Không tìm thấy biến thể' }, { status: 404 });
      revalidateTag('products');
      return NextResponse.json({ success: true });
    }
    // Thêm biến thể (size) mới cho sản phẩm.
    if (keys.length === 1 && keys[0] === 'newVariant') {
      const variant = parseVariantInput(body.newVariant);
      const product = await prisma.product.findUnique({ where: { id: params.id }, select: { sku: true } });
      if (!product) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
      const existing = await prisma.productVariant.count({ where: { productId: params.id, size: variant.size } });
      if (existing) return NextResponse.json({ error: 'Size này đã tồn tại cho sản phẩm' }, { status: 409 });
      const created = await prisma.productVariant.create({ data: { productId: params.id, sku: `${product.sku}-${variant.size}`,
        size: variant.size, price: variant.price, stock: variant.stock,
        weightRange: variant.weightRange, ageRange: variant.ageRange } });
      revalidateTag('products');
      return NextResponse.json({ id: created.id }, { status: 201 });
    }
    // Sửa thông tin sản phẩm.
    if (keys.length === 1 && keys[0] === 'product') {
      const patch = parseProductPatch(body.product);
      const updated = await prisma.product.update({ where: { id: params.id }, data: patch }).catch(() => null);
      if (!updated) return NextResponse.json({ error: 'Không tìm thấy sản phẩm hoặc bộ sưu tập không hợp lệ' }, { status: 404 });
      revalidateTag('products');
      revalidateTag('collections');
      return NextResponse.json({ success: true });
    }
    // Thêm ảnh từ thư viện media.
    if (keys.length === 1 && keys[0] === 'imageUrl' && typeof body.imageUrl === 'string') {
      let url: URL;
      try { url = new URL(body.imageUrl); } catch { return NextResponse.json({ error: 'URL ảnh không hợp lệ' }, { status: 400 }); }
      if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
        return NextResponse.json({ error: 'Chỉ nhận ảnh HTTPS từ Cloudinary' }, { status: 400 });
      }
      const product = await prisma.product.findUnique({ where: { id: params.id } });
      if (!product) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
      await prisma.productImage.create({ data: { productId: params.id, url: url.toString(), altText: product.name } });
      revalidateTag('products');
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Thao tác không được hỗ trợ' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && /không hợp lệ|Không có thay đổi/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Product update failed:', error);
    return NextResponse.json({ error: 'Không cập nhật được sản phẩm' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getStaffSession } from '@/server/auth/staff-session';
import { DASHBOARD_TAG } from '@/server/admin/dashboard';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';
import { table } from '@/server/db/sql';
import { parseProductPatch, parseVariantInput, parseVariantPatch } from '@/lib/content/product-input';

export const dynamic = 'force-dynamic';

const isCloudinaryUrl = (value: unknown) =>
  typeof value === 'string' && /^https:\/\/res\.cloudinary\.com\/[^"]*$/.test(value) && value.length <= 500;

/**
 * Lưu mọi thay đổi của một sản phẩm trong một yêu cầu duy nhất:
 * thông tin sản phẩm, giá/tồn của từng size, size mới và danh sách ảnh theo đúng thứ tự hiển thị.
 * Ảnh chỉ được thêm/xóa/sắp xếp khi yêu cầu này chạy, nên thao tác trên giao diện có thể hủy bỏ.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 200_000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }

  try {
    const productPatch = body.product === undefined ? null : parseProductPatch(body.product);
    const variantPatches = Array.isArray(body.variants)
      ? body.variants.map((item) => {
          const row = item as Record<string, unknown>;
          if (typeof row.id !== 'string') throw new Error('Thông tin biến thể không hợp lệ');
          return { id: row.id, ...parseVariantPatch(row) };
        })
      : [];
    const newVariants = Array.isArray(body.newVariants) ? body.newVariants.map(parseVariantInput) : [];
    let images: string[] | null = null;
    if (body.images !== undefined) {
      if (!Array.isArray(body.images) || body.images.length > 20 || !body.images.every(isCloudinaryUrl)) {
        throw new Error('Danh sách ảnh không hợp lệ');
      }
      images = body.images as string[];
    }
    if (!productPatch && variantPatches.length === 0 && newVariants.length === 0 && images === null) {
      throw new Error('Không có thay đổi hợp lệ');
    }

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: params.id }, select: { id: true, sku: true, name: true } });
      if (!product) throw new Error('Không tìm thấy sản phẩm');

      if (productPatch) await tx.product.update({ where: { id: product.id }, data: productPatch });

      for (const patch of variantPatches) {
        const { id, ...data } = patch;
        const updated = await tx.productVariant.updateMany({ where: { id, productId: product.id }, data });
        if (updated.count !== 1) throw new Error('Không tìm thấy biến thể');
      }

      for (const variant of newVariants) {
        const existing = await tx.productVariant.count({ where: { productId: product.id, size: variant.size } });
        if (existing > 0) throw new Error(`Size ${variant.size} đã tồn tại cho sản phẩm`);
        await tx.productVariant.create({ data: { productId: product.id, sku: `${product.sku}-${variant.size}`,
          size: variant.size, price: variant.price, stock: variant.stock,
          weightRange: variant.weightRange, ageRange: variant.ageRange } });
      }

      if (images !== null) {
        const current = await tx.productImage.findMany({ where: { productId: product.id } });
        // Xóa ảnh không còn trong danh sách mới.
        const removed = current.filter((image) => !images!.includes(image.url)).map((image) => image.id);
        if (removed.length > 0) await tx.productImage.deleteMany({ where: { id: { in: removed } } });
        // Cập nhật thứ tự ảnh cũ bằng một câu lệnh và thêm ảnh mới một lần, theo đúng thứ tự gửi lên
        // (trước đây mỗi ảnh một lượt gọi database trong transaction).
        const byUrl = new Map(current.map((image) => [image.url, image.id]));
        const kept = images.flatMap((url, index) => byUrl.has(url) ? [{ id: byUrl.get(url)!, index }] : []);
        if (kept.length > 0) {
          await tx.$executeRaw`
            UPDATE ${table('product_images')} AS image SET "sortOrder" = data.position, "isPrimary" = (data.position = 0)
            FROM unnest(${kept.map((item) => item.id)}::text[], ${kept.map((item) => item.index)}::int[]) AS data(id, position)
            WHERE image."id" = data.id`;
        }
        const added = images.flatMap((url, index) => byUrl.has(url) ? [] : [{ productId: product.id, url,
          altText: product.name, sortOrder: index, isPrimary: index === 0 }]);
        if (added.length > 0) await tx.productImage.createMany({ data: added });
      }
    });

    revalidateTag('products');
    revalidateTag('collections');
    // Tồn kho thay đổi thì danh sách "sắp hết hàng" ở trang tổng quan cũng phải cập nhật.
    revalidateTag(DASHBOARD_TAG);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && /không hợp lệ|Không có thay đổi|Không tìm thấy|đã tồn tại/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Product update failed:', error);
    return NextResponse.json({ error: 'Không cập nhật được sản phẩm' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { Prisma } from '@prisma/client';
import { getStaffSession } from '@/server/auth/staff-session';
import { DASHBOARD_TAG } from '@/server/admin/dashboard';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';
import { table } from '@/server/db/sql';
import { ADMIN_PRODUCT_INCLUDE, toAdminProductRow } from '@/server/catalog/admin-product';
import { parseProductPatch, parseVariantInput, parseVariantPatch } from '@/lib/content/product-input';

export const dynamic = 'force-dynamic';

const isCloudinaryUrl = (value: unknown) =>
  typeof value === 'string' && /^https:\/\/res\.cloudinary\.com\/[^"]*$/.test(value) && value.length <= 500;

/** Lỗi do dữ liệu người sửa gửi lên hoặc do dữ liệu đã đổi trong lúc sửa: trả nguyên thông báo cho giao diện. */
class EditError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

/**
 * Lưu mọi thay đổi của một sản phẩm trong một yêu cầu duy nhất:
 * thông tin sản phẩm, giá/tồn của từng size, size mới và danh sách ảnh theo đúng thứ tự hiển thị.
 * Ảnh chỉ được thêm/xóa/sắp xếp khi yêu cầu này chạy, nên thao tác trên giao diện có thể hủy bỏ.
 * Giao diện chỉ gửi trường đã đổi; tồn kho chỉ ghi khi tồn kho hiện tại vẫn bằng số lúc mở form.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 200_000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object') throw new Error();
  } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }

  let productPatch, variantPatches, newVariants, images: string[] | null = null;
  try {
    productPatch = body.product === undefined ? null : parseProductPatch(body.product);
    variantPatches = Array.isArray(body.variants)
      ? body.variants.map((item) => {
          const row = item as Record<string, unknown>;
          if (!row || typeof row.id !== 'string') throw new Error('Thông tin size không hợp lệ');
          return { id: row.id, ...parseVariantPatch(row) };
        })
      : [];
    newVariants = Array.isArray(body.newVariants) ? body.newVariants.map(parseVariantInput) : [];
    const sizeKeys = newVariants.map((variant) => variant.size.toLocaleLowerCase('vi-VN'));
    if (new Set(sizeKeys).size !== sizeKeys.length) throw new Error('Có hai size mới trùng tên');
    if (body.images !== undefined) {
      if (!Array.isArray(body.images) || !body.images.every(isCloudinaryUrl)) throw new Error('Danh sách ảnh không hợp lệ');
      if (body.images.length > 20) throw new Error('Mỗi sản phẩm tối đa 20 ảnh');
      images = body.images as string[];
    }
    if (!productPatch && variantPatches.length === 0 && newVariants.length === 0 && images === null) {
      throw new Error('Không có thay đổi hợp lệ');
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: params.id },
        select: { id: true, sku: true, name: true, variants: { select: { id: true, size: true, stock: true } } } });
      if (!product) throw new EditError('Không tìm thấy sản phẩm', 404);

      if (productPatch) await tx.product.update({ where: { id: product.id }, data: productPatch });

      for (const patch of variantPatches) {
        const { id, expectedStock, ...data } = patch;
        const current = product.variants.find((variant) => variant.id === id);
        if (!current) throw new EditError('Không tìm thấy size, tải lại trang rồi thử lại');
        const where: Prisma.ProductVariantWhereInput = { id, productId: product.id };
        // Ghi tồn kho có điều kiện: có đơn đặt/hủy trong lúc đang sửa thì dừng, không ghi đè số mới bằng số cũ.
        if (data.stock !== undefined) where.stock = expectedStock;
        const updated = await tx.productVariant.updateMany({ where, data });
        if (updated.count !== 1) {
          throw new EditError(`Tồn kho ${current.size} vừa thay đổi (hiện còn ${current.stock}) do có đơn hàng mới hoặc người khác sửa. `
            + 'Bấm "Về danh sách", mở lại sản phẩm rồi nhập lại tồn kho.', 409);
        }
      }

      const takenSizes = new Set(product.variants.map((variant) => variant.size.toLocaleLowerCase('vi-VN')));
      for (const variant of newVariants) {
        if (takenSizes.has(variant.size.toLocaleLowerCase('vi-VN'))) throw new EditError(`Size ${variant.size} đã có trong sản phẩm`);
        // Mã size = mã sản phẩm + tên size; trùng với size của sản phẩm khác thì thêm hậu tố để không lỗi khóa duy nhất.
        const base = `${product.sku}-${variant.size}`.slice(0, 90);
        let sku = base;
        for (let suffix = 2; await tx.productVariant.findUnique({ where: { sku }, select: { id: true } }); suffix += 1) {
          if (suffix > 50) throw new EditError(`Không tạo được mã cho size ${variant.size}`);
          sku = `${base}-${suffix}`;
        }
        await tx.productVariant.create({ data: { productId: product.id, sku,
          size: variant.size, price: variant.price, stock: variant.stock,
          weightRange: variant.weightRange, ageRange: variant.ageRange } });
      }

      // Giá hiển thị trên thẻ sản phẩm ("Từ …") luôn bằng giá size rẻ nhất đang bán, khớp số tiền tính khi đặt hàng.
      if (variantPatches.length > 0 || newVariants.length > 0) {
        const cheapest = await tx.productVariant.aggregate({ where: { productId: product.id, isActive: true }, _min: { price: true } });
        if (cheapest._min.price !== null) {
          await tx.product.update({ where: { id: product.id }, data: { basePrice: cheapest._min.price } });
        }
      }

      if (images !== null) {
        const nextImages = images;
        const current = await tx.productImage.findMany({ where: { productId: product.id } });
        // Xóa ảnh không còn trong danh sách mới.
        const removed = current.filter((image) => !nextImages.includes(image.url)).map((image) => image.id);
        if (removed.length > 0) await tx.productImage.deleteMany({ where: { id: { in: removed } } });
        // Cập nhật thứ tự ảnh cũ bằng một câu lệnh và thêm ảnh mới một lần, theo đúng thứ tự gửi lên
        // (trước đây mỗi ảnh một lượt gọi database trong transaction).
        const byUrl = new Map(current.map((image) => [image.url, image.id]));
        const kept = nextImages.flatMap((url, index) => byUrl.has(url) ? [{ id: byUrl.get(url)!, index }] : []);
        if (kept.length > 0) {
          await tx.$executeRaw`
            UPDATE ${table('product_images')} AS image SET "sortOrder" = data.position, "isPrimary" = (data.position = 0)
            FROM unnest(${kept.map((item) => item.id)}::text[], ${kept.map((item) => item.index)}::int[]) AS data(id, position)
            WHERE image."id" = data.id`;
        }
        const added = nextImages.flatMap((url, index) => byUrl.has(url) ? [] : [{ productId: product.id, url,
          altText: product.name, sortOrder: index, isPrimary: index === 0 }]);
        if (added.length > 0) await tx.productImage.createMany({ data: added });
      }
    });

    revalidateTag('products');
    revalidateTag('collections');
    // Tồn kho thay đổi thì danh sách "sắp hết hàng" ở trang tổng quan cũng phải cập nhật.
    if (variantPatches.length > 0 || newVariants.length > 0 || productPatch?.isActive !== undefined) revalidateTag(DASHBOARD_TAG);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof EditError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json({ error: 'Bộ sưu tập đã chọn không còn tồn tại' }, { status: 400 });
    }
    console.error('Product update failed:', error);
    return NextResponse.json({ error: 'Không cập nhật được sản phẩm, vui lòng thử lại' }, { status: 500 });
  }
}

/** Một sản phẩm với số liệu mới nhất, để form sửa không dựng từ dữ liệu cũ trong bảng đã cache. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const row = await prisma.product.findUnique({ where: { id: params.id }, include: ADMIN_PRODUCT_INCLUDE });
  if (!row) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
  return NextResponse.json({ product: toAdminProductRow(row) }, { headers: { 'Cache-Control': 'no-store' } });
}

import 'server-only';
import type { Prisma } from '@prisma/client';
import { compareSizeLabels } from '@/lib/catalog/filters';

/** Dữ liệu một sản phẩm cho bảng và form sửa ở khu quản trị (dùng chung cho danh sách và lần tải lại một sản phẩm). */
export const ADMIN_PRODUCT_INCLUDE = {
  images: { orderBy: { sortOrder: 'asc' } }, variants: true,
} satisfies Prisma.ProductInclude;

type AdminProductRecord = Prisma.ProductGetPayload<{ include: typeof ADMIN_PRODUCT_INCLUDE }>;

export function toAdminProductRow(row: AdminProductRecord) {
  return {
    id: row.id, slug: row.slug, sku: row.sku, name: row.name, active: row.isActive,
    price: Number(row.basePrice), description: row.description || '',
    originalPrice: row.originalPrice === null ? null : Number(row.originalPrice),
    discountPercent: row.discountPercent, collectionId: row.collectionId,
    subcategory: row.subcategory || '', subcategoryName: row.subcategoryName || '',
    material: row.material, colorName: row.colorName || '',
    isBestSeller: row.isBestSeller, isNewArrival: row.isNewArrival, isSale: row.isSale,
    images: row.images.map((image) => ({ id: image.id, url: image.url })),
    variants: [...row.variants].sort((a, b) => compareSizeLabels(a.size, b.size)).map((variant) => ({
      id: variant.id, size: variant.size, stock: variant.stock, price: Number(variant.price),
      weightRange: variant.weightRange || '', ageRange: variant.ageRange || '', active: variant.isActive })),
  };
}

export type AdminProductRow = ReturnType<typeof toAdminProductRow>;

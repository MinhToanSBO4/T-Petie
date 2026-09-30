import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/server/db/client';
import type { Product } from '@/types/product';
import type { Collection } from '@/types/collection';

const productInclude = { images: { orderBy: { sortOrder: 'asc' as const } }, variants: { orderBy: { size: 'asc' as const } }, collection: true };

function toProduct(row: Awaited<ReturnType<typeof prisma.product.findMany<{ include: typeof productInclude }>>>[number]): Product {
  const images = row.images.map((image) => image.url);
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    category: 'girls',
    categoryName: row.categoryName,
    subcategory: row.subcategory as Product['subcategory'],
    subcategoryName: row.subcategoryName || undefined,
    collectionId: row.collection?.slug,
    collectionName: row.collection?.title,
    material: row.material,
    materialFeatures: row.materialFeatures,
    sizes: row.variants.filter((variant) => variant.isActive).map((variant) => ({
      size: variant.size, weightRange: variant.weightRange || '', ageRange: variant.ageRange || '',
      price: Number(variant.price), stock: variant.stock,
    })),
    basePrice: Number(row.basePrice),
    originalPrice: row.originalPrice === null ? undefined : Number(row.originalPrice),
    discountPercent: row.discountPercent,
    saleCampaign: row.saleCampaign as Product['saleCampaign'],
    images,
    thumbnail: images[0] || '',
    colorName: row.colorName || undefined,
    colorHex: row.colorHex || undefined,
    isBestSeller: row.isBestSeller,
    isNewArrival: row.isNewArrival,
    isSale: row.isSale,
    description: row.description || '',
    promotion: row.promotion || undefined,
    orderNote: row.orderNote || undefined,
    specifications: row.specifications || undefined,
    careInstructions: row.careInstructions,
    origin: row.origin,
    rating: row.rating || 0,
    reviewCount: row.reviewCount,
  };
}

export const getProducts = unstable_cache(async () => {
  const rows = await prisma.product.findMany({ where: { isActive: true }, include: productInclude, orderBy: { createdAt: 'desc' } });
  return rows.map(toProduct);
}, ['active-products'], { revalidate: 60, tags: ['products'] });

/**
 * Một sản phẩm theo slug (chấp nhận cả id và sku để tương thích liên kết cũ).
 * Truy vấn trực tiếp một bản ghi và có cache, thay vì nạp toàn bộ catalog như trước.
 */
export const getProductBySlug = unstable_cache(async (slug: string): Promise<Product | null> => {
  const row = await prisma.product.findFirst({
    where: { isActive: true, OR: [{ slug }, { id: slug }, { sku: slug }] },
    include: productInclude,
  });
  return row ? toProduct(row) : null;
}, ['product-by-slug'], { revalidate: 60, tags: ['products'] });

/** Sản phẩm gợi ý: cùng bộ sưu tập trước, sau đó lấp đầy bằng sản phẩm mới nhất. */
export const getRelatedProducts = unstable_cache(async (productId: string, collectionSlug: string | null, limit: number): Promise<Product[]> => {
  const rows = await prisma.product.findMany({
    where: { isActive: true, id: { not: productId }, ...(collectionSlug ? { collection: { slug: collectionSlug } } : {}) },
    include: productInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  if (rows.length >= limit) return rows.map(toProduct);
  const fill = await prisma.product.findMany({
    where: { isActive: true, id: { notIn: [productId, ...rows.map((row) => row.id)] } },
    include: productInclude,
    orderBy: { createdAt: 'desc' },
    take: limit - rows.length,
  });
  return [...rows, ...fill].map(toProduct);
}, ['related-products'], { revalidate: 60, tags: ['products'] });

export const getCollections = unstable_cache(async (): Promise<Collection[]> => {
  const rows = await prisma.collection.findMany({ where: { isActive: true }, include: { products: { select: { id: true } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return rows.map((row) => ({
    id: row.slug, title: row.title, subtitle: row.subtitle || '', story: row.story || '',
    bannerImage: row.bannerUrl, lookbookImages: row.lookbookUrls,
    themeColor: row.themeColor || '#FFF8EE', accentColor: row.accentColor || '#D97706',
    season: row.season || '', badge: row.badge || '', featuredProductIds: row.products.map((product) => product.id),
    showInMenu: row.showInMenu, showOnHome: row.showOnHome,
  }));
}, ['active-collections'], { revalidate: 60, tags: ['collections'] });

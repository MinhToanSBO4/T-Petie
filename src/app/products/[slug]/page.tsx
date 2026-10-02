import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProducts, getProductBySlug, getRelatedProducts } from '@/server/catalog/queries';
import { toProductCard } from '@/types/product';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';

export const revalidate = 60;

/**
 * Dựng sẵn các trang sản phẩm phổ biến lúc build để khách không gặp độ trễ truy vấn
 * ở lần truy cập đầu tiên. Sản phẩm mới vẫn được dựng theo yêu cầu nhờ ISR.
 */
export async function generateStaticParams() {
  const products = await getProducts();
  return products.slice(0, 100).map((product) => ({ slug: product.slug }));
}

/** Tiêu đề, mô tả và ảnh chia sẻ riêng cho từng sản phẩm, đọc từ cùng cache với trang (không thêm truy vấn). */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};
  const description = product.description.replace(/\s+/g, ' ').trim().slice(0, 160) || undefined;
  const title = `${product.name} | T'Petie`;
  return { title, description,
    openGraph: { title, description, type: 'website', images: product.thumbnail ? [product.thumbnail] : undefined } };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const relatedProducts = await getRelatedProducts(product.id, product.collectionId || null, 4);
  return <ProductDetailClient product={product} relatedProducts={relatedProducts.map(toProductCard)} />;
}

import { notFound } from 'next/navigation';
import { getProducts, getProductBySlug, getRelatedProducts } from '@/server/catalog/queries';
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

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const relatedProducts = await getRelatedProducts(product.id, product.collectionId || null, 4);
  return <ProductDetailClient product={product} relatedProducts={relatedProducts} />;
}

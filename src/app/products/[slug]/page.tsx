import { notFound } from 'next/navigation';
import { getProducts } from '@/server/catalog/queries';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';

export const revalidate = 60;

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const products = await getProducts();
  const product = products.find((entry) => entry.slug === params.slug || entry.id === params.slug || entry.sku === params.slug);
  if (!product) notFound();
  return <ProductDetailClient product={product} allProducts={products} />;
}

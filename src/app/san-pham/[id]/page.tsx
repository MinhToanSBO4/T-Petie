import { notFound } from 'next/navigation';
import { getProducts } from '@/server/catalog/queries';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const products = await getProducts();
  const product = products.find((entry) => entry.slug === params.id || entry.id === params.id || entry.sku === params.id);
  if (!product) notFound();
  return <ProductDetailClient product={product} allProducts={products} />;
}

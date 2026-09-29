import { NextResponse } from 'next/server';
import { getProducts } from '@/server/catalog/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Math.min(10000, Number(url.searchParams.get('page')) || 1));
  const limit = Math.max(1, Math.min(48, Number(url.searchParams.get('limit')) || 24));
  const category = url.searchParams.get('category');
  const collection = url.searchParams.get('collection');
  const search = url.searchParams.get('q')?.trim().toLowerCase().slice(0, 100);
  const products = (await getProducts()).filter((product) =>
    (!category || product.category === category || product.subcategory === category) &&
    (!collection || product.collectionId === collection) &&
    (!search || product.name.toLowerCase().includes(search)));
  return NextResponse.json({ products: products.slice((page - 1) * limit, page * limit), total: products.length, page, limit });
}

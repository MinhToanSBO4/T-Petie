import { NextResponse } from 'next/server';
import { getProducts } from '@/server/catalog/queries';
import { searchCatalog } from '@/lib/catalog/filters';

export const dynamic = 'force-dynamic';

/** Danh mục công khai (đã cache phía máy chủ), lọc theo loại, bộ sưu tập và từ khóa không dấu, có phân trang. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Math.min(10000, Number(url.searchParams.get('page')) || 1));
  const limit = Math.max(1, Math.min(48, Number(url.searchParams.get('limit')) || 24));
  const category = url.searchParams.get('category');
  const collection = url.searchParams.get('collection');
  const search = url.searchParams.get('q')?.trim().slice(0, 100) || '';
  const scoped = (await getProducts()).filter((product) =>
    (!category || product.category === category || product.subcategory === category) &&
    (!collection || product.collectionId === collection));
  const products = searchCatalog(scoped, search);
  return NextResponse.json(
    { products: products.slice((page - 1) * limit, page * limit), total: products.length, page, limit },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
      },
    }
  );
}

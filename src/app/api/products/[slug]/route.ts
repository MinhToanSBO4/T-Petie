import { NextResponse } from 'next/server';
import { getProductBySlug } from '@/server/catalog/queries';

export const dynamic = 'force-dynamic';

/** Một sản phẩm theo slug (hoặc mã cũ); đọc đúng một bản ghi đã cache thay vì lọc toàn bộ catalog. */
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  return product
    ? NextResponse.json({ product }, { headers: { 'Cache-Control': 'no-store' } })
    : NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
}

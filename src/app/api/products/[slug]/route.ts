import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const product = (await getProducts()).find((entry) => entry.id === params.slug);
  return product
    ? NextResponse.json(
        { product },
        {
          headers: {
            'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
          },
        }
      )
    : NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
}

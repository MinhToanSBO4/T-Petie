import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const product = (await getProducts()).find((entry) => entry.slug === params.slug || entry.id === params.slug);
  return product ? NextResponse.json({ product }) : NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
}

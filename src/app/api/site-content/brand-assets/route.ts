import { NextResponse } from 'next/server';
import { getSiteContent } from '@/server/content/site-content';

export const dynamic = 'force-dynamic';

/** Nhận diện thương hiệu công khai cho các thành phần phía client. */
export async function GET() {
  const brand = (await getSiteContent()).brand_assets;
  return NextResponse.json({ logoUrl: brand?.logoUrl || '', logoAlt: brand?.logoAlt || '' },
    { headers: { 'Cache-Control': 'public, max-age=300' } });
}

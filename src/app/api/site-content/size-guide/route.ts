import { NextResponse } from 'next/server';
import { getSizeGuide } from '@/server/content/site-content';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guide = await getSizeGuide();
  if (!guide) return NextResponse.json({ error: 'Chưa có bảng chọn size' }, { status: 503 });
  return NextResponse.json(guide, { headers: { 'Cache-Control': 'public, max-age=300' } });
}

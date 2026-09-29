import { NextResponse } from 'next/server';
import { getCollections } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ collections: await getCollections() });
}

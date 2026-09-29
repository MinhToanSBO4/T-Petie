import { NextResponse } from 'next/server';
import { getCollections } from '@/server/catalog/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ collections: await getCollections() });
}

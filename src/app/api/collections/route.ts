import { NextResponse } from 'next/server';
import { getCollections } from '@/server/catalog/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { collections: await getCollections() },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
      },
    }
  );
}

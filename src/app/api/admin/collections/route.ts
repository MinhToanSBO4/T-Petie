import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active' || !['admin', 'staff'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  const collections = await prisma.collection.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json({ collections: collections.map((row) => ({ id: row.id, title: row.title, slug: row.slug, bannerUrl: row.bannerUrl })) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active' || !['admin', 'staff'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.length > 100 ||
    typeof body.slug !== 'string' || !/^[a-z0-9-]{3,100}$/.test(body.slug) ||
    typeof body.bannerUrl !== 'string' || !/^https:\/\/(res\.cloudinary\.com|i\.ibb\.co)\//.test(body.bannerUrl)) {
    return NextResponse.json({ error: 'Tên, slug và URL banner HTTPS là bắt buộc' }, { status: 400 });
  }
  try {
    const created = await prisma.collection.create({ data: {
      title: body.title.trim(), slug: body.slug, bannerUrl: body.bannerUrl,
      subtitle: typeof body.subtitle === 'string' ? body.subtitle.slice(0, 200) : null,
    } });
    revalidateTag('collections');
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Slug đã tồn tại' }, { status: 409 }); }
}

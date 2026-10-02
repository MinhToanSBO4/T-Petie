import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getStaffSession } from '@/server/auth/staff-session';
import { SITE_CONTENT_KEYS } from '@/lib/content/site-content';

export const dynamic = 'force-dynamic';

/** Trả về dữ liệu thô của mọi khối nội dung để trang quản trị dựng form. */
export async function GET() {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const rows = await prisma.siteContent.findMany({ where: { key: { in: [...SITE_CONTENT_KEYS] } } });
  const content: Record<string, unknown> = {};
  for (const key of SITE_CONTENT_KEYS) content[key] = rows.find((row) => row.key === key)?.data ?? null;
  return NextResponse.json({ content, keys: SITE_CONTENT_KEYS }, { headers: { 'Cache-Control': 'no-store' } });
}

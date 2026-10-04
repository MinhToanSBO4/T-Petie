import { NextResponse } from 'next/server';
import { getStaffSession } from '@/server/auth/staff-session';
import { readSiteContentForEditor } from '@/server/content/site-content';
import { SITE_CONTENT_KEYS } from '@/lib/content/site-content';

export const dynamic = 'force-dynamic';

/** Trả về nội dung mọi khối như website đang dùng (khối có dữ liệu hỏng giữ bản thô, nêu trong invalidKeys) để trang quản trị dựng form. */
export async function GET() {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const { content, invalidKeys } = await readSiteContentForEditor();
  return NextResponse.json({ content, invalidKeys, keys: SITE_CONTENT_KEYS }, { headers: { 'Cache-Control': 'no-store' } });
}

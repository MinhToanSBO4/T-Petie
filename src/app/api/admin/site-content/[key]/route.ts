import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/client';
import { getStaffSession } from '@/server/auth/staff-session';
import { invalidateSiteContent } from '@/server/content/invalidate';
import { SITE_CONTENT_KEYS, SiteContentError, parseSiteContent } from '@/lib/content/site-content';
import { isSameOrigin } from '@/server/security/origin';
import type { SiteContentKey } from '@/lib/content/site-content';

export const dynamic = 'force-dynamic';
const MAX_BODY = 200_000;

function isSiteContentKey(value: string): value is SiteContentKey {
  return (SITE_CONTENT_KEYS as string[]).includes(value);
}

/** Lưu cấu hình của một khối nội dung sau khi kiểm tra hợp lệ. */
export async function PUT(request: Request, { params }: { params: { key: string } }) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  if (!isSiteContentKey(params.key)) return NextResponse.json({ error: 'Khối nội dung không hợp lệ' }, { status: 404 });
  // Hotline/Zalo/Messenger là nơi khách chuyển tiền và chốt đơn: chỉ quản trị viên được đổi.
  if (params.key === 'contact_info' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Chỉ quản trị viên được sửa thông tin liên hệ' }, { status: 403 });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  try {
    const data = parseSiteContent(params.key, JSON.parse(raw));
    await prisma.siteContent.upsert({ where: { key: params.key },
      update: { data: data as Prisma.InputJsonValue }, create: { key: params.key, data: data as Prisma.InputJsonValue } });
    invalidateSiteContent();
    return NextResponse.json({ content: data });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    if (error instanceof SiteContentError && !error.message.startsWith('Invalid')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith('Invalid')) {
      return NextResponse.json({ error: 'Nội dung không hợp lệ, vui lòng kiểm tra lại các trường.' }, { status: 400 });
    }
    console.error('Site content update failed:', error);
    return NextResponse.json({ error: 'Không lưu được nội dung' }, { status: 500 });
  }
}

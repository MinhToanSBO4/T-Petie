import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdminApi } from '@/server/auth/staff-session';
import { DASHBOARD_TAG } from '@/server/admin/dashboard';
import { isSameOrigin } from '@/server/security/origin';

/** Nút "Làm mới" của trang Tổng quan: bỏ số liệu đã cache để lần tải kế tiếp đọc mới từ database. */
export async function POST(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  revalidateTag(DASHBOARD_TAG);
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getStaffSession } from '@/server/auth/staff-session';
import { checkCurrentPassword } from '@/server/auth/current-password';
import { forgetUserSnapshot } from '@/server/auth/user-snapshot';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';
import { parseAccountProfile } from '@/lib/account/account-input';

export const dynamic = 'force-dynamic';

/**
 * Quản trị viên/nhân viên tự sửa hồ sơ của mình. Email là tên đăng nhập nên đổi email phải nhập lại mật khẩu.
 */
export async function PATCH(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 4000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  let body: Record<string, unknown>;
  let input: ReturnType<typeof parseAccountProfile>;
  try {
    body = JSON.parse(raw);
    input = parseAccountProfile(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? 'Dữ liệu không hợp lệ' : (error as Error).message }, { status: 400 });
  }

  const id = session.user.id;
  const user = await prisma.user.findUnique({ where: { id }, select: { email: true, password: true } });
  if (!user) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
  const emailChanged = input.email !== user.email?.toLowerCase();
  if (emailChanged) {
    const check = await checkCurrentPassword(id, user.password, body.currentPassword);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    // Dấu "đã xác minh" thuộc về email cũ (đăng nhập Google dựa vào nó để quyết định giữ mật khẩu khi liên kết).
    const updated = await prisma.user.update({
      where: { id }, data: { ...input, ...(emailChanged ? { emailVerified: null } : {}) },
      select: { name: true, email: true, phone: true },
    });
    forgetUserSnapshot(id);
    return NextResponse.json({ profile: updated }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Email này đã được dùng cho tài khoản khác' }, { status: 409 });
    }
    throw error;
  }
}

import { NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { getStaffSession } from '@/server/auth/staff-session';
import { checkCurrentPassword } from '@/server/auth/current-password';
import { forgetUserSnapshot } from '@/server/auth/user-snapshot';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';
import { newPasswordProblem } from '@/lib/account/account-input';

export const dynamic = 'force-dynamic';

/**
 * Đổi mật khẩu của chính mình. Phiên đăng nhập gắn với dấu vân tay mật khẩu nên mọi thiết bị khác bị đăng xuất;
 * trình duyệt đang dùng tự đăng nhập lại bằng mật khẩu mới.
 */
export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 1000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });

  const id = session.user.id;
  const user = await prisma.user.findUnique({ where: { id }, select: { password: true } });
  const check = await checkCurrentPassword(id, user?.password, body.currentPassword);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const problem = newPasswordProblem(body.newPassword, body.currentPassword);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  await prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(body.newPassword as string, 12) } });
  forgetUserSnapshot(id);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

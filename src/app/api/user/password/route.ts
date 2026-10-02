import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as bcrypt from 'bcryptjs';
import { authOptions } from '@/server/auth/options';
import { checkCurrentPassword } from '@/server/auth/current-password';
import { forgetUserSnapshot } from '@/server/auth/user-snapshot';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';
import { newPasswordProblem } from '@/lib/account/account-input';

export const dynamic = 'force-dynamic';

/**
 * Khách đổi mật khẩu (hoặc đặt mật khẩu lần đầu cho tài khoản tạo bằng Google). Có mật khẩu thì phải nhập đúng
 * mật khẩu hiện tại (giới hạn số lần thử). Phiên đăng nhập gắn với dấu vân tay mật khẩu nên các thiết bị khác
 * bị đăng xuất; trình duyệt đang dùng tự đăng nhập lại bằng mật khẩu mới.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.status !== 'active') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 1000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });

  const id = session.user.id;
  const user = await prisma.user.findUnique({ where: { id }, select: { password: true, email: true } });
  if (!user) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
  if (user.password) {
    const check = await checkCurrentPassword(id, user.password, body.currentPassword);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  }
  const problem = newPasswordProblem(body.newPassword, user.password ? body.currentPassword : undefined);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  await prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(body.newPassword as string, 12) } });
  forgetUserSnapshot(id);
  return NextResponse.json({ ok: true, email: user.email }, { headers: { 'Cache-Control': 'no-store' } });
}

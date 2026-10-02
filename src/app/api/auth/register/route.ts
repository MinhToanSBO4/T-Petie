export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/client';
import * as bcrypt from 'bcryptjs';
import { allowAttempt } from '@/server/security/rate-limit';
import { clientIp } from '@/server/security/client-ip';
import { isSameOrigin } from '@/server/security/origin';
import { normalizePhone } from '@/lib/account/account-input';
import { readMailConfig, normalizeEmail } from '@/lib/email/config';
import { issueAccountEmail } from '@/server/auth/email-tokens';

const EMAIL_TAKEN = 'Địa chỉ Email này đã được đăng ký. Mẹ vui lòng chọn Đăng nhập nhé!';

/** Kiểm tra form đăng ký; trả về thông báo cho đúng ô bị sai (trước đây mọi lỗi đều báo "Mật khẩu cần 12–128 ký tự"). */
function inputError(body: Record<string, unknown>): string | null {
  const { name, email, password, phone } = body;
  if (typeof name !== 'string' || !name.trim()) return 'Vui lòng nhập Họ tên.';
  if (name.trim().length > 100) return 'Họ tên tối đa 100 ký tự.';
  if (typeof email !== 'string' || !email.trim()) return 'Vui lòng nhập Email.';
  if (!normalizeEmail(email)) return 'Email không đúng định dạng (VD: mebe@gmail.com)!';
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) return 'Mật khẩu cần 12–128 ký tự.';
  if (phone !== undefined && phone !== null && (typeof phone !== 'string' || (phone.trim() && !normalizePhone(phone)))) {
    return 'Số điện thoại gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09 (có thể bỏ trống).';
  }
  return null;
}

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
    if (Number(req.headers.get('content-length') || 0) > 4096) {
      return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
    }
    let body: Record<string, unknown>;
    try {
      body = await req.json();
      if (!body || typeof body !== 'object') throw new Error();
    } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }

    const invalid = inputError(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    // Chỉ tính lượt khi dữ liệu hợp lệ: gõ sai vài lần không bị khóa 10 phút, còn tạo tài khoản hàng loạt vẫn bị chặn.
    if (!(await allowAttempt(`register:${clientIp(req)}`, 5))) {
      return NextResponse.json({ error: 'Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau 10 phút.' }, { status: 429 });
    }

    const cleanEmail = String(body.email).trim().toLowerCase();
    try { readMailConfig(process.env); }
    catch { return NextResponse.json({ error: 'Dịch vụ email chưa sẵn sàng. Vui lòng thử lại sau.' }, { status: 503 }); }
    const phone = typeof body.phone === 'string' && body.phone.trim() ? normalizePhone(body.phone) : null;
    if (await prisma.user.findUnique({ where: { email: cleanEmail }, select: { id: true } })) {
      return NextResponse.json({ error: EMAIL_TAKEN }, { status: 409 });
    }

    // Mã hóa mật khẩu với bcrypt (12 rounds).
    const hashedPassword = await bcrypt.hash(String(body.password), 12);

    // Lưu tài khoản khách hàng; chương trình tích điểm chưa được kích hoạt.
    const newUser = await prisma.user.create({
      data: {
        name: String(body.name).trim().replace(/\s+/g, ' '),
        email: cleanEmail,
        emailVerificationRequired: true,
        password: hashedPassword,
        phone,
        role: 'user',
        status: 'active',
        points: 0,
        babyGender: 'girl',
      },
      select: { id: true, name: true, email: true, role: true, status: true, phone: true, points: true, createdAt: true },
    });

    const emailSent = await issueAccountEmail(cleanEmail, 'verify').catch(() => false);
    return NextResponse.json({ success: true, requiresVerification: true, emailSent,
      message: emailSent ? 'Vui lòng kiểm tra email để xác thực tài khoản.' : 'Tài khoản đã tạo. Chưa gửi được thư xác thực, vui lòng gửi lại.', user: newUser }, { status: 201 });
  } catch (error) {
    // Hai lần bấm đăng ký cùng email gần như đồng thời: lần sau gặp khóa duy nhất của email.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: EMAIL_TAKEN }, { status: 409 });
    }
    console.error('Error in register API:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi máy chủ khi đăng ký tài khoản. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

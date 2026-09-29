export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import * as bcrypt from 'bcryptjs';
import { allowAttempt } from '@/server/security/rate-limit';

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (!(await allowAttempt(`register:${ip}`, 5))) return NextResponse.json({ error: 'Thử lại sau 10 phút' }, { status: 429 });
    if (Number(req.headers.get('content-length') || 0) > 4096) {
      return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
    }
    const body = await req.json();
    const { name, email, password, phone } = body;

    // 1. Validation đầu vào
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' ||
      !name.trim() || !email.trim() || !password) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Email không đúng định dạng (VD: mebe@gmail.com)!' },
        { status: 400 }
      );
    }

    if (password.length < 12 || password.length > 128 || name.trim().length > 100 || email.length > 254 ||
      (phone !== undefined && (typeof phone !== 'string' || !/^0\d{9}$/.test(phone)))) {
      return NextResponse.json(
        { error: 'Mật khẩu cần 12–128 ký tự; kiểm tra lại tên và số điện thoại.' },
        { status: 400 }
      );
    }

    // 2. Kiểm tra trùng lặp email
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Địa chỉ Email này đã được đăng ký. Mẹ vui lòng chọn Đăng nhập nhé!' },
        { status: 409 }
      );
    }

    // Mã hóa mật khẩu với bcrypt (12 rounds).
    const hashedPassword = await bcrypt.hash(password, 12);

    // Lưu tài khoản khách hàng; chương trình tích điểm chưa được kích hoạt.
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : null,
        role: 'user',
        status: 'active',
        points: 0,
        babyGender: 'be-gai',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        points: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Đăng ký tài khoản thành công!',
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in register API:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi máy chủ khi đăng ký tài khoản. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

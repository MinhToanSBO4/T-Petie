export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

// GET: Lấy danh sách toàn bộ người dùng trong hệ thống (Chỉ Admin)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Kiểm tra quyền Admin
    if (!session || session.user?.role !== 'admin' || session.user.status !== 'active') {
      return NextResponse.json(
        { error: '403 Forbidden: Chỉ Quản Trị Viên (Admin) mới có quyền truy cập.' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        phone: true,
        address: true,
        city: true,
        points: true,
        babyName: true,
        babyBirthDate: true,
        babyWeight: true,
        babyHeight: true,
        recommendedSize: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    // Định dạng lại theo type User của ứng dụng
    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email || '',
      name: u.name || 'Người dùng',
      role: u.role as 'admin' | 'staff' | 'user',
      status: u.status as 'active' | 'blocked',
      avatar: u.image || undefined,
      phone: u.phone || undefined,
      address: u.address || undefined,
      city: u.city || undefined,
      points: u.points,
      babyProfile: u.babyName
        ? {
            name: u.babyName,
            birthDate: u.babyBirthDate ? u.babyBirthDate.toISOString().split('T')[0] : undefined,
            weight: u.babyWeight || 10,
            height: u.babyHeight || 80,
            gender: 'be-gai' as const,
            recommendedSize: u.recommendedSize || 'Size 2 (10 - 12kg)',
          }
        : undefined,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
    }));

    return NextResponse.json({ success: true, users: formattedUsers });
  } catch (error) {
    console.error('Error in Admin GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Lỗi server khi tải danh sách người dùng' }, { status: 500 });
  }
}

// POST: Admin tạo tài khoản người dùng mới
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin' || session.user.status !== 'active') {
      return NextResponse.json(
        { error: '403 Forbidden: Chỉ Quản Trị Viên (Admin) mới có quyền tạo người dùng.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, status, phone, address } = body;

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' ||
      !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
      return NextResponse.json({ error: 'Tên, email và mật khẩu tối thiểu 12 ký tự là bắt buộc.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'Email này đã tồn tại trong hệ thống!' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : 'user',
        status: status === 'blocked' ? 'blocked' : 'active',
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        points: 100,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Đã tạo tài khoản người dùng thành công!', user: { id: newUser.id, email: newUser.email, role: newUser.role } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in Admin POST /api/admin/users:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi tạo người dùng' }, { status: 500 });
  }
}

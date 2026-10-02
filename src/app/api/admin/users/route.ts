export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAdminApi } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';
import * as bcrypt from 'bcryptjs';
import { paginated, parseChoice, parsePagination, parseSearch } from '@/lib/pagination';
import { passwordProblem, PASSWORD_MIN } from '@/lib/account/account-input';

/** Cách sắp xếp danh sách tài khoản; luôn kèm id để phân trang ổn định. Chưa từng đăng nhập/chưa đặt tên xếp cuối. */
const SORTS: Record<string, Prisma.UserOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  login: [{ lastLoginAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
  name: [{ name: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
  orders: [{ orders: { _count: 'desc' } }, { createdAt: 'desc' }, { id: 'desc' }],
};
const STATUS: Record<string, Prisma.UserWhereInput> = { active: { status: 'active' }, blocked: { status: 'blocked' } };
/** Đơn gắn với tài khoản (khách đặt khi đã đăng nhập). */
const ORDERED: Record<string, Prisma.UserWhereInput> = { yes: { orders: { some: {} } }, no: { orders: { none: {} } } };

// GET: Lấy danh sách người dùng trong hệ thống, có tìm kiếm và phân trang (Chỉ Admin)
export async function GET(request: Request) {
  try {
    if (!(await requireAdminApi())) {
      return NextResponse.json(
        { error: '403 Forbidden: Chỉ Quản Trị Viên (Admin) mới có quyền truy cập.' },
        { status: 403 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
    const search = parseSearch(searchParams);
    const roleFilter = searchParams.get('filter') || '';
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(roleFilter === 'user' || roleFilter === 'staff' || roleFilter === 'admin' ? { role: roleFilter } : {}),
      ...parseChoice(searchParams, 'status', STATUS),
      ...parseChoice(searchParams, 'ordered', ORDERED),
      ...(search ? { OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { username: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ] } : {}),
    };

    const [users, total] = await Promise.all([prisma.user.findMany({
      where,
      orderBy: parseChoice(searchParams, 'sort', SORTS) ?? SORTS.newest,
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
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
        _count: { select: { orders: true } },
      },
    }), prisma.user.count({ where })]);

    // Định dạng lại theo type User của ứng dụng
    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email || '',
      username: u.username || '',
      name: u.name || 'Người dùng',
      role: u.role as 'admin' | 'staff' | 'user',
      status: u.status as 'active' | 'blocked',
      avatar: u.image || undefined,
      phone: u.phone || undefined,
      address: u.address || undefined,
      city: u.city || undefined,
      points: u.points,
      orderCount: u._count.orders,
      babyProfile: u.babyName
        ? {
            name: u.babyName,
            birthDate: u.babyBirthDate ? u.babyBirthDate.toISOString().split('T')[0] : undefined,
            weight: u.babyWeight || 10,
            height: u.babyHeight || 80,
            gender: 'girl' as const,
            recommendedSize: u.recommendedSize || 'Size 2 (10 - 12kg)',
          }
        : undefined,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
    }));

    return NextResponse.json({ success: true, ...paginated(formattedUsers, total, page, limit) });
  } catch (error) {
    console.error('Error in Admin GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Lỗi server khi tải danh sách người dùng' }, { status: 500 });
  }
}

// POST: Admin tạo tài khoản người dùng mới
export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
    if (!(await requireAdminApi())) {
      return NextResponse.json(
        { error: '403 Forbidden: Chỉ Quản Trị Viên (Admin) mới có quyền tạo người dùng.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, username, password } = body;

    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 ||
      typeof username !== 'string' || !/^[a-z][a-z0-9_]{2,31}$/.test(username.trim().toLowerCase()) ||
      passwordProblem(password)) {
      return NextResponse.json({ error: `Cần nhập tên, email, username và mật khẩu (ít nhất ${PASSWORD_MIN} ký tự).` }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { OR: [{ email: cleanEmail }, { username: cleanUsername }] } });

    if (existing) {
      return NextResponse.json({ error: 'Email hoặc tên đăng nhập đã tồn tại.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        username: cleanUsername,
        password: hashedPassword,
        role: 'staff',
        status: 'active',
        points: 0,
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

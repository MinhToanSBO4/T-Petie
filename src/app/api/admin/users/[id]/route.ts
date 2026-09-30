export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/options';
import { prisma } from '@/server/db/client';
import * as bcrypt from 'bcryptjs';
import { createTemporaryPassword } from '@/server/security/password-reset';
import { isSameOrigin } from '@/server/security/origin';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET: Lấy thông tin chi tiết một người dùng theo ID (Dành riêng cho Admin)
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin' || session.user.status !== 'active') {
      return NextResponse.json(
        { error: '403 Forbidden: Bạn không có quyền truy cập thông tin này.' },
        { status: 403 }
      );
    }

    const { id: targetUserId } = params;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Thiếu mã định danh người dùng (ID).' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
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
        babyGender: true,
        recommendedSize: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng trong hệ thống.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error in Admin GET /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi lấy thông tin người dùng.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Cập nhật Role (Phân quyền), Status (Khóa/Mở) hoặc thông tin người dùng (Admin)
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin' || session.user.status !== 'active') {
      return NextResponse.json(
        { error: '403 Forbidden: Bạn không có quyền thực hiện thao tác này.' },
        { status: 403 }
      );
    }

    const { id: targetUserId } = params;
    const body = await req.json();
    const { role, status, name, phone, address, city, password, resetPassword } = body;

    // Không cho phép Admin tự khóa hoặc tự hạ quyền chính mình
    if (session.user.id === targetUserId) {
      if (role && role !== 'admin') {
        return NextResponse.json(
          { error: 'Bạn không thể tự hạ quyền Quản Trị Viên của chính mình.' },
          { status: 400 }
        );
      }
      if (status && status === 'blocked') {
        return NextResponse.json(
          { error: 'Không thể tự khóa tài khoản của chính mình.' },
          { status: 400 }
        );
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || targetUser.deletedAt) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng cần cập nhật.' },
        { status: 404 }
      );
    }
    if (targetUser.role === 'admin' && targetUser.id !== session.user.id) {
      return NextResponse.json({ error: 'Không được sửa tài khoản quản trị khác' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (resetPassword !== undefined && resetPassword !== true) return NextResponse.json({ error: 'Yêu cầu đặt lại mật khẩu không hợp lệ' }, { status: 400 });
    if (resetPassword && password !== undefined) return NextResponse.json({ error: 'Chỉ chọn một cách đặt lại mật khẩu' }, { status: 400 });
    if (resetPassword && targetUser.role !== 'staff') return NextResponse.json({ error: 'Chỉ đặt lại mật khẩu nhân viên' }, { status: 403 });
    if (role && (role === 'staff' || role === 'user') && targetUser.role !== 'admin') {
      updateData.role = role;
    }
    if (status && (status === 'active' || status === 'blocked')) {
      updateData.status = status;
    }
    const temporaryPassword = resetPassword ? createTemporaryPassword() : undefined;
    if (password !== undefined || temporaryPassword) {
      if (!temporaryPassword && (targetUser.role !== 'staff' || typeof password !== 'string' || password.length < 12 || password.length > 128)) {
        return NextResponse.json({ error: 'Mật khẩu nhân viên cần 12–128 ký tự' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(temporaryPassword || password, 12);
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || name.length > 100) return NextResponse.json({ error: 'Tên không hợp lệ' }, { status: 400 });
      updateData.name = name.trim();
    }
    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.length > 20) return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 });
      updateData.phone = phone.trim();
    }
    if (address !== undefined) {
      if (typeof address !== 'string' || address.length > 300) return NextResponse.json({ error: 'Địa chỉ không hợp lệ' }, { status: 400 });
      updateData.address = address.trim();
    }
    if (city !== undefined) {
      if (typeof city !== 'string' || city.length > 100) return NextResponse.json({ error: 'Tỉnh/thành không hợp lệ' }, { status: 400 });
      updateData.city = city.trim();
    }

    if (!Object.keys(updateData).length) return NextResponse.json({ error: 'Không có dữ liệu hợp lệ để cập nhật' }, { status: 400 });
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật tài khoản người dùng thành công!',
      user: updatedUser,
      ...(temporaryPassword ? { temporaryPassword } : {}),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error in Admin PATCH /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi cập nhật tài khoản.' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Hỗ trợ cập nhật toàn phần thông tin tài khoản người dùng (Admin)
 */
export async function PUT(req: Request, context: RouteContext) {
  return PATCH(req, context);
}

/**
 * DELETE: Xóa tài khoản người dùng khỏi hệ thống (Admin)
 */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin' || session.user.status !== 'active') {
      return NextResponse.json(
        { error: '403 Forbidden: Bạn không có quyền thực hiện thao tác này.' },
        { status: 403 }
      );
    }
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: '403 Forbidden: Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
    }

    const { id: targetUserId } = params;

    // Không cho phép Admin tự xóa chính mình
    if (session.user.id === targetUserId) {
      return NextResponse.json(
        { error: 'Không thể xóa tài khoản Quản trị viên bạn đang đăng nhập.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || targetUser.deletedAt) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng cần xóa.' },
        { status: 404 }
      );
    }
    if (targetUser.role === 'admin') return NextResponse.json({ error: 'Không thể xóa tài khoản quản trị' }, { status: 403 });

    await prisma.$transaction(async (tx) => {
      await tx.account.deleteMany({ where: { userId: targetUserId } });
      await tx.session.deleteMany({ where: { userId: targetUserId } });
      await tx.user.update({ where: { id: targetUserId }, data: {
        status: 'blocked', deletedAt: new Date(), email: null, username: null, password: null,
        phone: null, address: null, city: null, image: null, name: 'Tài khoản đã xóa',
      } });
    });

    return NextResponse.json({
      success: true,
      message: 'Đã vô hiệu hóa tài khoản thành công!',
    });
  } catch (error) {
    console.error('Error in Admin DELETE /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi xóa người dùng.' },
      { status: 500 }
    );
  }
}

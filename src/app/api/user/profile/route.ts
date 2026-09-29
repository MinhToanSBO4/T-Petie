export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Lấy thông tin chi tiết hồ sơ cá nhân và hồ sơ bé của user hiện tại
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email || session.user.status !== 'active') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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
        babyGender: true,
        recommendedSize: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// PATCH: Cập nhật thông tin cá nhân hoặc hồ sơ bé yêu
export async function PATCH(req: Request) {
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email || session.user.status !== 'active') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, address, city, babyProfile } = body;

    for (const [value, max] of [[name, 100], [phone, 20], [address, 300], [city, 100]] as const) {
      if (value !== undefined && (typeof value !== 'string' || value.length > max)) {
        return NextResponse.json({ error: 'Thông tin hồ sơ không hợp lệ' }, { status: 400 });
      }
    }
    if (babyProfile !== undefined && (!babyProfile || typeof babyProfile !== 'object' || Array.isArray(babyProfile) ||
      (babyProfile.name !== undefined && (typeof babyProfile.name !== 'string' || babyProfile.name.length > 100)) ||
      (babyProfile.birthDate !== undefined && babyProfile.birthDate !== '' &&
        (typeof babyProfile.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(babyProfile.birthDate) || Number.isNaN(Date.parse(babyProfile.birthDate)))) ||
      (babyProfile.gender !== undefined && babyProfile.gender !== 'be-gai') ||
      (babyProfile.recommendedSize !== undefined && (typeof babyProfile.recommendedSize !== 'string' || babyProfile.recommendedSize.length > 100)) ||
      (babyProfile.weight !== undefined && (!Number.isFinite(Number(babyProfile.weight)) || Number(babyProfile.weight) <= 0 || Number(babyProfile.weight) > 100)) ||
      (babyProfile.height !== undefined && (!Number.isFinite(Number(babyProfile.height)) || Number(babyProfile.height) <= 0 || Number(babyProfile.height) > 250)))) {
      return NextResponse.json({ error: 'Hồ sơ bé không hợp lệ' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (city !== undefined) updateData.city = city.trim();

    // Cập nhật hồ sơ bé
    if (babyProfile) {
      if (babyProfile.name !== undefined) updateData.babyName = babyProfile.name;
      if (babyProfile.birthDate !== undefined) updateData.babyBirthDate = babyProfile.birthDate ? new Date(babyProfile.birthDate) : null;
      if (babyProfile.weight !== undefined) updateData.babyWeight = parseFloat(babyProfile.weight);
      if (babyProfile.height !== undefined) updateData.babyHeight = parseFloat(babyProfile.height);
      if (babyProfile.gender !== undefined) updateData.babyGender = babyProfile.gender;
      if (babyProfile.recommendedSize !== undefined) updateData.recommendedSize = babyProfile.recommendedSize;
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
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
        babyGender: true,
        recommendedSize: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin thành công!',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Lỗi server khi cập nhật hồ sơ' }, { status: 500 });
  }
}

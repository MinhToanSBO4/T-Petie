import 'server-only';
import { prisma } from '@/server/db/client';
import type { AccountProfile } from '@/components/admin/AccountSettings';

/** Hồ sơ hiển thị ở trang "Tài khoản của tôi" của quản trị viên/nhân viên. */
export async function loadAccountProfile(userId: string): Promise<AccountProfile | null> {
  const user = await prisma.user.findUnique({ where: { id: userId },
    select: { name: true, email: true, phone: true, username: true, role: true, createdAt: true, lastLoginAt: true } });
  if (!user) return null;
  return {
    name: user.name || '', email: user.email || '', phone: user.phone || '', username: user.username || '',
    role: user.role === 'admin' ? 'admin' : 'staff',
    createdAt: user.createdAt.toISOString(), lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

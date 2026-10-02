import 'server-only';
import type { Prisma } from '@prisma/client';
import type { AdapterAccount } from 'next-auth/adapters';
import { prisma } from '@/server/db/client';
import { forgetUserSnapshot } from '@/server/auth/user-snapshot';
import { googleLinkUpdate, verifiedEmailFromIdToken } from '@/lib/auth-google';

/**
 * Gắn tài khoản Google vào một tài khoản, đồng thời (cùng transaction) ghi nhận email đã được Google xác minh và gỡ
 * mật khẩu đặt khi email chưa xác minh (xem `googleLinkUpdate`). Gỡ mật khẩu làm đổi dấu vân tay mật khẩu nên mọi phiên
 * đăng nhập cũ của tài khoản hết hiệu lực.
 *
 * Dùng ở hai chỗ: callback signIn (khách đã có tài khoản cùng email) và `linkAccount` của adapter (tài khoản mới tạo từ
 * Google, hoặc gắn Google khi đang đăng nhập sẵn).
 */
export async function linkOAuthAccount(account: AdapterAccount): Promise<{ passwordRemoved: boolean }> {
  const verifiedEmail = account.provider === 'google' ? verifiedEmailFromIdToken(account.id_token) : null;
  const result = await prisma.$transaction(async (tx) => {
    // Cùng dữ liệu PrismaAdapter vẫn ghi (`account.create({ data })`).
    await tx.account.create({ data: account as Prisma.AccountUncheckedCreateInput });
    if (!verifiedEmail) return null;
    const user = await tx.user.findUnique({
      where: { id: account.userId }, select: { email: true, emailVerified: true, password: true },
    });
    const update = user && googleLinkUpdate(user, verifiedEmail, new Date());
    if (!update) return null;
    await tx.user.update({ where: { id: account.userId }, data: update });
    return update;
  });
  if (result) forgetUserSnapshot(account.userId);
  return { passwordRemoved: result?.password === null };
}

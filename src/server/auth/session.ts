import 'server-only';
import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from './options';

/**
 * Mỗi lần đọc phiên, callback jwt truy vấn lại database để cập nhật vai trò/trạng thái.
 * Layout, trang và các thành phần cùng request dùng chung một lần đọc.
 */
export const currentSession = cache(() => getServerSession(authOptions));

/** Phiên của tài khoản đang hoạt động (khách, nhân viên hoặc admin); null nếu chưa đăng nhập hoặc bị khóa. */
export async function getActiveSession() {
  const session = await currentSession();
  return session?.user?.status === 'active' ? session : null;
}

import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from './options';

/**
 * Mỗi lần đọc phiên, callback jwt truy vấn lại database để cập nhật vai trò/trạng thái.
 * Layout và trang quản trị đều cần phiên, nên gộp về một lần đọc cho mỗi request.
 */
const currentSession = cache(() => getServerSession(authOptions));

export async function getStaffSession() {
  const session = await currentSession();
  return session?.user?.status === 'active' && ['admin', 'staff'].includes(session.user.role)
    ? session : null;
}

/**
 * Bản dành cho API route: trả về phiên admin hợp lệ hoặc null (không điều hướng).
 */
export async function requireAdminApi() {
  const session = await currentSession();
  return session?.user?.status === 'active' && session.user.role === 'admin' ? session : null;
}

/**
 * Dùng cho trang quản trị dành cho cả admin và nhân viên.
 * Người chưa đăng nhập về trang đăng nhập; khách đã đăng nhập về trang tài khoản của họ.
 */
export async function requireStaffPage(callbackUrl: string) {
  const session = await currentSession();
  const user = session?.user;
  if (!user || user.status !== 'active') redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (!['admin', 'staff'].includes(user.role)) redirect('/dashboard');
  return session;
}

/**
 * Dùng cho trang chỉ dành quản trị viên.
 * Nhân viên đã đăng nhập được đưa về khu vực họ có quyền thay vì trang đăng nhập,
 * tránh cảm giác bị mất phiên khi mở nhầm trang chỉ dành admin.
 */
export async function requireAdminPage(callbackUrl: string) {
  const session = await currentSession();
  const user = session?.user;
  if (!user || user.status !== 'active') redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (user.role === 'staff') redirect('/admin/products');
  if (user.role !== 'admin') redirect('/dashboard');
  return session;
}

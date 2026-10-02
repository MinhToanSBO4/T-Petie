import 'server-only';
import { redirect } from 'next/navigation';
import { pathInArea } from '@/lib/admin/back-office';
import { currentSession } from './session';

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

/** Bản dành cho API route mà cả admin và nhân viên được dùng: trả về phiên hợp lệ hoặc null. */
export async function requireStaffApi() {
  return getStaffSession();
}

/**
 * Dùng cho trang trong khu quản trị (/admin), chỉ dành quản trị viên.
 * Người chưa đăng nhập về trang đăng nhập, khách về trang tài khoản. Nhân viên mở nhầm được đưa sang trang tương ứng
 * ở khu nhân viên thay vì trang đăng nhập, tránh cảm giác bị mất phiên.
 */
export async function requireAdminPage(callbackUrl: string) {
  const session = await currentSession();
  const user = session?.user;
  if (!user || user.status !== 'active') redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (user.role === 'staff') redirect(pathInArea('staff', callbackUrl));
  if (user.role !== 'admin') redirect('/dashboard');
  return session;
}

/** Dùng cho trang trong khu nhân viên (/staff). Quản trị viên mở nhầm được đưa sang trang tương ứng ở /admin. */
export async function requireStaffAreaPage(callbackUrl: string) {
  const session = await currentSession();
  const user = session?.user;
  if (!user || user.status !== 'active') redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (user.role === 'admin') redirect(pathInArea('admin', callbackUrl));
  if (user.role !== 'staff') redirect('/dashboard');
  return session;
}

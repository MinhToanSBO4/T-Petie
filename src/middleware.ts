import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/** Trang quản trị chỉ dành cho admin; nhân viên dùng phần còn lại của /admin. Khớp ADMIN_ITEMS/STAFF_ITEMS của layout quản trị. */
const ADMIN_ONLY = ['/admin/orders', '/admin/customers', '/admin/staff', '/admin/settings', '/admin/exports'];
const isAdminOnly = (pathname: string) => pathname === '/admin' || pathname === '/admin/'
  || ADMIN_ONLY.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/**
 * Điều hướng theo vai trò trước khi dựng trang (chỉ giải mã JWT, không truy vấn database):
 * - Tài khoản quản trị và nhân viên mở trang chủ công khai được đưa về khu quản trị. Đặt ở đây để trang chủ vẫn dựng tĩnh.
 * - Khu /admin: chưa đăng nhập về trang đăng nhập, khách về trang tài khoản, nhân viên mở trang chỉ dành admin về
 *   /admin/products — chuyển hướng HTTP ngay, không gửi khung chờ của trang mà người đó không có quyền xem.
 * Mỗi trang và API vẫn tự kiểm tra quyền với database (vai trò trong cookie có thể cũ hơn vài giây).
 */
export async function middleware(request: NextRequest) {
  const decoded = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
  const token = decoded?.status === 'active' ? decoded : null;
  const { pathname, search } = request.nextUrl;

  if (pathname === '/') {
    if (token && token.role !== 'user') {
      return NextResponse.redirect(new URL(token.role === 'admin' ? '/admin' : '/admin/products', request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const login = new URL('/login', request.url);
    login.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  if (token.role === 'staff' && isAdminOnly(pathname)) return NextResponse.redirect(new URL('/admin/products', request.url));
  if (token.role !== 'admin' && token.role !== 'staff') return NextResponse.redirect(new URL('/dashboard', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/', '/admin', '/admin/:path*'] };

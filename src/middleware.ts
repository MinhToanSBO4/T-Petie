import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { areaOf, backOfficeHome, isBackOfficeRole, pathInArea } from '@/lib/admin/back-office';

/**
 * Điều hướng theo vai trò trước khi dựng trang (chỉ giải mã JWT, không truy vấn database):
 * - Tài khoản quản trị và nhân viên mở trang chủ công khai được đưa về khu làm việc. Đặt ở đây để trang chủ vẫn dựng tĩnh.
 * - Khu nội bộ: chưa đăng nhập về trang đăng nhập, khách về trang tài khoản. Quản trị viên dùng /admin, nhân viên dùng
 *   /staff; mở nhầm khu kia được chuyển hướng HTTP ngay sang trang tương ứng, không gửi khung chờ của trang không có quyền.
 * Mỗi trang và API vẫn tự kiểm tra quyền với database (vai trò trong cookie có thể cũ hơn vài giây).
 */
export async function middleware(request: NextRequest) {
  const decoded = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
  const token = decoded?.status === 'active' ? decoded : null;
  const { pathname, search } = request.nextUrl;

  if (pathname === '/') {
    const home = backOfficeHome(token?.role);
    return home ? NextResponse.redirect(new URL(home, request.url)) : NextResponse.next();
  }

  if (!token) {
    const login = new URL('/login', request.url);
    login.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  if (!isBackOfficeRole(token.role)) return NextResponse.redirect(new URL('/dashboard', request.url));
  if (areaOf(pathname) !== token.role) return NextResponse.redirect(new URL(pathInArea(token.role, `${pathname}${search}`), request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/', '/admin', '/admin/:path*', '/staff', '/staff/:path*'] };

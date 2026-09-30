import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Tài khoản quản trị và nhân viên không dùng giao diện mua hàng, nên khi mở trang chủ
 * công khai họ được đưa về khu quản trị. Khách và người chưa đăng nhập xem bình thường.
 * Đặt ở middleware để trang chủ vẫn giữ được khả năng dựng tĩnh.
 */
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
  if (token && token.status === 'active' && token.role !== 'user') {
    const target = token.role === 'admin' ? '/admin' : '/admin/products';
    return NextResponse.redirect(new URL(target, request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/'] };

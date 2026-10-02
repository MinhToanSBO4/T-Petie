'use client';

import { usePathname } from 'next/navigation';
import { areaOf } from '@/lib/admin/back-office';

/**
 * Khung giao diện khách hàng (header, chân trang, giỏ hàng nổi).
 * Khu quản trị và khu nhân viên có thanh điều hướng riêng nên các thành phần này được ẩn đi,
 * nhờ đó trang chỉnh sửa nội dung hiển thị đúng như khách hàng nhìn thấy.
 */
export function PublicChrome({ header, footer, floating, children }: {
  header: React.ReactNode; footer: React.ReactNode; floating: React.ReactNode; children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname && areaOf(pathname)) return <>{children}</>;
  return <>{header}{children}{floating}{footer}</>;
}

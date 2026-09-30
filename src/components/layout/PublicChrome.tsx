'use client';

import { usePathname } from 'next/navigation';

/**
 * Khung giao diện khách hàng (header, chân trang, giỏ hàng nổi).
 * Khu vực quản trị có thanh điều hướng riêng nên các thành phần này được ẩn đi,
 * nhờ đó trang chỉnh sửa nội dung hiển thị đúng như khách hàng nhìn thấy.
 */
export function PublicChrome({ header, footer, floating, children }: {
  header: React.ReactNode; footer: React.ReactNode; floating: React.ReactNode; children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return <>{children}</>;
  return <>{header}{children}{floating}{footer}</>;
}

'use client';

import { usePathname } from 'next/navigation';
import { areaOf } from '@/lib/admin/back-office';
import { BackOfficeErrorScreen, ShopErrorScreen, type ErrorBoundaryProps } from '@/components/error/ErrorBoundaryScreen';

/**
 * Lỗi khi dựng trang của khách: lời trấn an, thử lại và mã tham chiếu, không bao giờ hiện nội dung lỗi.
 * Lỗi ở chính layout khu nội bộ (kiểm tra phiên, đếm đơn...) cũng rơi về đây vì nằm ngoài error.tsx của khu đó;
 * khi ấy hiện bản dành cho nhân sự với tông hồng của khu nội bộ.
 */
export default function RootError(props: ErrorBoundaryProps) {
  const pathname = usePathname();
  const area = pathname ? areaOf(pathname) : null;
  if (area) return <div className="admin-theme min-h-screen bg-cream-50 px-3 py-6 sm:px-6"><BackOfficeErrorScreen area={area} {...props} /></div>;
  return <ShopErrorScreen {...props} />;
}

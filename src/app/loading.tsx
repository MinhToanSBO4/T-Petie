'use client';

import { usePathname } from 'next/navigation';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { AdminShellSkeleton } from '@/components/admin/AdminContentSkeleton';
import { areaOf } from '@/lib/admin/back-office';

/**
 * Khung chờ gốc bọc mọi trang, kể cả layout quản trị (vốn phải chờ kiểm tra phiên).
 * Vì vậy ở /admin và /staff phải hiện khung quản trị, không hiện lưới sản phẩm của trang khách.
 */
export default function Loading() {
  const pathname = usePathname();
  if (pathname && areaOf(pathname)) return <AdminShellSkeleton pathname={pathname} />;
  return (
    <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 animate-fade-in" role="status" aria-label="Đang tải trang">
      <div className="space-y-4">
        <div className="h-7 w-48 rounded-xl shimmer" />
        <div className="h-12 max-w-xl rounded-2xl shimmer" />
        <div className="h-4 max-w-md rounded-lg shimmer" />
      </div>
      <ProductGridSkeleton />
    </main>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { AdminContentSkeleton } from '@/components/admin/AdminContentSkeleton';

/** Khung chờ khi chuyển giữa các trang quản trị (layout quản trị đã có sẵn), dựng theo bố cục trang đích. */
export default function AdminLoading() {
  const pathname = usePathname();
  return <AdminContentSkeleton pathname={pathname || '/admin'} />;
}

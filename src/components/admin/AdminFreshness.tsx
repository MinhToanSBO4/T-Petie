'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { takeAdminPagesStale } from '@/client/admin-freshness';

/** Đặt trong layout quản trị: vừa chuyển sang trang khác sau khi dữ liệu đổi thì làm mới trang đó một lần. */
export function AdminFreshness() {
  const pathname = usePathname();
  const router = useRouter();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (takeAdminPagesStale()) router.refresh();
  }, [pathname, router]);
  return null;
}

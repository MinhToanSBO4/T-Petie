'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Trang nhắc việc tự lấy số liệu mới mỗi `intervalMs` khi đang mở và ngay khi quay lại tab, để đơn mới hiện ra mà
 * không phải tải lại trang. Tab bị ẩn thì không gọi máy chủ.
 */
export function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh(); };
    const timer = setInterval(refresh, intervalMs);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [intervalMs, router]);
  return null;
}

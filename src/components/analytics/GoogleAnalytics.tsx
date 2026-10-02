'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { isBackOfficeRole } from '@/lib/admin/back-office';
import { initGoogleAnalytics } from '@/client/analytics/tracker';

const BACK_OFFICE_PATH = /^\/(admin|staff)(\/|$)/;

/**
 * Google Analytics 4 cho trang khách. Lượt xem trang (kể cả khi chuyển trang phía trình duyệt) do GA4 tự đo qua
 * Enhanced measurement, báo cáo Realtime hiện người đang truy cập trong 30 phút gần nhất.
 *
 * Không đo admin, nhân viên và khu /admin, /staff để số liệu chỉ phản ánh khách thật: chờ biết phiên đăng nhập rồi
 * mới khởi tạo gtag; nếu đăng nhập tài khoản nội bộ sau khi gtag đã chạy thì bật cờ chặn gửi của GA (`ga-disable-<ID>`).
 * Sự kiện phát sinh trong lúc chờ (ví dụ view_item) được tracker giữ lại và gửi khi khởi tạo.
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const internal = isBackOfficeRole(session?.user?.role) || BACK_OFFICE_PATH.test(pathname) || /^\/(verify-email|reset-password|forgot-password)(\/|$)/.test(pathname);
  const ready = status !== 'loading' && !internal;

  useEffect(() => {
    (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = internal;
    if (ready) initGoogleAnalytics(measurementId);
  }, [internal, ready, measurementId]);

  return ready ? <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" /> : null;
}

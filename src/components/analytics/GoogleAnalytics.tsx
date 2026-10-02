'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { isBackOfficeRole } from '@/lib/admin/back-office';

const BACK_OFFICE_PATH = /^\/(admin|staff)(\/|$)/;

/**
 * Google Analytics 4 cho trang khách. Lượt xem trang (kể cả khi chuyển trang phía trình duyệt) do GA4 tự đo qua
 * Enhanced measurement, báo cáo Realtime hiện người đang truy cập trong 30 phút gần nhất.
 *
 * Không đo admin, nhân viên và khu /admin, /staff để số liệu chỉ phản ánh khách thật: chờ biết phiên đăng nhập rồi
 * mới tải gtag; nếu đăng nhập tài khoản nội bộ sau khi gtag đã tải thì bật cờ chặn gửi của GA (`ga-disable-<ID>`).
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const internal = isBackOfficeRole(session?.user?.role) || BACK_OFFICE_PATH.test(pathname);

  useEffect(() => {
    (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = internal;
  }, [internal, measurementId]);

  if (status === 'loading' || internal) return null;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
    <Script id="google-analytics" strategy="afterInteractive">
      {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');`}
    </Script>
  </>;
}

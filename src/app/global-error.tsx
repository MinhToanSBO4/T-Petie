'use client';

import './globals.css';
import { useEffect } from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { ErrorScreen, errorButtonClass } from '@/components/error/ErrorScreen';
import { ReferenceCode } from '@/components/error/ErrorBoundaryScreen';

/**
 * Lỗi ngay ở layout gốc (header, footer, cấu hình chung chưa tải được). Trang này thay cả layout nên tự dựng <html>,
 * <body> và nạp font. Ở cấp này chưa có router: dùng tải lại trang và liên kết thường thay cho reset() và <Link>.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <html lang="vi">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{"Có chút trục trặc | T'Petie"}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Quicksand:wght@500;600;700;800&display=swap" rel="stylesheet" />
    </head>
    <body className="flex min-h-screen flex-col justify-center bg-cream-50 font-sans text-charcoal-900 antialiased">
      <main>
        <ErrorScreen illustration="spool" title="Có chút trục trặc nhỏ"
          actions={<>
            <button type="button" onClick={() => window.location.reload()} className={errorButtonClass('primary')}>
              <RefreshCw className="size-4" aria-hidden />Tải lại trang
            </button>
            <a href="/" className={errorButtonClass('secondary')}><Home className="size-4" aria-hidden />Về trang chủ</a>
          </>}
          footer={error.digest && <ReferenceCode digest={error.digest} />}>
          Website đang gián đoạn trong giây lát. Mẹ tải lại trang giúp shop nhé, giỏ hàng của mẹ vẫn được giữ nguyên.
        </ErrorScreen>
      </main>
    </body>
  </html>;
}

'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, Home, RefreshCw } from 'lucide-react';
import type { BackOfficeRole } from '@/lib/admin/back-office';
import { BACK_OFFICE_AREAS, ErrorScreen, errorButtonClass } from './ErrorScreen';

/** Props Next.js truyền cho error.tsx. `digest` chỉ có với lỗi phía máy chủ (khớp với log máy chủ). */
export type ErrorBoundaryProps = { error: Error & { digest?: string }; reset: () => void };

/**
 * Thử lại = tải lại dữ liệu máy chủ của trang rồi dựng lại phần lỗi; chỉ gọi reset() sẽ dựng lại bằng chính dữ liệu đã
 * lỗi. Lỗi được ghi ra console để tra cứu, người dùng chỉ thấy mã tham chiếu chứ không thấy nội dung lỗi.
 */
function useRetry({ error, reset }: ErrorBoundaryProps) {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  useEffect(() => { console.error(error); }, [error]);
  return { retrying, retry: () => startTransition(() => { router.refresh(); reset(); }) };
}

/** Mã tham chiếu của lỗi kèm nút sao chép, để gửi cho shop hoặc người phụ trách tra log. */
export function ReferenceCode({ digest }: { digest: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard?.writeText(digest).then(() => setCopied(true), () => undefined);
  return <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-charcoal-500">
    <span>Mã tham chiếu</span>
    <code className="select-all break-all rounded-lg bg-cream-100 px-2 py-1 font-mono text-charcoal-700">{digest}</code>
    <button type="button" onClick={copy}
      className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 font-semibold text-honey-700 transition-colors hover:bg-honey-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-honey-700">
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      <span aria-live="polite">{copied ? 'Đã sao chép' : 'Sao chép'}</span>
    </button>
  </p>;
}

function RetryButton({ retrying, retry, area }: ReturnType<typeof useRetry> & { area?: 'office' }) {
  return <button type="button" onClick={retry} disabled={retrying} className={errorButtonClass('primary', area)}>
    <RefreshCw className={`size-4 ${retrying ? 'motion-safe:animate-spin' : ''}`} aria-hidden />{retrying ? 'Đang thử lại…' : 'Thử lại'}
  </button>;
}

/** Lỗi khi dựng một trang của khách: lời trấn an, thử lại, về trang chủ và mã tham chiếu cho shop. */
export function ShopErrorScreen(props: ErrorBoundaryProps) {
  const retry = useRetry(props);
  const { digest } = props.error;
  return <ErrorScreen illustration="spool" title="Có chút trục trặc nhỏ"
    actions={<>
      <RetryButton {...retry} />
      <Link href="/" className={errorButtonClass('secondary')}><Home className="size-4" aria-hidden />Về trang chủ</Link>
    </>}
    footer={<div className="space-y-3">
      <p className="mx-auto max-w-md text-pretty text-sm text-charcoal-600">
        Nếu vẫn chưa được, mẹ nhắn shop qua mục <strong className="font-semibold text-charcoal-800">Kết nối với T&apos;Petie</strong> ở
        cuối trang{digest ? ' và gửi kèm mã bên dưới' : ''} nhé.
      </p>
      {digest && <ReferenceCode digest={digest} />}
    </div>}>
    Trang chưa tải xong do một lỗi tạm thời. Mẹ thử lại giúp shop nhé, giỏ hàng của mẹ vẫn được giữ nguyên.
  </ErrorScreen>;
}

/** Lỗi của một trang trong khu nội bộ: hiện trong khung khu đó để vẫn chuyển sang mục khác được. */
export function BackOfficeErrorScreen({ area, ...props }: ErrorBoundaryProps & { area: BackOfficeRole }) {
  const retry = useRetry(props);
  const { home, homeLabel, homeIcon: HomeIcon, support } = BACK_OFFICE_AREAS[area];
  const { digest } = props.error;
  return <ErrorScreen area="office" illustration="spool" title="Trang này đang gặp sự cố"
    actions={<>
      <RetryButton {...retry} area="office" />
      <Link href={home} className={errorButtonClass('secondary', 'office')}><HomeIcon className="size-4" aria-hidden />{homeLabel}</Link>
    </>}
    footer={<div className="space-y-3">
      <p className="mx-auto max-w-md text-pretty text-sm text-charcoal-600">
        {digest ? `Nếu lỗi lặp lại, gửi mã này cho ${support}.` : `Nếu lỗi lặp lại, báo cho ${support} kèm thao tác vừa làm.`}
      </p>
      {digest && <ReferenceCode digest={digest} />}
    </div>}>
    Nội dung chưa tải được do lỗi tạm thời. Bấm Thử lại để tải lại; dữ liệu đã lưu không bị ảnh hưởng.
  </ErrorScreen>;
}

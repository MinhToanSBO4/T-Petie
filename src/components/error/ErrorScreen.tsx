import type { ReactNode } from 'react';
import Link from 'next/link';
import { BarChart3, Home, MessageCircle, MessageCircleHeart, Phone, ShoppingBag, type LucideIcon } from 'lucide-react';
import type { BackOfficeRole } from '@/lib/admin/back-office';
import { telHref, type ContactInfo } from '@/lib/content/site-content';
import { ErrorIllustration, type ErrorIllustrationName } from './ErrorIllustration';

/** `shop`: giao diện khách (thẻ bo tròn lớn, nút bo tròn). `office`: nằm trong khung khu nội bộ, gọn như một panel. */
export type ErrorArea = 'shop' | 'office';

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey-700';

/**
 * Nút của màn hình lỗi. Nút chính ở giao diện khách dùng nền mật ong đậm (700) để chữ trắng đạt tương phản AA
 * (nền 500 chỉ đạt 2:1); khu nội bộ dùng nút bo góc như các trang quản trị.
 */
export function errorButtonClass(kind: 'primary' | 'secondary', area: ErrorArea = 'shop') {
  const shape = area === 'shop' ? 'rounded-full' : 'rounded-xl';
  const tone = kind === 'secondary'
    ? `border border-cream-300 bg-white text-charcoal-700 ${area === 'shop' ? 'hover:bg-cream-100' : 'hover:bg-honey-50'}`
    : area === 'shop' ? 'bg-honey-700 text-white shadow-md hover:bg-honey-800' : 'bg-honey-600 text-white hover:bg-honey-700';
  return `inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-70 ${focusRing} ${shape} ${tone}`;
}

/**
 * Khung chung của mọi màn hình lỗi (404, 403, lỗi tải trang) để cả website nói cùng một giọng: minh họa nhỏ, mã lỗi,
 * tiêu đề, lời trấn an và các lối đi tiếp. Không dùng hook nên dùng được ở cả server component lẫn error boundary.
 * `children` là lời giải thích; `footer` (liên hệ, mã tham chiếu) tự ẩn khi không có gì để hiện.
 */
export function ErrorScreen({ illustration, code, title, children, actions, footer, area = 'shop' }: {
  illustration: ErrorIllustrationName; code?: number; title: string; children: ReactNode;
  actions: ReactNode; footer?: ReactNode; area?: ErrorArea;
}) {
  const shop = area === 'shop';
  return <div className={shop ? 'px-4 py-10 sm:px-6 sm:py-16' : ''}>
    <div className={`mx-auto max-w-2xl border border-cream-200 bg-white px-5 py-10 text-center ${shop
      ? 'rounded-3xl shadow-soft sm:px-10 sm:py-14' : 'rounded-2xl shadow-card sm:px-10'}`}>
      <ErrorIllustration name={illustration} className={`mx-auto ${shop ? 'size-36 sm:size-44' : 'size-28 sm:size-32'}`} />
      {code && <p className="mt-2 inline-flex rounded-full bg-honey-50 px-3 py-1 text-xs font-semibold text-honey-800 ring-1 ring-inset ring-honey-200">
        Mã lỗi {code}</p>}
      <h1 className={`mt-3 text-balance font-heading font-bold text-charcoal-900 ${shop ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>{title}</h1>
      <div className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-relaxed text-charcoal-600 sm:text-base">{children}</div>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">{actions}</div>
      {footer && <div className="mt-8 border-t border-cream-200 pt-6 empty:hidden">{footer}</div>}
    </div>
  </div>;
}

/** "Cần shop hỗ trợ?" với các kênh liên hệ đã cấu hình trong nội dung website; không có kênh nào thì không hiện. */
export function SupportContacts({ contact }: { contact?: ContactInfo | null }) {
  const links: { href: string; label: string; icon: LucideIcon; external?: boolean }[] = [];
  if (contact?.zaloUrl) links.push({ href: contact.zaloUrl, label: 'Nhắn Zalo', icon: MessageCircle, external: true });
  if (contact?.messengerUrl) links.push({ href: contact.messengerUrl, label: 'Nhắn Messenger', icon: MessageCircleHeart, external: true });
  if (contact?.hotline) links.push({ href: telHref(contact.hotline), label: `Gọi ${contact.hotline}`, icon: Phone });
  if (!links.length) return null;
  return <div>
    <p className="font-heading text-base font-bold text-charcoal-900">Cần shop hỗ trợ?</p>
    <p className="mt-1 text-pretty text-sm text-charcoal-600">
      Mẹ cứ nhắn hoặc gọi, shop luôn sẵn lòng giúp mẹ{contact?.hotlineHours ? ` (${contact.hotlineHours})` : ''}.
    </p>
    <ul className="mt-4 flex flex-wrap justify-center gap-2">
      {links.map(({ href, label, icon: Icon, external }) => <li key={href}>
        <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border border-cream-300 bg-cream-50 px-4 text-sm font-semibold text-charcoal-800 transition-colors hover:border-honey-300 hover:bg-honey-50 ${focusRing}`}>
          <Icon className="size-4 text-honey-700" aria-hidden />{label}
        </a>
      </li>)}
    </ul>
  </div>;
}

/** Lối về trang chính và người cần báo khi lỗi lặp lại, theo từng khu nội bộ. */
export const BACK_OFFICE_AREAS: Record<BackOfficeRole, { home: string; homeLabel: string; homeIcon: LucideIcon; support: string }> = {
  admin: { home: '/admin', homeLabel: 'Về Tổng quan', homeIcon: BarChart3, support: 'người phụ trách kỹ thuật' },
  staff: { home: '/staff', homeLabel: 'Về Trang chủ', homeIcon: Home, support: 'quản trị viên' },
};

/** Trang 404 trong khung khu nội bộ: lời ngắn gọn, thực tế; header và thanh bên vẫn dùng được. */
export function BackOfficeNotFound({ area }: { area: BackOfficeRole }) {
  const { home, homeLabel, homeIcon: HomeIcon } = BACK_OFFICE_AREAS[area];
  return <ErrorScreen area="office" illustration="dress" code={404} title="Không tìm thấy trang này"
    actions={<>
      <Link href={home} className={errorButtonClass('primary', 'office')}><HomeIcon className="size-4" aria-hidden />{homeLabel}</Link>
      <Link href={`${home}/orders`} className={errorButtonClass('secondary', 'office')}><ShoppingBag className="size-4" aria-hidden />Mở Đơn hàng</Link>
    </>}>
    Đường dẫn có thể đã cũ, bị gõ nhầm hoặc nội dung đã bị xóa. Chọn mục cần mở ở thanh bên trái, hoặc quay về trang chính.
  </ErrorScreen>;
}

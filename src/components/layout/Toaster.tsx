'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Heart, Loader2, Sparkles, X, XCircle, type LucideIcon } from 'lucide-react';
import { getServerToasts, getToasts, subscribeToasts, toast, type ToastItem, type ToastType } from '@/client/toast';
import { areaOf } from '@/lib/admin/back-office';

// Biểu tượng đạt tương phản ≥ 3:1 trên nền thẻ (WCAG 2.2 cho thành phần đồ họa); chữ luôn là charcoal.
const LOOK: Record<ToastType, { Icon: LucideIcon; icon: string; card: string }> = {
  success: { Icon: CheckCircle2, icon: 'text-sage-600', card: 'border-sage-200 bg-white/95' },
  error: { Icon: XCircle, icon: 'text-blush-700', card: 'border-blush-200 bg-blush-50/95' },
  warning: { Icon: AlertTriangle, icon: 'text-honey-700', card: 'border-honey-200 bg-honey-50/95' },
  info: { Icon: Sparkles, icon: 'text-honey-600', card: 'border-cream-200 bg-white/95' },
  love: { Icon: Heart, icon: 'fill-blush-500 text-blush-500', card: 'border-cream-200 bg-white/95' },
  loading: { Icon: Loader2, icon: 'text-honey-600 motion-safe:animate-spin', card: 'border-cream-200 bg-white/95' },
};

/** Tab đang ẩn thì thông báo không tự đóng, quay lại vẫn kịp đọc. */
function usePageHidden() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return hidden;
}

/** Mất mạng thì báo ngay (thao tác lúc đó sẽ không gửi được), có mạng lại thì báo đã kết nối. */
function useConnectionNotices() {
  useEffect(() => {
    const offline = () => toast.warning('Mất kết nối mạng', {
      id: 'network-status', description: 'Kiểm tra Wi-Fi hoặc dữ liệu di động rồi thử lại.', duration: Infinity,
    });
    const online = () => toast.success('Đã có mạng trở lại', { id: 'network-status' });
    if (!navigator.onLine) offline();
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, []);
}

function ToastCard({ item, paused }: { item: ToastItem; paused: boolean }) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const { Icon, icon, card } = LOOK[item.type];

  // Rê chuột hoặc đặt focus vào thông báo thì tạm dừng tự đóng (WCAG 2.2.1); nội dung đổi thì tính lại từ đầu.
  useEffect(() => {
    if (paused || hovered || focused || !Number.isFinite(item.duration)) return;
    const timer = window.setTimeout(() => toast.dismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.id, item.duration, item.version, paused, hovered, focused]);

  const action = item.action;
  const actionClass = 'mt-2 inline-flex min-h-8 items-center rounded-full border border-honey-200 bg-white px-3 text-xs font-bold text-honey-700 transition-colors hover:bg-honey-50';

  return (
    <motion.div
      layout={reduceMotion ? false : 'position'}
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.95, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      // Chỉ chuột mới tạm dừng: chạm trên điện thoại giả lập mouseenter mà không có mouseleave, thông báo sẽ kẹt mãi.
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovered(false); }}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
      onKeyDown={(event) => { if (event.key === 'Escape') toast.dismiss(item.id, { byUser: true }); }}
      className={`pointer-events-auto relative w-full rounded-2xl border py-3 pl-3.5 pr-10 text-charcoal-900 shadow-lg shadow-charcoal-900/5 backdrop-blur-md ${card}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-px size-5 shrink-0 ${icon}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{item.message}</p>
          {item.description && <p className="mt-0.5 text-xs leading-relaxed text-charcoal-600">{item.description}</p>}
          {item.progress !== null && (
            <div className="mt-2 flex items-center gap-2">
              <div role="progressbar" aria-label={item.message} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-200">
                <div className="h-full rounded-full bg-honey-500 transition-[width] duration-300 ease-out" style={{ width: `${item.progress}%` }} />
              </div>
              {/* Số phần trăm đã có ở aria-valuenow; để trong vùng aria-live thì mỗi bước 1% đều bị đọc lên. */}
              <span aria-hidden className="w-9 text-right text-[11px] font-semibold tabular-nums text-charcoal-600">{item.progress}%</span>
            </div>
          )}
          {action && (action.href
            ? (action.download || action.href.startsWith('/api/')
              ? <a href={action.href} download={action.download || undefined} className={actionClass}
                  onClick={() => toast.dismiss(item.id)}>{action.label}</a>
              : <Link href={action.href} className={actionClass} onClick={() => toast.dismiss(item.id)}>{action.label}</Link>)
            : <button type="button" className={actionClass}
                onClick={() => { action.onClick?.(); toast.dismiss(item.id); }}>{action.label}</button>)}
        </div>
      </div>
      <button type="button" aria-label="Đóng thông báo" onClick={() => toast.dismiss(item.id, { byUser: true })}
        className="absolute right-1.5 top-1.5 rounded-full p-1.5 text-charcoal-500 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900">
        <X className="size-4" aria-hidden />
      </button>
    </motion.div>
  );
}

/**
 * Thông báo nổi ở góc phải trên: lỗi, đang xử lý, tiến độ tải ảnh/tạo file, kết quả thao tác. Nằm ngay dưới header
 * (h-16) để không che logo, giỏ hàng, tài khoản; ở điện thoại trải ngang màn hình với lề 12px.
 */
export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  const pathname = usePathname();
  const backOffice = Boolean(pathname && areaOf(pathname));
  const hidden = usePageHidden();
  useConnectionNotices();

  return (
    <section aria-label="Thông báo"
      className={`pointer-events-none fixed inset-x-3 top-[4.5rem] z-[90] md:inset-x-auto md:right-6 md:top-20 md:w-96 ${
        backOffice ? 'admin-theme' : ''}`}>
      {/* Mới nhất nằm trên cùng, sát mép trên; thông báo cũ trượt xuống dưới. */}
      <div aria-live="polite" aria-relevant="additions text" className="flex max-h-[calc(100dvh-6rem)] flex-col-reverse gap-2 overflow-hidden">
        <AnimatePresence initial={false}>
          {items.map((item) => <ToastCard key={item.id} item={item} paused={hidden} />)}
        </AnimatePresence>
      </div>
    </section>
  );
}

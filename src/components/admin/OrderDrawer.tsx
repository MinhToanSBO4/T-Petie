'use client';

import { useEffect, useRef } from 'react';
import { Check, Copy, Loader2, Phone, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge';
import { ADMIN_NEXT_STEP, orderStatusLabel } from '@/lib/orders/status';
import {
  autoCompleteDate, formatDateTime, formatPrice, fullAddress, reachedAt, type AdminOrder,
} from '@/components/admin/order-admin';

const STEPS = [
  { status: 'PENDING', label: 'Đặt hàng' },
  { status: 'CONFIRMED', label: 'Xác nhận' },
  { status: 'PROCESSING', label: 'Đóng gói' },
  { status: 'SHIPPING', label: 'Đang giao' },
  { status: 'COMPLETED', label: 'Đã giao' },
] as const;

const ACTOR_LABEL = { admin: 'Quản trị viên', customer: 'Khách hàng', system: 'Hệ thống' } as const;

/** Gợi ý việc cần làm ở từng bước, hiện ngay trên nút thao tác chính. */
const STEP_HINT: Record<string, string> = {
  PENDING: 'Gọi hoặc nhắn khách để xác nhận đơn trước khi bấm.',
  CONFIRMED: 'Kiểm tra hàng và size, rồi bắt đầu đóng gói.',
  PROCESSING: 'Bấm khi đã bàn giao kiện hàng cho shipper.',
  SHIPPING: 'Bấm khi shipper báo đã giao và thu tiền. Khách cũng có thể tự bấm "Đã nhận được hàng".',
};

/**
 * Chi tiết đơn dạng ngăn kéo bên phải: danh sách phía sau vẫn giữ nguyên chỗ đang xem.
 * Gồm tiến trình xử lý, thao tác cho bước kế tiếp, thông tin giao hàng sao chép được, tiền và lịch sử.
 */
export function OrderDrawer({ order, busy, onAdvance, onCancel, onClose }: {
  order: AdminOrder; busy: boolean;
  onAdvance: () => void; onCancel: () => void; onClose: () => void;
}) {
  const { showToast } = useToast();
  const closeButton = useRef<HTMLButtonElement>(null);
  const next = ADMIN_NEXT_STEP[order.orderStatus];
  const cancelled = order.orderStatus === 'CANCELLED';
  const currentIndex = STEPS.findIndex((step) => step.status === order.orderStatus);
  const autoComplete = autoCompleteDate(order);
  const cancelEvent = cancelled ? order.events.findLast((event) => event.status === 'CANCELLED') : undefined;

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); showToast(`Đã sao chép ${label}`, 'success'); }
    catch { showToast('Không sao chép được, vui lòng chọn và sao chép thủ công', 'info'); }
  };
  const shippingLabel = `${order.customerName}\n${order.customerPhone}\n${fullAddress(order)}`
    + (order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID' ? `\nThu hộ: ${formatPrice(order.totalAmount)}` : '');

  return <div className="fixed inset-0 z-50 flex justify-end">
    <button type="button" aria-label="Đóng chi tiết đơn" tabIndex={-1} onClick={onClose}
      className="absolute inset-0 bg-charcoal-900/30 motion-safe:animate-fade-in" />
    <aside role="dialog" aria-modal="true" aria-labelledby="order-drawer-title"
      className="relative flex h-full w-full max-w-xl flex-col bg-cream-50 shadow-2xl motion-safe:animate-slide-up sm:motion-safe:animate-fade-in">
      <header className="flex items-start justify-between gap-3 border-b border-cream-200 bg-white px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="order-drawer-title" className="text-lg font-bold text-charcoal-900">Đơn {order.orderCode}</h2>
            <OrderStatusBadge status={order.orderStatus} />
          </div>
          <p className="text-xs text-charcoal-500">Đặt lúc {formatDateTime(order.createdAt)}</p>
        </div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Đóng"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-cream-300 bg-white text-charcoal-600 hover:bg-cream-100">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <section className="rounded-2xl border border-cream-200 bg-white p-4" aria-label="Tiến trình đơn">
          <ol className="grid grid-cols-5 gap-1">
            {STEPS.map((step, index) => {
              const at = reachedAt(order, step.status);
              const done = cancelled ? Boolean(at) : index < currentIndex || order.orderStatus === 'COMPLETED';
              const current = !cancelled && index === currentIndex && order.orderStatus !== 'COMPLETED';
              return <li key={step.status} aria-current={current ? 'step' : undefined} className="flex flex-col items-center text-center">
                <span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${done ? 'bg-sage-600 text-white'
                  : current ? 'bg-honey-600 text-white ring-4 ring-honey-100' : 'bg-white text-charcoal-400 ring-2 ring-cream-300'}`}>
                  {done ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
                </span>
                <span className={`mt-1.5 text-xs ${current ? 'font-bold text-charcoal-900' : done ? 'font-semibold text-charcoal-800' : 'text-charcoal-500'}`}>{step.label}</span>
                {(done || current) && at && <span className="text-[11px] leading-tight text-charcoal-500">{formatDateTime(at)}</span>}
              </li>;
            })}
          </ol>
          {cancelled && <p className="mt-4 rounded-xl bg-blush-50 p-3 text-sm text-blush-900">
            <strong>Đã hủy</strong>{cancelEvent && ` lúc ${formatDateTime(cancelEvent.createdAt)}`}
            {cancelEvent?.note && <> · Lý do: {cancelEvent.note}</>}
          </p>}
          {autoComplete && <p className="mt-4 rounded-xl bg-cream-100 p-3 text-xs text-charcoal-700">
            Khách chưa xác nhận đã nhận hàng. Nếu không có phản hồi, đơn tự hoàn tất vào <strong>{autoComplete.toLocaleDateString('vi-VN')}</strong>.
          </p>}
        </section>

        <section className="space-y-3 rounded-2xl border border-cream-200 bg-white p-4" aria-label="Thông tin giao hàng">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-charcoal-900">{order.customerName}</p>
              <a href={`tel:${order.customerPhone}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-honey-700 hover:underline">
                <Phone className="h-3.5 w-3.5" aria-hidden />{order.customerPhone}
              </a>
              {order.customerEmail && <p className="text-xs text-charcoal-500">{order.customerEmail}</p>}
            </div>
            <button type="button" onClick={() => void copy(shippingLabel, 'thông tin giao hàng')}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-cream-300 px-3 text-xs font-semibold text-charcoal-700 hover:bg-cream-50">
              <Copy className="h-3.5 w-3.5" aria-hidden />Sao chép
            </button>
          </div>
          <p className="text-sm text-charcoal-800">{fullAddress(order)}</p>
          {order.note && <p className="whitespace-pre-line rounded-xl bg-honey-50 p-3 text-sm text-charcoal-800"><strong>Ghi chú của khách:</strong> {order.note}</p>}
          {order.source && <p className="text-xs text-charcoal-500">Biết đến shop qua: {order.source}</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-cream-200 bg-white" aria-label="Sản phẩm và thanh toán">
          <ul className="divide-y divide-cream-100">
            {order.items.map((item, index) => <li key={index} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0"><span className="font-semibold text-charcoal-900">{item.name}</span>
                <span className="block text-xs text-charcoal-500">Size {item.size} · SL {item.quantity}</span></span>
              <span className="shrink-0 tabular-nums">{formatPrice(item.total)}</span>
            </li>)}
          </ul>
          <dl className="space-y-1 border-t border-cream-200 bg-cream-50 px-4 py-3 text-sm">
            <div className="flex justify-between"><dt className="text-charcoal-600">Tạm tính</dt><dd className="tabular-nums">{formatPrice(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-charcoal-600">Phí giao hàng</dt><dd className="tabular-nums">{order.shippingFee ? formatPrice(order.shippingFee) : 'Miễn phí'}</dd></div>
            {order.discountAmount > 0 && <div className="flex justify-between"><dt className="text-charcoal-600">Giảm giá{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd className="tabular-nums">−{formatPrice(order.discountAmount)}</dd></div>}
            <div className="flex justify-between pt-1 text-base font-bold"><dt>Tổng cộng</dt><dd className="tabular-nums">{formatPrice(order.totalAmount)}</dd></div>
            <div className="flex justify-between text-xs"><dt className="text-charcoal-600">Thanh toán</dt>
              <dd>{order.paymentMethod === 'COD' ? 'Thu hộ khi giao (COD)' : order.paymentMethod} · {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</dd></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-cream-200 bg-white p-4" aria-label="Lịch sử đơn">
          <h3 className="mb-2 text-sm font-bold text-charcoal-900">Lịch sử</h3>
          <ol className="space-y-2 text-sm">
            {[...order.events].reverse().map((event, index) => <li key={index} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cream-300" aria-hidden />
              <span className="min-w-0">
                <span className="font-semibold text-charcoal-800">{orderStatusLabel(event.status)}</span>
                <span className="text-xs text-charcoal-500"> · {formatDateTime(event.createdAt)}{event.actor ? ` · ${ACTOR_LABEL[event.actor]}` : ''}</span>
                {event.note && <span className="block text-xs text-charcoal-600">{event.note}</span>}
              </span>
            </li>)}
            <li className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cream-300" aria-hidden />
              <span><span className="font-semibold text-charcoal-800">Đặt hàng</span>
                <span className="text-xs text-charcoal-500"> · {formatDateTime(order.createdAt)} · Khách hàng</span></span>
            </li>
          </ol>
        </section>
      </div>

      {(next || !cancelled && order.orderStatus !== 'COMPLETED') && <footer className="space-y-2 border-t border-cream-200 bg-white px-5 py-4">
        {STEP_HINT[order.orderStatus] && <p className="text-xs text-charcoal-600">{STEP_HINT[order.orderStatus]}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onCancel} disabled={busy}
            className="min-h-11 rounded-xl border border-blush-200 px-4 text-sm font-semibold text-blush-700 hover:bg-blush-50 disabled:opacity-50">
            {order.orderStatus === 'SHIPPING' ? 'Giao không thành công' : 'Hủy đơn'}
          </button>
          {next && <button type="button" onClick={onAdvance} disabled={busy}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white hover:bg-honey-700 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{next.label}
          </button>}
        </div>
      </footer>}
    </aside>
  </div>;
}

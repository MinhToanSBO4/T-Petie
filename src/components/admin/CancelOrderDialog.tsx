'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CANCEL_REASON_MAX, CANCEL_REASONS, restocksOnCancel } from '@/lib/orders/status';

const OTHER = '__other__';

/**
 * Hộp thoại hủy đơn: bắt buộc chọn lý do (lưu vào lịch sử đơn, khách xem được) và nói rõ hệ quả.
 * `shipping` = đơn đang giao, khi đó hủy nghĩa là giao không thành công và dùng bộ lý do riêng.
 */
export function CancelOrderDialog({ count, shipping, busy, onConfirm, onClose }: {
  count: number; shipping: boolean; busy: boolean;
  onConfirm: (reason: string) => void; onClose: () => void;
}) {
  const reasons = shipping ? CANCEL_REASONS.shipping : CANCEL_REASONS.beforeShipping;
  const [choice, setChoice] = useState<string>('');
  const [other, setOther] = useState('');
  const titleId = useId();
  const firstOption = useRef<HTMLInputElement>(null);
  const reason = choice === OTHER ? other.trim() : choice;
  const title = shipping ? 'Giao hàng không thành công' : count > 1 ? `Hủy ${count} đơn hàng` : 'Hủy đơn hàng';

  useEffect(() => {
    firstOption.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-charcoal-900/40 p-0 sm:items-center sm:p-4"
    onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <form role="dialog" aria-modal="true" aria-labelledby={titleId}
      onSubmit={(event) => { event.preventDefault(); if (reason) onConfirm(reason); }}
      className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-5 shadow-2xl motion-safe:animate-scale-up sm:rounded-3xl">
      <div>
        <h2 id={titleId} className="text-lg font-bold text-charcoal-900">{title}</h2>
        <p className="mt-1 text-sm text-charcoal-600">
          {reason && !restocksOnCancel(reason)
            ? 'Với lý do này, tồn kho KHÔNG được cộng lại (hàng không còn bán được); lượt dùng mã giảm giá vẫn được hoàn.'
            : shipping ? 'Đơn sẽ chuyển sang Đã hủy, hàng hoàn về được cộng lại vào kho.' : 'Tồn kho và lượt dùng mã giảm giá sẽ được hoàn lại.'}
          {' '}Thao tác này không hoàn tác được.
        </p>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-charcoal-800">Lý do (khách sẽ thấy lý do này)</legend>
        {[...reasons, OTHER].map((value, index) => <label key={value}
          className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm transition-colors ${
            choice === value ? 'border-blush-300 bg-blush-50' : 'border-cream-200 hover:bg-cream-50'}`}>
          <input ref={index === 0 ? firstOption : undefined} type="radio" name="cancel-reason" value={value}
            checked={choice === value} onChange={() => setChoice(value)} className="accent-blush-700" />
          {value === OTHER ? 'Lý do khác' : value}
        </label>)}
        {choice === OTHER && <input autoFocus value={other} maxLength={CANCEL_REASON_MAX} onChange={(event) => setOther(event.target.value)}
          placeholder="Nhập lý do" aria-label="Lý do khác"
          className="min-h-11 w-full rounded-xl border border-cream-300 px-3 text-sm" />}
      </fieldset>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={busy}
          className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold disabled:opacity-50">Không hủy</button>
        <button type="submit" disabled={busy || !reason}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blush-700 px-5 text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {shipping ? 'Xác nhận giao không thành công' : count > 1 ? `Hủy ${count} đơn` : 'Hủy đơn'}
        </button>
      </div>
    </form>
  </div>;
}

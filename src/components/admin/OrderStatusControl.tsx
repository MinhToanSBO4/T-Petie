'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { orderStatusLabel } from '@/lib/orders/status';

const nextStatuses: Record<string, { value: string; label: string }[]> = {
  PENDING: [{ value: 'CONFIRMED', label: 'Xác nhận' }, { value: 'CANCELLED', label: 'Hủy' }],
  CONFIRMED: [{ value: 'PROCESSING', label: 'Chuẩn bị hàng' }, { value: 'CANCELLED', label: 'Hủy' }],
  PROCESSING: [{ value: 'SHIPPING', label: 'Đang giao' }, { value: 'CANCELLED', label: 'Hủy' }],
  SHIPPING: [{ value: 'COMPLETED', label: 'Hoàn tất' }],
};

/**
 * Nút chuyển trạng thái đơn theo đúng quy trình. Sau khi máy chủ xác nhận, báo trạng thái mới
 * cho màn hình cha để hiển thị ngay (trước đây màn hình giữ trạng thái cũ, bấm tiếp sẽ báo lỗi).
 */
export function OrderStatusControl({ code, status, onChanged }: {
  code: string; status: string; onChanged: (status: string) => void;
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const change = async (next: string) => {
    if (next === 'CANCELLED' && !confirm(`Hủy đơn ${code}? Tồn kho sẽ được hoàn lại.`)) return;
    setPending(next);
    setError('');
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(code)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Cập nhật thất bại');
      onChanged(next);
      // Trang Tổng quan đang lưu trong trình duyệt cũng phải lấy số liệu mới.
      router.refresh();
      showToast(`Đơn ${code}: ${orderStatusLabel(next)}`, 'success');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Có lỗi xảy ra'); }
    finally { setPending(null); }
  };
  const options = nextStatuses[status] || [];
  if (options.length === 0) return <p className="text-sm text-charcoal-600">Đơn đã ở trạng thái cuối, không cần thao tác thêm.</p>;
  return <div className="flex flex-wrap items-center gap-2">
    {options.map((entry) => <button key={entry.value} type="button" disabled={pending !== null} onClick={() => change(entry.value)}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${entry.value === 'CANCELLED'
        ? 'border border-blush-200 text-blush-700 hover:bg-blush-50'
        : 'bg-honey-600 text-white hover:bg-honey-700'}`}>
      {pending === entry.value && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {entry.label}
    </button>)}
    {error && <span role="alert" className="text-sm text-blush-700">{error}</span>}
  </div>;
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const nextStatuses: Record<string, { value: string; label: string }[]> = {
  PENDING: [{ value: 'CONFIRMED', label: 'Xác nhận' }, { value: 'CANCELLED', label: 'Hủy' }],
  CONFIRMED: [{ value: 'PROCESSING', label: 'Chuẩn bị hàng' }, { value: 'CANCELLED', label: 'Hủy' }],
  PROCESSING: [{ value: 'SHIPPING', label: 'Đang giao' }, { value: 'CANCELLED', label: 'Hủy' }],
  SHIPPING: [{ value: 'COMPLETED', label: 'Hoàn tất' }],
};

export function OrderStatusControl({ code, status }: { code: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const change = async (next: string) => {
    if (next === 'CANCELLED' && !confirm(`Hủy đơn ${code}? Tồn kho sẽ được hoàn lại.`)) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(code)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Cập nhật thất bại');
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Có lỗi xảy ra'); }
    finally { setPending(false); }
  };
  return <div className="flex flex-wrap gap-2">
    {nextStatuses[status]?.map((entry) => <button key={entry.value} disabled={pending} onClick={() => change(entry.value)}
      className="px-3 py-1.5 rounded-lg border border-cream-300 text-xs font-bold disabled:opacity-50">{entry.label}</button>)}
    {error && <span className="text-xs text-red-600">{error}</span>}
  </div>;
}

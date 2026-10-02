'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

/**
 * Lấy số liệu mới nhất rồi dựng lại trang, giữ nguyên vị trí cuộn. `clearCache`: xóa cache số liệu tổng quan trên máy
 * chủ trước (chỉ quản trị viên); trang không cache như trang chủ nhân viên chỉ cần dựng lại.
 */
export function RefreshButton({ clearCache = true }: { clearCache?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const loading = busy || pending;
  const refresh = async () => {
    if (clearCache) {
      setBusy(true);
      try { await fetch('/api/admin/dashboard/refresh', { method: 'POST' }); }
      finally { setBusy(false); }
    }
    startTransition(() => router.refresh());
  };
  return <button type="button" onClick={() => void refresh()} disabled={loading}
    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-charcoal-700 transition-colors hover:border-honey-300 hover:text-honey-700 disabled:opacity-50">
    <RefreshCw className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} aria-hidden />
    {loading ? 'Đang làm mới…' : 'Làm mới'}
  </button>;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type ExportJob = {
  id: string; status: string; fileName: string | null; orderCount: number;
  error: string | null; createdAt: string; completedAt: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Đang chờ xử lý', processing: 'Đang tạo file', completed: 'Hoàn tất', failed: 'Thất bại',
};
const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-cream-200 text-charcoal-700', processing: 'bg-honey-100 text-honey-800',
  completed: 'bg-sage-100 text-sage-800', failed: 'bg-blush-100 text-blush-700',
};
const formatTime = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : '—';

export function ExportManager() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const notified = useRef(new Set<string>());

  const load = useCallback(async (): Promise<ExportJob[]> => {
    const response = await fetch('/api/admin/export', { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    const list: ExportJob[] = data.jobs || [];
    setJobs(list);
    return list;
  }, []);

  // File đã xong từ trước khi mở trang thì không báo lại là "vừa xong".
  useEffect(() => {
    void load().then((list) => list.forEach((job) => { if (job.status === 'completed') notified.current.add(job.id); }));
  }, [load]);

  // Theo dõi tiến trình đang chạy và thông báo ngay khi file sẵn sàng.
  useEffect(() => {
    const running = jobs.some((job) => job.status === 'pending' || job.status === 'processing');
    if (!running) return;
    const timer = setInterval(() => {
      void load().then((list) => {
        const finished = list.find((job) => job.status === 'completed' && !notified.current.has(job.id));
        if (!finished) return;
        notified.current.add(finished.id);
        setMessage(`Đã tạo xong file ${finished.fileName} (${finished.orderCount} đơn). Bấm "Tải file" để nhận.`);
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [jobs, load]);

  const startExport = async () => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/export', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không bắt đầu được tiến trình xuất');
      setMessage('Đã bắt đầu tạo file. Bạn có thể tiếp tục làm việc khác, hệ thống sẽ báo khi file sẵn sàng.');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <header>
      <h1 className="text-3xl font-bold font-heading">Xuất dữ liệu</h1>
      <p className="mt-1 text-sm text-charcoal-600">Một file Excel gồm các tab: đơn hàng, chi tiết sản phẩm, thanh toán &amp; giao hàng,
        khách hàng, nhân sự, sản phẩm &amp; tồn kho, mã giảm giá, đánh giá.</p>
    </header>
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm text-charcoal-900">{message}</p>}

    <button type="button" disabled={busy} onClick={() => void startExport()}
      className="min-h-11 rounded-xl bg-honey-600 px-6 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang bắt đầu…' : 'Tạo file Excel mới'}
    </button>

    <section className="space-y-3">
      <h2 className="text-xl font-bold">Lịch sử xuất dữ liệu</h2>
      {jobs.map((job) => <article key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-4">
        <div>
          <p className="text-sm font-semibold">{job.fileName || 'File dữ liệu'}</p>
          <p className="text-xs text-charcoal-600">Bắt đầu {formatTime(job.createdAt)}
            {job.status === 'completed' ? ` · ${job.orderCount} đơn · xong lúc ${formatTime(job.completedAt)}` : ''}</p>
          {job.error && <p className="text-xs text-red-700">{job.error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[job.status] || 'bg-cream-200 text-charcoal-700'}`}>
            {STATUS_LABEL[job.status] || job.status}
          </span>
          {job.status === 'completed' && <a href={`/api/admin/export/${job.id}/download`}
            className="min-h-11 rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-bold text-white">Tải file</a>}
        </div>
      </article>)}
      {jobs.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-sm text-charcoal-600">Chưa có lần xuất dữ liệu nào.</p>}
    </section>
  </div>;
}

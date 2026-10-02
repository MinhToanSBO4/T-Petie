'use client';

import { useEffect, useState } from 'react';
import { readJson } from '@/client/http';
import { errorText, toast } from '@/client/toast';

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

/** File xuất được xóa khỏi kho lưu trữ sau số ngày này (cron hằng ngày), giống EXPORT_RETENTION_DAYS ở máy chủ. */
const RETENTION_DAYS = 7;
const expired = (job: { completedAt: string | null }) =>
  Boolean(job.completedAt) && Date.now() - new Date(job.completedAt!).getTime() > RETENTION_DAYS * 86_400_000;

const POLL_MS = 3000;
/** Không hỏi được máy chủ (mất mạng…) lâu hơn chừng này thì thôi; tiến trình nào cũng bị máy chủ dừng sau 3 phút. */
const WATCH_LIMIT_MS = 5 * 60_000;
const running = (job: ExportJob) => job.status === 'pending' || job.status === 'processing';

/*
 * Theo dõi tiến trình nằm ngoài component: rời trang Xuất dữ liệu vẫn được báo khi file xong, quay lại không báo trùng.
 * toastIds: tiến trình đang có thông báo "đang tạo" (id giữ nguyên từ lúc bấm tạo file tới khi có kết quả).
 * settled: đã báo kết quả, hoặc đã xong từ trước khi theo dõi nên không báo là "vừa xong".
 */
const toastIds = new Map<string, string>();
const settled = new Set<string>();
let showJobs: ((jobs: ExportJob[]) => void) | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let watchUntil = 0;

async function fetchJobs(): Promise<ExportJob[]> {
  const response = await fetch('/api/admin/export', { cache: 'no-store' });
  const data = await readJson(response);
  if (!response.ok) throw new Error(String(data.error || 'Không tải được lịch sử xuất dữ liệu'));
  return Array.isArray(data.jobs) ? data.jobs as ExportJob[] : [];
}

/** Mỗi tiến trình một thông báo: "đang tạo" rồi đổi tại chỗ thành file đã xong (kèm nút tải) hoặc lỗi. */
function track(jobs: ExportJob[]) {
  for (const job of jobs) {
    if (settled.has(job.id)) continue;
    if (running(job)) {
      if (!toastIds.has(job.id)) toastIds.set(job.id, `export-${job.id}`);
      toast.loading('Đang tạo file Excel…', { id: toastIds.get(job.id) });
      continue;
    }
    settled.add(job.id);
    const id = toastIds.get(job.id);
    if (!id) continue;
    if (job.status === 'completed') {
      toast.success('Đã tạo xong file Excel', { id, duration: 30_000,
        description: `${job.fileName || 'File dữ liệu'} · ${job.orderCount} đơn`,
        action: { label: 'Tải file', href: `/api/admin/export/${job.id}/download`, download: true } });
    } else toast.error(job.error || 'Không tạo được file Excel', { id });
  }
  if (jobs.some(running)) { watchUntil = Date.now() + WATCH_LIMIT_MS; keepWatching(); }
}

/** Hỏi lại sau POLL_MS chừng nào còn tiến trình đang chạy; mất mạng tạm thời thì hỏi tiếp ở lượt sau. */
function keepWatching() {
  if (timer || Date.now() > watchUntil) return;
  timer = setTimeout(() => {
    void fetchJobs().then(
      (jobs) => { timer = undefined; track(jobs); showJobs?.(jobs); },
      () => { timer = undefined; keepWatching(); },
    );
  }, POLL_MS);
}

export function ExportManager() {
  const [jobs, setJobs] = useState<ExportJob[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    showJobs = setJobs;
    void fetchJobs().then((list) => { track(list); setJobs(list); },
      (error) => toast.error(errorText(error, 'Không tải được lịch sử xuất dữ liệu')));
    return () => { if (showJobs === setJobs) showJobs = null; };
  }, []);

  const startExport = async () => {
    setBusy(true);
    // Id riêng: không gộp với thông báo của một tiến trình khác đang chạy (cùng câu "Đang tạo file Excel…").
    const id = toast.loading('Đang tạo file Excel…', { id: `export-start-${Date.now()}` });
    try {
      const response = await fetch('/api/admin/export', { method: 'POST' });
      const data = await readJson(response);
      if (response.status === 409) {
        toast.warning(String(data.error || 'Đang có tiến trình xuất dữ liệu chạy'), { id });
        // Tiến trình đang chạy (có thể do người khác bấm) hiện lên danh sách, có thông báo riêng khi xong.
        void fetchJobs().then((list) => { track(list); setJobs(list); }, () => {});
        return;
      }
      if (!response.ok || !data.job) throw new Error(String(data.error || 'Không bắt đầu được tiến trình xuất'));
      const job = data.job as ExportJob;
      toastIds.set(job.id, id);
      setJobs((current) => [job, ...(current || []).filter((item) => item.id !== job.id)]);
      track([job]);
    } catch (error) { toast.error(errorText(error, 'Không bắt đầu được tiến trình xuất'), { id }); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <header>
      <h1 className="text-3xl font-bold font-heading">Xuất dữ liệu</h1>
      <p className="mt-1 text-sm text-charcoal-600">Một file Excel gồm các tab: đơn hàng, chi tiết sản phẩm, thanh toán &amp; giao hàng,
        khách hàng, nhân sự, sản phẩm &amp; tồn kho, mã giảm giá, đánh giá.</p>
    </header>

    <button type="button" disabled={busy} onClick={() => void startExport()}
      className="min-h-11 rounded-xl bg-honey-600 px-6 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang bắt đầu…' : 'Tạo file Excel mới'}
    </button>

    <section className="space-y-3">
      <h2 className="text-xl font-bold">Lịch sử xuất dữ liệu</h2>
      {(jobs || []).map((job) => <article key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-4">
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
          {job.status === 'completed' && (expired(job)
            ? <span className="text-xs text-charcoal-500">Đã xóa sau {RETENTION_DAYS} ngày, hãy xuất lại</span>
            : <a href={`/api/admin/export/${job.id}/download`}
                className="min-h-11 rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-bold text-white">Tải file</a>)}
        </div>
      </article>)}
      {jobs?.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-sm text-charcoal-600">Chưa có lần xuất dữ liệu nào.</p>}
    </section>
  </div>;
}

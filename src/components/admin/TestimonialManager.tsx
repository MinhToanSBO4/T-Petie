'use client';

import { useState } from 'react';
import { DataTable, type Column, type TableQuery } from '@/components/admin/DataTable';
import type { AdminTestimonial } from '@/types/admin-content';

type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; testimonial: AdminTestimonial };

const field = 'mt-1 block w-full rounded-xl border p-3';

async function fetchTestimonials(query: TableQuery) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q, filter: query.filter });
  const response = await fetch(`/api/admin/testimonials?${params}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không tải được feedback');
  return { items: data.items as AdminTestimonial[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

export function TestimonialManager() {
  const [view, setView] = useState<View>({ mode: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState('');
  const back = (text?: string) => { if (text) setMessage(text); setView({ mode: 'list' }); setReloadKey((key) => key + 1); };

  if (view.mode !== 'list') return <TestimonialForm testimonial={view.mode === 'edit' ? view.testimonial : null} onDone={back} />;

  const columns: Column<AdminTestimonial>[] = [
    { key: 'customer', header: 'Khách hàng', render: (row) => <div>
        <p className="font-semibold text-charcoal-900">{row.customerName}</p>
        <p className="text-xs text-charcoal-500">{row.location || '—'} · {row.rating}/5 sao</p>
      </div> },
    { key: 'quote', header: 'Nội dung', render: (row) => <p className="line-clamp-2 max-w-md text-xs text-charcoal-600">{row.quote}</p> },
    { key: 'order', header: 'Thứ tự', render: (row) => row.sortOrder },
    { key: 'consent', header: 'Đồng ý công bố', render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-bold ${
      row.consentConfirmed ? 'bg-sage-100 text-sage-800' : 'bg-cream-200 text-charcoal-600'}`}>
      {row.consentConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</span> },
    { key: 'status', header: 'Hiển thị', render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-bold ${
      row.isPublished ? 'bg-honey-100 text-honey-800' : 'bg-cream-200 text-charcoal-600'}`}>
      {row.isPublished ? 'Đang công bố' : 'Bản nháp'}</span> },
  ];

  return <div className="space-y-4">
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    <DataTable columns={columns} fetchPage={fetchTestimonials} reloadKey={reloadKey}
      searchPlaceholder="Tìm theo tên khách hoặc nội dung"
      filters={[{ value: 'published', label: 'Đang công bố' }, { value: 'draft', label: 'Bản nháp' }]}
      emptyText="Chưa có feedback nào."
      onRowClick={(row) => setView({ mode: 'edit', testimonial: row })}
      toolbar={<button type="button" onClick={() => setView({ mode: 'create' })}
        className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">Thêm feedback</button>} />
    <p className="text-xs text-charcoal-500">Bấm vào một dòng để xem chi tiết và chỉnh sửa. Chỉ bản đã xác nhận đồng ý và bật công bố mới hiện ở trang chủ.</p>
  </div>;
}

/** Tạo mới hoặc chỉnh sửa một feedback khách hàng. */
function TestimonialForm({ testimonial, onDone }: { testimonial: AdminTestimonial | null; onDone: (message?: string) => void }) {
  const editing = Boolean(testimonial);
  const [draft, setDraft] = useState({
    customerName: testimonial?.customerName || '', quote: testimonial?.quote || '',
    rating: String(testimonial?.rating ?? 5), location: testimonial?.location || '',
    sortOrder: String(testimonial?.sortOrder ?? 0),
    consentConfirmed: testimonial?.consentConfirmed ?? false, isPublished: testimonial?.isPublished ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch(editing ? `/api/admin/testimonials/${testimonial!.id}` : '/api/admin/testimonials', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, rating: Number(draft.rating), sortOrder: Number(draft.sortOrder) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không lưu được feedback');
      onDone(editing ? 'Đã lưu feedback.' : 'Đã thêm feedback.');
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="space-y-4 rounded-2xl border border-cream-200 bg-white p-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold">{editing ? 'Sửa feedback' : 'Thêm feedback'}</h2>
      <button type="button" onClick={() => onDone()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Tên khách hàng
        <input className={field} required maxLength={100} value={draft.customerName}
          onChange={(event) => setDraft({ ...draft, customerName: event.target.value })} /></label>
      <label className="text-sm font-semibold">Địa điểm
        <input className={field} maxLength={100} value={draft.location}
          onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
      <label className="text-sm font-semibold">Số sao (1–5)
        <input className={field} type="number" min="1" max="5" required value={draft.rating}
          onChange={(event) => setDraft({ ...draft, rating: event.target.value })} /></label>
      <label className="text-sm font-semibold">Thứ tự hiển thị
        <input className={field} type="number" min="0" max="999" value={draft.sortOrder}
          onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Nội dung
        <textarea className={field} rows={4} required minLength={10} maxLength={2000} value={draft.quote}
          onChange={(event) => setDraft({ ...draft, quote: event.target.value })} /></label>
    </div>
    <div className="flex flex-wrap gap-5 text-sm font-semibold">
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" className="size-5" checked={draft.consentConfirmed}
          onChange={(event) => setDraft({ ...draft, consentConfirmed: event.target.checked })} /> Khách đã đồng ý công bố
      </label>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" className="size-5" checked={draft.isPublished}
          onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} /> Công bố ở trang chủ
      </label>
    </div>
    <button disabled={busy} className="min-h-11 rounded-xl bg-sage-700 px-6 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang lưu…' : editing ? 'Lưu feedback' : 'Thêm feedback'}
    </button>
  </form>;
}

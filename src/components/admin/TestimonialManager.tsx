'use client';

import { useState } from 'react';
import type { AdminTestimonial } from '@/types/admin-content';

type Draft = { customerName: string; quote: string; rating: string; location: string;
  sortOrder: string; consentConfirmed: boolean; isPublished: boolean };
const emptyDraft = (): Draft => ({ customerName: '', quote: '', rating: '5', location: '',
  sortOrder: '0', consentConfirmed: false, isPublished: false });

function toDraft(item: AdminTestimonial): Draft {
  return { customerName: item.customerName, quote: item.quote, rating: String(item.rating),
    location: item.location || '', sortOrder: String(item.sortOrder),
    consentConfirmed: item.consentConfirmed, isPublished: item.isPublished };
}

export function TestimonialManager({ initialTestimonials }: { initialTestimonials: AdminTestimonial[] }) {
  const [items, setItems] = useState(initialTestimonials);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const change = (key: keyof Draft, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));

  const refresh = async () => {
    const response = await fetch('/api/admin/testimonials', { cache: 'no-store' });
    if (!response.ok) throw new Error('Không tải lại được feedback');
    setItems((await response.json()).testimonials);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(editingId ? `/api/admin/testimonials/${editingId}` : '/api/admin/testimonials', {
        method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, rating: Number(draft.rating), sortOrder: Number(draft.sortOrder) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không lưu được feedback');
      await refresh(); setEditingId(null); setDraft(emptyDraft());
      setMessage('Đã lưu feedback. Chỉ mục được công bố và có xác nhận đồng ý mới xuất hiện trên trang chủ.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };
  const remove = async (item: AdminTestimonial) => {
    if (!window.confirm(`Xóa feedback của ${item.customerName}?`)) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/testimonials/${item.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không xóa được feedback');
      await refresh();
      if (editingId === item.id) { setEditingId(null); setDraft(emptyDraft()); }
      setMessage('Đã xóa feedback.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    <header><h1 className="mt-2 text-3xl font-bold font-heading">Feedback khách hàng</h1>
      <p className="mt-1 text-sm text-charcoal-600">Lưu lời nhận xét thật từ khách. Có thể giữ ở bản nháp trước khi công bố ở cuối trang chủ.</p>
    </header>
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    <section aria-labelledby="feedback-list-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 id="feedback-list-heading" className="text-xl font-bold">Danh sách ({items.length})</h2>
        <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft()); }}
          className="min-h-11 rounded-xl bg-honey-600 px-4 text-sm font-bold text-white">Thêm feedback</button></div>
      {items.map((item) => <article key={item.id} className="rounded-2xl border border-cream-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
          <p className="font-bold text-charcoal-900">{item.customerName} · {item.rating}/5 sao</p>
          <p className="mt-1 text-xs font-semibold text-charcoal-600">{item.isPublished ? 'Đã công bố' : 'Bản nháp'} · Thứ tự {item.sortOrder} · Đồng ý: {item.consentConfirmed ? 'Có' : 'Chưa'}</p>
          <p className="mt-3 text-sm text-charcoal-700 line-clamp-3">{item.quote}</p></div>
          <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => { setEditingId(item.id); setDraft(toDraft(item)); document.getElementById('feedback-editor')?.scrollIntoView(); }}
            className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">Sửa</button>
            <button type="button" disabled={busy} onClick={() => void remove(item)} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-red-700">Xóa</button></div>
        </div>
      </article>)}
      {items.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-sm text-charcoal-600">Chưa có feedback. Trang chủ sẽ không hiện mục đánh giá cho đến khi bạn công bố nhận xét thật.</p>}
    </section>
    <form id="feedback-editor" onSubmit={save} className="space-y-5 rounded-2xl border border-cream-200 bg-white p-5 sm:p-6">
      <h2 className="text-xl font-bold">{editingId ? 'Sửa feedback' : 'Thêm feedback'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Tên hiển thị của khách<input required minLength={2} maxLength={80} value={draft.customerName} onChange={(e) => change('customerName', e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>
        <label className="text-sm font-semibold">Địa phương (tùy chọn)<input maxLength={100} value={draft.location} onChange={(e) => change('location', e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>
        <label className="text-sm font-semibold">Đánh giá<select value={draft.rating} onChange={(e) => change('rating', e.target.value)} className="mt-1 block w-full rounded-xl border p-3">
          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5 sao</option>)}</select></label>
        <label className="text-sm font-semibold">Thứ tự<input type="number" min="0" max="999" value={draft.sortOrder} onChange={(e) => change('sortOrder', e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Nội dung nguyên văn của khách<textarea required minLength={15} maxLength={800} rows={5} value={draft.quote} onChange={(e) => change('quote', e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>
      </div>
      <div className="space-y-2 text-sm"><label className="flex items-center gap-2 min-h-11 font-semibold">
        <input type="checkbox" checked={draft.consentConfirmed} onChange={(e) => change('consentConfirmed', e.target.checked)} className="size-5" />
        Khách đã đồng ý công bố nhận xét, tên và địa phương (nếu có)</label>
        <label className="flex items-center gap-2 min-h-11 font-semibold"><input type="checkbox" checked={draft.isPublished}
          onChange={(e) => change('isPublished', e.target.checked)} className="size-5" />Công bố trên trang chủ</label>
      </div>
      <button disabled={busy} className="min-h-11 rounded-xl bg-sage-700 px-6 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu feedback'}</button>
    </form>
  </div>;
}

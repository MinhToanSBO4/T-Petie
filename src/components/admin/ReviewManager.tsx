'use client';

import { useState } from 'react';
import { DataTable, type Column, type TableQuery } from '@/components/admin/DataTable';

type Review = {
  id: string; customerName: string; rating: number; content: string;
  isApproved: boolean; isFeatured: boolean; createdAt: string;
  productName: string; productSlug: string;
};

const formatDate = (value: string) => new Date(value).toLocaleString('vi-VN');

async function fetchReviews(query: TableQuery) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q, filter: query.filter });
  const response = await fetch(`/api/admin/reviews?${params}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không tải được đánh giá');
  return { items: data.items as Review[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

/**
 * Quản trị đánh giá sản phẩm: tìm, duyệt và chọn đánh giá hiển thị ở trang chủ.
 * Nội dung lấy từ khách hàng gửi ở trang sản phẩm, quản trị viên không nhập tay.
 */
export function ReviewManager() {
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const update = async (review: Review, patch: { isApproved?: boolean; isFeatured?: boolean }) => {
    setBusy(review.id); setMessage(''); setError('');
    try {
      const response = await fetch('/api/admin/reviews', { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: review.id, ...patch }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được đánh giá');
      setMessage(patch.isFeatured === true ? 'Đã chọn đánh giá hiển thị ở trang chủ.'
        : patch.isFeatured === false ? 'Đã bỏ hiển thị ở trang chủ.'
        : patch.isApproved ? 'Đã duyệt đánh giá.' : 'Đã chuyển về trạng thái chờ duyệt.');
      setReloadKey((key) => key + 1);
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(''); }
  };

  const remove = async (review: Review) => {
    if (!window.confirm(`Xóa đánh giá của ${review.customerName}? Thao tác không thể hoàn tác.`)) return;
    setBusy(review.id); setMessage(''); setError('');
    try {
      const response = await fetch(`/api/admin/reviews?id=${encodeURIComponent(review.id)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không xóa được đánh giá');
      setMessage('Đã xóa đánh giá.');
      setReloadKey((key) => key + 1);
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(''); }
  };

  const columns: Column<Review>[] = [
    { key: 'customer', header: 'Khách hàng', render: (row) => <div>
        <p className="font-semibold text-charcoal-900">{row.customerName}</p>
        <p className="text-xs text-charcoal-500">{formatDate(row.createdAt)}</p>
      </div> },
    { key: 'product', header: 'Sản phẩm', render: (row) => <span className="text-xs text-charcoal-600">{row.productName}</span> },
    { key: 'rating', header: 'Sao', render: (row) => <span className="text-honey-600" aria-label={`${row.rating} trên 5 sao`}>
        {'★'.repeat(row.rating)}<span className="text-charcoal-300">{'☆'.repeat(5 - row.rating)}</span></span> },
    { key: 'content', header: 'Nội dung', render: (row) => <p className="line-clamp-2 max-w-sm text-xs text-charcoal-600">{row.content}</p> },
    { key: 'status', header: 'Trạng thái', render: (row) => <div className="flex flex-wrap gap-1">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${row.isApproved ? 'bg-sage-100 text-sage-800' : 'bg-cream-200 text-charcoal-700'}`}>
          {row.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}</span>
        {row.isFeatured && <span className="rounded-full bg-honey-100 px-2.5 py-0.5 text-[11px] font-bold text-honey-800">Trang chủ</span>}
      </div> },
    { key: 'actions', header: 'Thao tác', className: 'w-64', render: (row) => <div className="flex flex-wrap gap-1">
        {row.isApproved
          ? <button type="button" disabled={busy === row.id} onClick={(event) => { event.stopPropagation(); void update(row, { isApproved: false }); }}
              className="rounded-lg border border-cream-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Bỏ duyệt</button>
          : <button type="button" disabled={busy === row.id} onClick={(event) => { event.stopPropagation(); void update(row, { isApproved: true }); }}
              className="rounded-lg bg-sage-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Duyệt</button>}
        {row.isApproved && (row.isFeatured
          ? <button type="button" disabled={busy === row.id} onClick={(event) => { event.stopPropagation(); void update(row, { isFeatured: false }); }}
              className="rounded-lg border border-honey-400 px-3 py-1.5 text-xs font-semibold text-honey-700 disabled:opacity-50">Bỏ khỏi trang chủ</button>
          : <button type="button" disabled={busy === row.id} onClick={(event) => { event.stopPropagation(); void update(row, { isFeatured: true }); }}
              className="rounded-lg bg-honey-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Chọn hiện trang chủ</button>)}
        <button type="button" disabled={busy === row.id} onClick={(event) => { event.stopPropagation(); void remove(row); }}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">Xóa</button>
      </div> },
  ];

  return <div className="space-y-4">
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <DataTable columns={columns} fetchPage={fetchReviews} reloadKey={reloadKey}
      searchPlaceholder="Tìm theo tên khách, nội dung hoặc sản phẩm"
      filters={[{ value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'featured', label: 'Hiện ở trang chủ' }]}
      emptyText="Không có đánh giá nào ở mục này." />
    <p className="text-xs text-charcoal-500">
      Đánh giá do khách gửi ở trang sản phẩm. Duyệt để hiển thị công khai; chọn “hiện trang chủ” để đưa vào khối đánh giá ở trang chủ.
    </p>
  </div>;
}

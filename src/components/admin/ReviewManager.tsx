'use client';

import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { DataTable, type Column, type TableQuery } from '@/components/admin/DataTable';
import { PhotoLightbox } from '@/components/reviews/PhotoLightbox';
import { sizeFitLabel } from '@/lib/content/review-input';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';

type Review = {
  id: string; customerName: string; isAnonymous: boolean; rating: number; content: string;
  imageUrls: string[]; sizeFit: string | null; variantLabel: string | null; editCount: number;
  isApproved: boolean; isFeatured: boolean; createdAt: string;
  productName: string; productSlug: string; orderCode: string | null;
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
 * Đánh giá do khách đã mua gửi từ mục Đơn mua hoặc trang sản phẩm, quản trị viên không nhập tay.
 */
export function ReviewManager() {
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<{ images: string[]; index: number } | null>(null);

  const update = async (review: Review, patch: { isApproved?: boolean; isFeatured?: boolean }) => {
    setBusy(review.id); setMessage(''); setError('');
    try {
      const response = await fetch('/api/admin/reviews', { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: review.id, ...patch }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được đánh giá');
      setMessage(patch.isFeatured === true ? 'Đã chọn đánh giá hiển thị ở trang chủ.'
        : patch.isFeatured === false ? 'Đã bỏ hiển thị ở trang chủ.'
        : patch.isApproved ? 'Đã duyệt đánh giá. Điểm sao của sản phẩm đã được cập nhật.' : 'Đã chuyển về trạng thái chờ duyệt.');
      setReloadKey((key) => key + 1);
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(''); }
  };

  const remove = async (review: Review) => {
    if (!window.confirm(`Xóa đánh giá của ${review.customerName}? Ảnh khách gửi kèm cũng bị xóa. Thao tác không thể hoàn tác.`)) return;
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
        <div className="mt-1 flex flex-wrap gap-1">
          {row.isAnonymous && <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-bold text-charcoal-700">Ẩn tên</span>}
          {row.editCount > 0 && <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-bold text-charcoal-700">Đã sửa</span>}
        </div>
      </div> },
    { key: 'product', header: 'Sản phẩm', render: (row) => <div className="text-xs text-charcoal-600">
        <p className="font-semibold text-charcoal-800">{row.productName}</p>
        {row.variantLabel && <p>Phân loại: {row.variantLabel}</p>}
        {row.orderCode
          ? <p className="mt-0.5 inline-flex items-center gap-1 font-semibold text-sage-700"><BadgeCheck className="size-3.5" aria-hidden />Đã mua · {row.orderCode}</p>
          : <p className="mt-0.5 text-charcoal-500">Đánh giá cũ, chưa xác minh mua hàng</p>}
      </div> },
    { key: 'rating', header: 'Sao', render: (row) => <span className="whitespace-nowrap text-honey-600" aria-label={`${row.rating} trên 5 sao`}>
        {'★'.repeat(row.rating)}<span className="text-charcoal-300">{'☆'.repeat(5 - row.rating)}</span></span> },
    { key: 'content', header: 'Nội dung', render: (row) => <div className="max-w-sm space-y-1.5">
        <p className="line-clamp-3 text-xs text-charcoal-600">{row.content || <em className="text-charcoal-400">Chỉ chấm sao</em>}</p>
        {row.sizeFit && <p className="text-[11px] font-semibold text-sage-700">Kích cỡ: {sizeFitLabel(row.sizeFit)}</p>}
        {row.imageUrls.length > 0 && <div className="flex gap-1">
          {row.imageUrls.map((url, index) => <button key={url} type="button" aria-label={`Xem ảnh ${index + 1}`}
            onClick={(event) => { event.stopPropagation(); setPhotos({ images: row.imageUrls, index }); }}
            className="overflow-hidden rounded-lg border border-cream-200">
            <img src={cloudinaryImage(url, { width: 96 })} alt="" className="size-10 object-cover" />
          </button>)}
        </div>}
      </div> },
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
        {row.isApproved && row.content.trim() && (row.isFeatured
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
      searchPlaceholder="Tìm theo tên khách, nội dung, sản phẩm hoặc mã đơn"
      filters={[{ value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' },
        { value: 'featured', label: 'Hiện ở trang chủ' }, { value: 'media', label: 'Có ảnh' }]}
      emptyText="Không có đánh giá nào ở mục này." />
    <p className="text-xs text-charcoal-500">
      Chỉ khách đã mua và nhận hàng mới gửi được đánh giá (trong 30 ngày, sửa 1 lần — bản sửa quay về chờ duyệt).
      Duyệt để hiển thị công khai và tính vào điểm sao của sản phẩm; chọn “hiện trang chủ” để đưa vào khối feedback ở trang chủ.
    </p>
    {photos && <PhotoLightbox images={photos.images} startIndex={photos.index} label="Ảnh khách gửi kèm đánh giá" onClose={() => setPhotos(null)} />}
  </div>;
}

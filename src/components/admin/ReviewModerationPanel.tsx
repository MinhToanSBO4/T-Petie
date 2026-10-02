'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, EyeOff, Eye, Loader2, MessageSquareReply, Search, Trash2 } from 'lucide-react';
import { errorText, toast } from '@/client/toast';
import { PhotoLightbox } from '@/components/reviews/PhotoLightbox';
import { StarRating } from '@/components/reviews/StarRating';
import { REVIEW_REPLY_MAX, sizeFitLabel } from '@/lib/content/review-input';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';

type AdminReview = {
  id: string; customerName: string; isAnonymous: boolean; rating: number; content: string;
  imageUrls: string[]; sizeFit: string | null; variantLabel: string | null; editCount: number;
  isHidden: boolean; createdAt: string; reply: string | null; repliedAt: string | null;
  productName: string; productSlug: string; orderCode: string | null;
};
type Page = { items: AdminReview[]; total: number; page: number; pages: number; stats: { unreplied: number; hidden: number } };

const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'unreplied', label: 'Chưa trả lời' },
  { value: 'hidden', label: 'Đã ẩn' },
  { value: 'media', label: 'Có ảnh' },
  { value: 'low', label: '1–2 sao' },
] as const;
const formatDate = (value: string) => new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

async function call(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Có lỗi xảy ra');
  return data;
}

/**
 * Quản lý đánh giá của khách: đánh giá hiển thị ngay khi khách gửi, quản trị viên/nhân viên trả lời,
 * ẩn/hiện và xóa. Truyền `productId` để chỉ xem đánh giá của một sản phẩm.
 */
export function ReviewModerationPanel({ productId }: { productId?: string }) {
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [replying, setReplying] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [photos, setPhotos] = useState<{ images: string[]; index: number } | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async (page: number, append: boolean) => {
    const request = ++latest.current;
    setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(page), limit: '10', q: search, filter });
    if (productId) params.set('productId', productId);
    try {
      const result = await call(`/api/admin/reviews?${params}`) as Page;
      if (request !== latest.current) return;
      setData((current) => append && current ? { ...result, items: [...current.items, ...result.items] } : result);
    } catch (loadError) {
      if (request === latest.current) setError(errorText(loadError, 'Không tải được đánh giá'));
    } finally { if (request === latest.current) setLoading(false); }
  }, [filter, search, productId]);

  useEffect(() => { void load(1, false); }, [load]);

  /** Cập nhật ngay trên màn hình sau khi máy chủ xác nhận, không tải lại cả danh sách. */
  const patchLocal = (id: string, patch: Partial<AdminReview> | null) => setData((current) => current && {
    ...current,
    items: patch ? current.items.map((item) => item.id === id ? { ...item, ...patch } : item) : current.items.filter((item) => item.id !== id),
    total: patch ? current.total : current.total - 1,
  });

  // Thông báo theo từng đánh giá: thao tác trên hai đánh giá cùng lúc không đè kết quả của nhau.
  const update = async (review: AdminReview, body: Record<string, unknown>, pending: string, done: string, patch: Partial<AdminReview>) => {
    setBusy(review.id);
    const id = toast.loading(pending, { id: `review-${review.id}` });
    try {
      await call('/api/admin/reviews', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: review.id, ...body }) });
      patchLocal(review.id, patch);
      toast.success(done, { id });
      return true;
    } catch (updateError) {
      toast.error(errorText(updateError, 'Không cập nhật được đánh giá'), { id });
      return false;
    } finally { setBusy(''); }
  };

  const remove = async (review: AdminReview) => {
    if (!window.confirm(`Xóa hẳn đánh giá của ${review.customerName}? Ảnh khách gửi kèm cũng bị xóa và không khôi phục được. `
      + 'Nếu chỉ muốn không hiển thị, hãy dùng "Ẩn".')) return;
    setBusy(review.id);
    const id = toast.loading('Đang xóa đánh giá…', { id: `review-${review.id}` });
    try {
      await call(`/api/admin/reviews?id=${encodeURIComponent(review.id)}`, { method: 'DELETE' });
      patchLocal(review.id, null);
      toast.success('Đã xóa đánh giá', { id });
    } catch (removeError) { toast.error(errorText(removeError, 'Không xóa được đánh giá'), { id }); }
    finally { setBusy(''); }
  };

  const saveReply = async (review: AdminReview) => {
    const reply = draft.trim();
    const ok = await update(review, { reply: reply || null }, reply ? 'Đang đăng câu trả lời…' : 'Đang gỡ câu trả lời…',
      reply ? 'Đã đăng câu trả lời' : 'Đã gỡ câu trả lời', { reply: reply || null, repliedAt: reply ? new Date().toISOString() : null });
    if (ok) setReplying(null);
  };

  const chipFilter = (value: string) => filter === value;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((item) => <button key={item.value || 'all'} type="button" aria-pressed={chipFilter(item.value)}
        onClick={() => setFilter(item.value)}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${chipFilter(item.value)
          ? 'bg-honey-600 text-white' : 'border border-cream-300 bg-white text-charcoal-700 hover:bg-honey-50'}`}>
        {item.label}
        {item.value === 'unreplied' && data && data.stats.unreplied > 0 && <span className={`rounded-full px-1.5 text-xs ${filter === 'unreplied' ? 'bg-white/25' : 'bg-honey-100 text-honey-800'}`}>{data.stats.unreplied}</span>}
        {item.value === 'hidden' && data && data.stats.hidden > 0 && <span className={`rounded-full px-1.5 text-xs ${filter === 'hidden' ? 'bg-white/25' : 'bg-cream-100 text-charcoal-600'}`}>{data.stats.hidden}</span>}
      </button>)}
      {!productId && <label className="relative ml-auto w-full sm:w-80 lg:w-96">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-charcoal-400" aria-hidden />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm khách, nội dung, sản phẩm, mã đơn"
          aria-label="Tìm đánh giá" className="min-h-10 w-full rounded-xl border border-cream-300 bg-white pl-9 pr-3 text-sm" />
      </label>}
    </div>

    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!data && loading && <div className="space-y-3" role="status" aria-label="Đang tải đánh giá">
      {[1, 2, 3].map((item) => <div key={item} className="shimmer h-28 rounded-2xl" />)}
    </div>}
    {data && data.items.length === 0 && !loading && <p className="rounded-2xl border border-dashed border-cream-300 bg-white p-6 text-center text-sm text-charcoal-600">
      {filter === 'unreplied' ? 'Đã trả lời hết đánh giá. 🎉' : productId && !filter ? 'Sản phẩm chưa có đánh giá nào.' : 'Không có đánh giá nào ở mục này.'}
    </p>}

    {data && data.items.length > 0 && <ul className={`space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      {data.items.map((review) => {
        const pending = busy === review.id;
        return <li key={review.id} className={`rounded-2xl border bg-white p-4 ${review.isHidden ? 'border-dashed border-cream-300 opacity-75' : 'border-cream-200'}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <strong className="text-sm text-charcoal-900">{review.customerName}</strong>
                {review.isAnonymous && <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-bold text-charcoal-700">Khách chọn ẩn tên</span>}
                {review.isHidden && <span className="rounded-full bg-charcoal-800 px-2 py-0.5 text-[10px] font-bold text-white">Đã ẩn</span>}
              </div>
              <StarRating value={review.rating} size="size-3.5" />
              <p className="text-[11px] text-charcoal-500">
                {formatDate(review.createdAt)}{review.variantLabel ? ` · Phân loại: ${review.variantLabel}` : ''}
                {review.sizeFit ? ` · Kích cỡ: ${sizeFitLabel(review.sizeFit)}` : ''}{review.editCount > 0 ? ' · Đã chỉnh sửa' : ''}
              </p>
              {!productId && <p className="text-xs font-semibold text-charcoal-700">{review.productName}</p>}
              {review.orderCode && <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-sage-700">
                <BadgeCheck className="size-3.5" aria-hidden />Đã mua · {review.orderCode}</p>}
            </div>
          </div>
          {review.content
            ? <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-charcoal-800">{review.content}</p>
            : <p className="mt-2 text-sm italic text-charcoal-500">Khách chỉ chấm sao</p>}
          {review.imageUrls.length > 0 && <div className="mt-2 flex flex-wrap gap-2">
            {review.imageUrls.map((url, index) => <button key={url} type="button" aria-label={`Xem ảnh ${index + 1}`}
              onClick={() => setPhotos({ images: review.imageUrls, index })} className="overflow-hidden rounded-xl border border-cream-200">
              <img src={cloudinaryImage(url, { width: 160 })} alt="" className="size-16 object-cover" />
            </button>)}
          </div>}

          {replying === review.id
            ? <div className="mt-3 space-y-2 rounded-2xl bg-cream-50 p-3">
                <label className="block text-xs font-bold text-charcoal-800" htmlFor={`reply-${review.id}`}>Trả lời công khai (hiện dưới đánh giá)</label>
                <textarea id={`reply-${review.id}`} autoFocus rows={3} maxLength={REVIEW_REPLY_MAX} value={draft}
                  onChange={(event) => setDraft(event.target.value)} placeholder="Cảm ơn mẹ đã tin chọn T'Petie..."
                  className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-charcoal-500">{draft.length}/{REVIEW_REPLY_MAX}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setReplying(null)} disabled={pending}
                      className="min-h-10 rounded-xl px-3 text-sm font-semibold text-charcoal-600 hover:bg-cream-100">Hủy</button>
                    <button type="button" onClick={() => void saveReply(review)} disabled={pending || (!draft.trim() && !review.reply)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-honey-600 px-4 text-sm font-bold text-white disabled:opacity-50">
                      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      {draft.trim() ? 'Đăng trả lời' : 'Gỡ câu trả lời'}
                    </button>
                  </div>
                </div>
              </div>
            : review.reply && <div className="mt-3 rounded-2xl bg-cream-100 px-3 py-2">
                <p className="text-xs font-bold text-charcoal-800">Phản hồi của shop{review.repliedAt ? ` · ${formatDate(review.repliedAt)}` : ''}</p>
                <p className="whitespace-pre-line text-sm text-charcoal-700">{review.reply}</p>
              </div>}

          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-cream-100 pt-3">
            {replying !== review.id && <button type="button" disabled={pending} onClick={() => { setReplying(review.id); setDraft(review.reply || ''); }}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-honey-50 px-3 text-xs font-bold text-honey-800 hover:bg-honey-100 disabled:opacity-50">
              <MessageSquareReply className="h-3.5 w-3.5" aria-hidden />{review.reply ? 'Sửa trả lời' : 'Trả lời'}
            </button>}
            <button type="button" disabled={pending} onClick={() => void update(review, { isHidden: !review.isHidden },
              review.isHidden ? 'Đang hiện lại đánh giá…' : 'Đang ẩn đánh giá…',
              review.isHidden ? 'Đã hiện lại đánh giá' : 'Đã ẩn đánh giá khỏi trang sản phẩm',
              { isHidden: !review.isHidden })}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cream-300 px-3 text-xs font-semibold text-charcoal-700 hover:bg-cream-50 disabled:opacity-50">
              {review.isHidden ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
              {review.isHidden ? 'Hiện lại' : 'Ẩn'}
            </button>
            <button type="button" disabled={pending} onClick={() => void remove(review)}
              className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-blush-700 hover:bg-blush-50 disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" aria-hidden />Xóa
            </button>
          </div>
        </li>;
      })}
    </ul>}

    {data && data.page < data.pages && <div className="text-center">
      <button type="button" onClick={() => void load(data.page + 1, true)} disabled={loading}
        className="min-h-11 rounded-xl border border-cream-300 bg-white px-6 text-sm font-bold text-charcoal-700 hover:bg-cream-50 disabled:opacity-50">
        {loading ? 'Đang tải…' : `Xem thêm (${data.total - data.items.length})`}
      </button>
    </div>}
    {photos && <PhotoLightbox images={photos.images} startIndex={photos.index} label="Ảnh khách gửi kèm đánh giá" onClose={() => setPhotos(null)} />}
  </div>;
}

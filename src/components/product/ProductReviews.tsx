'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Camera, PenLine } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { StarRating } from '@/components/reviews/StarRating';
import { ReviewDialog } from '@/components/reviews/ReviewDialog';
import { PhotoLightbox } from '@/components/reviews/PhotoLightbox';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { sizeFitLabel } from '@/lib/content/review-input';
import { fitSummary, RATING_DISTRIBUTION_MIN, type PublicReview, type ReviewFilter, type ReviewSummary } from '@/lib/reviews/filters';
import { formatDateVN } from '@/lib/utils/formatters';
import type { ReviewTarget } from '@/types/order';

type ReviewPage = { summary: ReviewSummary; reviews: PublicReview[]; page: number; pages: number; total: number };

/**
 * Đánh giá sản phẩm (tham khảo Shopee và nghiên cứu của Baymard): điểm trung bình, phân bố sao bấm để lọc,
 * lọc có ảnh/có bình luận, cảm nhận size, danh sách mới nhất trước. Chỉ khách đã mua và nhận hàng mới viết được;
 * khách có món chờ đánh giá thấy nút viết ngay tại đây.
 */
export function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [data, setData] = useState<ReviewPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<ReviewTarget[]>([]);
  const [writing, setWriting] = useState<ReviewTarget | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const load = useCallback(async (nextFilter: ReviewFilter, page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ productId, filter: nextFilter, page: String(page) });
      const response = await fetch(`/api/reviews?${params}`, { cache: 'no-store' });
      if (!response.ok) return;
      const result = await response.json() as ReviewPage;
      setData((current) => page > 1 && current ? { ...result, reviews: [...current.reviews, ...result.reviews] } : result);
    } catch { /* giữ nguyên danh sách đang có nếu mất mạng */ }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { void load(filter, 1); }, [filter, load]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'user') { setTargets([]); return; }
    fetch(`/api/reviews/eligibility?productId=${encodeURIComponent(productId)}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : { targets: [] })
      .then((result) => setTargets(Array.isArray(result.targets) ? result.targets : []))
      .catch(() => setTargets([]));
  }, [isAuthenticated, user?.role, productId]);

  const summary = data?.summary;
  const fit = summary ? fitSummary(summary.fit) : null;
  const chips: { value: ReviewFilter; label: string; count: number }[] = summary ? [
    { value: 'all', label: 'Tất cả', count: summary.total },
    ...(['5', '4', '3', '2', '1'] as const).map((star) => ({ value: star, label: `${star} sao`, count: summary.counts[star] })),
    { value: 'media', label: 'Có hình ảnh', count: summary.withImages },
    { value: 'comment', label: 'Có bình luận', count: summary.withComments },
  ] : [];

  return <section id="reviews" aria-labelledby="product-reviews-title" className="mt-10 scroll-mt-24 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="product-reviews-title" className="font-heading text-lg font-bold text-charcoal-900 sm:text-xl">Đánh giá sản phẩm</h2>
      {summary && summary.total > 0 && <span className="text-sm text-charcoal-600">{summary.total} đánh giá từ khách đã mua</span>}
    </div>

    {targets.length > 0 && <div className="flex flex-col gap-3 rounded-2xl border border-honey-200 bg-honey-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-charcoal-800">
        Mẹ đã nhận sản phẩm này · Phân loại: {targets[0].size}. Chia sẻ cảm nhận giúp các mẹ khác chọn đồ nhé!
      </p>
      <button type="button" onClick={() => setWriting(targets[0])} data-track="product-review-open"
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-honey-500 px-5 text-sm font-bold text-white shadow-md hover:bg-honey-600">
        <PenLine className="size-4" aria-hidden />Viết đánh giá
      </button>
    </div>}

    {summary && summary.total > 0 && <div className="grid gap-5 rounded-3xl border border-cream-200 bg-white p-5 shadow-card md:grid-cols-[minmax(0,220px)_1fr]">
      <div className="text-center md:border-r md:border-cream-100 md:pr-5 md:text-left">
        <p className="font-heading text-5xl font-extrabold text-honey-700">
          {summary.average.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          <span className="ml-1 text-base font-semibold text-charcoal-500">/5</span>
        </p>
        <StarRating value={summary.average} size="size-5" className="mt-1 text-honey-500" />
        {fit && <p className="mt-3 rounded-xl bg-sage-50 px-3 py-2 text-xs font-semibold text-sage-800">
          Kích cỡ: {Math.round(fit.share * 100)}% mẹ {fit.label} ({fit.answers} trả lời)
        </p>}
      </div>
      <div className="space-y-4">
        {summary.total >= RATING_DISTRIBUTION_MIN && <ul className="space-y-1.5" aria-label="Phân bố số sao, bấm để lọc">
          {(['5', '4', '3', '2', '1'] as const).map((star) => {
            const count = summary.counts[star];
            return <li key={star}>
              <button type="button" onClick={() => setFilter(filter === star ? 'all' : star)} aria-pressed={filter === star} disabled={count === 0}
                className={`flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-xs disabled:cursor-default ${filter === star ? 'bg-honey-50' : 'hover:bg-cream-50'}`}>
                <span className="w-10 shrink-0 text-left font-semibold text-charcoal-700">{star} sao</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200">
                  <span className="block h-full rounded-full bg-honey-500" style={{ width: `${(count / summary.total) * 100}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right text-charcoal-600">{count}</span>
              </button>
            </li>;
          })}
        </ul>}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc đánh giá">
          {chips.map((chip) => <button key={chip.value} type="button" onClick={() => setFilter(chip.value)} aria-pressed={filter === chip.value}
            disabled={chip.count === 0 && chip.value !== 'all'}
            className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-40 ${filter === chip.value
              ? 'border-honey-500 bg-honey-50 text-honey-800' : 'border-cream-300 bg-white text-charcoal-700 hover:bg-cream-50'}`}>
            {chip.value === 'media' && <Camera className="size-3.5" aria-hidden />}{chip.label} ({chip.count})
          </button>)}
        </div>
      </div>
    </div>}

    {data && data.reviews.length > 0 && <ul className="divide-y divide-cream-100 rounded-3xl border border-cream-200 bg-white px-5 shadow-card">
      {data.reviews.map((review) => <li key={review.id} className="flex gap-3 py-4">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-sage-100 text-sm font-bold text-sage-800">
          {review.name.charAt(0).toLocaleUpperCase('vi-VN')}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="text-sm text-charcoal-900">{review.name}</strong>
            {review.verified && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sage-700">
              <BadgeCheck className="size-3.5" aria-hidden />Đã mua hàng</span>}
          </div>
          <StarRating value={review.rating} size="size-3.5" />
          <p className="text-[11px] text-charcoal-500">
            {formatDateVN(review.createdAt)}{review.variantLabel ? ` · Phân loại: ${review.variantLabel}` : ''}
            {review.sizeFit ? ` · Kích cỡ: ${sizeFitLabel(review.sizeFit)}` : ''}{review.edited ? ' · Đã chỉnh sửa' : ''}
          </p>
          {review.content && <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal-800">{review.content}</p>}
          {review.images.length > 0 && <ul className="flex flex-wrap gap-2 pt-1">
            {review.images.map((url, index) => <li key={url}>
              <button type="button" onClick={() => setLightbox({ images: review.images, index })} aria-label={`Xem ảnh ${index + 1} của ${review.name}`}
                className="block overflow-hidden rounded-xl border border-cream-200 transition-opacity hover:opacity-90">
                <img src={cloudinaryImage(url, { width: 200 })} alt="" loading="lazy" className="size-20 object-cover" />
              </button>
            </li>)}
          </ul>}
          {review.reply && <div className="mt-2 rounded-2xl bg-cream-100 px-4 py-3">
            <p className="text-xs font-bold text-charcoal-800">Phản hồi của T&apos;Petie</p>
            <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-charcoal-700">{review.reply.content}</p>
          </div>}
        </div>
      </li>)}
    </ul>}

    {data && data.page < data.pages && <div className="text-center">
      <button type="button" onClick={() => void load(filter, data.page + 1)} disabled={loading}
        className="min-h-11 rounded-full border border-cream-300 bg-white px-6 text-sm font-bold text-charcoal-700 hover:bg-cream-50 disabled:opacity-50">
        {loading ? 'Đang tải…' : 'Xem thêm đánh giá'}
      </button>
    </div>}

    {data && data.total === 0 && <p className="rounded-2xl border border-dashed border-cream-300 bg-cream-50 p-5 text-center text-sm text-charcoal-600">
      {summary?.total ? 'Không có đánh giá phù hợp bộ lọc này.' : 'Sản phẩm chưa có đánh giá nào.'}
    </p>}
    {!data && loading && <div className="h-28 rounded-3xl shimmer" role="status" aria-label="Đang tải đánh giá" />}

    <p className="text-xs text-charcoal-500">Chỉ khách đã mua và nhận hàng mới đánh giá được.</p>

    {writing && <ReviewDialog customerName={user?.name || ''} onClose={() => setWriting(null)}
      target={{ orderItemId: writing.orderItemId, orderCode: writing.orderCode, productName: writing.productName || productName,
        size: writing.size, thumbnail: writing.thumbnail }}
      onSaved={(message) => {
        setTargets((current) => current.filter((item) => item.orderItemId !== writing.orderItemId));
        setWriting(null);
        showToast(message, 'love');
        // Xóa bản Đơn mua đã lưu trong trình duyệt để nút "Đánh giá" của món này không còn hiện ở đó.
        router.refresh();
      }} />}
    {lightbox && <PhotoLightbox images={lightbox.images} startIndex={lightbox.index} label="Ảnh đánh giá của khách" onClose={() => setLightbox(null)} />}
  </section>;
}

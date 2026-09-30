'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Review = { id: string; customerName: string; rating: number; content: string; createdAt: string };

const formatDate = (value: string) => new Date(value).toLocaleDateString('vi-VN');

/** Đánh giá sản phẩm: khách xem đánh giá đã duyệt và gửi đánh giá mới (chờ quản trị viên duyệt). */
export function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch { /* giữ danh sách rỗng nếu không tải được */ }
  }, [productId]);
  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, content }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không gửi được đánh giá');
      setContent(''); setRating(5);
      setMessage('Cảm ơn mẹ đã đánh giá! Đánh giá sẽ hiển thị sau khi cửa hàng kiểm duyệt.');
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  return <section aria-labelledby="product-reviews-title" className="mt-10 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="product-reviews-title" className="font-heading text-lg font-bold text-charcoal-900">Đánh giá từ khách hàng</h2>
      {reviews.length > 0 && <p className="text-sm text-charcoal-600">
        <span className="font-bold text-honey-700">{average.toFixed(1)}/5</span> · {reviews.length} đánh giá
      </p>}
    </div>

    {reviews.length === 0 && <p className="text-sm text-charcoal-500">Sản phẩm chưa có đánh giá nào được duyệt.</p>}
    <ul className="space-y-3">
      {reviews.map((review) => <li key={review.id} className="rounded-2xl border border-cream-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <strong className="text-sm text-charcoal-900">{review.customerName}</strong>
          <span className="text-xs text-charcoal-400">{formatDate(review.createdAt)}</span>
        </div>
        <div className="mt-1 text-honey-600" aria-label={`${review.rating} trên 5 sao`}>
          {'★'.repeat(review.rating)}<span className="text-charcoal-300">{'☆'.repeat(5 - review.rating)}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-charcoal-700 whitespace-pre-line">{review.content}</p>
      </li>)}
    </ul>

    {isAuthenticated ? <form onSubmit={submit} className="rounded-2xl border border-cream-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-bold text-charcoal-900">Viết đánh giá cho {productName}</h3>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Chọn số sao">
        {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value}
          aria-label={`${value} sao`} onClick={() => setRating(value)}
          className={`p-1 ${value <= rating ? 'text-honey-500' : 'text-charcoal-300'}`}>
          <Star className="h-6 w-6" fill={value <= rating ? 'currentColor' : 'none'} />
        </button>)}
        <span className="ml-2 text-sm text-charcoal-600">{rating}/5</span>
      </div>
      <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} maxLength={2000}
        placeholder="Chia sẻ cảm nhận về chất liệu, form dáng và trải nghiệm mua hàng…"
        className="w-full rounded-xl border border-cream-300 p-3 text-sm" />
      <button disabled={busy || content.trim().length < 10}
        className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white disabled:opacity-50">
        {busy ? 'Đang gửi…' : 'Gửi đánh giá'}
      </button>
      {message && <p role="status" className="text-sm text-sage-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form> : <p className="rounded-2xl border border-dashed border-cream-300 bg-cream-50 p-4 text-sm text-charcoal-600">
      Mẹ <a href="/login" className="font-bold text-honey-700 hover:underline">đăng nhập</a> để gửi đánh giá cho sản phẩm này.
    </p>}
  </section>;
}

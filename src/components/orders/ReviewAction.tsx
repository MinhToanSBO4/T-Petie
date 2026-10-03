'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/client/toast';
import { ReviewDialog } from '@/components/reviews/ReviewDialog';
import { StarRating } from '@/components/reviews/StarRating';
import type { CustomerOrderItem } from '@/types/order';

/**
 * Trạng thái đánh giá của một món trong đơn: nút "Đánh giá" khi đơn đã giao và còn hạn,
 * trạng thái đã đánh giá, phản hồi của shop và nút sửa (một lần) sau khi đã gửi.
 */
export function ReviewAction({ item, orderCode, showWaiting = false }: {
  item: CustomerOrderItem; orderCode: string; showWaiting?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const saved = (message: string) => {
    setOpen(false);
    toast.love(message);
    router.refresh();
  };

  let action: React.ReactNode = null;
  if (item.reviewAvailability === 'open') {
    action = <button type="button" onClick={() => setOpen(true)} data-track="order-review-open"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-honey-500 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-honey-600 active:scale-95">
      <Star className="size-3.5" fill="currentColor" aria-hidden />Đánh giá
    </button>;
  } else if (item.review) {
    action = <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-50 px-3 py-1 text-xs font-semibold text-sage-800 ring-1 ring-sage-200">
        Đã đánh giá <StarRating value={item.review.rating} size="size-3" />
      </span>
      {item.review.editable && <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-honey-700 hover:underline">
        Sửa đánh giá</button>}
      {item.review.status === 'visible' && item.productSlug && <Link href={`/products/${item.productSlug}#reviews`}
        className="text-xs font-semibold text-charcoal-600 hover:underline">Xem trên trang sản phẩm</Link>}
      {item.review.reply && <span className="block w-full text-xs text-charcoal-600">
        <strong className="text-charcoal-800">Shop phản hồi:</strong> <span className="line-clamp-2 inline">{item.review.reply}</span>
      </span>}
    </span>;
  } else if (item.reviewAvailability === 'expired') {
    action = <span className="text-xs text-charcoal-500">Đã hết hạn đánh giá</span>;
  } else if (showWaiting) {
    action = <span className="text-xs text-charcoal-500">Đánh giá được sau khi mẹ nhận hàng</span>;
  }

  return <>
    {action}
    {open && <ReviewDialog customerName={user?.name || ''} review={item.review} onClose={() => setOpen(false)} onSaved={saved}
      target={{ orderItemId: item.id, orderCode, productName: item.productName, size: item.size, thumbnail: item.thumbnail }} />}
  </>;
}

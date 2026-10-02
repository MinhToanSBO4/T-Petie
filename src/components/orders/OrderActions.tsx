'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, PackageCheck, RotateCcw } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { errorText, toast } from '@/client/toast';
import type { CustomerOrderItem } from '@/types/order';

type Action = 'cancel' | 'received';

const CONFIRM: Record<Action, string> = {
  cancel: 'Hủy đơn hàng này? Sản phẩm sẽ được trả lại kho.',
  received: 'Mẹ xác nhận đã nhận đủ hàng và thanh toán cho shipper? Sau đó đơn sẽ hoàn tất và mẹ có thể đánh giá sản phẩm.',
};

/**
 * Thao tác theo trạng thái đơn (như Shopee): hủy khi chờ xác nhận, "Đã nhận được hàng" khi đang giao,
 * "Mua lại" khi đơn đã xong hoặc đã hủy (thêm lại vào giỏ theo giá và tồn kho hiện tại).
 */
export function OrderActions({ code, status, items, detailHref }: {
  code: string; status: string; items: CustomerOrderItem[]; detailHref?: string;
}) {
  const router = useRouter();
  const { addItems } = useCart();
  const [pending, setPending] = useState<Action | null>(null);

  const run = async (action: Action) => {
    if (!window.confirm(CONFIRM[action])) return;
    setPending(action);
    const notice = toast.loading(action === 'received' ? 'Đang xác nhận đã nhận hàng…' : `Đang hủy đơn ${code}…`, { id: `order-${code}` });
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(code)}/status`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được đơn hàng');
      if (action === 'received') toast.love('Cảm ơn mẹ! Mẹ đánh giá sản phẩm giúp shop nhé 🌸', { id: notice });
      else toast.success(`Đã hủy đơn ${code}.`, { id: notice });
      router.refresh();
      // Nút "Đã nhận được hàng" nằm cuối đơn: đưa khách về danh sách sản phẩm, nơi nút Đánh giá vừa xuất hiện.
      if (action === 'received') {
        (document.getElementById('order-items-title') || document.getElementById(`order-${code}`))
          ?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    } catch (error) { toast.error(errorText(error, 'Không cập nhật được đơn hàng'), { id: notice }); }
    finally { setPending(null); }
  };

  const buyAgain = () => {
    const available = items.filter((item) => item.reorder);
    addItems(available.map((item) => ({
      productId: item.productId, productName: item.productName, sku: item.reorder!.sku, thumbnail: item.thumbnail,
      category: item.reorder!.category, selectedSize: item.reorder!.selectedSize, price: item.reorder!.price,
      quantity: Math.min(item.quantity, item.reorder!.stock),
    })));
    const missing = items.length - available.length;
    if (available.length === 0) { toast.warning('Các sản phẩm trong đơn đã hết hàng hoặc ngừng bán.'); return; }
    if (missing > 0) toast.warning(`Đã thêm ${available.length} món vào giỏ; ${missing} món đã hết hàng.`);
    else toast.success(`Đã thêm ${available.length} món vào giỏ hàng.`);
    window.dispatchEvent(new Event('tpetie:navigation-start'));
    router.push('/cart');
  };

  const secondary = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-cream-300 bg-white px-4 text-xs font-bold text-charcoal-800 transition-colors hover:border-honey-300 hover:bg-cream-50 active:scale-95 disabled:opacity-50';
  const primary = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-sage-700 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-sage-800 active:scale-95 disabled:opacity-50';
  return <div className="flex flex-wrap items-center justify-end gap-2">
    {detailHref && <Link href={detailHref} className={secondary}>Xem chi tiết</Link>}
    {status === 'PENDING' && <button type="button" onClick={() => void run('cancel')} disabled={pending !== null}
      className={`${secondary} text-blush-700`}>
      {pending === 'cancel' && <Loader2 className="size-3.5 animate-spin" aria-hidden />}Hủy đơn
    </button>}
    {(status === 'COMPLETED' || status === 'CANCELLED') && <button type="button" onClick={buyAgain} data-track="order-buy-again" className={secondary}>
      <RotateCcw className="size-3.5" aria-hidden />Mua lại
    </button>}
    {status === 'SHIPPING' && <button type="button" onClick={() => void run('received')} disabled={pending !== null} className={primary}>
      {pending === 'received' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <PackageCheck className="size-3.5" aria-hidden />}
      Đã nhận được hàng
    </button>}
  </div>;
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { readJson } from '@/client/http';
import { errorText, toast } from '@/client/toast';

export type QuoteInputItem = { productId: string; selectedSize: string; quantity: number };
export type OrderQuote = { subtotal: number; shippingFee: number; discountAmount: number; total: number; freeShippingThreshold: number; couponCode: string | null;
  items: Array<QuoteInputItem & { unitPrice: number; totalPrice: number }> };

/**
 * Lỗi báo giá (mã giảm giá không dùng được, hết hàng, thử quá nhiều lần…) hiện bằng thông báo nổi. Cùng một id: lỗi mới
 * thay lỗi cũ, báo giá lại thành công thì đóng lỗi còn đang hiện.
 */
export const QUOTE_NOTICE_ID = 'order-quote';

export function useOrderQuote(items: QuoteInputItem[], couponCode = '') {
  const key = useMemo(() => JSON.stringify(items.map(({ productId, selectedSize, quantity }) => ({ productId, selectedSize, quantity }))), [items]);
  const [state, setState] = useState<{ quote: OrderQuote | null; error: string | null; loading: boolean }>({ quote: null, error: null, loading: true });

  useEffect(() => {
    const parsed: QuoteInputItem[] = JSON.parse(key);
    if (parsed.length === 0) {
      setState({ quote: null, error: null, loading: false });
      toast.dismiss(QUOTE_NOTICE_ID);
      return;
    }
    const controller = new AbortController();
    setState({ quote: null, error: null, loading: true });
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/quote', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ items: parsed, couponCode: couponCode || undefined }) });
        const data = await readJson(response);
        if (!response.ok) throw new Error(data.error || 'Không tính được đơn hàng');
        if (controller.signal.aborted) return;
        setState({ quote: data as OrderQuote, error: null, loading: false });
        toast.dismiss(QUOTE_NOTICE_ID);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = errorText(error, 'Không tính được đơn hàng');
        setState({ quote: null, error: message, loading: false });
        toast.error(message, { id: QUOTE_NOTICE_ID });
      }
    }, 150);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [key, couponCode]);

  return state;
}

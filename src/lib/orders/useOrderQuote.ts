'use client';

import { useEffect, useMemo, useState } from 'react';

export type QuoteInputItem = { productId: string; selectedSize: string; quantity: number };
export type OrderQuote = { subtotal: number; shippingFee: number; discountAmount: number; total: number; freeShippingThreshold: number; couponCode: string | null;
  items: Array<QuoteInputItem & { unitPrice: number; totalPrice: number }> };

export function useOrderQuote(items: QuoteInputItem[], couponCode = '') {
  const key = useMemo(() => JSON.stringify(items.map(({ productId, selectedSize, quantity }) => ({ productId, selectedSize, quantity }))), [items]);
  const [state, setState] = useState<{ quote: OrderQuote | null; error: string | null; loading: boolean }>({ quote: null, error: null, loading: true });

  useEffect(() => {
    const parsed: QuoteInputItem[] = JSON.parse(key);
    if (parsed.length === 0) { setState({ quote: null, error: null, loading: false }); return; }
    const controller = new AbortController();
    setState({ quote: null, error: null, loading: true });
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/quote', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ items: parsed, couponCode: couponCode || undefined }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không tính được đơn hàng');
        if (!controller.signal.aborted) setState({ quote: data, error: null, loading: false });
      } catch (error) {
        if (!controller.signal.aborted) setState({ quote: null, error: error instanceof Error ? error.message : 'Không tính được đơn hàng', loading: false });
      }
    }, 150);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [key, couponCode]);

  return state;
}

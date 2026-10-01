'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';

/** Lối sang giỏ hàng từ trang Đơn mua, nhắc rằng giỏ là món chưa đặt. */
export function CartShortcut() {
  const { totalItems } = useCart();
  return <Link href="/cart" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-honey-200 bg-honey-50 px-4 text-xs font-bold text-honey-800 transition-colors hover:bg-honey-100">
    <ShoppingBag className="size-4" aria-hidden />
    Giỏ hàng chưa đặt
    <span className="grid min-w-5 place-items-center rounded-full bg-honey-500 px-1.5 text-[11px] text-white">{totalItems}</span>
  </Link>;
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Package, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [orderId, setOrderId] = useState<string>('');

  useEffect(() => {
    // Xóa giỏ hàng khi vào trang này
    clearCart();

    // Lấy mã đơn hàng từ session
    const id = sessionStorage.getItem('order_success_id');
    if (id) {
      setOrderId(id);
      // Xóa dữ liệu tạm để tránh f5 load lại sai
      sessionStorage.removeItem('checkout_data');
      sessionStorage.removeItem('tpetie_buy_now');
      sessionStorage.removeItem('order_success_id');
    }
  }, [clearCart]);

  // Khách đăng nhập theo dõi đơn trong mục Đơn mua; khách vãng lai tra cứu bằng mã đơn và số điện thoại.
  const trackHref = orderId
    ? isAuthenticated ? `/orders/${encodeURIComponent(orderId)}` : `/order-lookup?code=${encodeURIComponent(orderId)}`
    : isAuthenticated ? '/orders' : '/order-lookup';

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="bg-white p-8 rounded-3xl border border-cream-200 shadow-card max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-honey-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-honey-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold font-heading text-charcoal-900">
            Đặt Hàng Thành Công!
          </h1>
          <p className="text-sm text-charcoal-600">
            Cảm ơn mẹ đã tin tưởng lựa chọn T'Petie. Đơn hàng của mẹ đã được ghi nhận và sẽ sớm được xử lý.
          </p>
        </div>

        {orderId && (
          <div className="bg-cream-50 p-4 rounded-2xl border border-cream-200">
            <p className="text-xs text-charcoal-500 font-semibold mb-1">Mã đơn hàng của mẹ</p>
            <p className="text-lg font-bold text-honey-600 font-heading tracking-wider">{orderId}</p>
            <p className="text-[11px] text-charcoal-500 mt-1">
              {isAuthenticated ? 'Đơn đã nằm trong mục Đơn mua ở menu tài khoản.' : 'Mẹ lưu lại mã đơn và số điện thoại đặt hàng để tra cứu nhé.'}
            </p>
          </div>
        )}

        <div className="space-y-3 pt-4">
          <Link
            href={trackHref}
            data-track="checkout-success-track-order"
            className="w-full py-3.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <Package className="w-4 h-4" />
            <span>Theo Dõi Đơn Hàng</span>
          </Link>
          <Link
            href="/girls"
            className="w-full py-3.5 rounded-full bg-white hover:bg-cream-50 text-charcoal-700 font-bold text-sm border-2 border-cream-200 transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Tiếp Tục Mua Sắm</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Minus, Plus } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { formatPriceCompact } from '@/lib/utils/formatters';
import { useToast } from '@/context/ToastContext';
import { trackBeginCheckout } from '@/lib/analytics/tracker';


interface BuyNowItem {
  productId: string;
  productName: string;
  sku: string;
  thumbnail: string;
  category: string;
  selectedSize: string;
  price: number;
  quantity: number;
}

export default function MuaNgayPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [item, setItem] = useState<BuyNowItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem('tpetie_buy_now');
    if (!raw) {
      router.replace('/be-gai');
      return;
    }
    try {
      const parsed: BuyNowItem = JSON.parse(raw);
      setItem(parsed);
      setQuantity(parsed.quantity);
    } catch {
      router.replace('/be-gai');
    }
  }, [router]);

  if (!item) return null;

  const subtotal = item.price * quantity;
  const shippingFee = subtotal >= 399000 ? 0 : 30000;
  const total = Math.max(0, subtotal + shippingFee - discountAmount);

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'TPETIE20') {
      setDiscountAmount(20000);
      showToast('Đã áp dụng mã giảm giá 20.000đ!', 'success');
    } else if (couponCode.toUpperCase() === 'MEMBERVIP') {
      setDiscountAmount(Math.round(subtotal * 0.1));
      showToast('Đã áp dụng mã giảm 10% thành viên mới!', 'success');
    } else {
      showToast('Mã giảm giá không hợp lệ hoặc đã hết hạn', 'info');
    }
  };

  const handleCheckout = () => {
    trackBeginCheckout(
      [{ item_id: item.productId, item_name: item.productName, price: item.price, quantity }],
      total
    );
    
    // Lưu dữ liệu vào session và chuyển hướng sang trang thanh toán
    sessionStorage.setItem('checkout_data', JSON.stringify({
      items: [{ ...item, quantity }],
      subtotal,
      discountAmount,
      shippingFee,
      finalTotal: total,
      couponCode
    }));
    
    router.push('/thanh-toan');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      <Breadcrumb
        items={[
          { label: 'Mua Ngay', href: '/mua-ngay' },
        ]}
      />

      {/* Tiêu đề */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-charcoal-900">
          Đặt Hàng Nhanh
        </h1>
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-1 text-xs text-charcoal-500 hover:text-honey-600 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sản phẩm */}
        <div className="lg:col-span-2 space-y-3">
          {/* Card sản phẩm */}
          <div className="bg-white p-4 rounded-2xl border border-honey-400 ring-1 ring-honey-300 shadow-card flex space-x-4 items-center">
            {/* Ảnh */}
            <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-cream-100 shrink-0 border border-cream-200">
              <Image
                src={item.thumbnail}
                alt={item.productName}
                fill
                sizes="120px"
                className="object-cover"
              />
            </div>

            {/* Thông tin */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-charcoal-900 line-clamp-2">
                {item.productName}
              </h3>
              <p className="text-xs text-sage-700 font-semibold mt-1">
                Kích cỡ: {item.selectedSize}
              </p>

              <div className="flex items-center justify-between mt-3">
                <span className="text-base font-bold text-honey-600 font-heading">
                  {formatPriceCompact(item.price * quantity)}
                </span>

                {/* Số lượng */}
                <div className="flex items-center border border-cream-300 rounded-lg bg-cream-50">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-1.5 hover:bg-cream-200 text-charcoal-600 rounded-l-lg"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-xs font-bold text-charcoal-900 min-w-[28px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-1.5 hover:bg-cream-200 text-charcoal-600 rounded-r-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Link thêm sản phẩm khác vào giỏ */}
          <p className="text-xs text-charcoal-400 text-center">
            Muốn mua thêm sản phẩm khác?{' '}
            <Link href="/gio-hang" className="text-honey-600 font-semibold hover:underline">
              Xem Giỏ Hàng →
            </Link>
          </p>
        </div>

        {/* Tóm tắt đơn hàng */}
        <div className="bg-white p-5 rounded-3xl border border-cream-200 shadow-card space-y-4 h-fit">
          <h2 className="font-heading font-bold text-base text-charcoal-900 pb-2 border-b border-cream-200">
            Tóm Tắt Đơn Hàng
          </h2>

          {/* Mã Khuyến Mãi */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-charcoal-700">Mã Khuyến Mãi:</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập TPETIE20..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-cream-300 bg-cream-50 focus:outline-none focus:border-honey-500 uppercase"
              />
              <button
                onClick={applyCoupon}
                className="px-3 py-2 rounded-xl bg-charcoal-900 text-white text-xs font-bold hover:bg-charcoal-800"
              >
                Áp Dụng
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs text-charcoal-700 pt-2 border-t border-cream-100">
            <div className="flex justify-between">
              <span>Tạm tính (1 sản phẩm):</span>
              <span className="font-semibold">{formatPriceCompact(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Phí vận chuyển:</span>
              <span className="font-semibold">
                {shippingFee === 0 ? (
                  <span className="text-sage-700 font-bold">Miễn Phí</span>
                ) : (
                  formatPriceCompact(shippingFee)
                )}
              </span>
            </div>
            {shippingFee > 0 && (
              <p className="text-[11px] text-charcoal-400 bg-cream-50 rounded-lg px-2 py-1.5">
                💡 Mua thêm{' '}
                <strong className="text-honey-600">
                  {formatPriceCompact(399000 - subtotal)}
                </strong>{' '}
                để được Freeship!
              </p>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-blush-600 font-semibold">
                <span>Mã giảm giá:</span>
                <span>-{formatPriceCompact(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-charcoal-900 pt-2 border-t border-cream-200">
              <span>Tổng thanh toán:</span>
              <span className="text-lg text-honey-600 font-heading">
                {formatPriceCompact(total)}
              </span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            data-track="buy-now-checkout"
            className="w-full py-3.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>Đặt Hàng Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>


        </div>
      </div>
    </div>
  );
}

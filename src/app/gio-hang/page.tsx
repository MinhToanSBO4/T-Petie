'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPriceCompact } from '@/lib/utils/formatters';
import { useToast } from '@/context/ToastContext';
import { trackBeginCheckout } from '@/lib/analytics/tracker';
import { useRouter } from 'next/navigation';

// Bỏ link Google Form cũ
// const GOOGLE_FORM_URL = 'https://forms.gle/t866jwRWJ38f4tKD6';

const itemKey = (productId: string, selectedSize: string) =>
  `${productId}-${selectedSize}`;

export default function GioHangPage() {
  const router = useRouter();
  const { items, updateQuantity, removeFromCart, clearCart, totalItems } = useCart();
  const { showToast } = useToast();

  // ── Checkbox state: mặc định tất cả được chọn ─────────────────
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(items.map((i) => itemKey(i.productId, i.selectedSize)))
  );

  const allKeys = useMemo(
    () => items.map((i) => itemKey(i.productId, i.selectedSize)),
    [items]
  );
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k));
  const someSelected = allKeys.some((k) => selectedKeys.has(k));

  const toggleItem = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allKeys));
    }
  };

  // ── Tính toán chỉ trên hàng được chọn ────────────────────────
  const selectedItems = items.filter((i) =>
    selectedKeys.has(itemKey(i.productId, i.selectedSize))
  );
  const selectedSubtotal = selectedItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  const shippingFee = selectedSubtotal >= 399000 || selectedSubtotal === 0 ? 0 : 30000;
  const finalTotal = Math.max(0, selectedSubtotal + shippingFee - discountAmount);

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'TPETIE20') {
      setDiscountAmount(20000);
      showToast('Đã áp dụng mã giảm giá 20.000đ!', 'success');
    } else if (couponCode.toUpperCase() === 'MEMBERVIP') {
      setDiscountAmount(Math.round(selectedSubtotal * 0.1));
      showToast('Đã áp dụng mã giảm 10% thành viên mới!', 'success');
    } else {
      showToast('Mã giảm giá không hợp lệ hoặc đã hết hạn', 'info');
    }
  };

  const handleStartCheckout = () => {
    if (selectedItems.length === 0) {
      showToast('Mẹ chưa chọn sản phẩm nào để đặt hàng!', 'info');
      return;
    }
    trackBeginCheckout(
      selectedItems.map((i) => ({
        item_id: i.productId,
        item_name: i.productName,
        price: i.price,
        quantity: i.quantity,
      })),
      finalTotal
    );
    
    // Lưu dữ liệu vào session và chuyển hướng sang trang thanh toán
    sessionStorage.setItem('checkout_data', JSON.stringify({
      items: selectedItems,
      subtotal: selectedSubtotal,
      discountAmount,
      shippingFee,
      finalTotal,
      couponCode
    }));
    
    router.push('/thanh-toan');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6">



      <Breadcrumb
        items={[
          { label: 'Giỏ Hàng', href: '/gio-hang' },
        ]}
      />

      {/* ===== GIỎ HÀNG ===== */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-charcoal-900">
            Giỏ Hàng Của Mẹ ({totalItems} món)
          </h1>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-charcoal-400 hover:text-red-500 font-medium"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-cream-200 p-10 text-center space-y-4 shadow-card">
            <div className="text-5xl">🛍️</div>
            <h2 className="text-lg font-bold font-heading text-charcoal-900">
              Giỏ hàng của mẹ hiện đang trống
            </h2>
            <p className="text-xs text-charcoal-600 max-w-sm mx-auto">
              Hãy ghé xem những mẫu váy áo trong BST mới nhất của T&apos;Petie để chọn cho bé yêu nhé!
            </p>
            <Link
              href="/be-gai"
              className="inline-block px-6 py-3 rounded-full bg-honey-500 text-white text-xs font-bold shadow-md hover:bg-honey-600 active:scale-95 transition-all"
            >
              Khám Phá Sản Phẩm Ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Danh Sách Sản Phẩm */}
            <div className="lg:col-span-2 space-y-3">

              {/* ── Thanh chọn tất cả ── */}
              <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-cream-200 shadow-sm">
                <button
                  onClick={toggleAll}
                  className="flex items-center space-x-2 text-xs font-semibold text-charcoal-700 hover:text-honey-600 transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-honey-500" />
                  ) : (
                    <Square className="w-4 h-4 text-charcoal-400" />
                  )}
                  <span>Chọn tất cả</span>
                </button>
                {someSelected && (
                  <span className="text-[11px] text-charcoal-500">
                    Đã chọn{' '}
                    <strong className="text-honey-600">{selectedItems.length}</strong>
                    /{items.length} sản phẩm
                  </span>
                )}
              </div>

              {/* ── Danh sách item ── */}
              {items.map((item) => {
                const key = itemKey(item.productId, item.selectedSize);
                const isChecked = selectedKeys.has(key);
                return (
                  <div
                    key={key}
                    className={`bg-white p-4 rounded-2xl border shadow-card flex space-x-3 sm:space-x-4 items-center transition-all duration-150 ${
                      isChecked
                        ? 'border-honey-400 ring-1 ring-honey-300'
                        : 'border-cream-200 opacity-60'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleItem(key)}
                      className="shrink-0 p-0.5"
                      aria-label={isChecked ? 'Bỏ chọn sản phẩm' : 'Chọn sản phẩm'}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-honey-500" />
                      ) : (
                        <Square className="w-5 h-5 text-charcoal-300" />
                      )}
                    </button>

                    {/* Ảnh sản phẩm */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-cream-100 shrink-0 border border-cream-200">
                      <Image
                        src={item.thumbnail}
                        alt={item.productName}
                        fill
                        sizes="100px"
                        className="object-cover"
                      />
                    </div>

                    {/* Thông tin */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xs sm:text-sm font-bold text-charcoal-900 line-clamp-1">
                          {item.productName}
                        </h3>
                        <button
                          onClick={() => {
                            removeFromCart(item.productId, item.selectedSize);
                            setSelectedKeys((prev) => {
                              const next = new Set(prev);
                              next.delete(key);
                              return next;
                            });
                          }}
                          className="text-charcoal-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-sage-700 font-semibold mt-0.5">
                        Kích cỡ: {item.selectedSize}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm sm:text-base font-bold text-honey-600 font-heading">
                          {formatPriceCompact(item.price * item.quantity)}
                        </span>

                        <div className="flex items-center border border-cream-300 rounded-lg bg-cream-50">
                          <button
                            onClick={() => updateQuantity(item.productId, item.selectedSize, -1)}
                            className="p-1.5 hover:bg-cream-200 text-charcoal-600 rounded-l-lg"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-bold text-charcoal-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.selectedSize, 1)}
                            className="p-1.5 hover:bg-cream-200 text-charcoal-600 rounded-r-lg"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tóm Tắt & Mã Giảm Giá */}
            <div className="bg-white p-5 rounded-3xl border border-cream-200 shadow-card space-y-4 h-fit">
              <h2 className="font-heading font-bold text-base text-charcoal-900 pb-2 border-b border-cream-200">
                Tóm Tắt Đơn Hàng
              </h2>

              {/* Nhập Coupon */}
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
                  <span>Tạm tính ({selectedItems.length} món được chọn):</span>
                  <span className="font-semibold">{formatPriceCompact(selectedSubtotal)}</span>
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
                {discountAmount > 0 && (
                  <div className="flex justify-between text-blush-600 font-semibold">
                    <span>Mã giảm giá:</span>
                    <span>-{formatPriceCompact(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-charcoal-900 pt-2 border-t border-cream-200">
                  <span>Tổng thanh toán:</span>
                  <span className="text-lg text-honey-600 font-heading">
                    {formatPriceCompact(finalTotal)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleStartCheckout}
                data-track="cart-proceed-checkout"
                disabled={selectedItems.length === 0}
                className="w-full py-3.5 rounded-full bg-honey-500 hover:bg-honey-600 disabled:bg-cream-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>
                  {selectedItems.length === 0
                    ? 'Chưa chọn sản phẩm'
                    : `Đặt Hàng (${selectedItems.length} món)`}
                </span>
                {selectedItems.length > 0 && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

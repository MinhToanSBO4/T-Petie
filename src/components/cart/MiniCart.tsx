'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPriceCompact } from '@/lib/utils/formatters';

export function MiniCart() {
  const { items, isMiniCartOpen, closeMiniCart, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();

  const freeShippingThreshold = 399000;
  const progressPercent = Math.min(100, (totalPrice / freeShippingThreshold) * 100);
  const remainingForFreeShip = Math.max(0, freeShippingThreshold - totalPrice);

  return (
    <AnimatePresence>
      {isMiniCartOpen && (
        <>
          {/* Backdrop mờ dần */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeMiniCart}
            className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-sm"
          />

          {/* Drawer trượt từ bên phải */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col justify-between"
          >
            {/* Header Mini-cart */}
            <div className="p-4 border-b border-cream-200 flex items-center justify-between bg-cream-50">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-honey-600" />
                <h3 className="font-heading font-bold text-base text-charcoal-900">
                  Giỏ Hàng Của Mẹ ({totalItems})
                </h3>
              </div>
              <button
                onClick={closeMiniCart}
                className="p-1.5 rounded-full hover:bg-cream-200 text-charcoal-600 transition-colors"
                aria-label="Đóng giỏ hàng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thanh tiến độ Freeship */}
            <div className="px-4 py-2.5 bg-honey-50 border-b border-cream-200 text-xs text-honey-700">
              {remainingForFreeShip === 0 ? (
                <div className="flex items-center space-x-1.5 font-semibold text-sage-700">
                  <Sparkles className="w-4 h-4 text-sage-500" />
                  <span>🎉 Chúc mừng Mẹ! Đơn hàng đã đủ điều kiện <strong>Miễn Phí Vận Chuyển</strong></span>
                </div>
              ) : (
                <div>
                  Mua thêm <strong className="text-honey-600">{formatPriceCompact(remainingForFreeShip)}</strong> để nhận <strong>Freeship toàn quốc</strong>!
                </div>
              )}
              <div className="w-full bg-cream-200 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-honey-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Danh sách món hàng */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-cream-100">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-charcoal-400">
                  <div className="w-20 h-20 rounded-full bg-cream-100 flex items-center justify-center text-3xl mb-3">
                    🛍️
                  </div>
                  <p className="font-heading font-semibold text-charcoal-700 mb-1">Giỏ hàng đang trống</p>
                  <p className="text-xs max-w-xs mb-4">Mẹ hãy chọn cho bé những bộ váy áo thật xinh xắn nhé!</p>
                  <button
                    onClick={closeMiniCart}
                    className="px-5 py-2 rounded-full bg-honey-500 text-white text-xs font-semibold shadow-sm hover:bg-honey-600 transition-all"
                  >
                    Dạo Xem Sản Phẩm
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={`${item.productId}-${item.selectedSize}`} className="pt-3 first:pt-0 flex space-x-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-cream-100 border border-cream-200 shrink-0">
                      <Image
                        src={item.thumbnail}
                        alt={item.productName}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs sm:text-sm font-semibold text-charcoal-900 line-clamp-1">
                            {item.productName}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.productId, item.selectedSize)}
                            className="text-charcoal-400 hover:text-red-500 p-1"
                            title="Xóa món này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-charcoal-600 mt-0.5">Size: <span className="font-medium text-sage-700">{item.selectedSize}</span></p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs sm:text-sm font-bold text-honey-600">
                          {formatPriceCompact(item.price)}
                        </span>
                        {/* Bộ tăng giảm số lượng */}
                        <div className="flex items-center border border-cream-300 rounded-lg bg-cream-50">
                          <button
                            onClick={() => updateQuantity(item.productId, item.selectedSize, -1)}
                            className="p-1 hover:bg-cream-200 rounded-l-lg transition-colors text-charcoal-600"
                            aria-label="Giảm"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-charcoal-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.selectedSize, 1)}
                            className="p-1 hover:bg-cream-200 rounded-r-lg transition-colors text-charcoal-600"
                            aria-label="Tăng"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Mini-cart với nút bấm CTA */}
            {items.length > 0 && (
              <div className="p-4 border-t border-cream-200 bg-cream-50 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-charcoal-600 font-medium">Tạm tính:</span>
                  <span className="text-lg font-bold text-honey-600 font-heading">
                    {formatPriceCompact(totalPrice)}
                  </span>
                </div>
                <Link
                    href="/gio-hang"
                    onClick={closeMiniCart}
                    data-track="view-full-cart"
                    className="w-full py-2.5 px-3 rounded-full bg-honey-500 hover:bg-honey-600 text-white text-xs font-bold text-center flex items-center justify-center space-x-1 shadow-md transition-all active:scale-95"
                  >
                    <span>Xem Giỏ Hàng</span>
                  </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

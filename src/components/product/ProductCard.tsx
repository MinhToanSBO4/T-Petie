'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { Product } from '@/types/product';
import { formatPriceCompact } from '@/lib/utils/formatters';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.sizes.length > 0) {
      addToCart(product, product.sizes[0], 1);
      showToast(`Đã thêm "${product.name}" vào giỏ hàng!`, 'success');
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="group bg-white rounded-2xl sm:rounded-3xl border border-cream-200 overflow-hidden shadow-card hover:shadow-soft transition-all flex flex-col justify-between"
    >
      <Link
        href={`/san-pham/${product.id}`}
        data-track="select-item"
        data-item-id={product.id}
        data-item-name={product.name}
        className="block relative"
      >
        {/* Khung Ảnh Sản Phẩm */}
        <div className="relative w-full aspect-square bg-cream-100 overflow-hidden">
          <motion.div
            layoutId={`product-image-${product.id}`}
            className="w-full h-full relative"
          >
            <Image
              src={product.thumbnail || (product.images && product.images[0]) || product.image || '/images/hero-banner.jpg'}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          </motion.div>

          {/* Badges Góc Trái Trên */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {product.isSale && product.discountPercent && (
              <span className="text-[10px] font-bold bg-blush-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                -{product.discountPercent}%
              </span>
            )}
            {product.isBestSeller && (
              <span className="text-[10px] font-bold bg-honey-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                Hot
              </span>
            )}
            {product.isNewArrival && !product.isBestSeller && (
              <span className="text-[10px] font-bold bg-sage-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                Mới
              </span>
            )}
          </div>

          {/* Tag Chất Liệu Nổi Bật Dưới Chân Ảnh */}
          <div className="absolute bottom-2 left-2 right-2 z-10">
            <span className="inline-block text-[9px] sm:text-[10px] font-medium bg-white/90 backdrop-blur-md text-charcoal-700 px-2 py-0.5 rounded-full border border-cream-200 truncate max-w-full">
              🌿 {product.materialFeatures[0] || product.material}
            </span>
          </div>
        </div>

        {/* Thông Tin Sản Phẩm */}
        <div className="p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-semibold text-charcoal-900 line-clamp-2 leading-snug mb-1.5 group-hover:text-honey-600 transition-colors">
            {product.name}
          </h3>

          {/* Giá tiền */}
          <div className="flex items-baseline space-x-1.5 mb-2">
            <span className="text-sm sm:text-base font-bold text-honey-600 font-heading">
              {formatPriceCompact(product.basePrice)}
            </span>
            {product.originalPrice && (
              <span className="text-[11px] text-charcoal-400 line-through">
                {formatPriceCompact(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Gợi Ý Size */}
          <div className="flex flex-wrap gap-1">
            {product.sizes.slice(0, 3).map((s) => (
              <span
                key={s.size}
                className="text-[9px] px-1.5 py-0.5 rounded bg-cream-100 text-charcoal-600 font-medium"
              >
                {s.size}
              </span>
            ))}
            {product.sizes.length > 3 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cream-100 text-charcoal-400 font-medium">
                +{product.sizes.length - 3}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Quick Action Button */}
      <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-0">
        <button
          onClick={handleQuickAdd}
          data-track="quick-add-cart"
          className="w-full py-2 rounded-xl bg-cream-100 hover:bg-honey-500 hover:text-white text-charcoal-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all active:scale-95 border border-cream-200"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Thêm nhanh</span>
        </button>
      </div>
    </motion.div>
  );
}

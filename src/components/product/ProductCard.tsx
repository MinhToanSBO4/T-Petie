'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ImageIcon, ShoppingBag } from 'lucide-react';
import type { ProductCardData } from '@/types/product';
import { formatPriceCompact } from '@/lib/utils/formatters';
import { useCart } from '@/context/CartContext';
import { toast } from '@/client/toast';

/**
 * Thẻ sản phẩm trong lưới. Hiệu ứng nổi khi rê chuột bằng CSS (trước đây mỗi thẻ là một motion.div có layoutId,
 * framer-motion phải đo lại bố cục cả lưới mỗi lần đổi bộ lọc).
 */
export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const { addToCart } = useCart();
  const availableSize = product.sizes.find((size) => size.stock > 0);
  const discount = product.discountPercent ?? 0;
  const highlight = product.materialFeatures[0] || product.material;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (availableSize) {
      addToCart(product, availableSize, 1);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`, { action: { label: 'Xem giỏ hàng', href: '/cart' } });
    }
  };

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-soft motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:rounded-3xl">
      <Link
        href={`/products/${product.slug}`}
        data-track="select-item"
        data-item-id={product.id}
        data-item-name={product.name}
        className="relative block"
      >
        {/* Khung Ảnh Sản Phẩm */}
        <div className="relative aspect-square w-full overflow-hidden bg-cream-100">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cream-100 text-charcoal-300" aria-hidden="true">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}

          {/* Badges Góc Trái Trên */}
          <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
            {product.isSale && discount > 0 && (
              <span className="rounded-full bg-blush-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                -{discount}%
              </span>
            )}
            {product.isBestSeller && (
              <span className="rounded-full bg-honey-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                Hot
              </span>
            )}
            {product.isNewArrival && !product.isBestSeller && (
              <span className="rounded-full bg-sage-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                Mới
              </span>
            )}
          </div>

          {/* Tag Chất Liệu Nổi Bật Dưới Chân Ảnh (sản phẩm chưa ghi chất liệu thì không hiện tag trống) */}
          {highlight && (
            <div className="absolute bottom-2 left-2 right-2 z-10">
              <span className="inline-block max-w-full truncate rounded-full border border-cream-200 bg-white/90 px-2 py-0.5 text-[9px] font-medium text-charcoal-700 backdrop-blur-md sm:text-[10px]">
                🌿 {highlight}
              </span>
            </div>
          )}
        </div>

        {/* Thông Tin Sản Phẩm */}
        <div className="p-3 sm:p-4">
          <h3 className="mb-1.5 line-clamp-2 text-xs font-semibold leading-snug text-charcoal-900 transition-colors group-hover:text-honey-600 sm:text-sm">
            {product.name}
          </h3>

          {/* Giá tiền */}
          <div className="mb-2 flex items-baseline space-x-1.5">
            <span className="font-heading text-sm font-bold text-honey-600 sm:text-base">
              {formatPriceCompact(product.basePrice)}
            </span>
            {product.originalPrice !== undefined && product.originalPrice > product.basePrice && (
              <span className="text-[11px] text-charcoal-400 line-through">
                {formatPriceCompact(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Gợi Ý Size */}
          <div className="flex flex-wrap gap-1">
            {product.sizes.slice(0, 3).map((s) => (
              <span key={s.size} className="rounded bg-cream-100 px-1.5 py-0.5 text-[9px] font-medium text-charcoal-600">
                {s.size}
              </span>
            ))}
            {product.sizes.length > 3 && (
              <span className="rounded bg-cream-100 px-1.5 py-0.5 text-[9px] font-medium text-charcoal-400">
                +{product.sizes.length - 3}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Quick Action Button */}
      <div className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={!availableSize}
          data-track="quick-add-cart"
          aria-label={availableSize ? `Thêm nhanh ${product.name} (${availableSize.size}) vào giỏ` : `${product.name} đã hết hàng`}
          className="flex w-full items-center justify-center space-x-1.5 rounded-xl border border-cream-200 bg-cream-100 py-2 text-xs font-semibold text-charcoal-800 transition-all hover:bg-honey-500 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-cream-100 disabled:hover:text-charcoal-800"
        >
          <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
          <span>{availableSize ? 'Thêm nhanh' : 'Hết hàng'}</span>
        </button>
      </div>
    </div>
  );
}
